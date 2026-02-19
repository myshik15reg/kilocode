// npx vitest run src/services/code-index/embedders/__tests__/throttled-embedder.spec.ts

import { ThrottledEmbedder } from "../throttled-embedder"
import type { EmbeddingResponse, IEmbedder } from "../../interfaces"

describe("ThrottledEmbedder", () => {
	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	function createInnerEmbedder(calls: number[]): IEmbedder {
		const response: EmbeddingResponse = { embeddings: [[0]] }

		return {
			async createEmbeddings() {
				calls.push(Date.now())
				return response
			},
			async validateConfiguration() {
				return { valid: true }
			},
			get embedderInfo() {
				return { name: "openai" as const }
			},
		}
	}

	it("throttles sequential requests based on RPM", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(10_000))

		const calls: number[] = []
		const inner = createInnerEmbedder(calls)
		const throttled = new ThrottledEmbedder(inner, () => 60)

		await throttled.createEmbeddings(["a"])
		expect(calls).toEqual([10_000])

		const pending = throttled.createEmbeddings(["b"])

		// Not enough time: should not call inner yet
		await vi.advanceTimersByTimeAsync(999)
		expect(calls).toEqual([10_000])

		// Cross the 1s boundary
		await vi.advanceTimersByTimeAsync(1)
		await pending

		expect(calls).toHaveLength(2)
		expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(1000)
	})

	it("applies updated RPM without recreating the embedder", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(10_000))

		const calls: number[] = []
		const inner = createInnerEmbedder(calls)

		let rpm = 60
		const throttled = new ThrottledEmbedder(inner, () => rpm)

		await throttled.createEmbeddings(["a"])
		expect(calls).toEqual([10_000])

		// Update to 120 RPM => 500ms interval
		rpm = 120
		const pending = throttled.createEmbeddings(["b"])

		await vi.advanceTimersByTimeAsync(499)
		expect(calls).toEqual([10_000])

		await vi.advanceTimersByTimeAsync(1)
		await pending

		expect(calls).toHaveLength(2)
		expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(500)
	})
})
