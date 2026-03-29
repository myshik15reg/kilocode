import neo4j, { Driver } from "neo4j-driver"

export type Neo4jCfg = {
	uri: string
	username: string
	password: string
	database: string
}

export type CodeEntity = {
	id: string
	type: string
	name: string
	filePath: string
	line: number
	column?: number
	language?: string
	properties?: Record<string, any>
}

export type CodeRel = {
	id: string
	type: string
	fromId: string
	toId: string
	properties?: Record<string, any>
}

export async function connectNeo4j(cfg: Neo4jCfg): Promise<Driver> {
	const driver = neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.username, cfg.password), {
		disableLosslessIntegers: true,
	})
	await driver.verifyConnectivity()
	return driver
}

export async function initSchema(driver: Driver, cfg: Neo4jCfg): Promise<void> {
	const session = driver.session({ database: cfg.database })
	try {
		// constraints / indexes
		await session.executeWrite((tx) =>
			tx.run("CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:CodeEntity) REQUIRE e.id IS UNIQUE"),
		)
		await session.executeWrite((tx) =>
			tx.run("CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:CodeEntity) ON (e.type)"),
		)
		await session.executeWrite((tx) =>
			tx.run("CREATE INDEX entity_filepath_idx IF NOT EXISTS FOR (e:CodeEntity) ON (e.filePath)"),
		)
		await session.executeWrite((tx) =>
			tx.run("CREATE INDEX entity_name_idx IF NOT EXISTS FOR (e:CodeEntity) ON (e.name)"),
		)
	} finally {
		await session.close()
	}
}

export async function clearAll(driver: Driver, cfg: Neo4jCfg): Promise<void> {
	const session = driver.session({ database: cfg.database })
	try {
		await session.executeWrite((tx) => tx.run("MATCH (e:CodeEntity) DETACH DELETE e"))
	} finally {
		await session.close()
	}
}

export async function deleteByFilePaths(driver: Driver, cfg: Neo4jCfg, filePaths: string[]): Promise<void> {
	if (filePaths.length === 0) return
	const session = driver.session({ database: cfg.database })
	try {
		await session.executeWrite((tx) =>
			tx.run("UNWIND $filePaths AS filePath MATCH (e:CodeEntity {filePath: filePath}) DETACH DELETE e", {
				filePaths,
			}),
		)
	} finally {
		await session.close()
	}
}

export async function bulkUpsert(
	driver: Driver,
	cfg: Neo4jCfg,
	entities: CodeEntity[],
	rels: CodeRel[],
): Promise<void> {
	const session = driver.session({ database: cfg.database })
	try {
		if (entities.length > 0) {
			const params = entities.map((e) => ({
				id: e.id,
				type: e.type,
				name: e.name,
				filePath: e.filePath,
				line: e.line,
				column: e.column ?? null,
				language: e.language ?? null,
				propertiesJson: JSON.stringify(e.properties ?? {}),
			}))
			await session.executeWrite((tx) =>
				tx.run(
					"UNWIND $entities AS entity MERGE (e:CodeEntity {id: entity.id}) SET e.type=entity.type, e.name=entity.name, e.filePath=entity.filePath, e.line=entity.line, e.column=entity.column, e.language=entity.language, e.propertiesJson=entity.propertiesJson, e.updatedAt=datetime()",
					{ entities: params },
				),
			)
		}

		// Group by type to reduce query planning overhead
		const byType = new Map<string, CodeRel[]>()
		for (const r of rels) {
			const arr = byType.get(r.type) ?? []
			arr.push(r)
			byType.set(r.type, arr)
		}

		for (const [type, items] of byType.entries()) {
			const cypherType = sanitizeRelType(type)
			const params = items.map((r) => ({
				fromId: r.fromId,
				toId: r.toId,
				propertiesJson: JSON.stringify(r.properties ?? {}),
			}))
			await session.executeWrite((tx) =>
				tx.run(
					`UNWIND $relationships AS rel MATCH (from:CodeEntity {id: rel.fromId}) MATCH (to:CodeEntity {id: rel.toId}) MERGE (from)-[r:${cypherType}]->(to) SET r.propertiesJson=rel.propertiesJson, r.updatedAt=datetime()`,
					{ relationships: params },
				),
			)
		}
	} finally {
		await session.close()
	}
}

export async function stats(driver: Driver, cfg: Neo4jCfg): Promise<any> {
	const session = driver.session({ database: cfg.database })
	try {
		const [entitiesRes, relsRes, entitiesByTypeRes, relsByTypeRes] = await Promise.all([
			session.executeRead((tx) => tx.run("MATCH (e:CodeEntity) RETURN count(e) AS count")),
			session.executeRead((tx) => tx.run("MATCH ()-[r]->() RETURN count(r) AS count")),
			session.executeRead((tx) => tx.run("MATCH (e:CodeEntity) RETURN e.type AS type, count(e) AS count")),
			session.executeRead((tx) => tx.run("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count")),
		])

		return {
			totalEntities: entitiesRes.records[0]?.get("count") ?? 0,
			totalRelationships: relsRes.records[0]?.get("count") ?? 0,
			entitiesByType: Object.fromEntries(entitiesByTypeRes.records.map((r) => [r.get("type"), r.get("count")])),
			relationshipsByType: Object.fromEntries(
				relsByTypeRes.records.map((r) => [String(r.get("type")).toLowerCase(), r.get("count")]),
			),
		}
	} finally {
		await session.close()
	}
}

export async function getEntitiesByFilePath(driver: Driver, cfg: Neo4jCfg, filePath: string): Promise<CodeEntity[]> {
	const session = driver.session({ database: cfg.database })
	try {
		const res = await session.executeRead((tx) =>
			tx.run("MATCH (e:CodeEntity {filePath: $filePath}) RETURN e", { filePath }),
		)
		return res.records.map((r) => {
			const node = r.get("e")
			const props = node.properties
			return {
				id: props.id,
				type: props.type,
				name: props.name,
				filePath: props.filePath,
				line: props.line,
				column: props.column ?? undefined,
				language: props.language ?? undefined,
				properties: safeJsonParse(props.propertiesJson) ?? {},
			}
		})
	} finally {
		await session.close()
	}
}

function sanitizeRelType(type: string): string {
	return type.toUpperCase().replace(/[^A-Z_]/g, "_")
}

function safeJsonParse(input: any): any {
	if (typeof input !== "string") return null
	try {
		return JSON.parse(input)
	} catch {
		return null
	}
}
