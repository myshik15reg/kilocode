/**
 * Neo4j Graph Store Interfaces for Kilocode
 * 
 * This module defines the core interfaces and types for the Neo4j graph integration.
 * It supports storing and querying code relationships, dependencies, and structure.
 */

/**
 * Types of code entities that can be stored in the graph
 */
export type EntityType = 
  | 'file'          // Source file
  | 'function'      // Function or method
  | 'class'         // Class declaration
  | 'interface'     // Interface declaration
  | 'variable'      // Variable or constant
  | 'import'        // Import statement
  | 'module'        // Module or namespace
  | 'type'          // Type alias

/**
 * Types of relationships between code entities
 */
export type RelationshipType = 
  | 'imports'       // A imports B
  | 'calls'         // A calls B
  | 'inherits'      // A inherits from B
  | 'implements'    // A implements B
  | 'references'    // A references B
  | 'defines'       // A defines B (e.g., file defines function)
  | 'contains'      // A contains B (e.g., class contains method)
  | 'uses'          // A uses B (generic usage)
  | 'exports'       // A exports B

/**
 * Represents a code entity in the graph
 */
export interface CodeEntity {
  /** Unique identifier (format: "file:path:symbol" or "file:path") */
  id: string
  
  /** Type of the entity */
  type: EntityType
  
  /** Name of the entity */
  name: string
  
  /** File path (relative to workspace root) */
  filePath: string
  
  /** Line number where entity is defined */
  line: number
  
  /** Column number where entity starts */
  column?: number
  
  /** Programming language */
  language: string
  
  /** Additional properties */
  properties?: Record<string, any>
}

/**
 * Represents a relationship between code entities
 */
export interface CodeRelationship {
  /** ID of the source entity */
  fromId: string
  
  /** ID of the target entity */
  toId: string
  
  /** Type of relationship */
  type: RelationshipType
  
  /** Additional properties */
  properties?: {
    /** Line where relationship is defined */
    line?: number
    
    /** Strength of the relationship (0-1) */
    strength?: number
    
    /** Additional metadata */
    [key: string]: any
  }
}

/**
 * Configuration for Neo4j connection
 */
export interface Neo4jConfig {
  /** Neo4j connection URI (e.g., "bolt://localhost:7687") */
  uri: string
  
  /** Username for authentication */
  username: string
  
  /** Password for authentication */
  password: string
  
  /** Database name (default: "neo4j") */
  database?: string
  
  /** Connection timeout in milliseconds */
  connectionTimeout?: number
  
  /** Maximum retry attempts */
  maxRetries?: number
}

/**
 * Result of a graph query
 */
export interface GraphQueryResult {
  /** Entities returned by the query */
  entities: CodeEntity[]
  
  /** Relationships returned by the query */
  relationships: CodeRelationship[]
  
  /** Additional metadata */
  metadata?: {
    /** Query execution time in milliseconds */
    executionTime?: number
    
    /** Number of nodes traversed */
    nodesTraversed?: number
    
    [key: string]: any
  }
}

/**
 * Options for graph search operations
 */
export interface GraphSearchOptions {
  /** Maximum depth for traversal */
  maxDepth?: number
  
  /** Relationship types to follow */
  relationshipTypes?: RelationshipType[]
  
  /** Entity types to return */
  entityTypes?: EntityType[]
  
  /** Maximum number of results */
  limit?: number
  
  /** Direction of traversal */
  direction?: 'incoming' | 'outgoing' | 'both'
}

/**
 * Result of impact analysis
 */
export interface ImpactAnalysis {
  /** Entity being analyzed */
  entity: CodeEntity
  
  /** Entities directly affected */
  directImpact: CodeEntity[]
  
  /** Entities indirectly affected (transitive) */
  indirectImpact: CodeEntity[]
  
  /** Impact score (0-1, higher means more impact) */
  impactScore: number
  
  /** Potential breaking changes */
  breakingChanges: {
    entity: CodeEntity
    reason: string
    severity: 'low' | 'medium' | 'high'
  }[]
  
  /** Recommendations */
  recommendations: string[]
}

/**
 * Interface for graph storage operations
 */
export interface IGraphStore {
  /**
   * Initialize the graph store (create indexes, constraints, etc.)
   * @returns Promise resolving to true if a new database was created
   */
  initialize(): Promise<boolean>
  
  /**
   * Create a single entity in the graph
   * @param entity Entity to create
   */
  createEntity(entity: CodeEntity): Promise<void>
  
  /**
   * Create a single relationship in the graph
   * @param relationship Relationship to create
   */
  createRelationship(relationship: CodeRelationship): Promise<void>
  
  /**
   * Bulk create entities (more efficient than individual creates)
   * @param entities Array of entities to create
   */
  bulkCreateEntities(entities: CodeEntity[]): Promise<void>
  
