import type OpenAI from "openai"

const WEB_SEARCH_DESCRIPTION = `Search the public web for up-to-date information and return a compact, budget-aware summary. When internet access is unavailable, this tool returns an offline fallback summary that explicitly tells you to continue using local tools or MCP resources instead of looping.

Use this tool for external documentation, standards, release notes, API behavior, and current ecosystem information. Prefer compact factual queries. Do not use it for local repository exploration when codebase_search, search_files, or read_file are sufficient.

Parameters:
- query: (required) A concise search query describing the external information you need.

Example:
{ "query": "Model Context Protocol HTTP/2 streamable transport best practices" }`

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
			},
			required: ["query"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
