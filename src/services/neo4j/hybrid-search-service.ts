/**
 * Hybrid Search Service
 *
 * Combines semantic search (Qdrant) with graph-based search (Neo4j)
 * to provide more accurate and context-aware code search results.
 *
 * Algorithm:
 * 1. Perform semantic search in Qdrant
 * 2. For each result, query Neo4j for related entities
 * 3. Calculate combined score: 0.6 * semantic_score + 0.4 * graph_score
 * 4. Merge and rank results
 */

import { Neo4jGraphService } from "./graph-service"
import type { HybridSearchResult, HybridSearchOptions, CodeEntity } from "./interfaces"
import type { IEmbedder } from "../code-index/interfaces/embedder"
import type { IVectorStore } from "../code-index/interfaces/vector-store"
// kilocode_change start
import type { Payload, VectorStoreSearchResult } from "../code-index/interfaces"
import { BgeReranker, type RerankConfig } from "./reranker"
import { canonicalizeNeo4jFilePath } from "./canonical-file-path"
// kilocode_change end

// kilocode_change start
type RerankCandidatePayload = Partial<Payload> & {
	code_snippet?: string
	module?: string
	neo4j_id?: string
}
// kilocode_change end

export class HybridSearchService {
	// Weights for combining scores
	private static readonly SEMANTIC_WEIGHT = 0.6
	private static readonly GRAPH_WEIGHT = 0.4
	// kilocode_change start
	private static readonly DEFAULT_RERANK_CANDIDATE_LIMIT = 50
	private static readonly DEFAULT_RERANK_TOP_K = 10
	// kilocode_change end

	private graphService: Neo4jGraphService
	// kilocode_change start
	private reranker?: BgeReranker
	private rerankCandidateLimit: number = HybridSearchService.DEFAULT_RERANK_CANDIDATE_LIMIT
	private rerankTopK: number = HybridSearchService.DEFAULT_RERANK_TOP_K
	// kilocode_change end

	constructor(
		private embedder: IEmbedder,
		private vectorStore: IVectorStore,
		graphService?: Neo4jGraphService,
		// kilocode_change start
		rerankConfig?: RerankConfig,
		// kilocode_change end
	) {
		this.graphService = graphService || new Neo4jGraphService()
		// kilocode_change start
		this.updateRerankConfig(rerankConfig)
		// kilocode_change end
	}

	// kilocode_change start
	public updateRerankConfig(rerankConfig?: RerankConfig): void {
		this.reranker = rerankConfig ? new BgeReranker(rerankConfig) : undefined
		this.rerankCandidateLimit = rerankConfig?.candidateLimit ?? HybridSearchService.DEFAULT_RERANK_CANDIDATE_LIMIT
		this.rerankTopK = rerankConfig?.topK ?? HybridSearchService.DEFAULT_RERANK_TOP_K
	}
	// kilocode_change end

	/**
	 * Perform hybrid search combining semantic and graph-based approaches
	 *
	 * Combines semantic search (via Qdrant vector store) with graph-based search
	 * (via Neo4j) to provide more accurate and context-aware code search results.
	 *
	 * Algorithm:
	 * 1. Performs semantic search in Qdrant to find relevant code chunks
	 * 2. Enhances results with graph data from Neo4j (entities, relationships)
	 * 3. Calculates combined score: semanticWeight * semanticScore + graphWeight * graphScore
	 * 4. Returns ranked results filtered by minimum score
	 *
	 * @param query - Natural language search query
	 * @param options - Search configuration options
	 * @param options.maxResults - Maximum number of results to return (default: 10)
	 * @param options.minScore - Minimum combined score threshold (default: 0.7)
	 * @param options.directoryPrefix - Optional directory filter
	 * @param options.semanticWeight - Weight for semantic scores (default: 0.6)
	 * @param options.graphWeight - Weight for graph scores (default: 0.4)
	 *
	 * @returns Promise<HybridSearchResult[]> - Ranked search results with combined scores
	 *
	 * @example
	 * ```typescript
	 * const searchService = new HybridSearchService(embedder, vectorStore)
	 * const results = await searchService.search('user authentication', {
	 *   maxResults: 20,
	 *   minScore: 0.75,
	 *   directoryPrefix: 'src/auth'
	 * })
	 * ```
	 */
	public async search(query: string, options: HybridSearchOptions = {}): Promise<HybridSearchResult[]> {
		const {
			maxResults = 10,
			minScore = 0.7,
			directoryPrefix,
			semanticWeight = HybridSearchService.SEMANTIC_WEIGHT,
			graphWeight = HybridSearchService.GRAPH_WEIGHT,
		} = options

		// Step 1: Semantic search via Qdrant
		// kilocode_change start
		const shouldRerank = this.reranker?.isEnabled ?? false
		const semanticLimit = shouldRerank ? this.rerankCandidateLimit : maxResults * 2
		const semanticResults = await this.performSemanticSearch(query, directoryPrefix, semanticLimit)
		// kilocode_change end

		if (semanticResults.length === 0) {
			return []
		}

		// kilocode_change start
		const preparedResults = semanticResults.map((result) => this.ensureCandidatePayload(result))
		const rerankedResults = await this.applyRerank(query, preparedResults)
		const resultsForGraph = rerankedResults ?? preparedResults
		// kilocode_change end

		// Step 2: Check if Neo4j is available
		const isNeo4jReady = await this.graphService.isInitialized()
		if (!isNeo4jReady) {
			// Fallback to semantic-only results
			return this.convertToHybridResults(resultsForGraph, semanticWeight, graphWeight, false)
		}

		// Step 3: Enhance with graph information
		const hybridResults = await this.enhanceWithGraphData(resultsForGraph, query, semanticWeight, graphWeight)

		// Step 4: Filter by minimum score and limit results
		const filteredResults = hybridResults.filter((result) => result.combinedScore >= minScore).slice(0, maxResults)

		return filteredResults
	}

