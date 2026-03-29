import { ToolArgs } from "./types"

export function getWebSearchDescription(_args: ToolArgs): string {
	return `## web_search
Description: Search the public web for current external information and return a compact summary. If internet access is unavailable, this tool returns an offline fallback summary and tells you to continue with local tools or MCP resources instead of retry loops.

Use this for external docs, standards, release notes, and current ecosystem behavior. Do not use it for local repository exploration when codebase_search, search_files, or read_file are enough.

Parameters:
- query: (required) A concise public-web search query.

Usage:
<web_search>
<query>Your external information query here</query>
</web_search>`
}