  /**
   * Bulk create relationships
   * @param relationships Array of relationships to create
   */
  bulkCreateRelationships(relationships: CodeRelationship[]): Promise<void>
  
  /**
   * Get an entity and its immediate context
   * @param entityId ID of the entity
   * @returns Query result with entity and related entities
   */
  getEntityContext(entityId: string): Promise<GraphQueryResult>
  
  /**
   * Get all dependencies of an entity
   * @param entityId ID of the entity
   * @param depth Maximum depth to traverse (default: 1)
   * @returns Array of dependent entities
   */
  getDependencies(entityId: string, depth?: number): Promise<CodeEntity[]>
  
  /**
   * Get all entities that depend on this entity (dependents)
   * @param entityId ID of the entity
   * @param depth Maximum depth to traverse (default: 1)
   * @returns Array of dependent entities
   */
  getDependents(entityId: string, depth?: number): Promise<CodeEntity[]>
  
  /**
   * Analyze the impact of modifying an entity
   * @param entityId ID of the entity
   * @param maxDepth Maximum depth for impact analysis (default: 3)
   * @returns Impact analysis result
   */
  getImpactGraph(entityId: string, maxDepth?: number): Promise<ImpactAnalysis>
  
  /**
   * Find paths between two entities
   * @param fromId Source entity ID
   * @param toId Target entity ID
   * @param maxDepth Maximum path length (default: 5)
   * @returns Array of paths, where each path is an array of entity IDs
   */
  findPath(fromId: string, toId: string, maxDepth?: number): Promise<string[][]>
  
  /**
   * Search for entities by criteria
   * @param criteria Search criteria
   * @param options Search options
   * @returns Array of matching entities
   */
  searchEntities(
    criteria: Partial<CodeEntity>,
    options?: GraphSearchOptions
  ): Promise<CodeEntity[]>
  
  /**
   * Delete all entities and relationships for a file
   * @param filePath Path of the file
   */
  deleteEntitiesByFilePath(filePath: string): Promise<void>
  
  /**
   * Delete all entities and relationships for multiple files
   * @param filePaths Array of file paths
   */
  deleteEntitiesByMultipleFilePaths(filePaths: string[]): Promise<void>
  
  /**
   * Clear all data from the graph
   */
  clearAll(): Promise<void>
  
  /**
   * Check if the graph store is properly initialized
   * @returns Promise resolving to true if initialized
   */
  isInitialized(): Promise<boolean>
  
  /**
   * Get statistics about the graph
   * @returns Graph statistics
   */
  getStatistics(): Promise<{
    totalEntities: number
    totalRelationships: number
    entitiesByType: Record<EntityType, number>
    relationshipsByType: Record<RelationshipType, number>
  }>
}

/**
 * Options for hybrid search (combining vector and graph search)
 */
export interface HybridSearchOptions {
  /** Weight for semantic (vector) search results (0-1) */
  semanticWeight?: number
  
  /** Weight for graph search results (0-1) */
  graphWeight?: number
  
  /** Include dependencies in results */
  includeDependencies?: boolean
  
  /** Include dependents in results */
  includeDependents?: boolean
  
  /** Maximum dependency depth */
  maxDependencyDepth?: number
  
  /** Maximum number of results */
  maxResults?: number
  
  /** Minimum combined score threshold */
  minScore?: number
  
  /** Directory prefix to filter results */
  directoryPrefix?: string
}

/**
 * Result of hybrid search combining vector and graph search
 */
export interface HybridSearchResult {
  /** File path */
  filePath: string
  
  /** Semantic similarity score from Qdrant (0-1) */
  semanticScore: number
  
  /** Graph relevance score from Neo4j (0-1) */
  graphScore: number
  
  /** Combined weighted score */
  combinedScore: number
  
  /** Code content (from Qdrant) */
  content?: string
  
  /** Line numbers */
  startLine?: number
  endLine?: number
  
  /** Metadata */
  metadata?: {
    /** Programming language */
    language?: string
    
    /** Entity type */
    entityType?: EntityType
    
    /** Symbols defined in this chunk */
    symbols?: string[]
    
    /** Direct dependencies */
    dependencies?: string[]
    
    /** Direct dependents */
    dependents?: string[]
    
    /** Relationship count */
    relationshipCount?: number
    
    [key: string]: any
  }
}

/**
 * Context for a piece of code including its dependencies and structure
 */
export interface CodeContext {
  /** The file being analyzed */
  filePath: string
  
  /** Entities defined in the file */
  entities: CodeEntity[]
  
  /** Direct dependencies */
  dependencies: CodeEntity[]
  
  /** Direct dependents */
  dependents: CodeEntity[]
  
  /** Related files */
  relatedFiles: string[]
  
  /** Relationship graph */
  relationships: CodeRelationship[]
  
  /** Suggested files to examine together */
  suggestedFiles: string[]
}