	/**
	 * Perform semantic search using Qdrant
	 */
	private async performSemanticSearch(
		query: string,
		directoryPrefix?: string,
		limit: number = 20,
	): Promise<VectorStoreSearchResult[]> {
		// Generate embedding for query
		const embeddingResponse = await this.embedder.createEmbeddings([query])
		const vector = embeddingResponse?.embeddings[0]

		if (!vector) {
			throw new Error("Failed to generate embedding for query")
		}

		// Search in Qdrant
		const results = await this.vectorStore.search(
			vector,
			directoryPrefix,
			0.0, // Get all results, we'll filter later
			limit,
		)

		return results
	}

	/**
	 * Enhance semantic results with graph data from Neo4j
	 */
	private async enhanceWithGraphData(
		semanticResults: VectorStoreSearchResult[],
		query: string,
		semanticWeight: number,
		graphWeight: number,
	): Promise<HybridSearchResult[]> {
		const hybridResults: HybridSearchResult[] = []

		for (const semanticResult of semanticResults) {
			try {
				// Find entities in Neo4j for this file
				// FIX: 2026-02-17-neo4j-index-fixes (TestAnalyzer)
				// Root cause: Neo4j stored filePath could be canonicalized (workspace-relative, POSIX), while Qdrant payload may vary.
				const canonicalFilePath = canonicalizeNeo4jFilePath(semanticResult.filePath)
				const entities = await this.graphService.getEntitiesByFilePath(canonicalFilePath)

				// Calculate graph score based on relevance
				const graphScore = this.calculateGraphScore(entities, query, semanticResult)

				// Calculate combined score
				const combinedScore = semanticWeight * semanticResult.score + graphWeight * graphScore

				// Create hybrid result
				const hybridResult: HybridSearchResult = {
					...semanticResult,
					semanticScore: semanticResult.score,
					graphScore,
					combinedScore,
					relatedEntities: entities,
					graphMetadata:
						entities.length > 0
							? {
									entityCount: entities.length,
									entityTypes: [...new Set(entities.map((e) => e.type))],
								}
							: undefined,
				}

				hybridResults.push(hybridResult)
			} catch (error) {
				console.error(`[HybridSearchService] Error enhancing result for ${semanticResult.filePath}:`, error)
				// Fallback to semantic-only for this result
				hybridResults.push({
					...semanticResult,
					semanticScore: semanticResult.score,
					graphScore: 0,
					combinedScore: semanticWeight * semanticResult.score,
					relatedEntities: [],
				})
			}
		}

		// Sort by combined score (descending)
		hybridResults.sort((a, b) => b.combinedScore - a.combinedScore)

		return hybridResults
	}

	/**
	 * Calculate graph relevance score
	 *
	 * Factors:
	 * - Number of entities in the file
	 * - Entity types (functions, classes are more relevant than variables)
	 * - Relationships to other entities
	 */
	private calculateGraphScore(
		entities: CodeEntity[],
		query: string,
		semanticResult: VectorStoreSearchResult,
	): number {
		if (entities.length === 0) {
			return 0
		}

		let score = 0
		const queryLower = query.toLowerCase()

		for (const entity of entities) {
			// Base score for having an entity
			score += 0.1

			// Bonus for entity type relevance
			if (entity.type === "function" || entity.type === "class") {
				score += 0.2
			} else if (entity.type === "interface" || entity.type === "module") {
				score += 0.15
			} else if (entity.type === "type") {
				score += 0.1
			}

			// Bonus for name matching query
			if (entity.name.toLowerCase().includes(queryLower)) {
				score += 0.3
			}

			// Bonus for being in the relevant line range
			if (
				semanticResult.startLine &&
				semanticResult.endLine &&
				entity.line >= semanticResult.startLine &&
				entity.line <= semanticResult.endLine
			) {
				score += 0.2
			}
		}

		// Normalize score to 0-1 range
		// Max theoretical score per entity: 0.1 + 0.2 + 0.3 + 0.2 = 0.8
		// For 10 entities: 8.0, so normalize by dividing by entity count
		const normalizedScore = Math.min(score / Math.max(entities.length, 1), 1.0)

		return normalizedScore
	}

