const DEFAULT_MAX_CHARS = 1_200
const DEFAULT_HEAD_CHARS = 780
const DEFAULT_TAIL_CHARS = 220

interface CompactCompletionSummaryOptions {
	maxChars?: number
	headChars?: number
	tailChars?: number
}

export function compactCompletionSummary(summary: string, options: CompactCompletionSummaryOptions = {}): string {
	const normalized = summary.trim()
	if (!normalized) {
		return normalized
	}

	const maxChars = Math.max(1, options.maxChars ?? DEFAULT_MAX_CHARS)
	if (normalized.length <= maxChars) {
		return normalized
	}

	const lineCount = normalized.split(/\r?\n/).length
	const notice = `\n\n[NOTE] Child completion summary truncated for parent context. Full result remains in the child task history. Original length: ${normalized.length} chars across ${lineCount} lines.\n\n`
	const availableChars = Math.max(0, maxChars - notice.length)
	const headChars = Math.min(Math.max(0, options.headChars ?? DEFAULT_HEAD_CHARS), availableChars)
	const tailChars = Math.min(
		Math.max(0, options.tailChars ?? DEFAULT_TAIL_CHARS),
		Math.max(0, availableChars - headChars),
	)
	const prefix = normalized.slice(0, headChars).trimEnd()
	const suffix = tailChars > 0 ? normalized.slice(-tailChars).trimStart() : ""

	if (!suffix) {
		return `${prefix}${notice}`.trim()
	}

	return `${prefix}${notice}${suffix}`.trim()
}
