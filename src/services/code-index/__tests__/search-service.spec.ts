import { describe, it, expect, vi, beforeEach } from "vitest"
import { CodeIndexSearchService } from "../search-service"
import { CodeIndexConfigManager } from "../config-manager"
import { CodeIndexStateManager } from "../state-manager"
import type { IEmbedder } from "../interfaces/embedder"
import type { IVectorStore } from "../interfaces/vector-store"
import { Neo4jGraphService } from "../graph-service"
import type { VectorStoreSearchResult } from "../interfaces"
import { TelemetryService } from "@roo-code/telemetry"

// Определяем интерфейс CodeSymbol для использования в тестах
interface CodeSymbol {
	id: string
	name: string
	filePath: string
	kind: string
	range?: {
		start: { line: number; character: number }
		end: { line: number; character: number }
	}
}

// Мокируем TelemetryService
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

describe("CodeIndexSearchService", () => {
	let mockConfigManager: any
	let mockStateManager: any
	let mockEmbedder: any
	let mockVectorStore: any
	let mockNeo4jService: any
	let searchService: CodeIndexSearchService

	beforeEach(() => {
		// Создаем моки для всех зависимостей
		mockConfigManager = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			currentSearchMinScore: 0.5,
			currentSearchMaxResults: 10,
		}

		mockStateManager = {
			getCurrentStatus: vi.fn().mockReturnValue({
				systemStatus: "Indexed",
				message: "Index up-to-date.",
				processedItems: 100,
				totalItems: 100,
				currentItemUnit: "blocks",
			}),
			setSystemState: vi.fn(),
		}

		mockEmbedder = {
			createEmbeddings: vi.fn(),
			embedderInfo: { name: "openai" },
		}

		mockVectorStore = {
			search: vi.fn(),
		}

		mockNeo4jService = {
			searchByTerm: vi.fn(),
		}

		// Создаем экземпляр сервиса с моками
		searchService = new CodeIndexSearchService(
			mockConfigManager,
			mockStateManager,
			mockEmbedder,
			mockVectorStore,
			mockNeo4jService,
		)
	})

	describe("searchIndex", () => {
		it("should throw error when feature is disabled", async () => {
			// Arrange
			mockConfigManager.isFeatureEnabled = false

			// Act & Assert
			await expect(searchService.searchIndex("test query")).rejects.toThrow(
				"Code index feature is disabled or not configured.",
			)
		})

		it("should throw error when feature is not configured", async () => {
			// Arrange
			mockConfigManager.isFeatureConfigured = false

			// Act & Assert
			await expect(searchService.searchIndex("test query")).rejects.toThrow(
				"Code index feature is disabled or not configured.",
			)
		})

		it("should throw error when index is not ready", async () => {
			// Arrange
			mockStateManager.getCurrentStatus.mockReturnValue({
				systemStatus: "Standby",
				message: "Ready.",
			})

			// Act & Assert
			await expect(searchService.searchIndex("test query")).rejects.toThrow(
				"Code index is not ready for search. Current state: Standby",
			)
		})

		it("should allow search during Indexing state", async () => {
			// Arrange
			mockStateManager.getCurrentStatus.mockReturnValue({
				systemStatus: "Indexing",
				message: "Indexing in progress...",
			})

			mockEmbedder.createEmbeddings.mockResolvedValue({
				embeddings: [[0.1, 0.2, 0.3]],
			})

			mockVectorStore.search.mockResolvedValue([])
			mockNeo4jService.searchByTerm.mockResolvedValue([])

			// Act & Assert - не должно выбрасывать ошибку
			await expect(searchService.searchIndex("test query")).resolves.toEqual([])
		})

		it("should throw error when embedding generation fails", async () => {
			// Arrange
			mockEmbedder.createEmbeddings.mockResolvedValue({
				embeddings: [], // Пустой массив означает ошибку
			})

			// Act & Assert
			await expect(searchService.searchIndex("test query")).rejects.toThrow(
				"Failed to generate embedding for query.",
			)
		})

		it("should call vectorStore.search and neo4jService.searchByTerm in parallel", async () => {
			// Arrange
			const query = "test query"
			const directoryPrefix = "/src"
			const embeddingVector = [0.1, 0.2, 0.3]
			const minScore = 0.5
			const maxResults = 10

			mockEmbedder.createEmbeddings.mockResolvedValue({
				embeddings: [embeddingVector],
			})

			const semanticResults: VectorStoreSearchResult[] = [
				{
					id: "1",
					score: 0.8,
					payload: {
						content: "semantic result 1",
						codeChunk: "semantic result 1",
						filePath: "/src/file1.ts",
						startLine: 1,
						endLine: 5,
					},
				},
			]

			const structuralResults: CodeSymbol[] = [
				{
					id: "2",
					name: "function test",
					filePath: "/src/file2.ts",
					kind: "function",
					range: {
						start: { line: 10, character: 0 },
						end: { line: 15, character: 0 },
					},
				},
			]

			mockVectorStore.search.mockResolvedValue(semanticResults)
			mockNeo4jService.searchByTerm.mockResolvedValue(structuralResults)

			// Act
			await searchService.searchIndex(query, directoryPrefix)

			// Assert
			expect(mockEmbedder.createEmbeddings).toHaveBeenCalledWith([query])
			expect(mockVectorStore.search).toHaveBeenCalledWith(embeddingVector, directoryPrefix, minScore, maxResults)
			expect(mockNeo4jService.searchByTerm).toHaveBeenCalledWith(query)

			// Проверяем, что оба метода были вызваны (Promise.all выполняет их параллельно)
			expect(mockVectorStore.search).toHaveBeenCalledTimes(1)
			expect(mockNeo4jService.searchByTerm).toHaveBeenCalledTimes(1)
		})

		it("should handle search errors and update state", async () => {
			// Arrange
			const searchError = new Error("Search failed")
			mockEmbedder.createEmbeddings.mockResolvedValue({
				embeddings: [[0.1, 0.2, 0.3]],
			})
			mockVectorStore.search.mockRejectedValue(searchError)

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			// Act & Assert
			await expect(searchService.searchIndex("test query")).rejects.toThrow("Search failed")

			// Assert
			expect(consoleErrorSpy).toHaveBeenCalledWith("[CodeIndexSearchService] Error during search:", searchError)
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Error", "Search failed: Search failed")
			expect(TelemetryService.instance.captureEvent).toHaveBeenCalledWith("CODE_INDEX_ERROR", {
				error: "Search failed",
				stack: searchError.stack,
				location: "searchIndex",
			})

			// Cleanup
			consoleErrorSpy.mockRestore()
		})
	})

	describe("combineAndRank", () => {
		it("should combine and rank results using RRF algorithm", () => {
			// Arrange
			const semanticResults: VectorStoreSearchResult[] = [
				{
					id: "1",
					score: 0.9,
					payload: {
						content: "semantic result 1",
						codeChunk: "semantic result 1",
						filePath: "/src/file1.ts",
						startLine: 1,
						endLine: 5,
					},
				},
				{
					id: "2",
					score: 0.8,
					payload: {
						content: "semantic result 2",
						codeChunk: "semantic result 2",
						filePath: "/src/file2.ts",
						startLine: 10,
						endLine: 15,
					},
				},
			]

			const structuralResults: CodeSymbol[] = [
				{
					id: "3",
					name: "function test",
					filePath: "/src/file1.ts", // Такой же файл, как в semanticResults[0]
					kind: "function",
					range: {
						start: { line: 20, character: 0 },
						end: { line: 25, character: 0 },
					},
				},
				{
					id: "4",
					name: "class TestClass",
					filePath: "/src/file3.ts", // Новый файл
					kind: "class",
					range: {
						start: { line: 30, character: 0 },
						end: { line: 40, character: 0 },
					},
				},
			]

			// Act - вызываем приватный метод через приведение типа
			const result = (searchService as any).combineAndRank(semanticResults, structuralResults)

			// Assert
			expect(result).toHaveLength(3) // 3 уникальных файла

			// Проверяем, что файл /src/file1.ts имеет наивысший рейтинг (присутствует в обоих результатах)
			const file1Result = result.find((r: any) => r.payload.filePath === "/src/file1.ts")
			expect(file1Result).toBeDefined()

			// Проверяем, что результаты отсортированы по RRF-скору
			const scores = result.map((r: any) => {
				// Вычисляем ожидаемый RRF-скор для проверки
				const semanticRank =
					semanticResults.findIndex((sr: any) => sr.payload.filePath === r.payload.filePath) + 1
				const structuralRank =
					structuralResults.findIndex((srr: any) => srr.filePath === r.payload.filePath) + 1
				const k = 60 // Константа RRF из кода
				let score = 0
				if (semanticRank > 0) score += 1 / (k + semanticRank)
				if (structuralRank > 0) score += 1 / (k + structuralRank)
				return score
			})

			// Проверяем, что результаты отсортированы по убыванию скора
			for (let i = 1; i < scores.length; i++) {
				expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i])
			}
		})

		it("should handle empty semantic results", () => {
			// Arrange
			const semanticResults: VectorStoreSearchResult[] = []
			const structuralResults: CodeSymbol[] = [
				{
					id: "1",
					name: "function test",
					filePath: "/src/file1.ts",
					kind: "function",
					range: {
						start: { line: 10, character: 0 },
						end: { line: 15, character: 0 },
					},
				},
			]

			// Act
			const result = (searchService as any).combineAndRank(semanticResults, structuralResults)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0].payload.filePath).toBe("/src/file1.ts")
			expect(result[0].payload.codeChunk).toBe("function test")
		})

		it("should handle empty structural results", () => {
			// Arrange
			const semanticResults: VectorStoreSearchResult[] = [
				{
					id: "1",
					score: 0.9,
					payload: {
						content: "semantic result 1",
						codeChunk: "semantic result 1",
						filePath: "/src/file1.ts",
						startLine: 1,
						endLine: 5,
					},
				},
			]
			const structuralResults: CodeSymbol[] = []

			// Act
			const result = (searchService as any).combineAndRank(semanticResults, structuralResults)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0].payload.filePath).toBe("/src/file1.ts")
			expect(result[0].payload.codeChunk).toBe("semantic result 1")
		})

		it("should handle duplicate file paths correctly", () => {
			// Arrange
			const semanticResults: VectorStoreSearchResult[] = [
				{
					id: "1",
					score: 0.9,
					payload: {
						content: "semantic content",
						codeChunk: "semantic content",
						filePath: "/src/duplicate.ts",
						startLine: 1,
						endLine: 5,
					},
				},
			]
			const structuralResults: CodeSymbol[] = [
				{
					id: "2",
					name: "structural function",
					filePath: "/src/duplicate.ts", // Тот же файл
					kind: "function",
					range: {
						start: { line: 10, character: 0 },
						end: { line: 15, character: 0 },
					},
				},
			]

			// Act
			const result = (searchService as any).combineAndRank(semanticResults, structuralResults)

			// Assert
			expect(result).toHaveLength(1) // Только один результат для дублирующегося файла
			expect(result[0].payload.filePath).toBe("/src/duplicate.ts")
			// Семантический контент должен быть сохранен
			expect(result[0].payload.codeChunk).toBe("semantic content")
		})

		it("should preserve original chunk data for semantic results", () => {
			// Arrange
			const semanticResults: VectorStoreSearchResult[] = [
				{
					id: "1",
					score: 0.9,
					payload: {
						content: "semantic content",
						codeChunk: "semantic content",
						filePath: "/src/file1.ts",
						startLine: 1,
						endLine: 5,
					},
				},
			]
			const structuralResults: CodeSymbol[] = []

			// Act
			const result = (searchService as any).combineAndRank(semanticResults, structuralResults)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0].payload.codeChunk).toBe("semantic content")
			expect(result[0].payload.filePath).toBe("/src/file1.ts")
			expect(result[0].payload.startLine).toBe(1)
			expect(result[0].payload.endLine).toBe(5)
		})

		it("should create proper chunk structure for structural-only results", () => {
			// Arrange
			const semanticResults: VectorStoreSearchResult[] = []
			const structuralResults: CodeSymbol[] = [
				{
					id: "1",
					name: "testFunction",
					filePath: "/src/structural.ts",
					kind: "function",
					range: {
						start: { line: 10, character: 0 },
						end: { line: 20, character: 0 },
					},
				},
			]

			// Act
			const result = (searchService as any).combineAndRank(semanticResults, structuralResults)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0].payload.codeChunk).toBe("testFunction")
			expect(result[0].payload.filePath).toBe("/src/structural.ts")
			expect(result[0].payload.range).toEqual({
				start: { line: 10, character: 0 },
				end: { line: 20, character: 0 },
			})
		})
	})

	describe("integration tests", () => {
		it("should perform complete search workflow", async () => {
			// Arrange
			const query = "test function"
			const embeddingVector = [0.1, 0.2, 0.3]

			mockEmbedder.createEmbeddings.mockResolvedValue({
				embeddings: [embeddingVector],
			})

			const semanticResults: VectorStoreSearchResult[] = [
				{
					id: "1",
					score: 0.9,
					payload: {
						content: "function testFunction() {}",
						codeChunk: "function testFunction() {}",
						filePath: "/src/test.ts",
						startLine: 1,
						endLine: 5,
					},
				},
			]

			const structuralResults: CodeSymbol[] = [
				{
					id: "2",
					name: "testFunction",
					filePath: "/src/test.ts",
					kind: "function",
					range: {
						start: { line: 1, character: 0 },
						end: { line: 5, character: 0 },
					},
				},
				{
					id: "3",
					name: "anotherFunction",
					filePath: "/src/other.ts",
					kind: "function",
					range: {
						start: { line: 10, character: 0 },
						end: { line: 15, character: 0 },
					},
				},
			]

			mockVectorStore.search.mockResolvedValue(semanticResults)
			mockNeo4jService.searchByTerm.mockResolvedValue(structuralResults)

			// Act
			const result = await searchService.searchIndex(query)

			// Assert
			expect(result).toHaveLength(2) // Два уникальных файла
			expect(mockEmbedder.createEmbeddings).toHaveBeenCalledWith([query])
			expect(mockVectorStore.search).toHaveBeenCalledWith(embeddingVector, undefined, 0.5, 10)
			expect(mockNeo4jService.searchByTerm).toHaveBeenCalledWith(query)

			// Проверяем, что /src/test.ts имеет более высокий рейтинг (присутствует в обоих результатах)
			const testFileResult = result.find((r: any) => r.payload.filePath === "/src/test.ts")
			const otherFileResult = result.find((r: any) => r.payload.filePath === "/src/other.ts")

			expect(testFileResult).toBeDefined()
			expect(otherFileResult).toBeDefined()

			// test.ts должен быть первым в результатах из-за более высокого RRF-скора
			if (result[0]?.payload) {
				expect(result[0].payload.filePath).toBe("/src/test.ts")
			}
			if (result[1]?.payload) {
				expect(result[1].payload.filePath).toBe("/src/other.ts")
			}
		})

		it("should handle directory prefix filtering", async () => {
			// Arrange
			const query = "test"
			const directoryPrefix = "/src/components"
			const embeddingVector = [0.1, 0.2, 0.3]

			mockEmbedder.createEmbeddings.mockResolvedValue({
				embeddings: [embeddingVector],
			})

			mockVectorStore.search.mockResolvedValue([])
			mockNeo4jService.searchByTerm.mockResolvedValue([])

			// Act
			await searchService.searchIndex(query, directoryPrefix)

			// Assert
			expect(mockVectorStore.search).toHaveBeenCalledWith(embeddingVector, directoryPrefix, 0.5, 10)
		})
	})
})
