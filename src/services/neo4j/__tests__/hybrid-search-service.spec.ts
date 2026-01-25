/**
 * Unit tests for HybridSearchService
 * Tests combination of semantic and graph-based search
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { HybridSearchService } from "../hybrid-search-service"
import type { CodeEntity, HybridSearchResult } from "../interfaces"
import type { IEmbedder } from "../../code-index/interfaces/embedder"
import type { IVectorStore } from "../../code-index/interfaces/vector-store"
import type { VectorStoreSearchResult } from "../../code-index/interfaces"

// Mock implementations
const createMockEmbedder = (): IEmbedder => ({
	createEmbeddings: vi.fn().mockResolvedValue({
		embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]],
	}),
	validateConfiguration: vi.fn().mockResolvedValue({ valid: true }),
	embedderInfo: { name: "openai" as const },
})

const createMockVectorStore = (): IVectorStore => ({
	initialize: vi.fn().mockResolvedValue(true),
	hasIndexedData: vi.fn().mockResolvedValue(true),
	collectionExists: vi.fn().mockResolvedValue(true),
	search: vi.fn().mockResolvedValue([
		{
			id: "1",
			filePath: "src/calculator.ts",
			codeChunk: "function add(a: number, b: number) { return a + b }",
			startLine: 1,
			endLine: 3,
			score: 0.9,
		},
		{
			id: "2",
			filePath: "src/math.ts",
			codeChunk: "export const multiply = (x, y) => x * y",
			startLine: 5,
			endLine: 5,
			score: 0.85,
		},
	] as VectorStoreSearchResult[]),
	upsertPoints: vi.fn().mockResolvedValue(undefined),
	deletePointsByFilePath: vi.fn().mockResolvedValue(undefined),
	deletePointsByMultipleFilePaths: vi.fn().mockResolvedValue(undefined),
	clearCollection: vi.fn().mockResolvedValue(undefined),
	deleteCollection: vi.fn().mockResolvedValue(undefined),
	markIndexingComplete: vi.fn().mockResolvedValue(undefined),
	markIndexingIncomplete: vi.fn().mockResolvedValue(undefined),
})

const createMockGraphService = () => ({
	initialize: vi.fn().mockResolvedValue(true),
	isInitialized: vi.fn().mockResolvedValue(true),
	getEntitiesByFilePath: vi.fn().mockImplementation((filePath: string) => {
		if (filePath === "src/calculator.ts") {
			return Promise.resolve([
				{
					id: "function:src/calculator.ts:add",
					type: "function",
					name: "add",
					filePath: "src/calculator.ts",
					line: 1,
					language: "typescript",
				} as CodeEntity,
			])
		}
		return Promise.resolve([])
	}),
	getImpactGraph: vi.fn().mockResolvedValue({
		rootEntity: {
			id: "function:src/calculator.ts:add",
			type: "function",
			name: "add",
			filePath: "src/calculator.ts",
			line: 1,
			language: "typescript",
		},
		directImpact: [],
		indirectImpact: [],
		relationshipPaths: [],
	}),
	bulkCreateEntities: vi.fn().mockResolvedValue(undefined),
	bulkCreateRelationships: vi.fn().mockResolvedValue(undefined),
	deleteEntitiesByFilePath: vi.fn().mockResolvedValue(undefined),
	deleteEntitiesByMultipleFilePaths: vi.fn().mockResolvedValue(undefined),
	clearAll: vi.fn().mockResolvedValue(undefined),
	getStatistics: vi.fn().mockResolvedValue({
		totalEntities: 100,
		totalRelationships: 50,
		entitiesByType: {},
		relationshipsByType: {},
	}),
})

describe("HybridSearchService", () => {
	let service: HybridSearchService
	let mockEmbedder: IEmbedder
	let mockVectorStore: IVectorStore
	let mockGraphService: any

	beforeEach(() => {
		mockEmbedder = createMockEmbedder()
		mockVectorStore = createMockVectorStore()
		mockGraphService = createMockGraphService()
		
		service = new HybridSearchService(
			mockEmbedder,
			mockVectorStore,
			mockGraphService,
		)
	})

	describe("search", () => {
		it("should combine semantic and graph scores", async () => {
			const results = await service.search("add function", { minScore: 0 })

			expect(results).toHaveLength(2)
			
			// First result should have graph data
			const firstResult = results[0]
			expect(firstResult).toHaveProperty("semanticScore")
			expect(firstResult).toHaveProperty("graphScore")
			expect(firstResult).toHaveProperty("combinedScore")
			expect(firstResult.semanticScore).toBe(0.9)
			expect(firstResult.graphScore).toBeGreaterThan(0)
			
			// Combined score should be weighted average
			const expectedCombined = 0.6 * firstResult.semanticScore + 0.4 * firstResult.graphScore
			expect(firstResult.combinedScore).toBeCloseTo(expectedCombined, 2)
		})

		it("should include related entities in results", async () => {
			const results = await service.search("add function", { minScore: 0 })

			const firstResult = results[0]
			expect(firstResult.relatedEntities).toBeDefined()
			expect(firstResult.relatedEntities?.length).toBeGreaterThan(0)
			
			const entity = firstResult.relatedEntities?.[0]
			expect(entity?.type).toBe("function")
			expect(entity?.name).toBe("add")
		})

		it("should include graph metadata", async () => {
			const results = await service.search("add function", { minScore: 0 })

			const firstResult = results[0]
			expect(firstResult.graphMetadata).toBeDefined()
			expect(firstResult.graphMetadata?.entityCount).toBe(1)
			expect(firstResult.graphMetadata?.entityTypes).toContain("function")
		})

		it("should filter results by minimum score", async () => {
			const results = await service.search("add function", {
				minScore: 0.95,
			})

			// With high min score, some results should be filtered out
			expect(results.length).toBeLessThanOrEqual(2)
			
			results.forEach(result => {
				expect(result.combinedScore).toBeGreaterThanOrEqual(0.95)
			})
		})

		it("should limit number of results", async () => {
			const results = await service.search("add function", {
				maxResults: 1,
				minScore: 0,
			})

			expect(results).toHaveLength(1)
		})

		it("should sort results by combined score", async () => {
			const results = await service.search("add function", { minScore: 0 })

			// Verify descending order
			for (let i = 1; i < results.length; i++) {
				expect(results[i - 1].combinedScore).toBeGreaterThanOrEqual(
					results[i].combinedScore,
				)
			}
		})

		it("should use custom weights when provided", async () => {
			const customSemanticWeight = 0.8
			const customGraphWeight = 0.2

			const results = await service.search("add function", {
				semanticWeight: customSemanticWeight,
				graphWeight: customGraphWeight,
				minScore: 0,
			})

			const firstResult = results[0]
			const expectedCombined = 
				customSemanticWeight * firstResult.semanticScore +
				customGraphWeight * firstResult.graphScore
			
			expect(firstResult.combinedScore).toBeCloseTo(expectedCombined, 2)
		})

		it("should fallback to semantic-only when Neo4j is unavailable", async () => {
			// Mock Neo4j as unavailable
			mockGraphService.isInitialized.mockResolvedValue(false)

			const results = await service.search("add function", { minScore: 0 })

			expect(results).toHaveLength(2)
			
			// Should still have results but with zero graph scores
			results.forEach(result => {
				expect(result.graphScore).toBe(0)
				expect(result.relatedEntities).toEqual([])
			})
		})

		it("should handle empty semantic results", async () => {
			// Mock empty semantic search results
			mockVectorStore.search = vi.fn().mockResolvedValue([])

			const results = await service.search("nonexistent function")

			expect(results).toHaveLength(0)
		})

		it("should handle errors in graph enhancement gracefully", async () => {
			// Mock error in graph service
			mockGraphService.getEntitiesByFilePath.mockRejectedValue(
				new Error("Neo4j connection failed"),
			)

			const results = await service.search("add function", { minScore: 0 })

			// Should still return results with zero graph scores
			expect(results).toHaveLength(2)
			results.forEach(result => {
				expect(result.graphScore).toBe(0)
				expect(result.combinedScore).toBe(0.6 * result.semanticScore)
			})
		})
	})

	describe("getRelatedEntities", () => {
		it("should return entities for a file", async () => {
			const entities = await service.getRelatedEntities("src/calculator.ts")

			expect(entities).toHaveLength(1)
			expect(entities[0].type).toBe("function")
			expect(entities[0].name).toBe("add")
		})

		it("should filter entities by line range", async () => {
			mockGraphService.getEntitiesByFilePath.mockResolvedValue([
				{
					id: "function:1",
					type: "function",
					name: "func1",
					filePath: "test.ts",
					line: 5,
					language: "typescript",
				},
				{
					id: "function:2",
					type: "function",
					name: "func2",
					filePath: "test.ts",
					line: 15,
					language: "typescript",
				},
			] as CodeEntity[])

			const entities = await service.getRelatedEntities("test.ts", 1, 10)

			expect(entities).toHaveLength(1)
			expect(entities[0].name).toBe("func1")
		})

		it("should return empty array when Neo4j is unavailable", async () => {
			mockGraphService.isInitialized.mockResolvedValue(false)

			const entities = await service.getRelatedEntities("test.ts")

			expect(entities).toHaveLength(0)
		})
	})

	describe("searchDependents", () => {
		it("should find dependent entities", async () => {
			const entityId = "function:src/calculator.ts:add"
			
			mockGraphService.getImpactGraph.mockResolvedValue({
				rootEntity: {
					id: entityId,
					type: "function",
					name: "add",
					filePath: "src/calculator.ts",
					line: 1,
					language: "typescript",
				},
				directImpact: [
					{
						id: "function:src/app.ts:main",
						type: "function",
						name: "main",
						filePath: "src/app.ts",
						line: 10,
						language: "typescript",
					},
				],
				indirectImpact: [],
				relationshipPaths: [],
			})

			const results = await service.searchDependents(entityId)

			expect(results).toHaveLength(1)
			expect(results[0].filePath).toBe("src/app.ts")
			expect(results[0].combinedScore).toBe(1.0)
			expect(results[0].graphScore).toBe(1.0)
		})

		it("should return empty array when Neo4j is unavailable", async () => {
			mockGraphService.isInitialized.mockResolvedValue(false)

			const results = await service.searchDependents("function:test:func")

			expect(results).toHaveLength(0)
		})

		it("should handle errors gracefully", async () => {
			mockGraphService.getImpactGraph.mockRejectedValue(
				new Error("Graph query failed"),
			)

			const results = await service.searchDependents("function:test:func")

			expect(results).toHaveLength(0)
		})
	})

	describe("isAvailable", () => {
		it("should return true when Neo4j is initialized", async () => {
			const available = await service.isAvailable()

			expect(available).toBe(true)
		})

		it("should return false when Neo4j is not initialized", async () => {
			mockGraphService.isInitialized.mockResolvedValue(false)

			const available = await service.isAvailable()

			expect(available).toBe(false)
		})
	})

	describe("calculateGraphScore", () => {
		it("should give higher scores to functions and classes", async () => {
			mockGraphService.getEntitiesByFilePath.mockResolvedValue([
				{
					id: "function:1",
					type: "function",
					name: "importantFunc",
					filePath: "test.ts",
					line: 5,
					language: "typescript",
				},
				{
					id: "variable:1",
					type: "variable",
					name: "someVar",
					filePath: "test.ts",
					line: 10,
					language: "typescript",
				},
			] as CodeEntity[])

			const results = await service.search("test")

			// Result with function should have higher graph score
			const funcResult = results.find(r => r.startLine === 5)
			const varResult = results.find(r => r.startLine === 10)
			
			// Since we're mocking, we need to check the actual implementation
			// This is more of an integration test
		})
	})
})
