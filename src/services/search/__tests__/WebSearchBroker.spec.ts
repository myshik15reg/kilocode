import { describe, expect, it, vi } from "vitest"

import { WebSearchBroker, type WebSearchProvider, type WebSearchProviderResult } from "../WebSearchBroker"

function createProvider(
	name: string,
	result: WebSearchProviderResult | Error,
	options?: {
		auto?: boolean
		isConfigured?: () => boolean
	},
): WebSearchProvider {
	return {
		name,
		auto: options?.auto,
		isConfigured: options?.isConfigured,
		search: vi.fn(async () => {
			if (result instanceof Error) {
				throw result
			}

			return result
		}),
	}
}

describe("WebSearchBroker", () => {
	it("uses the auto provider chain in order and returns fallback trace metadata", async () => {
		const firecrawl = createProvider("firecrawl", new Error("boom"))
		const tavily = createProvider("tavily", { results: [] })
		const exa = createProvider("exa", {
			results: [
				{
					title: "Exa result",
					url: "https://exa.test/result",
					snippet: "Result from Exa",
					source: "online",
				},
			],
		})
		const duckduckgo = createProvider("duckduckgo", {
			results: [
				{
					title: "DuckDuckGo result",
					url: "https://duck.test/result",
					snippet: "Should not be used",
					source: "online",
				},
			],
		})
		const broker = new WebSearchBroker({
			providers: [firecrawl, tavily, exa, duckduckgo],
			fetchImpl: vi.fn() as any,
		})

		const result = await broker.search("agentic web search")

		expect(result.mode).toBe("auto")
		expect(result.provider).toBe("exa")
		expect(result.online).toBe(true)
		expect(result.notice).toContain("exa")
		expect(result.results[0]?.title).toBe("Exa result")
		expect(result.fallbackTrace).toEqual([
			{ provider: "firecrawl", outcome: "error", detail: "boom" },
			{ provider: "tavily", outcome: "empty" },
			{ provider: "exa", outcome: "success" },
		])
		expect((firecrawl.search as any).mock.invocationCallOrder[0]).toBeLessThan(
			(tavily.search as any).mock.invocationCallOrder[0],
		)
		expect((tavily.search as any).mock.invocationCallOrder[0]).toBeLessThan(
			(exa.search as any).mock.invocationCallOrder[0],
		)
		expect(duckduckgo.search).not.toHaveBeenCalled()
	})

	it("fails loudly for an explicit provider without silent fallback", async () => {
		const firecrawl = createProvider("firecrawl", new Error("provider unavailable"))
		const duckduckgo = createProvider("duckduckgo", {
			results: [
				{
					title: "DuckDuckGo result",
					url: "https://duck.test/result",
					snippet: "Should not be used",
					source: "online",
				},
			],
		})
		const broker = new WebSearchBroker({
			providers: [firecrawl, duckduckgo],
			fetchImpl: vi.fn() as any,
		})

		await expect(broker.search("agentic web search", { provider: "firecrawl" })).rejects.toThrow(
			'Web search provider "firecrawl" failed: provider unavailable',
		)
		expect(duckduckgo.search).not.toHaveBeenCalled()
	})

	it("excludes custom providers from the auto chain", async () => {
		const custom = createProvider(
			"custom",
			{
				results: [
					{
						title: "Custom result",
						url: "https://custom.test/result",
						snippet: "Should not be used in auto mode",
						source: "online",
					},
				],
			},
			{ auto: false },
		)
		const duckduckgo = createProvider("duckduckgo", {
			results: [
				{
					title: "DuckDuckGo result",
					url: "https://duck.test/result",
					snippet: "Fallback result",
					source: "online",
				},
			],
		})
		const broker = new WebSearchBroker({
			providers: [custom, duckduckgo],
			fetchImpl: vi.fn() as any,
		})

		const result = await broker.search("agentic web search")

		expect(result.provider).toBe("duckduckgo")
		expect(custom.search).not.toHaveBeenCalled()
		expect(result.fallbackTrace).toEqual([{ provider: "duckduckgo", outcome: "success" }])
	})

	it("returns offline fallback when the auto chain is exhausted", async () => {
		const firecrawl = createProvider("firecrawl", new Error("boom"))
		const tavily = createProvider("tavily", { results: [] })
		const duckduckgo = createProvider("duckduckgo", { results: [] })
		const broker = new WebSearchBroker({
			providers: [firecrawl, tavily, duckduckgo],
			fetchImpl: vi.fn() as any,
		})

		const result = await broker.search("agentic web search")

		expect(result.provider).toBe("offline")
		expect(result.online).toBe(false)
		expect(result.notice).toContain("offline fallback")
		expect(result.results[0]?.source).toBe("offline")
		expect(result.fallbackTrace).toEqual([
			{ provider: "firecrawl", outcome: "error", detail: "boom" },
			{ provider: "tavily", outcome: "empty" },
			{ provider: "duckduckgo", outcome: "empty" },
		])
	})
})
