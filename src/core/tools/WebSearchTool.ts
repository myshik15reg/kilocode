import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { webSearchBroker } from "../../services/search/WebSearchBroker"
import { BaseTool, ToolCallbacks } from "./BaseTool"

interface WebSearchParams {
	query: string
}

export class WebSearchTool extends BaseTool<"web_search"> {
	readonly name = "web_search" as const

	parseLegacy(params: Partial<Record<string, string>>): WebSearchParams {
		return {
			query: params.query || "",
		}
	}

	async execute(params: WebSearchParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { askApproval, handleError, pushToolResult, toolProtocol } = callbacks
		const query = typeof params.query === "string" ? params.query.trim() : ""

		if (!query) {
			task.consecutiveMistakeCount++
			task.didToolFailInCurrentTurn = true
			pushToolResult(
				formatResponse.toolError(
					'Invalid arguments for web_search: missing or empty required parameter "query". Retry with JSON like: { "query": "latest MCP HTTP/2 guidance" }.',
					toolProtocol,
				),
			)
			return
		}

		const didApprove = await askApproval("tool", JSON.stringify({ tool: "webSearch", query }))
		if (!didApprove) {
			pushToolResult(formatResponse.toolDenied())
			return
		}

		try {
			const result = await webSearchBroker.search(query)
			await task.say("web_search_result", result.summary)
			pushToolResult(
				[
					`Query: ${result.query}`,
					`Mode: ${result.online ? "online" : "offline-fallback"}`,
					result.notice ? `Notice: ${result.notice}` : undefined,
					`Summary: ${result.summary}`,
					"Results:",
					...result.results.map(
						(item, index) => `${index + 1}. ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}`,
					),
				]
					.filter(Boolean)
					.join("\n\n"),
			)
		} catch (error) {
			await handleError("web_search", error as Error)
		}
	}
}

export const webSearchTool = new WebSearchTool()
