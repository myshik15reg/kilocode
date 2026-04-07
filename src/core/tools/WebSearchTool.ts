import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { webSearchBroker, type WebSearchProviderConfig } from "../../services/search/WebSearchBroker"
import { BaseTool, ToolCallbacks } from "./BaseTool"

interface WebSearchParams {
	query: string
	provider?: string
}

function readConfigValue(source: unknown, key: keyof WebSearchProviderConfig): string | undefined {
	if (!source || typeof source !== "object") {
		return undefined
	}

	const value = (source as Record<string, unknown>)[key]
	return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function formatFallbackTrace(trace: Array<{ provider: string; outcome: string; detail?: string }>): string[] {
	if (trace.length === 0) {
		return []
	}

	return [
		"Fallback trace:",
		...trace.map((entry, index) => {
			const detail = entry.detail ? ` (${entry.detail})` : ""
			return `${index + 1}. ${entry.provider}: ${entry.outcome}${detail}`
		}),
	]
}

export class WebSearchTool extends BaseTool<"web_search"> {
	readonly name = "web_search" as const

	parseLegacy(params: Partial<Record<string, string>>): WebSearchParams {
		return {
			query: params.query || "",
			provider: params.provider || undefined,
		}
	}

	private async resolveProviderConfig(task: Task): Promise<WebSearchProviderConfig | undefined> {
		const provider = task.providerRef.deref()
		const state = await provider?.getState()
		const config: WebSearchProviderConfig = {
			firecrawlApiKey:
				readConfigValue(task.apiConfiguration as unknown, "firecrawlApiKey") ||
				readConfigValue(state?.apiConfiguration as unknown, "firecrawlApiKey") ||
				readConfigValue(state as unknown, "firecrawlApiKey"),
			tavilyApiKey:
				readConfigValue(task.apiConfiguration as unknown, "tavilyApiKey") ||
				readConfigValue(state?.apiConfiguration as unknown, "tavilyApiKey") ||
				readConfigValue(state as unknown, "tavilyApiKey"),
			exaApiKey:
				readConfigValue(task.apiConfiguration as unknown, "exaApiKey") ||
				readConfigValue(state?.apiConfiguration as unknown, "exaApiKey") ||
				readConfigValue(state as unknown, "exaApiKey"),
		}

		return Object.values(config).some(Boolean) ? config : undefined
	}

	async execute(params: WebSearchParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { askApproval, handleError, pushToolResult, toolProtocol } = callbacks
		const query = typeof params.query === "string" ? params.query.trim() : ""
		const provider =
			typeof params.provider === "string" && params.provider.trim() !== "" ? params.provider.trim() : undefined

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

		const didApprove = await askApproval(
			"tool",
			JSON.stringify({
				tool: "webSearch",
				query,
				provider,
			}),
		)
		if (!didApprove) {
			pushToolResult(formatResponse.toolDenied())
			return
		}

		try {
			const result = await webSearchBroker.search(query, {
				provider,
				config: await this.resolveProviderConfig(task),
			})
			await task.say("web_search_result", result.summary)
			pushToolResult(
				[
					`Query: ${result.query}`,
					provider ? `Requested provider: ${provider}` : undefined,
					`Provider: ${result.provider}`,
					`Mode: ${result.mode}`,
					`Status: ${result.online ? "online" : "offline-fallback"}`,
					`Duration: ${result.durationSeconds.toFixed(3)}s`,
					result.notice ? `Notice: ${result.notice}` : undefined,
					...formatFallbackTrace(result.fallbackTrace),
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
