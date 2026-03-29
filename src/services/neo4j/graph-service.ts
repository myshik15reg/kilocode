/**
 * Neo4j Graph Service
 *
 * Implements IGraphStore interface for managing code entities and relationships in Neo4j.
 * Provides CRUD operations, graph traversal, and impact analysis.
 */

import type {
	IGraphStore,
	CodeEntity,
	CodeRelationship,
	GraphQueryResult,
	GraphSearchOptions,
	ImpactAnalysis,
	EntityType,
	RelationshipType,
} from "./interfaces"
import { Neo4jConnectionManager } from "./connection-manager"

// kilocode_change start
type NormalizeCypherIntOptions = {
	defaultValue: number
	min: number
	max: number
}

function normalizeCypherInt(value: unknown, { defaultValue, min, max }: NormalizeCypherIntOptions): number {
	const rawNumber = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
	if (!Number.isFinite(rawNumber)) {
		return defaultValue
	}

	const intValue = Math.trunc(rawNumber)
	if (intValue < min) return min
	if (intValue > max) return max
	return intValue
}
// kilocode_change end

export class Neo4jGraphService implements IGraphStore {
	private connectionManager: Neo4jConnectionManager

	constructor(connectionManager?: Neo4jConnectionManager) {
		this.connectionManager = connectionManager || Neo4jConnectionManager.getInstance()
	}

