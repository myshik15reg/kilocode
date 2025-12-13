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
import type { VectorStoreSearchResult } from "../code-index/interfaces"

export class HybridSearchService {
	private graphService: Neo4jGraphService
	
	// Weights for combining scores
	private static readonly SEMANTIC_WEIGHT = 0.6
	private static readonly GRAPH_WEIGHT = 0.4

	constructor(
		private embedder: IEmbedder,
		private vectorStore: IVectorStore,
		graphService?: Neo4jGraphService,
	) {
		this.graphService = graphService || new Neo4jGraphService()
	}

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
	public async search(
		query: string,
		options: HybridSearchOptions = {},
	): Promise<HybridSearchResult[]> {
		const {
			maxResults = 10,
			minScore = 0.7,
			directoryPrefix,
			semanticWeight = HybridSearchService.SEMANTIC_WEIGHT,
			graphWeight = HybridSearchService.GRAPH_WEIGHT,
		} = options

		// Step 1: Semantic search via Qdrant
		const semanticResults = await this.performSemanticSearch(
			query,
			directoryPrefix,
			maxResults * 2, // Get more results for better graph matching
		)

		if (semanticResults.length === 0) {
			return []
		}

		// Step 2: Check if Neo4j is available
		const isNeo4jReady = await this.graphService.isInitialized()
		if (!isNeo4jReady) {
			// Fallback to semantic-only results
			return this.convertToHybridResults(semanticResults, semanticWeight, graphWeight, false)
		}

		// Step 3: Enhance with graph information
		const hybridResults = await this.enhanceWithGraphData(
			semanticResults,
			query,
			semanticWeight,
			graphWeight,
		)

		// Step 4: Filter by minimum score and limit results
		const filteredResults = hybridResults
			.filter((result) => result.combinedScore >= minScore)
			.slice(0, maxResults)

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
				const entities = await this.graphService.getEntitiesByFilePath(
					semanticResult.filePath,
				)

				// Calculate graph score based on relevance
				const graphScore = this.calculateGraphScore(entities, query, semanticResult)

				// Calculate combined score
				const combinedScore = 
					semanticWeight * semanticResult.score +
					graphWeight * graphScore

				// Create hybrid result
				const hybridResult: HybridSearchResult = {
					...semanticResult,
					semanticScore: semanticResult.score,
					graphScore,
					combinedScore,
					relatedEntities: entities,
					graphMetadata: entities.length > 0 ? {
						entityCount: entities.length,
						entityTypes: [...new Set(entities.map(e => e.type))],
					} : undefined,
				}

				hybridResults.push(hybridResult)
			} catch (error) {
				console.error(
					`[HybridSearchService] Error enhancing result for ${semanticResult.filePath}:`,
					error,
				)
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
	public async getRelatedEntities(
		filePath: string,
		startLine?: number,
		endLine?: number,
	): Promise<CodeEntity[]> {
		const isReady = await this.graphService.isInitialized()
		if (!isReady) {
			return []
		}

		const entities = await this.graphService.getEntitiesByFilePath(filePath)
		
		if (!startLine || !endLine) {
			return entities
		}

		// Filter entities within line range
		return entities.filter(
			(entity) => entity.line >= startLine && entity.line <= endLine,
		)
	}

	/**
	 * Search for code that depends on a specific entity
	 * Useful for impact analysis
	 */
	public async searchDependents(
		entityId: string,
		maxDepth: number = 2,
	): Promise<HybridSearchResult[]> {
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
			const allAffectedEntities = [
				...impactAnalysis.directImpact,
				...impactAnalysis.indirectImpact,
			]

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
}