	// kilocode_change start
	private ensureCandidatePayload(result: VectorStoreSearchResult): VectorStoreSearchResult {
		const payload: RerankCandidatePayload = (result.payload ?? {}) as RerankCandidatePayload
		const filePath = result.filePath || payload.filePath || ""
		const codeChunk = result.codeChunk || payload.codeChunk || ""
		const startLine = result.startLine ?? payload.startLine ?? 0
		const endLine = result.endLine ?? payload.endLine ?? startLine

		const normalizedPayload: Payload = {
			...payload,
			filePath,
			codeChunk,
			startLine,
			endLine,
			code_snippet: payload.code_snippet ?? codeChunk,
			module: payload.module ?? filePath,
			neo4j_id: payload.neo4j_id ?? (filePath ? `file:${filePath}` : undefined),
		}

		return {
			...result,
			filePath,
			codeChunk,
			startLine,
			endLine,
			payload: normalizedPayload,
		}
	}

	private async applyRerank(
		query: string,
		candidates: VectorStoreSearchResult[],
	): Promise<VectorStoreSearchResult[] | null> {
		if (!this.reranker?.isEnabled) {
			return null
		}

		try {
			return await this.reranker.rerank(query, candidates, this.rerankTopK)
		} catch (error) {
			console.warn("[HybridSearchService] Rerank failed, falling back to semantic order:", error)
			return null
		}
	}
	// kilocode_change end

	/**
	 * Convert semantic-only results to hybrid format (fallback)
	 */
	private convertToHybridResults(
		semanticResults: VectorStoreSearchResult[],
		semanticWeight: number,
		graphWeight: number,
		hasGraphData: boolean,
	): HybridSearchResult[] {
		return semanticResults.map((result) => ({
			...result,
			semanticScore: result.score,
			graphScore: 0,
			combinedScore: semanticWeight * result.score,
			relatedEntities: [],
		}))
	}

	/**
	 * Get related entities for a specific code location
	 * Useful for showing context around search results
	 */
	public async getRelatedEntities(filePath: string, startLine?: number, endLine?: number): Promise<CodeEntity[]> {
		const isReady = await this.graphService.isInitialized()
		if (!isReady) {
			return []
		}

		const canonicalFilePath = canonicalizeNeo4jFilePath(filePath)
		const entities = await this.graphService.getEntitiesByFilePath(canonicalFilePath)

		if (!startLine || !endLine) {
			return entities
		}

		// Filter entities within line range
		return entities.filter((entity) => entity.line >= startLine && entity.line <= endLine)
	}

	/**
	 * Search for code that depends on a specific entity
	 * Useful for impact analysis
	 */
	public async searchDependents(entityId: string, maxDepth: number = 2): Promise<HybridSearchResult[]> {
		const isReady = await this.graphService.isInitialized()
		if (!isReady) {
			return []
		}

		try {
			// Get impact graph from Neo4j
			const impactAnalysis = await this.graphService.getImpactGraph(entityId, maxDepth)

			// Convert to hybrid results
			const results: HybridSearchResult[] = []
			const processedFiles = new Set<string>()

			// Combine direct and indirect impacts
			const allAffectedEntities = [...impactAnalysis.directImpact, ...impactAnalysis.indirectImpact]

			for (const entity of allAffectedEntities) {
				if (processedFiles.has(entity.filePath)) {
					continue
				}
				processedFiles.add(entity.filePath)

				// Create a result for this file
				results.push({
					filePath: entity.filePath,
					codeChunk: `${entity.type} ${entity.name}`,
					startLine: entity.line,
					endLine: entity.line,
					score: 1.0, // Max score for direct dependency
					semanticScore: 0,
					graphScore: 1.0,
					combinedScore: 1.0,
					relatedEntities: [entity],
					graphMetadata: {
						entityCount: 1,
						entityTypes: [entity.type],
						impactDepth: 1,
					},
				})
			}

			return results
		} catch (error) {
			console.error(`[HybridSearchService] Error searching dependents:`, error)
			return []
		}
	}

	/**
	 * Check if hybrid search is available
	 */
	public async isAvailable(): Promise<boolean> {
		return await this.graphService.isInitialized()
	}

	// kilocode_change start
	public getRerankAvailability(): {
		enabled: boolean
		configured: boolean
		modelId?: string
		baseUrl?: string
	} {
		return (
			this.reranker?.availability ?? {
				enabled: false,
				configured: false,
			}
		)
	}
	// kilocode_change end
}
