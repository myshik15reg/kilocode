import crypto from "node:crypto"
import * as path from "node:path"

export type ChunkingConfig = {
	maxBlockChars: number
	minBlockChars: number
	maxCharsToleranceFactor: number
	minChunkRemainderChars: number
}

export type CodeBlock = {
	filePath: string
	startLine: number
	endLine: number
	content: string
	segmentHash: string
}

function sha256(input: string): string {
	return crypto.createHash("sha256").update(input).digest("hex")
}

/**
 * Fallback chunker compatible по смыслу с CodeParser._chunkTextByLines.
 * Не использует tree-sitter (чтобы быть независимым от VSCode runtime).
 */
export function chunkTextByLines(filePath: string, content: string, cfg: ChunkingConfig): CodeBlock[] {
	const lines = content.split(/\r?\n/)
	const effectiveMax = cfg.maxBlockChars * cfg.maxCharsToleranceFactor

	const blocks: CodeBlock[] = []
	const seen = new Set<string>()

	let current: string[] = []
	let currentLen = 0
	let chunkStartIdx = 0 // index in lines

	const finalize = (endIdx: number) => {
		if (current.length === 0) return
		if (currentLen < cfg.minBlockChars) {
			current = []
			currentLen = 0
			chunkStartIdx = endIdx + 1
			return
		}

		const text = current.join("\n")
		const startLine = chunkStartIdx + 1
		const endLine = endIdx + 1
		const preview = text.slice(0, 100)
		const segmentHash = sha256(`${filePath}-${startLine}-${endLine}-${text.length}-${preview}`)

		if (!seen.has(segmentHash)) {
			seen.add(segmentHash)
			blocks.push({ filePath, startLine, endLine, content: text, segmentHash })
		}

		current = []
		currentLen = 0
		chunkStartIdx = endIdx + 1
	}

	const addOversizedLineAsSegments = (line: string, lineNo: number) => {
		let remaining = line
		let startChar = 0
		while (remaining.length > 0) {
			const segment = remaining.substring(0, cfg.maxBlockChars)
			remaining = remaining.substring(cfg.maxBlockChars)
			const preview = segment.slice(0, 100)
			const segmentHash = sha256(`${filePath}-${lineNo}-${lineNo}-${startChar}-${segment.length}-${preview}`)
			if (!seen.has(segmentHash)) {
				seen.add(segmentHash)
				blocks.push({ filePath, startLine: lineNo, endLine: lineNo, content: segment, segmentHash })
			}
			startChar += cfg.maxBlockChars
		}
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? ""
		const lineLen = line.length + (i < lines.length - 1 ? 1 : 0)

		if (lineLen > effectiveMax) {
			// finalize current chunk before oversized line
			if (current.length > 0) {
				finalize(i - 1)
			}
			addOversizedLineAsSegments(line, i + 1)
			chunkStartIdx = i + 1
			continue
		}

		if (currentLen > 0 && currentLen + lineLen > effectiveMax) {
			// rebalancing similar to CodeParser
			let remainderLen = 0
			for (let j = i; j < lines.length; j++) {
				const l = lines[j] ?? ""
				remainderLen += l.length + (j < lines.length - 1 ? 1 : 0)
			}

			let splitIdx = i - 1
			if (currentLen >= cfg.minBlockChars && remainderLen < cfg.minChunkRemainderChars && current.length > 1) {
				for (let k = i - 2; k >= chunkStartIdx; k--) {
					const left = lines.slice(chunkStartIdx, k + 1).join("\n")
					const right = lines.slice(k + 1).join("\n")
					if (left.length >= cfg.minBlockChars && right.length >= cfg.minChunkRemainderChars) {
						splitIdx = k
						break
					}
				}
			}

			finalize(splitIdx)

			// after finalize, continue adding current line
			if (i >= chunkStartIdx) {
				current.push(line)
				currentLen += lineLen
			} else {
				i = chunkStartIdx - 1
			}

			continue
		}

		current.push(line)
		currentLen += lineLen
	}

	if (current.length > 0) {
		finalize(lines.length - 1)
	}

	return blocks
}

export function isLikelyCodeFile(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase()
	return [
		".ts",
		".tsx",
		".js",
		".jsx",
		".py",
		".go",
		".rs",
		".java",
		".kt",
		".kts",
		".cs",
		".php",
		".rb",
		".cpp",
		".c",
		".h",
		".hpp",
		".scala",
		".lua",
		".zig",
		".md",
		".json",
	].includes(ext)
}
