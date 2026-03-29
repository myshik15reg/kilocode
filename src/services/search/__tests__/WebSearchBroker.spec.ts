// kilocode_change - new file
import { WebSearchBroker } from "../WebSearchBroker"

describe("WebSearchBroker", () => {
	it("returns online results when provider responds", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				Heading: "MCP",
				AbstractText: "Model Context Protocol overview",
				AbstractURL: "https://example.com/mcp",
				RelatedTopics: [],
			}),
		} as any)
		const broker = new WebSearchBroker(fetchMock as any)

		const result = await broker.search("mcp overview")

		expect(result.online).toBe(true)
		expect(result.results[0]?.title).toBe("MCP")
		expect(result.summary).toContain("mcp overview")
	})

	it("returns offline fallback when provider fails", async () => {
		const broker = new WebSearchBroker(vi.fn().mockRejectedValue(new Error("offline")) as any)

		const result = await broker.search("latest http2 guidance")

		expect(result.online).toBe(false)
		expect(result.notice).toContain("No internet connection")
		expect(result.results[0]?.source).toBe("offline")
	})

	it("falls back quickly when the provider hangs until abort", async () => {
		vi.useFakeTimers()
		const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
			return new Promise((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					const error = new Error("aborted")
					error.name = "AbortError"
					reject(error)
				})
			})
		})
		const broker = new WebSearchBroker(fetchMock as any)

		const resultPromise = broker.search("mcp http2 timeout")
		await vi.advanceTimersByTimeAsync(3_600)
		const result = await resultPromise

		expect(result.online).toBe(false)
		expect(result.notice).toContain("timed out")
		expect(result.results[0]?.source).toBe("offline")
		vi.useRealTimers()
	})
})
