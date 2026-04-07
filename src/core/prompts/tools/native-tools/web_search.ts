import type OpenAI from "openai"

const WEB_SEARCH_DESCRIPTION = `Search the public web for up-to-date information and return a compact, budget-aware summary. In auto mode this tool tries the configured provider chain in order: Firecrawl, Tavily, Exa, then DuckDuckGo. When all providers fail or return nothing, it returns an explicit offline fallback summary instead of silently looping.

Use this tool for external documentation, standards, release notes, API behavior, and current ecosystem information. Prefer compact factual queries. Do not use it for local repository exploration when codebase_search, search_files, or read_file are sufficient.

Parameters:
- query: (required) A concise search query describing the external information you need.
- provider: (optional) Explicit provider to force. Use one of firecrawl, tavily, exa, duckduckgo, or a workspace-specific custom provider. Explicit mode is fail-loud: it does not silently fall back to another provider.

Examples:
{ "query": "Model Context Protocol HTTP/2 streamable transport best practices" }
{ "query": "latest Firecrawl search API docs", "provider": "firecrawl" }`

export default {
	type: "function",
	function: {
		name: "web_search",
		description: WEB_SEARCH_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Concise public-web search query for external information",
				},
				provider: {
					type: "string",
					description:
						"Optional explicit provider override, for example firecrawl, tavily, exa, or duckduckgo",
				},
			},
			required: ["query"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
