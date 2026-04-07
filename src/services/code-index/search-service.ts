import * as path from "path"

import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName, type RetrievalMode } from "@roo-code/types"

import { CodeIndexConfigManager } from "./config-manager"
import type { CodeIndexSearchRequest } from "./interfaces/manager"
import type {
	CodeIndexStructuredSearchResult,
	RetrievalQueryClass,
	RetrievalSource,
	RetrievalSourceKind,
	RetrievalStage,
	VectorStoreSearchResult,
} from "./interfaces"
import type { IEmbedder } from "./interfaces/embedder"
import type { IVectorStore } from "./interfaces/vector-store"
import { CodeIndexStateManager } from "./state-manager"
import { HybridSearchService } from "../neo4j/hybrid-search-service"
import type { HybridSearchResult } from "../neo4j/interfaces"

/**
 * Service responsible for searching the code index.
 */
export class CodeIndexSearchService {
	private hybridSearchService: HybridSearchService | null = null
	private rerankAvailability?: { enabled: boolean; configured: boolean; modelId?: string; baseUrl?: string }

	private static readonly LANGUAGE_HINT_EXTENSIONS: Array<{ hints: string[]; extensions: string[] }> = [
		{ hints: ["typescript", " ts ", "tsx"], extensions: [".ts", ".tsx"] },
		{ hints: ["javascript", " js ", "jsx"], extensions: [".js", ".jsx", ".mjs", ".cjs"] },
		{ hints: ["python", " py "], extensions: [".py"] },
		{ hints: ["java"], extensions: [".java"] },
		{ hints: ["1c", "onec", "bsl", "1c:enterprise"], extensions: [".bsl", ".os"] },
	]
	private static readonly LEXICAL_CANDIDATE_MULTIPLIER = 4
	private static readonly RRF_K = 60
	private static readonly MAX_QUERY_TOKENS = 24
	private static readonly MIN_ADAPTIVE_RESULTS = 3

	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly stateManager: CodeIndexStateManager,
		private readonly embedder: IEmbedder,
		private readonly vectorStore: IVectorStore,
	) {
		const rerankConfig = this.configManager.currentRerankConfig
		if (this.configManager.isNeo4jEnabled || rerankConfig?.enabled) {
			this.hybridSearchService = new HybridSearchService(this.embedder, this.vectorStore, undefined, rerankConfig)
			this.rerankAvailability = this.hybridSearchService.getRerankAvailability()
		}
	}

	public updateRerankConfig(rerankConfig?: CodeIndexConfigManager["currentRerankConfig"]): void {
		if (!this.hybridSearchService && (this.configManager.isNeo4jEnabled || rerankConfig?.enabled)) {
			this.hybridSearchService = new HybridSearchService(this.embedder, this.vectorStore, undefined, rerankConfig)
		}

		if (this.hybridSearchService) {
			this.hybridSearchService.updateRerankConfig(rerankConfig)
			this.rerankAvailability = this.hybridSearchService.getRerankAvailability()
		}
	}

	public async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]>
	public async searchIndex(request: CodeIndexSearchRequest): Promise<VectorStoreSearchResult[]>
	public async searchIndex(
		queryOrRequest: string | CodeIndexSearchRequest,
		directoryPrefix?: string,
	): Promise<VectorStoreSearchResult[]> {
		const detailed = await this.searchIndexDetailed(this.normalizeSearchRequest(queryOrRequest, directoryPrefix))
		return detailed.results
	}

	public async searchIndexDetailed(query: string, directoryPrefix?: string): Promise<CodeIndexStructuredSearchResult>
	public async searchIndexDetailed(request: CodeIndexSearchRequest): Promise<CodeIndexStructuredSearchResult>
	public async searchIndexDetailed(
		queryOrRequest: string | CodeIndexSearchRequest,
		directoryPrefix?: string,
	): Promise<CodeIndexStructuredSearchResult> {
		const request = this.normalizeSearchRequest(queryOrRequest, directoryPrefix)
		if (!this.configManager.isFeatureEnabled || !this.configManager.isFeatureConfigured) {
			throw new Error("Code index feature is disabled or not configured.")
		}

		const currentState = this.stateManager.getCurrentStatus().systemStatus
		if (currentState !== "Indexed" && currentState !== "Indexing") {
			throw new Error(`Code index is not ready for search. Current state: ${currentState}`)
		}

		const queryClass = this.classifyQuery(request.query)
		const queryRewrite = this.rewriteQuery(request.query, queryClass)
		const effectiveQuery = queryRewrite ?? request.query
		const requestedMode = this.getRequestedRetrievalMode(request.retrievalMode)
		const minScore = this.configManager.currentSearchMinScore
		const maxResults = this.configManager.currentSearchMaxResults
		const useAdaptiveCutoff = requestedMode === "adaptive"
		const candidateLimit = useAdaptiveCutoff
			? Math.max(maxResults * CodeIndexSearchService.LEXICAL_CANDIDATE_MULTIPLIER, maxResults)
			: maxResults
		const warnings: string[] = []

		if (queryRewrite && this.isQueryClassifierDebugEnabled()) {
			warnings.push(`Query rewritten for ${queryClass}: ${queryRewrite}`)
		}
		if (this.isQueryClassifierDebugEnabled()) {
			warnings.push(`Query classified as ${queryClass}`)
		}

		try {
			const retrieval = await this.retrieveResults(
				effectiveQuery,
				request.directoryPrefix,
				requestedMode,
				minScore,
				candidateLimit,
			)
			const structured = useAdaptiveCutoff
				? this.buildAdaptiveSearchResult(
						request.query,
						queryClass,
						requestedMode,
						queryRewrite,
						retrieval.results,
						maxResults,
					)
				: this.buildFixedSearchResult(
						request.query,
						queryClass,
						requestedMode,
						queryRewrite,
						retrieval.results,
						maxResults,
					)
			structured.warnings = this.dedupeStrings([...warnings, ...retrieval.warnings, ...structured.warnings])
			return structured
		} catch (error) {
			console.error("[CodeIndexSearchService] Error during search:", error)

			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: (error as Error).message,
				stack: (error as Error).stack,
				location: "searchIndexDetailed",
			})

			throw error
		}
	}

	public async hybridSearch(query: string, directoryPrefix?: string): Promise<HybridSearchResult[]> {
		if (!this.configManager.isFeatureEnabled || !this.configManager.isFeatureConfigured) {
			throw new Error("Code index feature is disabled or not configured.")
		}

		if (!this.configManager.isNeo4jEnabled || !this.hybridSearchService) {
			throw new Error("Neo4j is not enabled. Hybrid search is not available.")
		}

		const minScore = this.configManager.currentSearchMinScore
		const maxResults = this.configManager.currentSearchMaxResults
		const currentState = this.stateManager.getCurrentStatus().systemStatus
		if (currentState !== "Indexed" && currentState !== "Indexing") {
			throw new Error(`Code index is not ready for search. Current state: ${currentState}`)
		}

		try {
			const results = await this.hybridSearchService.search(query, {
				maxResults,
				minScore,
				directoryPrefix,
			})
			return this.applyStructuredMetadataToHybridResults(query, results)
		} catch (error) {
			console.error("[CodeIndexSearchService] Error during hybrid search:", error)

			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: (error as Error).message,
				stack: (error as Error).stack,
				location: "hybridSearch",
			})

			throw error
		}
	}

	private async retrieveResults(
		query: string,
		directoryPrefix: string | undefined,
		requestedMode: RetrievalMode,
		minScore: number,
		candidateLimit: number,
	): Promise<{ results: VectorStoreSearchResult[]; warnings: string[] }> {
		const warnings: string[] = []
		const rerankEnabled = this.configManager.currentRerankConfig?.enabled === true
		const hybridRequested = requestedMode === "hybrid" || requestedMode === "rerank_heavy"
		const canUseHybridService = Boolean(
			this.hybridSearchService && (this.configManager.isNeo4jEnabled || rerankEnabled),
		)
		const hybridAvailable =
			canUseHybridService && this.configManager.isNeo4jEnabled
				? await this.hybridSearchService!.isAvailable()
				: false
		const canRunHybridSearch = canUseHybridService && (rerankEnabled || hybridAvailable)

		if (requestedMode === "semantic_only") {
			return {
				results: await this.performSemanticSearch(query, directoryPrefix, minScore, candidateLimit),
				warnings,
			}
		}

		if (requestedMode === "adaptive") {
			if (canRunHybridSearch) {
				return {
					results: this.mapHybridResults(
						await this.hybridSearchService!.search(query, {
							maxResults: candidateLimit,
							minScore,
							directoryPrefix,
						}),
					),
					warnings,
				}
			}

			if (canUseHybridService) {
				warnings.push("Optional graph/rerank enhancers were unavailable, using semantic-only retrieval.")
			}

			return {
				results: await this.performSemanticSearch(query, directoryPrefix, minScore, candidateLimit),
				warnings,
			}
		}

		if (canRunHybridSearch) {
			return {
				results: this.mapHybridResults(
					await this.hybridSearchService!.search(query, {
						maxResults: candidateLimit,
						minScore,
						directoryPrefix,
					}),
				),
				warnings,
			}
		}

		if (hybridRequested) {
			warnings.push(`Requested retrieval mode '${requestedMode}' was unavailable, using semantic-only retrieval.`)
		}
		return {
			results: await this.performSemanticSearch(query, directoryPrefix, minScore, candidateLimit),
			warnings,
		}
	}

	private async performSemanticSearch(
		query: string,
		directoryPrefix: string | undefined,
		minScore: number,
		maxResults: number,
	): Promise<VectorStoreSearchResult[]> {
		const embeddingResponse = await this.embedder.createEmbeddings([query])
		const vector = embeddingResponse?.embeddings[0]
		if (!vector) {
			throw new Error("Failed to generate embedding for query.")
		}
		const normalizedPrefix = directoryPrefix ? path.normalize(directoryPrefix) : undefined
		const results = await this.vectorStore.search(vector, normalizedPrefix, minScore, maxResults)
		return this.applyLanguageHintBoost(query, results)
	}

	private applyStructuredMetadataToHybridResults(query: string, results: HybridSearchResult[]): HybridSearchResult[] {
		const mappedResults = this.mapHybridResults(results)
		const structuredResults = this.applyStructuredMetadata(query, mappedResults)
		const structuredById = new Map(structuredResults.map((result) => [String(result.id), result]))
		return results.map((result) => {
			const normalizedId = String(result.id ?? `${result.filePath}:${result.startLine}`)
			const structured = structuredById.get(normalizedId)
			return {
				...result,
				id: result.id ?? normalizedId,
				retrievalPath: structured?.retrievalPath ?? result.retrievalPath,
				vectorScore: structured?.vectorScore ?? result.vectorScore ?? result.semanticScore,
				lexicalScore: structured?.lexicalScore ?? result.lexicalScore,
				rerankScore: structured?.rerankScore ?? result.rerankScore,
				sources: structured?.sources ?? result.sources,
				warnings: structured?.warnings ?? result.warnings,
				postprocessUsed: structured?.postprocessUsed ?? result.postprocessUsed,
			}
		})
	}

	private mapHybridResults(results: HybridSearchResult[]): VectorStoreSearchResult[] {
		return results.map((result) => ({
			id: result.id ?? `${result.filePath}:${result.startLine}`,
			filePath: result.filePath,
			codeChunk: result.codeChunk,
			startLine: result.startLine,
			endLine: result.endLine,
			score: result.combinedScore,
			payload: {
				...(result.payload ?? {}),
				vector_score: result.semanticScore,
				graph_score: result.graphScore,
				combined_score: result.combinedScore,
			},
			vectorScore: result.semanticScore,
			rerankScore: result.rerankScore,
			lexicalScore: result.lexicalScore,
			retrievalPath: result.retrievalPath,
			sources: result.sources,
			warnings: result.warnings,
			postprocessUsed: result.postprocessUsed,
		}))
	}

	private buildFixedSearchResult(
		originalQuery: string,
		queryClass: RetrievalQueryClass,
		retrievalMode: RetrievalMode,
		queryRewrite: string | undefined,
		results: VectorStoreSearchResult[],
		maxResults: number,
	): CodeIndexStructuredSearchResult {
		const ranked = this.applyStructuredRanking(originalQuery, results).slice(0, maxResults)
		return this.buildSearchEnvelope(originalQuery, queryClass, retrievalMode, queryRewrite, ranked, false)
	}

	private buildAdaptiveSearchResult(
		originalQuery: string,
		queryClass: RetrievalQueryClass,
		retrievalMode: RetrievalMode,
		queryRewrite: string | undefined,
		results: VectorStoreSearchResult[],
		maxResults: number,
	): CodeIndexStructuredSearchResult {
		const ranked = this.applyStructuredRanking(originalQuery, results)
		const adaptive = this.applyAdaptiveCutoff(ranked, maxResults)
		const envelope = this.buildSearchEnvelope(
			originalQuery,
			queryClass,
			retrievalMode,
			queryRewrite,
			adaptive.results,
			adaptive.cutoffApplied,
		)
		envelope.warnings = this.dedupeStrings([...envelope.warnings, ...adaptive.warnings])
		envelope.adaptiveCutoffApplied = adaptive.cutoffApplied
		return envelope
	}

	private buildSearchEnvelope(
		originalQuery: string,
		queryClass: RetrievalQueryClass,
		retrievalMode: RetrievalMode,
		queryRewrite: string | undefined,
		rankedResults: VectorStoreSearchResult[],
		compressionApplied: boolean,
	): CodeIndexStructuredSearchResult {
		const keyPoints = rankedResults
			.slice(0, 3)
			.map((result) => result.citationLabel ?? `${result.filePath}:${result.startLine}`)
		const sources = this.dedupeSources(rankedResults.flatMap((result) => result.sources ?? []))
		const warnings = this.dedupeStrings(rankedResults.flatMap((result) => result.warnings ?? []))
		const postprocessUsed = rankedResults.some((result) => result.postprocessUsed)
		const retrievalConfidence = this.computeAggregateConfidence(rankedResults)
		if (retrievalMode === "adaptive" && rankedResults.length > 0) {
			const minConfidence = this.configManager.currentAdaptiveRetrievalMinConfidence
			if (retrievalConfidence < minConfidence) {
				warnings.push(
					`Adaptive retrieval confidence is low (${retrievalConfidence.toFixed(2)} < ${minConfidence.toFixed(2)}).`,
				)
			}
		}
		return {
			query: originalQuery,
			queryClass,
			...(queryRewrite ? { queryRewrite } : {}),
			results: rankedResults.map((result) => ({
				...result,
				...(queryRewrite ? { queryRewrite } : {}),
				compressionApplied,
			})),
			keyPoints,
			sources,
			warnings: this.dedupeStrings(warnings),
			postprocessUsed,
			retrievalMode,
			retrievalConfidence,
			compressionApplied,
			adaptiveCutoffApplied: compressionApplied,
		}
	}

	private applyAdaptiveCutoff(
		results: VectorStoreSearchResult[],
		maxResults: number,
	): { results: VectorStoreSearchResult[]; cutoffApplied: boolean; warnings: string[] } {
		const selected: VectorStoreSearchResult[] = []
		const warnings: string[] = []
		const minConfidence = this.configManager.currentAdaptiveRetrievalMinConfidence
		const kneeSensitivity = this.configManager.currentAdaptiveRetrievalKneeSensitivity
		const minimumResults = Math.min(
			results.length,
			Math.min(CodeIndexSearchService.MIN_ADAPTIVE_RESULTS, maxResults),
		)
		let cutoffApplied = false
		let previousConfidence: number | undefined

		for (const result of results) {
			const confidence = result.confidence ?? this.computeResultConfidence(result)
			const annotated = { ...result, confidence, retrievalConfidence: confidence }
			const dropFromPrevious = previousConfidence === undefined ? 0 : previousConfidence - confidence
			const belowConfidenceFloor = confidence < minConfidence
			const hitKneePoint = selected.length >= minimumResults && dropFromPrevious > kneeSensitivity

			if (selected.length >= minimumResults && (belowConfidenceFloor || hitKneePoint)) {
				cutoffApplied = true
				if (belowConfidenceFloor) {
					warnings.push(
						`Adaptive retrieval stopped after ${selected.length} chunks because confidence fell below ${minConfidence.toFixed(2)}.`,
					)
				}
				if (hitKneePoint) {
					warnings.push(
						`Adaptive retrieval stopped at the relevance knee-point after ${selected.length} chunks.`,
					)
				}
				break
			}

			selected.push(annotated)
			previousConfidence = confidence
			if (selected.length >= maxResults) {
				break
			}
		}

		if (selected.length === 0 && results[0]) {
			const confidence = results[0].confidence ?? this.computeResultConfidence(results[0])
			selected.push({ ...results[0], confidence, retrievalConfidence: confidence })
		}

		return {
			results: selected,
			cutoffApplied,
			warnings: this.dedupeStrings(warnings),
		}
	}

	private applyStructuredRanking(query: string, results: VectorStoreSearchResult[]): VectorStoreSearchResult[] {
		const annotated = this.applyStructuredMetadata(query, results)
		if (annotated.length <= 1) {
			return annotated
		}

		const vectorRanks = this.createRankMap(annotated, (result) => result.vectorScore ?? result.score)
		const lexicalRanks = this.createRankMap(annotated, (result) => result.lexicalScore ?? 0)
		const rerankRanks = annotated.some((result) => typeof result.rerankScore === "number")
			? this.createRankMap(annotated, (result) => result.rerankScore ?? 0)
			: undefined

		return [...annotated].sort((left, right) => {
			const leftScore = this.computeRrfScore(left, vectorRanks, lexicalRanks, rerankRanks)
			const rightScore = this.computeRrfScore(right, vectorRanks, lexicalRanks, rerankRanks)
			if (rightScore !== leftScore) {
				return rightScore - leftScore
			}

			const lexicalDelta = (right.lexicalScore ?? 0) - (left.lexicalScore ?? 0)
			if (lexicalDelta !== 0) {
				return lexicalDelta
			}

			const rerankDelta = (right.rerankScore ?? 0) - (left.rerankScore ?? 0)
			if (rerankDelta !== 0) {
				return rerankDelta
			}

			return (right.score ?? 0) - (left.score ?? 0)
		})
	}

	private applyStructuredMetadata<T extends VectorStoreSearchResult>(query: string, results: T[]): T[] {
		const queryTokens = this.tokenizeForCodeSearch(query)
		return results.map((result) => {
			const vectorScore = this.extractVectorScore(result)
			const rerankScore = this.extractRerankScore(result)
			const lexicalScore = this.computeLexicalScore(queryTokens, result)
			const graphScore = this.extractGraphScore(result)
			const retrievalStage = this.detectRetrievalStage(graphScore, rerankScore)
			const retrievalPath = this.buildRetrievalPath(result)
			const sourceKind = this.detectSourceKind(result.filePath)
			const scoreBreakdown = {
				total: result.score,
				semantic: vectorScore,
				...(lexicalScore > 0 ? { lexical: lexicalScore } : {}),
				...(typeof rerankScore === "number" ? { rerank: rerankScore } : {}),
				...(typeof graphScore === "number" && graphScore > 0 ? { graph: graphScore } : {}),
			}
			const sources = this.buildResultSources(result, vectorScore, lexicalScore, rerankScore, graphScore)
			const warnings = this.buildResultWarnings(result)
			const confidence = this.computeResultConfidence({
				...result,
				vectorScore,
				lexicalScore,
				rerankScore,
			})
			return {
				...result,
				retrievalPath,
				vectorScore,
				lexicalScore,
				rerankScore,
				retrievalStage,
				sourceKind,
				citationLabel: `${result.filePath}:${result.startLine}-${result.endLine}`,
				scoreBreakdown,
				sources,
				warnings,
				postprocessUsed: lexicalScore > 0 || typeof rerankScore === "number",
				confidence,
				retrievalConfidence: confidence,
			} as T
		})
	}

	private createRankMap(
		results: VectorStoreSearchResult[],
		scoreGetter: (result: VectorStoreSearchResult) => number,
	): Map<string | number, number> {
		return new Map(
			[...results]
				.sort((left, right) => scoreGetter(right) - scoreGetter(left))
				.map((result, index) => [result.id, index + 1]),
		)
	}

	private computeRrfScore(
		result: VectorStoreSearchResult,
		vectorRanks: Map<string | number, number>,
		lexicalRanks: Map<string | number, number>,
		rerankRanks?: Map<string | number, number>,
	): number {
		const vectorRank = vectorRanks.get(result.id) ?? vectorRanks.size + CodeIndexSearchService.RRF_K
		const lexicalRank = lexicalRanks.get(result.id) ?? lexicalRanks.size + CodeIndexSearchService.RRF_K
		let score = 1 / (CodeIndexSearchService.RRF_K + vectorRank) + 1 / (CodeIndexSearchService.RRF_K + lexicalRank)
		if (rerankRanks) {
			const rerankRank = rerankRanks.get(result.id) ?? rerankRanks.size + CodeIndexSearchService.RRF_K
			score += 1 / (CodeIndexSearchService.RRF_K + rerankRank)
		}
		return score
	}

	private classifyQuery(query: string): RetrievalQueryClass {
		const normalized = query.trim().toLowerCase()
		const tokenCount = this.expandIdentifierTokens(query).length
		if (/workflow|protocol|runbook|guide|readme|instruction|settings?|configuration|docs?/u.test(normalized)) {
			return "workflow_docs"
		}
		if (
			/impact|affected|affect|blast radius|dependency|dependents|callers|references|where .*used|usage/u.test(
				normalized,
			)
		) {
			return "impact_analysis"
		}
		if (
			/overview|research|explore|analy[sz]e repo|architecture|how does .* work/u.test(normalized) ||
			tokenCount >= 10
		) {
			return "broad_repo_research"
		}
		if (/implement|implementation|code path|handler|service|logic|flow|where .*implemented/u.test(normalized)) {
			return "implementation_search"
		}
		if (/\b(class|function|method|symbol|type|interface|enum|const|variable)\b/u.test(normalized)) {
			return "symbol_lookup"
		}
		if (tokenCount <= 4 && (/[_./:#]/u.test(query) || /[A-Z]/u.test(query) || /^\w+$/u.test(query.trim()))) {
			return "symbol_lookup"
		}
		return "implementation_search"
	}

	private rewriteQuery(query: string, queryClass: RetrievalQueryClass): string | undefined {
		switch (queryClass) {
			case "workflow_docs":
				return /workflow|protocol|doc|readme|instruction|guide|setting/i.test(query)
					? undefined
					: `workflow docs settings protocol ${query.trim()}`
			case "broad_repo_research":
				return /repo|repository|architecture|system|overview/i.test(query)
					? undefined
					: `repository architecture overview ${query.trim()}`
			default:
				return undefined
		}
	}

	private detectRetrievalStage(graphScore: number | undefined, rerankScore: number | undefined): RetrievalStage {
		if (typeof graphScore === "number" && graphScore > 0 && typeof rerankScore === "number") {
			return "semantic_graph_rerank"
		}
		if (typeof graphScore === "number" && graphScore > 0) {
			return "semantic_graph"
		}
		if (typeof rerankScore === "number") {
			return "semantic_rerank"
		}
		return "semantic"
	}

	private detectSourceKind(filePathValue: string): RetrievalSourceKind {
		const normalizedPath = filePathValue.replace(/\\/g, "/").toLowerCase()
		const extension = path.extname(normalizedPath)
		if (normalizedPath.includes("/.protocols/") || normalizedPath.includes("/protocols/")) {
			return "protocol"
		}
		if (normalizedPath.includes("/workflow") || normalizedPath.includes("/workflows/")) {
			return "workflow"
		}
		if ([".md", ".mdx"].includes(extension)) {
			return normalizedPath.includes("readme") || normalizedPath.includes("guide") ? "workflow" : "markdown"
		}
		if ([".json", ".yml", ".yaml", ".toml", ".ini", ".env"].includes(extension)) {
			return "config"
		}
		if (/(\.spec\.|\.test\.|__tests__|\/tests\/)/u.test(normalizedPath)) {
			return "test"
		}
		return "code"
	}

	private computeResultConfidence(result: VectorStoreSearchResult): number {
		const vectorScore = this.extractVectorScore(result)
		const lexicalScore = result.lexicalScore ?? 0
		const rerankScore = result.rerankScore ?? vectorScore
		const graphScore = Math.max(0, this.extractGraphScore(result) ?? 0)
		return this.clamp01(vectorScore * 0.5 + lexicalScore * 0.2 + rerankScore * 0.2 + graphScore * 0.1)
	}

	private computeAggregateConfidence(results: VectorStoreSearchResult[]): number {
		if (results.length === 0) {
			return 0
		}
		const sample = results.slice(0, 3)
		const total = sample.reduce(
			(sum, result) => sum + (result.confidence ?? this.computeResultConfidence(result)),
			0,
		)
		return this.clamp01(total / sample.length)
	}

	private clamp01(value: number): number {
		if (!Number.isFinite(value)) {
			return 0
		}
		return Math.max(0, Math.min(1, value))
	}

	private extractVectorScore(result: VectorStoreSearchResult): number {
		if (typeof result.vectorScore === "number") {
			return result.vectorScore
		}
		const payload = (result.payload ?? {}) as Record<string, unknown>
		if (typeof payload.vector_score === "number") {
			return payload.vector_score
		}
		return result.score
	}

	private extractRerankScore(result: VectorStoreSearchResult): number | undefined {
		if (typeof result.rerankScore === "number") {
			return result.rerankScore
		}
		const payload = (result.payload ?? {}) as Record<string, unknown>
		return typeof payload.rerank_score === "number" ? payload.rerank_score : undefined
	}

	private extractGraphScore(result: VectorStoreSearchResult): number | undefined {
		const payload = (result.payload ?? {}) as Record<string, unknown>
		return typeof payload.graph_score === "number" ? payload.graph_score : undefined
	}

	private buildRetrievalPath(result: VectorStoreSearchResult): string[] {
		const normalizedPath = (result.filePath ?? "").replace(/\\/g, "/")
		const pathParts = normalizedPath.split("/").filter(Boolean)
		const breadcrumb = ["workspace", ...pathParts]
		const symbolLabel = this.extractSymbolLabel(result.codeChunk)
		if (symbolLabel) {
			breadcrumb.push(`symbol:${symbolLabel}`)
		}
		breadcrumb.push(`lines:${result.startLine}-${result.endLine}`)
		return breadcrumb
	}

	private extractSymbolLabel(codeChunk: string): string | undefined {
		const firstMeaningfulLine = codeChunk
			.split(/\r?\n/)
			.map((line) => line.trim())
			.find((line) => line.length > 0)
		if (!firstMeaningfulLine) {
			return undefined
		}
		return firstMeaningfulLine.slice(0, 64)
	}

	private buildResultSources(
		result: VectorStoreSearchResult,
		vectorScore: number,
		lexicalScore: number,
		rerankScore: number | undefined,
		graphScore: number | undefined,
	): RetrievalSource[] {
		const fileName = path.basename(result.filePath)
		const sources: RetrievalSource[] = [
			{
				type: "semantic",
				label: `semantic match in ${fileName}`,
				score: vectorScore,
				details: result.filePath,
			},
		]
		if (lexicalScore > 0) {
			sources.push({
				type: "lexical",
				label: `lexical overlap in ${fileName}`,
				score: lexicalScore,
				details: result.filePath,
			})
		}
		if (typeof rerankScore === "number") {
			sources.push({
				type: "rerank",
				label: `reranker confirmation for ${fileName}`,
				score: rerankScore,
				details: result.filePath,
			})
		}
		if (typeof graphScore === "number" && graphScore > 0) {
			sources.push({
				type: "graph",
				label: `graph relationships for ${fileName}`,
				score: graphScore,
				details: result.filePath,
			})
		}
		return sources
	}

	private buildResultWarnings(result: VectorStoreSearchResult): string[] {
		const warnings = [...(result.warnings ?? [])]
		if (!result.codeChunk || result.codeChunk.trim().length === 0) {
			warnings.push(`Result ${result.filePath}:${result.startLine}-${result.endLine} is missing snippet content.`)
		}
		return this.dedupeStrings(warnings)
	}

	private tokenizeForCodeSearch(query: string): string[] {
		const baseTokens = this.expandIdentifierTokens(query)
		return [...new Set(baseTokens)].slice(0, CodeIndexSearchService.MAX_QUERY_TOKENS)
	}

	private expandIdentifierTokens(input: string): string[] {
		const expanded = input
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.replace(/[_./\:-]+/g, " ")
			.toLowerCase()
		return expanded
			.split(/[^\p{L}\p{N}]+/u)
			.map((token) => token.trim())
			.filter((token) => token.length >= 2)
	}

	private computeLexicalScore(queryTokens: string[], result: VectorStoreSearchResult): number {
		if (queryTokens.length === 0) {
			return 0
		}
		const searchableText = [result.filePath, result.codeChunk, ...(result.retrievalPath ?? [])]
			.filter(Boolean)
			.join(" ")
			.toLowerCase()
		const candidateTokens = new Set([
			...this.expandIdentifierTokens(searchableText),
			...this.getLanguageAliasTokens(result.filePath),
		])
		const matchedTokens = queryTokens.filter((token) => candidateTokens.has(token))
		const tokenCoverage = matchedTokens.length / queryTokens.length
		const exactPathBonus = result.filePath.toLowerCase().includes(queryTokens.join(" ")) ? 0.25 : 0
		const exactIdentifierBonus = matchedTokens.some((token) =>
			path.basename(result.filePath).toLowerCase().includes(token),
		)
			? 0.15
			: 0
		const languageAliasTokens = this.getLanguageAliasTokens(result.filePath)
		const languageAliasBonus = queryTokens.some((token) => languageAliasTokens.includes(token)) ? 0.2 : 0
		return Math.min(1, tokenCoverage + exactPathBonus + exactIdentifierBonus + languageAliasBonus)
	}

	private getLanguageAliasTokens(filePath: string): string[] {
		const extension = path.extname(filePath.toLowerCase())
		const languageConfig = CodeIndexSearchService.LANGUAGE_HINT_EXTENSIONS.find(({ extensions }) =>
			extensions.includes(extension),
		)
		if (!languageConfig) {
			return []
		}
		return languageConfig.hints.flatMap((hint) => this.expandIdentifierTokens(hint))
	}

	private applyLanguageHintBoost(query: string, results: VectorStoreSearchResult[]): VectorStoreSearchResult[] {
		const normalizedQuery = ` ${query.toLowerCase()} `
		const matchedExtensions = CodeIndexSearchService.LANGUAGE_HINT_EXTENSIONS.find(({ hints }) =>
			hints.some((hint) => normalizedQuery.includes(hint)),
		)?.extensions
		if (!matchedExtensions?.length) {
			return results
		}
		return [...results].sort((left, right) => {
			const leftScore = this.getLanguageBoostedScore(left, matchedExtensions)
			const rightScore = this.getLanguageBoostedScore(right, matchedExtensions)
			return rightScore - leftScore
		})
	}

	private getLanguageBoostedScore(result: VectorStoreSearchResult, matchedExtensions: string[]): number {
		const filePath = result.filePath?.toLowerCase() ?? ""
		const extension = path.extname(filePath)
		const boost = matchedExtensions.includes(extension) ? 0.2 : 0
		return result.score + boost
	}
	private normalizeSearchRequest(
		queryOrRequest: string | CodeIndexSearchRequest,
		directoryPrefix?: string,
	): CodeIndexSearchRequest {
		if (typeof queryOrRequest === "string") {
			return { query: queryOrRequest, directoryPrefix }
		}
		return queryOrRequest
	}

	private getRequestedRetrievalMode(requestedMode?: RetrievalMode): RetrievalMode {
		if (
			requestedMode === "semantic_only" ||
			requestedMode === "hybrid" ||
			requestedMode === "rerank_heavy" ||
			requestedMode === "adaptive"
		) {
			return requestedMode
		}
		const rawMode = this.configManager.getContextProxy?.().getGlobalState?.("retrievalPolicy")
		return rawMode === "semantic_only" || rawMode === "hybrid" || rawMode === "rerank_heavy" ? rawMode : "adaptive"
	}

	private isQueryClassifierDebugEnabled(): boolean {
		return this.configManager.getContextProxy?.().getGlobalState?.("queryClassifierDebug") === true
	}

	private dedupeSources(sources: RetrievalSource[]): RetrievalSource[] {
		const seen = new Set<string>()
		return sources.filter((source) => {
			const key = `${source.type}:${source.label}`
			if (seen.has(key)) {
				return false
			}
			seen.add(key)
			return true
		})
	}

	private dedupeStrings(values: string[]): string[] {
		return [...new Set(values.filter((value) => value.trim().length > 0))]
	}

	public async isHybridSearchAvailable(): Promise<boolean> {
		if (!this.configManager.isNeo4jEnabled || !this.hybridSearchService) {
			return false
		}
		return await this.hybridSearchService.isAvailable()
	}

	public getRerankAvailability():
		| {
				enabled: boolean
				configured: boolean
				modelId?: string
				baseUrl?: string
		  }
		| undefined {
		return this.rerankAvailability
	}
}