	/**
	 * Initialize the graph store with constraints and indexes
	 *
	 * Creates necessary database constraints and indexes for optimal query performance.
	 * This should be called once after connecting to Neo4j.
	 * Safe to call multiple times - will skip creation if already initialized.
	 *
	 * @returns Promise<boolean> - Returns true if new database was created, false if already initialized
	 *
	 * @throws {Error} If not connected to Neo4j or if initialization fails
	 *
	 * @example
	 * ```typescript
	 * const graphService = new Neo4jGraphService()
	 * const isNewDatabase = await graphService.initialize()
	 * if (isNewDatabase) {
	 *   console.log('New database initialized')
	 * }
	 * ```
	 */
	public async initialize(): Promise<boolean> {
		if (!this.connectionManager.isConnected()) {
			throw new Error("Neo4j is not connected. Call connect() first.")
		}

		try {
			// Check if constraints already exist
			const existingConstraints = await this.connectionManager.executeRead<{ name: string }>("SHOW CONSTRAINTS")

			const hasEntityConstraint = existingConstraints.some((c) => c.name?.includes("entity_id_unique"))

			if (hasEntityConstraint) {
				// Already initialized
				return false
			}

			// Create unique constraint on CodeEntity.id
			await this.connectionManager.executeWrite(
				"CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:CodeEntity) REQUIRE e.id IS UNIQUE",
			)

			// Create indexes for better query performance
			await this.connectionManager.executeWrite(
				"CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:CodeEntity) ON (e.type)",
			)

			await this.connectionManager.executeWrite(
				"CREATE INDEX entity_filepath_idx IF NOT EXISTS FOR (e:CodeEntity) ON (e.filePath)",
			)

			await this.connectionManager.executeWrite(
				"CREATE INDEX entity_name_idx IF NOT EXISTS FOR (e:CodeEntity) ON (e.name)",
			)

			console.log("[Neo4j] Graph store initialized with constraints and indexes")
			return true
		} catch (error) {
			throw new Error(
				`Failed to initialize Neo4j graph store: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Create a single entity
	 */
	public async createEntity(entity: CodeEntity): Promise<void> {
		// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
		// Root cause: Neo4j properties не поддерживают map/object; запись `properties = {}`/object падает.
		// Решение: хранить JSON-строку в `propertiesJson`.
		const query = `
			MERGE (e:CodeEntity {id: $id})
			SET e.type = $type,
			    e.name = $name,
			    e.filePath = $filePath,
			    e.line = $line,
			    e.column = $column,
			    e.language = $language,
			    e.propertiesJson = $propertiesJson,
			    e.updatedAt = datetime()
			RETURN e
		`

		await this.connectionManager.executeWrite(query, {
			id: entity.id,
			type: entity.type,
			name: entity.name,
			filePath: entity.filePath,
			line: entity.line,
			column: entity.column || null,
			language: entity.language,
			propertiesJson: this.serializePropertiesJson(entity.properties),
		})
	}

	/**
	 * Create a single relationship
	 */
	public async createRelationship(relationship: CodeRelationship): Promise<void> {
		const query = `
			MATCH (from:CodeEntity {id: $fromId})
			MATCH (to:CodeEntity {id: $toId})
			MERGE (from)-[r:${this.sanitizeRelationType(relationship.type)}]->(to)
			SET r.propertiesJson = $propertiesJson,
			    r.updatedAt = datetime()
			RETURN r
		`

		await this.connectionManager.executeWrite(query, {
			fromId: relationship.fromId,
			toId: relationship.toId,
			propertiesJson: this.serializePropertiesJson(relationship.properties),
		})
	}

	/**
	 * Bulk create entities (optimized for performance)
	 */
	public async bulkCreateEntities(entities: CodeEntity[]): Promise<void> {
		if (entities.length === 0) return

		try {
			// Use UNWIND for batch operations
			const query = `
				UNWIND $entities AS entity
				MERGE (e:CodeEntity {id: entity.id})
				SET e.type = entity.type,
				    e.name = entity.name,
				    e.filePath = entity.filePath,
				    e.line = entity.line,
				    e.column = entity.column,
				    e.language = entity.language,
				    e.propertiesJson = entity.propertiesJson,
				    e.updatedAt = datetime()
			`

			const params = entities.map((e) => ({
				id: e.id,
				type: e.type,
				name: e.name,
				filePath: e.filePath,
				line: e.line,
				column: e.column || null,
				language: e.language,
				propertiesJson: this.serializePropertiesJson(e.properties),
			}))

			await this.connectionManager.executeWrite(query, { entities: params })
		} catch (error) {
			console.error(`[Neo4jGraphService] Failed to bulk create ${entities.length} entities:`, error)
			throw new Error(`Failed to bulk create entities: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Bulk create relationships (optimized for performance)
	 */
	public async bulkCreateRelationships(relationships: CodeRelationship[]): Promise<void> {
		if (relationships.length === 0) return

		try {
			// Group relationships by type for better performance
			const relationshipsByType = new Map<RelationshipType, CodeRelationship[]>()

			for (const rel of relationships) {
				const existing = relationshipsByType.get(rel.type) || []
				existing.push(rel)
				relationshipsByType.set(rel.type, existing)
			}

			// Create relationships for each type
			for (const [type, rels] of relationshipsByType.entries()) {
				const query = `
					UNWIND $relationships AS rel
					MATCH (from:CodeEntity {id: rel.fromId})
					MATCH (to:CodeEntity {id: rel.toId})
					MERGE (from)-[r:${this.sanitizeRelationType(type)}]->(to)
					SET r.propertiesJson = rel.propertiesJson,
					    r.updatedAt = datetime()
				`

				const params = rels.map((r) => ({
					fromId: r.fromId,
					toId: r.toId,
					propertiesJson: this.serializePropertiesJson(r.properties),
				}))

				await this.connectionManager.executeWrite(query, { relationships: params })
			}
		} catch (error) {
			console.error(`[Neo4jGraphService] Failed to bulk create ${relationships.length} relationships:`, error)
			throw new Error(
				`Failed to bulk create relationships: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Get entity with its immediate context
	 */
	public async getEntityContext(entityId: string): Promise<GraphQueryResult> {
		try {
			const query = `
				MATCH (e:CodeEntity {id: $entityId})
				OPTIONAL MATCH (e)-[r]->(related:CodeEntity)
				RETURN e, collect({rel: r, entity: related}) AS relationships
			`

			interface ContextQueryResult {
				e: Record<string, unknown>
				relationships: Array<{
					rel: Record<string, unknown> | null
					entity: Record<string, unknown> | null
				}>
			}

			const result = await this.connectionManager.executeRead<ContextQueryResult>(query, { entityId })

			if (result.length === 0) {
				return { entities: [], relationships: [] }
			}

			const record = result[0]
			const entity = this.mapToCodeEntity(record.e)
			const relationships: CodeRelationship[] = []
			const relatedEntities: CodeEntity[] = []

			for (const item of record.relationships || []) {
				if (item.rel && item.entity) {
					// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
					// Root cause: Neo4j driver возвращает Node-объект; `item.entity.id` не содержит `CodeEntity.id`.
					// Решение: сначала маппим сущность, затем используем её `id` для связи.
					const relatedEntity = this.mapToCodeEntity(item.entity)
					relationships.push(this.mapToCodeRelationship(item.rel, entityId, relatedEntity.id))
					relatedEntities.push(relatedEntity)
				}
			}

			return {
				entities: [entity, ...relatedEntities],
				relationships,
			}
		} catch (error) {
			console.error(`[Neo4jGraphService] Failed to get entity context for ${entityId}:`, error)
			throw new Error(`Failed to get entity context: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Get all dependencies of an entity
	 */
	public async getDependencies(entityId: string, depth: number = 1): Promise<CodeEntity[]> {
		// FIX: 2026-02-19-reviewer-neo4j-cypher-numeric-normalization (TestAnalyzer)
		// Root cause: `depth` интерполировался в Cypher как строка без валидации → риск Cypher-injection.
		// Решение: нормализуем до integer и clamp диапазон перед интерполяцией.
		const safeDepth = normalizeCypherInt(depth, { defaultValue: 1, min: 1, max: 25 })
		const query = `
			MATCH path = (e:CodeEntity {id: $entityId})-[*1..${safeDepth}]->(dep:CodeEntity)
			RETURN DISTINCT dep
		`

		const result = await this.connectionManager.executeRead<{ dep: any }>(query, { entityId })
		return result.map((r) => this.mapToCodeEntity(r.dep))
	}

	/**
	 * Get all dependents of an entity
	 */
	public async getDependents(entityId: string, depth: number = 1): Promise<CodeEntity[]> {
		// FIX: 2026-02-19-reviewer-neo4j-cypher-numeric-normalization (TestAnalyzer)
		// Root cause: `depth` интерполировался в Cypher как строка без валидации → риск Cypher-injection.
		// Решение: нормализуем до integer и clamp диапазон перед интерполяцией.
		const safeDepth = normalizeCypherInt(depth, { defaultValue: 1, min: 1, max: 25 })
		const query = `
			MATCH path = (dependent:CodeEntity)-[*1..${safeDepth}]->(e:CodeEntity {id: $entityId})
			RETURN DISTINCT dependent
		`

		const result = await this.connectionManager.executeRead<{ dependent: any }>(query, {
			entityId,
		})
		return result.map((r) => this.mapToCodeEntity(r.dependent))
	}

	/**
	 * Analyze impact of modifying an entity
	 */
	public async getImpactGraph(entityId: string, maxDepth: number = 3): Promise<ImpactAnalysis> {
		const entity = (await this.getEntityContext(entityId)).entities[0]
		if (!entity) {
			throw new Error(`Entity ${entityId} not found`)
		}

		// Get all dependents (things that depend on this entity)
		const directImpact = await this.getDependents(entityId, 1)
		const indirectImpact = await this.getDependents(entityId, maxDepth)

		// Calculate impact score based on number of dependents
		const impactScore = Math.min(1.0, (directImpact.length * 0.5 + indirectImpact.length * 0.3) / 100)

		// Identify potential breaking changes
		const breakingChanges = directImpact.map((dep) => ({
			entity: dep,
			reason: `Depends on ${entity.name} (${entity.type})`,
			severity: "medium" as const,
		}))

		// Generate recommendations
		const recommendations: string[] = []
		if (directImpact.length > 10) {
			recommendations.push("High impact change - consider creating a new version instead")
		}
		if (entity.type === "interface" || entity.type === "class") {
			recommendations.push("Update all implementations and usages")
		}
		recommendations.push("Run tests for all affected files")
		recommendations.push("Review and update documentation")

		return {
			entity,
			directImpact,
			indirectImpact: indirectImpact.filter((e) => !directImpact.some((d) => d.id === e.id)),
			impactScore,
			breakingChanges,
			recommendations,
		}
	}

	/**
	 * Find paths between two entities
	 */
	public async findPath(fromId: string, toId: string, maxDepth: number = 5): Promise<string[][]> {
		// FIX: 2026-02-19-reviewer-neo4j-cypher-numeric-normalization (TestAnalyzer)
		// Root cause: `maxDepth` интерполировался в Cypher как строка без валидации → риск Cypher-injection.
		// Решение: нормализуем до integer и clamp диапазон перед интерполяцией.
		const safeMaxDepth = normalizeCypherInt(maxDepth, { defaultValue: 5, min: 1, max: 25 })
		const query = `
			MATCH path = shortestPath((from:CodeEntity {id: $fromId})-[*1..${safeMaxDepth}]-(to:CodeEntity {id: $toId}))
			RETURN [node in nodes(path) | node.id] AS pathIds
		`

		const result = await this.connectionManager.executeRead<{ pathIds: string[] }>(query, {
			fromId,
			toId,
		})

		return result.map((r) => r.pathIds)
	}

	/**
	 * Get all entities for a specific file
	 * @param filePath File path to search for
	 * @returns Array of entities in the file
	 */
	public async getEntitiesByFilePath(filePath: string): Promise<CodeEntity[]> {
		const query = `
			MATCH (e:CodeEntity {filePath: $filePath})
			RETURN e
		`

		const result = await this.connectionManager.executeRead<{ e: Record<string, unknown> }>(query, { filePath })
		return result.map((r) => this.mapToCodeEntity(r.e))
	}

	/**
	 * Search entities by criteria
	 */
	public async searchEntities(criteria: Partial<CodeEntity>, options?: GraphSearchOptions): Promise<CodeEntity[]> {
		let query = "MATCH (e:CodeEntity) WHERE 1=1"
		const params: Record<string, any> = {}

		if (criteria.type) {
			query += " AND e.type = $type"
			params.type = criteria.type
		}

		if (criteria.name) {
			query += " AND e.name CONTAINS $name"
			params.name = criteria.name
		}

		if (criteria.filePath) {
			query += " AND e.filePath CONTAINS $filePath"
			params.filePath = criteria.filePath
		}

		if (criteria.language) {
			query += " AND e.language = $language"
			params.language = criteria.language
		}

		query += " RETURN e"

		if (options?.limit !== undefined) {
			// FIX: 2026-02-19-reviewer-neo4j-cypher-numeric-normalization (TestAnalyzer)
			// Root cause: `limit` интерполировался в Cypher как строка без валидации → риск Cypher-injection.
			// Решение: нормализуем до integer и clamp диапазон перед интерполяцией.
			const safeLimit = normalizeCypherInt(options.limit, { defaultValue: 100, min: 1, max: 1000 })
			query += ` LIMIT ${safeLimit}`
		}

		const result = await this.connectionManager.executeRead<{ e: any }>(query, params)
		return result.map((r) => this.mapToCodeEntity(r.e))
	}

	/**
	 * Delete all entities and relationships for a file
	 */
	public async deleteEntitiesByFilePath(filePath: string): Promise<void> {
		const query = `
			MATCH (e:CodeEntity {filePath: $filePath})
			DETACH DELETE e
		`

		await this.connectionManager.executeWrite(query, { filePath })
	}

	/**
	 * Delete entities for multiple files
	 */
	public async deleteEntitiesByMultipleFilePaths(filePaths: string[]): Promise<void> {
		if (filePaths.length === 0) return

		const query = `
			UNWIND $filePaths AS filePath
			MATCH (e:CodeEntity {filePath: filePath})
			DETACH DELETE e
		`

		await this.connectionManager.executeWrite(query, { filePaths })
	}

	/**
	 * Clear all data from the graph
	 */
	public async clearAll(): Promise<void> {
		const query = `
			MATCH (e:CodeEntity)
			DETACH DELETE e
		`

		await this.connectionManager.executeWrite(query)
	}

	/**
	 * Check if initialized
	 */
	public async isInitialized(): Promise<boolean> {
		try {
			const constraints = await this.connectionManager.executeRead<{ name: string }>("SHOW CONSTRAINTS")
			return constraints.some((c) => c.name?.includes("entity_id_unique"))
		} catch (error) {
			return false
		}
	}

	/**
	 * Count total CodeEntity nodes.
	 */
	public async getCodeEntityCount(): Promise<number> {
		const result = await this.connectionManager.executeRead<{ count: number }>(
			"MATCH (e:CodeEntity) RETURN count(e) AS count",
		)
		return result[0]?.count ?? 0
	}

	/**
	 * Get statistics about the graph
	 */
	public async getStatistics(): Promise<{
		totalEntities: number
		totalRelationships: number
		entitiesByType: Record<EntityType, number>
		relationshipsByType: Record<RelationshipType, number>
	}> {
		// Get total entities
		const entityCount = await this.connectionManager.executeRead<{ count: number }>(
			"MATCH (e:CodeEntity) RETURN count(e) AS count",
		)

		// Get total relationships
		const relCount = await this.connectionManager.executeRead<{ count: number }>(
			"MATCH ()-[r]->() RETURN count(r) AS count",
		)

		// Get entities by type
		const entityTypes = await this.connectionManager.executeRead<{ type: EntityType; count: number }>(
			"MATCH (e:CodeEntity) RETURN e.type AS type, count(e) AS count",
		)

		// Get relationships by type
		const relTypes = await this.connectionManager.executeRead<{ type: string; count: number }>(
			"MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count",
		)

		const entitiesByType: Record<string, number> = {}
		for (const row of entityTypes) {
			entitiesByType[row.type] = row.count
		}

		const relationshipsByType: Record<string, number> = {}
		for (const row of relTypes) {
			relationshipsByType[row.type.toLowerCase()] = row.count
		}

		return {
			totalEntities: entityCount[0]?.count || 0,
			totalRelationships: relCount[0]?.count || 0,
			entitiesByType: entitiesByType as Record<EntityType, number>,
			relationshipsByType: relationshipsByType as Record<RelationshipType, number>,
		}
	}

	/**
	 * Map Neo4j node to CodeEntity
	 */
	private mapToCodeEntity(node: any): CodeEntity {
		const props = (node?.properties as Record<string, unknown> | undefined) ?? (node as Record<string, unknown>)

		return {
			id: props.id as string,
			type: props.type as EntityType,
			name: props.name as string,
			filePath: props.filePath as string,
			line: props.line as number,
			column: props.column as number,
			language: props.language as string,
			properties: this.parsePropertiesJson(props.propertiesJson, props.properties),
		}
	}

	/**
	 * Map Neo4j relationship to CodeRelationship
	 */
	private mapToCodeRelationship(rel: any, fromId: string, toId: string): CodeRelationship {
		const props = (rel?.properties as Record<string, unknown> | undefined) ?? (rel as Record<string, unknown>)

		return {
			fromId,
			toId,
			type: rel.type?.toLowerCase() || "references",
			properties: this.parsePropertiesJson(props.propertiesJson, props.properties),
		}
	}

	private serializePropertiesJson(properties: unknown): string {
		if (properties === undefined || properties === null) return "{}"
		if (typeof properties === "string") return properties
		try {
			return JSON.stringify(properties)
		} catch {
			return "{}"
		}
	}

	private parsePropertiesJson(propertiesJson: unknown, legacyProperties: unknown): Record<string, any> {
		if (typeof propertiesJson === "string" && propertiesJson.trim() !== "") {
			try {
				const parsed = JSON.parse(propertiesJson)
				if (parsed && typeof parsed === "object") {
					return parsed as Record<string, any>
				}
				return {}
			} catch {
				return {}
			}
		}

		if (legacyProperties && typeof legacyProperties === "object") {
			return legacyProperties as Record<string, any>
		}

		return {}
	}

	/**
	 * Sanitize relationship type for Cypher query
	 */
	private sanitizeRelationType(type: RelationshipType): string {
		return type.toUpperCase().replace(/[^A-Z_]/g, "_")
	}
}
