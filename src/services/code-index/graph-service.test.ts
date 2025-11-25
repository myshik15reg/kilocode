import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import neo4j from "neo4j-driver"
import { Neo4jGraphService, CodeNode, CodeEdge } from "./graph-service"

// Мокаем драйвер Neo4j
vi.mock("neo4j-driver", () => ({
	default: {
		driver: vi.fn(),
		auth: {
			basic: vi.fn(),
		},
	},
}))

describe("Neo4jGraphService", () => {
	let graphService: Neo4jGraphService
	let mockDriver: any
	let mockSession: any
	let mockRun: any

	beforeEach(() => {
		// Создаем моки для драйвера и сессии
		mockRun = vi.fn().mockResolvedValue({ records: [] })
		mockSession = {
			run: mockRun,
			close: vi.fn().mockResolvedValue(undefined),
		}
		mockDriver = {
			session: vi.fn().mockReturnValue(mockSession),
			close: vi.fn().mockResolvedValue(undefined),
		}

		// Настраиваем мок для neo4j.driver
		;(neo4j.driver as any).mockReturnValue(mockDriver)
		;(neo4j.auth.basic as any).mockReturnValue({})

		// Создаем экземпляр сервиса
		graphService = new Neo4jGraphService({
			uri: "bolt://localhost:7687",
			user: "neo4j",
			password: "password",
			database: "neo4j",
		})
	})

	afterEach(async () => {
		await graphService.close()
	})

	describe("addOrUpdateNode", () => {
		test("должен создавать новый узел с правильными параметрами", async () => {
			const node: CodeNode = {
				id: "test-node-1",
				labels: ["function"],
				properties: {
					name: "testFunction",
					filePath: "/path/to/file.ts",
					line: 10,
					complexity: 5,
					range: { start: { line: 10, character: 0 }, end: { line: 10, character: 10 } },
				},
			}

			await graphService.addOrUpdateNode(node)

			expect(mockDriver.session).toHaveBeenCalledWith({
				database: "neo4j",
			})
			expect(mockRun).toHaveBeenCalledWith("MERGE (n:Code {id: $id}) SET n += $properties, n.labels = $labels", {
				id: "test-node-1",
				properties: {
					name: "testFunction",
					filePath: "/path/to/file.ts",
					line: 10,
					complexity: 5,
					range: { start: { line: 10, character: 0 }, end: { line: 10, character: 10 } },
				},
				labels: ["function"],
			})
			expect(mockSession.close).toHaveBeenCalled()
		})

		test("должен использовать правильную метку для узла", async () => {
			const node: CodeNode = {
				id: "test-node-2",
				labels: ["class"],
				properties: {
					name: "TestClass",
					filePath: "/path/to/class.ts",
					range: { start: { line: 10, character: 0 }, end: { line: 10, character: 10 } },
				},
			}

			await graphService.addOrUpdateNode(node)

			expect(mockRun).toHaveBeenCalledWith("MERGE (n:Code {id: $id}) SET n += $properties, n.labels = $labels", {
				id: "test-node-2",
				properties: {
					name: "TestClass",
					filePath: "/path/to/class.ts",
					range: { start: { line: 10, character: 0 }, end: { line: 10, character: 10 } },
				},
				labels: ["class"],
			})
		})

		test("должен обрабатывать ошибки при добавлении узла", async () => {
			const node: CodeNode = {
				id: "test-node-3",
				labels: ["function"],
				properties: {
					name: "errorFunction",
					filePath: "/path/to/error.ts",
					range: { start: { line: 10, character: 0 }, end: { line: 10, character: 10 } },
				},
			}

			const error = new Error("Connection error")
			mockRun.mockRejectedValue(error)

			await expect(graphService.addOrUpdateNode(node)).rejects.toThrow("Connection error")
			expect(mockSession.close).toHaveBeenCalled()
		})
	})

	describe("addEdge", () => {
		test("должен создавать ребро с правильными параметрами", async () => {
			const edge: CodeEdge = {
				sourceId: "source-node",
				targetId: "target-node",
				type: "calls",
			}

			await graphService.addEdge(edge)

			expect(mockDriver.session).toHaveBeenCalledWith({
				database: "neo4j",
			})
			expect(mockRun).toHaveBeenCalledWith(
				"MATCH (a:Code {id: $sourceId}), (b:Code {id: $targetId}) MERGE (a)-[r:calls]->(b)",
				{
					sourceId: "source-node",
					targetId: "target-node",
				},
			)
			expect(mockSession.close).toHaveBeenCalled()
		})

		test("должен использовать правильный тип связи", async () => {
			const edge: CodeEdge = {
				sourceId: "source-node",
				targetId: "target-node",
				type: "imports",
			}

			await graphService.addEdge(edge)

			expect(mockRun).toHaveBeenCalledWith(
				"MATCH (a:Code {id: $sourceId}), (b:Code {id: $targetId}) MERGE (a)-[r:imports]->(b)",
				{
					sourceId: "source-node",
					targetId: "target-node",
				},
			)
		})

		test("должен обрабатывать ошибки при добавлении ребра", async () => {
			const edge: CodeEdge = {
				sourceId: "source-node",
				targetId: "target-node",
				type: "calls",
			}

			const error = new Error("Node not found")
			mockRun.mockRejectedValue(error)

			await expect(graphService.addEdge(edge)).rejects.toThrow("Node not found")
			expect(mockSession.close).toHaveBeenCalled()
		})
	})

	describe("searchByTerm", () => {
		test("должен возвращать результаты при совпадении", async () => {
			const mockRecord = {
				get: (key: string) => {
					if (key === "n") {
						return {
							properties: {
								id: "test-id",
								name: "testFunction",
								type: "function",
								filePath: "/path/to/file.ts",
							},
						}
					}
					if (key === "relationships") {
						return [
							{
								type: "CALLS",
								targetNode: {
									properties: {
										id: "called-id",
										name: "calledFunction",
										type: "function",
										filePath: "/path/to/other.ts",
									},
								},
							},
						]
					}
					return null
				},
			}

			mockRun.mockResolvedValue({ records: [mockRecord] })

			const results = await graphService.searchByTerm("test")

			expect(results).toHaveLength(1)
			expect(results[0].name).toBe("testFunction")
			expect(mockRun).toHaveBeenCalledWith(
				"MATCH (n:Code) WHERE n.name CONTAINS $term RETURN n.id as id, n.name as name, n.filePath as filePath, n.kind as kind, n.range as range",
				{ term: "test" },
			)
		})

		test("должен возвращать пустой массив, если совпадений нет", async () => {
			mockRun.mockResolvedValue({ records: [] })
			const results = await graphService.searchByTerm("nonexistent")
			expect(results).toHaveLength(0)
		})

		test("должен обрабатывать ошибки при поиске", async () => {
			const error = new Error("Search failed")
			mockRun.mockRejectedValue(error)
			await expect(graphService.searchByTerm("anything")).rejects.toThrow("Search failed")
		})
	})
})
