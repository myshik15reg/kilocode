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
export type CodeEntityType =
	| 'file'
	| 'function'
	| 'class'
	| 'interface'
	| 'variable'
	| 'import'
	| 'module'
	| 'type'

/**
 * Represents a relationship between code entities
 */
export interface CodeRelationship {
	id: string
	type: RelationshipType
	source: string // Entity ID
	target: string // Entity ID
	properties?: Record<string, any>
}

/**
 * Type of relationship between entities
 */
export type RelationshipType =
	| 'imports'
	| 'calls'
	| 'inherits'
	| 'implements'
	| 'references'
	| 'defines'
	| 'contains'
	| 'uses'
	| 'exports'

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