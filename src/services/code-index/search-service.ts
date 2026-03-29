import * as path from "path"
import { VectorStoreSearchResult } from "./interfaces"
import { IEmbedder } from "./interfaces/embedder"
import { IVectorStore } from "./interfaces/vector-store"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager } from "./state-manager"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
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
		{
			hints: ["1c", "1СЃ", "onec", "bsl", "1c:enterprise", "1СЃ:РїСЂРµРґРїСЂРёСЏС‚РёРµ"],
			extensions: [".bsl", ".os"],
		},
	]

	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly stateManager: CodeIndexStateManager,
		private readonly embedder: IEmbedder,
		private readonly vectorStore: IVectorStore,
	) {
		// kilocode_change start
		// Keep semantic Qdrant search independent. Neo4j and reranker are optional layers
		// that can be used together or separately.
		const rerankConfig = this.configManager.currentRerankConfig
		if (this.configManager.isNeo4jEnabled || rerankConfig?.enabled) {
			this.hybridSearchService = new HybridSearchService(this.embedder, this.vectorStore, undefined, rerankConfig)
			this.rerankAvailability = this.hybridSearchService.getRerankAvailability()
		}
		// kilocode_change end
	}

	// kilocode_change start
	public updateRerankConfig(rerankConfig?: CodeIndexConfigManager["currentRerankConfig"]): void {
		if (!this.hybridSearchService && (this.configManager.isNeo4jEnabled || rerankConfig?.enabled)) {
			this.hybridSearchService = new HybridSearchService(this.embedder, this.vectorStore, undefined, rerankConfig)
		}

		if (this.hybridSearchService) {
			this.hybridSearchService.updateRerankConfig(rerankConfig)
			this.rerankAvailability = this.hybridSearchService.getRerankAvailability()
		}
	}
	// kilocode_change end

	/**
	 * Searches the code index for relevant content.
	 * Automatically uses hybrid search if Neo4j is enabled and available.
	 * @param query The search query
	 * @param directoryPrefix Optional directory path to filter results by
	 * @returns Array of search results
	 * @throws Error if the service is not properly configured or ready
	 */
	public async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]> {
		if (!this.configManager.isFeatureEnabled || !this.configManager.isFeatureConfigured) {
			throw new Error("Code index feature is disabled or not configured.")
		}

		const minScore = this.configManager.currentSearchMinScore
		const maxResults = this.configManager.currentSearchMaxResults

		const currentState = this.stateManager.getCurrentStatus().systemStatus
		if (currentState !== "Indexed" && currentState !== "Indexing") {
			// Allow search during Indexing too
			throw new Error(`Code index is not ready for search. Current state: ${currentState}`)
		}

		try {
			// kilocode_change start
			// Use optional enhancers when enabled. Without them, semantic search remains the baseline.
			if (
				(this.configManager.isNeo4jEnabled || this.configManager.currentRerankConfig?.enabled) &&
				this.hybridSearchService
			) {
				const isHybridAvailable = await this.hybridSearchService.isAvailable()
				if (isHybridAvailable || this.configManager.currentRerankConfig.enabled) {
					const hybridResults = await this.hybridSearchService.search(query, {
						maxResults,
						minScore,
						directoryPrefix,
					})
					// Convert hybrid results to vector store results for backward compatibility
					return this.applyLanguageHintBoost(
						query,
						hybridResults.map((result) => ({
							id: result.id ?? `${result.filePath}:${result.startLine}`,
							filePath: result.filePath,
							codeChunk: result.codeChunk,
							startLine: result.startLine,
							endLine: result.endLine,
							score: result.combinedScore, // Use combined score
						})),
					)
				}
			}
			// kilocode_change end

			// Fallback to semantic-only search
			return await this.performSemanticSearch(query, directoryPrefix, minScore, maxResults)
		} catch (error) {
			console.error("[CodeIndexSearchService] Error during search:", error)
			this.stateManager.setSystemState("Error", `Search failed: ${(error as Error).message}`)

			// Capture telemetry for the error
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: (error as Error).message,
				stack: (error as Error).stack,
				location: "searchIndex",
			})

			throw error // Re-throw the error after setting state
		}
	}

	/**
	 * Performs hybrid search combining semantic and graph-based approaches.
	 * Returns detailed hybrid results with graph metadata.
	 * @param query The search query
	 * @param directoryPrefix Optional directory path to filter results by
	 * @returns Array of hybrid search results with graph metadata
	 * @throws Error if Neo4j is not enabled or service is not ready
	 */
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
			return results
		} catch (error) {
			console.error("[CodeIndexSearchService] Error during hybrid search:", error)
			this.stateManager.setSystemState("Error", `Hybrid search failed: ${(error as Error).message}`)

			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: (error as Error).message,
				stack: (error as Error).stack,
				location: "hybridSearch",
			})

			throw error
		}
	}

	/**
	 * Performs semantic-only search using Qdrant
	 * @param query The search query
	 * @param directoryPrefix Optional directory path to filter results by
	 * @param minScore Minimum score threshold
	 * @param maxResults Maximum number of results
	 * @returns Array of vector store search results
	 */
	private async performSemanticSearch(
		query: string,
		directoryPrefix: string | undefined,
		minScore: number,
		maxResults: number,
	): Promise<VectorStoreSearchResult[]> {
		// Generate embedding for query
		const embeddingResponse = await this.embedder.createEmbeddings([query])
		const vector = embeddingResponse?.embeddings[0]
		if (!vector) {
			throw new Error("Failed to generate embedding for query.")
		}

		// Handle directory prefix
		let normalizedPrefix: string | undefined = undefined
		if (directoryPrefix) {
			normalizedPrefix = path.normalize(directoryPrefix)
		}

		// Perform search
		const results = await this.vectorStore.search(vector, normalizedPrefix, minScore, maxResults)
		return this.applyLanguageHintBoost(query, results)
	}

	// kilocode_change start
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
	// kilocode_change end

	/**
	 * Check if hybrid search is available
	 * @returns True if Neo4j is enabled and ready
	 */
	public async isHybridSearchAvailable(): Promise<boolean> {
		if (!this.configManager.isNeo4jEnabled || !this.hybridSearchService) {
			return false
		}
		return await this.hybridSearchService.isAvailable()
	}

	// kilocode_change start
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
	// kilocode_change end
}
