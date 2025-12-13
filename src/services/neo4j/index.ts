/**
 * Neo4j Graph Store Module
 * 
 * This module provides integration with Neo4j graph database for storing
 * and querying code relationships, dependencies, and structure.
 * 
 * @example
 * ```typescript
 * // Connect to Neo4j
 * import { Neo4jConnectionManager } from './neo4j'
 * const manager = Neo4jConnectionManager.getInstance()
 * await manager.connect({ uri, username, password })
 * 
 * // Initialize graph service
 * import { Neo4jGraphService } from './neo4j'
 * const graphService = new Neo4jGraphService()
 * await graphService.initialize()
 * 
 * // Perform hybrid search
 * import { HybridSearchService } from './neo4j'
 * const searchService = new HybridSearchService(embedder, vectorStore)
 * const results = await searchService.search(query)
 * ```
 */

// Core components
export { Neo4jConnectionManager } from "./connection-manager"
export { Neo4jGraphService } from "./graph-service"
export { RelationshipExtractor } from "./relationship-extractor"
export { RelationshipIndexer } from "./relationship-indexer"
export { HybridSearchService } from "./hybrid-search-service"

// Types and interfaces
export type {
	// Core types
	EntityType,
	RelationshipType,
	Neo4jConfig,
	
	// Entity and relationship
	CodeEntity,
	CodeRelationship,
	
	// Query and search
	GraphQueryResult,
	GraphSearchOptions,
	HybridSearchOptions,
	HybridSearchResult,
	
	// Analysis
	ImpactAnalysis,
	CodeContext,
	
	// Interfaces
	IGraphStore,
} from "./interfaces"

// Indexer types
export type { IndexingProgress } from "./relationship-indexer"