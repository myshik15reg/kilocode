// src/services/code-index/graph-service.ts

import neo4j, { Driver, auth } from "neo4j-driver"
// import { CodeSymbol } from '../../code-symbols/types'; // Используем CodeSymbol, как в search-service.ts
interface CodeSymbol {
	id: string
	name: string
	filePath: string
	kind: string
	range: any
}

// Определения для узлов и связей
export interface CodeNode {
	id: string
	labels: string[]
	properties: Record<string, any>
}
export interface CodeEdge {
	sourceId: string
	targetId: string
	type: string
}

export class Neo4jGraphService {
	private driver: Driver
	private database: string

	constructor(config: { uri: string; user: string; password: string; database: string }) {
		this.driver = neo4j.driver(config.uri, auth.basic(config.user, config.password))
		this.database = config.database
	}

	async addOrUpdateNode(node: CodeNode): Promise<void> {
		const session = this.driver.session({ database: this.database })
		try {
			// Используем MERGE для создания узла, если он не существует, или обновления, если существует.
			await session.run("MERGE (n:Code {id: $id}) SET n += $properties, n.labels = $labels", {
				id: node.id,
				properties: node.properties,
				labels: node.labels,
			})
		} finally {
			await session.close()
		}
	}

	async addEdge(edge: CodeEdge): Promise<void> {
		const session = this.driver.session({ database: this.database })
		try {
			// Ищем исходный и целевой узлы и создаем между ними связь
			await session.run(
				"MATCH (a:Code {id: $sourceId}), (b:Code {id: $targetId}) MERGE (a)-[r:" + edge.type + "]->(b)",
				{ sourceId: edge.sourceId, targetId: edge.targetId },
			)
		} finally {
			await session.close()
		}
	}

	/**
	 * Метод для структурного поиска по текстовому запросу.
	 * Ищет прямые совпадения в графе (имена функций, классов и т.д.).
	 * @param term - Текстовый запрос пользователя.
	 * @returns Массив найденных в графе узлов.
	 */
	async searchByTerm(term: string): Promise<CodeSymbol[]> {
		const session = this.driver.session({ database: this.database })
		try {
			const result = await session.run(
				"MATCH (n:Code) WHERE n.name CONTAINS $term RETURN n.id as id, n.name as name, n.filePath as filePath, n.kind as kind, n.range as range",
				{ term },
			)

			return result.records.map((record) => ({
				id: record.get("id"),
				name: record.get("name"),
				filePath: record.get("filePath"),
				kind: record.get("kind"),
				range: record.get("range"),
			}))
		} finally {
			await session.close()
		}
	}

	async close(): Promise<void> {
		await this.driver.close()
	}
}
