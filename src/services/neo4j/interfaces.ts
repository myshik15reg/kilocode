/**
 * Represents a code entity extracted from source code
 */
export interface CodeEntity {
	id: string
	type: CodeEntityType
	name: string
	filePath: string
	line: number
	column?: number
	language: string
	properties?: Record<string, any>
}

/**
 * Type of code entity
 */
export type CodeEntityType = "file" | "function" | "class" | "interface" | "variable" | "import" | "module" | "type"

/**
 * Represents a relationship between code entities
 */
export interface CodeRelationship {
	id?: string // Optional unique identifier
	type: RelationshipType
	fromId: string // Source entity ID
	toId: string // Target entity ID
	source?: string // Entity ID (deprecated, use fromId)
	target?: string // Entity ID (deprecated, use toId)
	properties?: Record<string, any>
}

/**
 * Type of relationship between entities
 */
export type RelationshipType =
	| "imports"
	| "calls"
	| "inherits"
	| "implements"
	| "references"
	| "defines"
	| "contains"
	| "uses"
	| "exports"

/**
 * Result of extraction process
 */
export interface ExtractionResult {
	entities: CodeEntity[]
	relationships: CodeRelationship[]
}

/**
 * Base interface for language extractors
 */
export interface ILanguageExtractor {
	extract(code: string, filePath: string): Promise<ExtractionResult>
}

/**
 * Neo4j connection configuration
 */
export interface Neo4jConfig {
	uri: string
	username: string
	password: string
	database?: string
	connectionTimeout?: number
}

/**
 * Graph query result
 */
export interface GraphQueryResult {
	entities: CodeEntity[]
	relationships: CodeRelationship[]
}

/**
 * Graph search options
 */
export interface GraphSearchOptions {
	limit?: number
	offset?: number
}

/**
 * Hybrid search options
 */
export interface HybridSearchOptions {
	maxResults?: number
	minScore?: number
	directoryPrefix?: string
	semanticWeight?: number
	graphWeight?: number
}

/**
 * Hybrid search result combining semantic and graph data
 */
export interface HybridSearchResult {
	filePath: string
	codeChunk: string
	startLine: number
	endLine: number
	score: number
	semanticScore: number
	graphScore: number
	combinedScore: number
	relatedEntities: CodeEntity[]
	graphMetadata?: {
		entityCount: number
		entityTypes: CodeEntityType[]
		impactDepth?: number
	}
	id?: string | number
	payload?: any
	// kilocode_change start
	retrievalPath?: string[]
	vectorScore?: number
	lexicalScore?: number
	rerankScore?: number
	sources?: import("../code-index/interfaces").RetrievalSource[]
	warnings?: string[]
	postprocessUsed?: boolean
	// kilocode_change end
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
	entity: CodeEntity
	directImpact: CodeEntity[]
	indirectImpact: CodeEntity[]
	impactScore: number
	breakingChanges: Array<{
		entity: CodeEntity
		reason: string
		severity: "low" | "medium" | "high"
	}>
	recommendations: string[]
}

/**
 * Code context information
 */
export interface CodeContext {
	entity: CodeEntity
	relatedEntities: CodeEntity[]
	relationships: CodeRelationship[]
}

/**
 * Entity type alias for export compatibility
 */
export type EntityType = CodeEntityType

/**
 * Graph store interface
 */
export interface IGraphStore {
	initialize(): Promise<boolean>
	createEntity(entity: CodeEntity): Promise<void>
	createRelationship(relationship: CodeRelationship): Promise<void>
	bulkCreateEntities(entities: CodeEntity[]): Promise<void>
	bulkCreateRelationships(relationships: CodeRelationship[]): Promise<void>
	getEntityContext(entityId: string): Promise<GraphQueryResult>
	getDependencies(entityId: string, depth?: number): Promise<CodeEntity[]>
	getDependents(entityId: string, depth?: number): Promise<CodeEntity[]>
	getImpactGraph(entityId: string, maxDepth?: number): Promise<ImpactAnalysis>
	findPath(fromId: string, toId: string, maxDepth?: number): Promise<string[][]>
	getEntitiesByFilePath(filePath: string): Promise<CodeEntity[]>
	searchEntities(criteria: Partial<CodeEntity>, options?: GraphSearchOptions): Promise<CodeEntity[]>
	deleteEntitiesByFilePath(filePath: string): Promise<void>
	deleteEntitiesByMultipleFilePaths(filePaths: string[]): Promise<void>
	clearAll(): Promise<void>
	isInitialized(): Promise<boolean>
}
