import * as path from "path"
import { VectorStoreSearchResult } from "./interfaces"
import { IEmbedder } from "./interfaces/embedder"
import { IVectorStore } from "./interfaces/vector-store"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager } from "./state-manager"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import { Neo4jGraphService } from "./graph-service"
// import { CodeSymbol } from "./interfaces"
interface CodeSymbol {
	id: string
	name: string
	filePath: string
	range?: {
		start: {
			line: number
		}
		end: {
			line: number
		}
	}
}

/**
 * Service responsible for searching the code index.
 */
export class CodeIndexSearchService {
	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly stateManager: CodeIndexStateManager,
		private readonly embedder: IEmbedder,
		private readonly vectorStore: IVectorStore,
		private readonly neo4jService: Neo4jGraphService,
	) {}

	/**
	 * Combines and ranks search results from semantic and structural searches.
	 * @param semanticResults Results from the vector store
	 * @param structuralResults Results from the graph database
	 * @returns A combined and ranked list of search results
	 */
	private combineAndRank(
		semanticResults: VectorStoreSearchResult[],
		structuralResults: (CodeSymbol & { score: number })[],
		k: number = 60, // Константа для RRF
	): VectorStoreSearchResult[] {
		const rankedScores: { [filePath: string]: number } = {}

		// Обработка семантических результатов
		semanticResults.forEach((result, index) => {
			if (!result.payload) return
			const rank = index + 1
			const score = 1 / (k + rank)
			if (!rankedScores[result.payload.filePath]) {
				rankedScores[result.payload.filePath] = 0
			}
			rankedScores[result.payload.filePath] += score
		})

		// Обработка структурных результатов
		structuralResults.forEach((result, index) => {
			const rank = index + 1
			const score = 1 / (k + rank) // Даем структурным результатам такой же вес
			if (!rankedScores[result.filePath]) {
				rankedScores[result.filePath] = 0
			}
			rankedScores[result.filePath] += score
		})

		// Создаем объединенный и отсортированный список
		const combinedResultsMap = new Map<string, VectorStoreSearchResult>()

		semanticResults.forEach((r) => {
			if (r.payload) combinedResultsMap.set(r.payload.filePath, r)
		})
		structuralResults.forEach((r) => {
			if (!combinedResultsMap.has(r.filePath)) {
				combinedResultsMap.set(r.filePath, {
					id: r.id,
					score: 0, // Начальный score, будет заменен RRF-скором
					payload: {
						content: r.name,
						codeChunk: r.name,
						filePath: r.filePath,
						startLine: r.range?.start.line ?? 0,
						endLine: r.range?.end.line ?? 0,
					},
				})
			}
		})

		const finalResults = Array.from(combinedResultsMap.values())

		// Сортируем по RRF-скору
		finalResults.sort((a, b) => {
			const scoreA = (a.payload && rankedScores[a.payload.filePath]) || 0
			const scoreB = (b.payload && rankedScores[b.payload.filePath]) || 0
			return scoreB - scoreA
		})

		return finalResults
	}

	/**
	 * Searches the code index for relevant content.
	 * @param query The search query
	 * @param limit Maximum number of results to return
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
			// Generate embedding for query for semantic search
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

			const timeout = (ms: number, promiseName: string) =>
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error(`Timeout: ${promiseName} took too long`)), ms),
				)

			const semanticPromise = this.vectorStore.search(vector, normalizedPrefix, minScore, maxResults)
			let structuralPromise: Promise<CodeSymbol[]> = Promise.resolve([])

			if (this.configManager.getConfig().useCodeGraph) {
				structuralPromise = this.neo4jService.searchByTerm(query)
			}

			const [semanticSettled, structuralSettled] = await Promise.allSettled([
				Promise.race([semanticPromise, timeout(5000, "Semantic Search")]),
				Promise.race([structuralPromise, timeout(5000, "Structural Search")]),
			])

			const semanticResults = semanticSettled.status === "fulfilled" ? semanticSettled.value : []
			if (semanticSettled.status === "rejected") {
				console.error("[CodeIndexSearchService] Semantic search failed:", semanticSettled.reason)
			}

			const structuralResults = structuralSettled.status === "fulfilled" ? structuralSettled.value : []
			if (structuralSettled.status === "rejected") {
				console.warn(
					"[CodeIndexSearchService] Structural search failed (Neo4j may be unavailable):",
					structuralSettled.reason,
				)
			}

			// Combine and rank results
			const structuralResultsWithScore = structuralResults.map((r) => ({ ...r, score: 1.0 }))
			return this.combineAndRank(semanticResults, structuralResultsWithScore)
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
}
