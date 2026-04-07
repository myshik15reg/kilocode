import { beforeEach, describe, expect, it, vi } from "vitest"

import { webSearchTool } from "../WebSearchTool"
import { formatResponse } from "../../prompts/responses"
import { Task } from "../../task/Task"
import { webSearchBroker } from "../../../services/search/WebSearchBroker"

vi.mock("../../../services/search/WebSearchBroker", () => ({
	webSearchBroker: {
		search: vi.fn(),
	},
}))

describe("webSearchTool", () => {
	let mockTask: Partial<Task>
	let askApproval: ReturnType<typeof vi.fn>
	let handleError: ReturnType<typeof vi.fn>
	let pushToolResult: ReturnType<typeof vi.fn>

	beforeEach(() => {
		vi.clearAllMocks()
		mockTask = {
			cwd: "/repo",
			apiConfiguration: {},
			providerRef: {
				deref: vi.fn().mockReturnValue({
					getState: vi.fn().mockResolvedValue({
						apiConfiguration: {
							firecrawlApiKey: "fc-key",
						},
					}),
				}),
			} as any,
			consecutiveMistakeCount: 0,
			say: vi.fn().mockResolvedValue(undefined),
		} as any
		askApproval = vi.fn().mockResolvedValue(true)
		handleError = vi.fn()
		pushToolResult = vi.fn()
	})

	it("returns deterministic tool_error for empty query", async () => {
		await webSearchTool.handle(
			mockTask as Task,
			{ type: "tool_use", name: "web_search", params: {}, partial: false } as any,
			{
				askApproval,
				handleError,
				pushToolResult,
				removeClosingTag: (_, text) => text ?? "",
				toolProtocol: "xml",
			},
		)

		expect(pushToolResult).toHaveBeenCalledWith(
			formatResponse.toolError(
				'Invalid arguments for web_search: missing or empty required parameter "query". Retry with JSON like: { "query": "latest MCP HTTP/2 guidance" }.',
				"xml",
			),
		)
	})

	it("passes explicit provider and resolved provider config to the broker", async () => {
		vi.mocked(webSearchBroker.search).mockResolvedValue({
			query: "mcp http2",
			provider: "firecrawl",
			mode: "explicit",
			durationSeconds: 0.024,
			online: true,
			summary: 'Web search summary for "mcp http2" via firecrawl',
			results: [
				{
					title: "Firecrawl result",
					url: "https://example.com/firecrawl",
					snippet: "Use Firecrawl",
					source: "online",
				},
			],
			fallbackTrace: [{ provider: "firecrawl", outcome: "success" }],
		})

		await webSearchTool.handle(
			mockTask as Task,
			{
				type: "tool_use",
				name: "web_search",
				params: { query: "mcp http2", provider: "firecrawl" },
				partial: false,
			} as any,
			{
				askApproval,
				handleError,
				pushToolResult,
				removeClosingTag: (_, text) => text ?? "",
				toolProtocol: "xml",
			},
		)

		expect(askApproval).toHaveBeenCalledWith(
			"tool",
			JSON.stringify({ tool: "webSearch", query: "mcp http2", provider: "firecrawl" }),
		)
		expect(webSearchBroker.search).toHaveBeenCalledWith(
			"mcp http2",
			expect.objectContaining({
				provider: "firecrawl",
				config: expect.objectContaining({ firecrawlApiKey: "fc-key" }),
			}),
		)
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Requested provider: firecrawl"))
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Mode: explicit"))
	})

	it("renders broker metadata and fallback trace after approval", async () => {
		vi.mocked(webSearchBroker.search).mockResolvedValue({
			query: "mcp http2",
			provider: "duckduckgo",
			mode: "auto",
			durationSeconds: 0.137,
			online: false,
			summary: 'Offline fallback summary for "mcp http2"',
			notice: "No configured web search provider returned results; using offline fallback.",
			results: [
				{
					title: "Offline fallback",
					url: "offline://search-unavailable",
					snippet: "Use local tools",
					source: "offline",
				},
			],
			fallbackTrace: [
				{ provider: "firecrawl", outcome: "error", detail: "boom" },
				{ provider: "duckduckgo", outcome: "success" },
			],
		})

		await webSearchTool.handle(
			mockTask as Task,
			{ type: "tool_use", name: "web_search", params: { query: "mcp http2" }, partial: false } as any,
			{
				askApproval,
				handleError,
				pushToolResult,
				removeClosingTag: (_, text) => text ?? "",
				toolProtocol: "xml",
			},
		)

		expect(mockTask.say).toHaveBeenCalledWith("web_search_result", 'Offline fallback summary for "mcp http2"')
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Provider: duckduckgo"))
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Mode: auto"))
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Status: offline-fallback"))
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("firecrawl: error (boom)"))
	})

	it("delegates explicit provider failures to the standard error handler", async () => {
		const error = new Error('Web search provider "firecrawl" failed: provider unavailable')
		vi.mocked(webSearchBroker.search).mockRejectedValue(error)

		await webSearchTool.handle(
			mockTask as Task,
			{
				type: "tool_use",
				name: "web_search",
				params: { query: "mcp http2", provider: "firecrawl" },
				partial: false,
			} as any,
			{
				askApproval,
				handleError,
				pushToolResult,
				removeClosingTag: (_, text) => text ?? "",
				toolProtocol: "xml",
			},
		)

		expect(handleError).toHaveBeenCalledWith("web_search", error)
	})
})
