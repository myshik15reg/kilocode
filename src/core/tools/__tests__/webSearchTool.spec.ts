// kilocode_change - new file
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
				askApproval: askApproval,
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

	it("returns broker output after approval", async () => {
		vi.mocked(webSearchBroker.search).mockResolvedValue({
			query: "mcp http2",
			online: false,
			summary: 'Offline fallback summary for "mcp http2"',
			notice: "No internet connection",
			results: [
				{
					title: "Offline fallback",
					url: "offline://search-unavailable",
					snippet: "Use local tools",
					source: "offline",
				},
			],
		})

		await webSearchTool.handle(
			mockTask as Task,
			{ type: "tool_use", name: "web_search", params: { query: "mcp http2" }, partial: false } as any,
			{
				askApproval: askApproval,
				handleError,
				pushToolResult,
				removeClosingTag: (_, text) => text ?? "",
				toolProtocol: "xml",
			},
		)

		expect(askApproval).toHaveBeenCalled()
		expect(mockTask.say).toHaveBeenCalledWith("web_search_result", 'Offline fallback summary for "mcp http2"')
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Mode: offline-fallback"))
	})
})
