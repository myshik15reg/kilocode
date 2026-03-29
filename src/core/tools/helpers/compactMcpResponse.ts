// kilocode_change - new file
const DEFAULT_MAX_CHARS = 12_000
const DEFAULT_HEAD_CHARS = 8_000
const DEFAULT_TAIL_CHARS = 3_000

interface CompactMcpResponseOptions {
	maxChars?: number
	headChars?: number
	tailChars?: number
}

export function compactMcpResponse(text: string, options?: CompactMcpResponseOptions): string {
	if (text.length === 0) {
		return text
	}

	const maxChars = Math.max(1, options?.maxChars ?? DEFAULT_MAX_CHARS)
	if (text.length <= maxChars) {
		return text
	}

	const notice = `\n\n[NOTE] MCP response truncated to reduce context usage. Original length: ${text.length} chars. Use narrower MCP queries or pagination to inspect specific sections.\n\n`
	const availableChars = Math.max(0, maxChars - notice.length)
	const requestedHeadChars = options?.headChars ?? DEFAULT_HEAD_CHARS
	const requestedTailChars = options?.tailChars ?? DEFAULT_TAIL_CHARS
	const headChars = Math.min(Math.max(0, requestedHeadChars), availableChars)
	const tailChars = Math.min(Math.max(0, requestedTailChars), Math.max(0, availableChars - headChars))
	const prefix = text.slice(0, headChars).trimEnd()
	const suffix = tailChars > 0 ? text.slice(-tailChars).trimStart() : ""

	if (!suffix) {
		return `${prefix}${notice}`
	}

	return `${prefix}${notice}${suffix}`
}
