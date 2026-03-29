// kilocode_change - new file
export interface HashlineOptions {
	maxLines?: number
	maxCharsPerLine?: number
}

const HASHLINE_REFERENCE_REGEX = /^\s*(?:#HL\s+)?(\d+):([0-9a-f]{2,8})(?:\|.*)?\s*$/i
const HASHLINE_PREFIX_REGEX = /^(\s*)#HL\s+(\d+):([0-9a-f]{2,8})\|(.*)$/i
const MIN_HASH_PREFIX_LENGTH = 2
const MAX_HASH_PREFIX_LENGTH = 4

function fnv1aHex(input: string): string {
	let hash = 0x811c9dc5
	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index)
		hash = Math.imul(hash, 0x01000193)
	}
	return (hash >>> 0).toString(16)
}

function buildLineHash(lineNumber: number, line: string): string {
	return fnv1aHex(`${lineNumber}:${line}`)
}

function isHashlineReferenceLine(line: string): boolean {
	return HASHLINE_REFERENCE_REGEX.test(line) || HASHLINE_PREFIX_REGEX.test(line)
}

function getAdaptiveHashPrefixLength(fullHashes: string[]): number {
	for (let prefixLength = MIN_HASH_PREFIX_LENGTH; prefixLength <= MAX_HASH_PREFIX_LENGTH; prefixLength++) {
		const prefixes = new Set(fullHashes.map((hash) => hash.slice(0, prefixLength)))
		if (prefixes.size === fullHashes.length) {
			return prefixLength
		}
	}

	return MAX_HASH_PREFIX_LENGTH
}

export function annotateWithHashline(content: string, options: HashlineOptions = {}): string {
	const maxLines = options.maxLines ?? 12
	const maxCharsPerLine = options.maxCharsPerLine ?? 160
	const visibleLines = content.split("\n").slice(0, maxLines)
	const fullHashes = visibleLines.map((line, index) => buildLineHash(index + 1, line))
	const hashPrefixLength = getAdaptiveHashPrefixLength(fullHashes)

	return visibleLines
		.map((line, index) => {
			const lineNumber = index + 1
			const shortened = line.length > maxCharsPerLine ? `${line.slice(0, maxCharsPerLine)}?` : line
			const hash = fullHashes[index].slice(0, hashPrefixLength)
			return `#HL ${lineNumber}:${hash}|${shortened}`
		})
		.join("\n")
}

export function stripHashlinePrefixes(content: string): string {
	return content
		.split("\n")
		.map((line) => {
			const match = line.match(HASHLINE_PREFIX_REGEX)
			if (!match) {
				return line
			}

			return `${match[1]}${match[4]}`
		})
		.join("\n")
}

export function resolveHashlineReference(content: string, reference: string): string | undefined {
	const match = reference.match(HASHLINE_REFERENCE_REGEX)
	if (!match) {
		return undefined
	}

	const lineNumber = Number.parseInt(match[1], 10)
	const expectedHash = match[2].toLowerCase()
	const line = content.split("\n")[lineNumber - 1]
	if (line === undefined) {
		return undefined
	}

	const actualHash = buildLineHash(lineNumber, line).toLowerCase()
	return actualHash.startsWith(expectedHash) ? line : undefined
}

export function expandHashlineReferences(content: string, snippet: string): string {
	return snippet
		.split("\n")
		.map((line) => {
			const resolved = resolveHashlineReference(content, line)
			if (resolved !== undefined) {
				return resolved
			}

			return isHashlineReferenceLine(line) ? line : stripHashlinePrefixes(line)
		})
		.join("\n")
}
