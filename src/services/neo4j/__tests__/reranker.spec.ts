import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { VectorStoreSearchResult } from "../../code-index/interfaces"
import { BgeReranker } from "../reranker"

describe("BgeReranker", () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		vi.restoreAllMocks()
	})

	afterEach(() => {
		;(globalThis as { fetch?: unknown }).fetch = originalFetch
	})

	it("should apply rerank scores and preserve normalized payload fields", async () => {
		;(globalThis as { fetch?: unknown }).fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [{ index: 0, relevance_score: 0.91 }],
			}),
		})

		const reranker = new BgeReranker({
			enabled: true,
			baseUrl: "https://rerank.local/",
			modelId: "bge-reranker-v2",
		})

		const candidates: VectorStoreSearchResult[] = [
			{
				id: "1",
				score: 0.5,
				filePath: "",
				codeChunk: "",
				startLine: 0,
				endLine: 0,
				payload: {
					filePath: "src/reranker.ts",
					codeChunk: "export const rerank = true",
					startLine: 12,
					endLine: 12,
					code_snippet: "export const rerank = true",
					module: "src/reranker.ts",
					neo4j_id: "file:src/reranker.ts",
				},
			},
		]

		const results = await reranker.rerank("rerank", candidates, 1)

		expect(results).toHaveLength(1)
		expect(results[0].score).toBe(0.91)
		expect(results[0].payload?.vector_score).toBe(0.5)
		expect(results[0].payload?.rerank_score).toBe(0.91)
		expect(results[0].payload?.filePath).toBe("src/reranker.ts")
		expect(results[0].payload?.codeChunk).toBe("export const rerank = true")
		expect(results[0].payload?.code_snippet).toBe("export const rerank = true")
		expect(results[0].payload?.module).toBe("src/reranker.ts")
		expect(results[0].payload?.neo4j_id).toBe("file:src/reranker.ts")
	})

	it("should throw when rerank response has no usable scores", async () => {
		;(globalThis as { fetch?: unknown }).fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ data: [] }),
		})

		const reranker = new BgeReranker({
			enabled: true,
			baseUrl: "https://rerank.local/",
			modelId: "bge-reranker-v2",
		})

		await expect(
			reranker.rerank(
				"query",
				[
					{
						id: "1",
						score: 0.5,
						filePath: "src/a.ts",
						codeChunk: "a",
						startLine: 1,
						endLine: 1,
					},
				],
				1,
			),
		).rejects.toThrow("Rerank response contained no usable scores")
	})
})
