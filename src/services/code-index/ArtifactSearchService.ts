import fs from "fs/promises"
import path from "path"

import type {
	CodeIndexStructuredSearchResult,
	RetrievalSource,
	RetrievalSourceKind,
	VectorStoreSearchResult,
} from "./interfaces"
import type { CodeIndexSearchRequest } from "./interfaces/manager"

const ARTIFACT_QUERY_RE =
	/\b(workflow|protocol|memory\s*bank|memory-bank|agents?\.md|brief|context|handoff|instruction|guide|runbook|rules?|artifact|kilocode|workflowai|\.protocols|\.kilocode)\b/iu
const ROOT_DIRS = [
	".kilocode/memory-bank",
	".kilocode/workflows",
	".kilocode/rules",
	".kilocode/patterns/orchestration",
	".protocols",
	"WorkFlowAI/.kilocode/memory-bank",
	"WorkFlowAI/.kilocode/workflows",
	"WorkFlowAI/.kilocode/rules",
	"src/WorkFlowAI/.kilocode/memory-bank",
	"src/WorkFlowAI/.kilocode/workflows",
	"src/WorkFlowAI/.kilocode/rules",
] as const
const ROOT_FILES = [
	"AGENTS.md",
	".clinerules",
	".kilocodemodes",
	".kilocode/QUICK.md",
	"WorkFlowAI/AGENTS.md",
	"src/WorkFlowAI/AGENTS.md",
] as const
const ROOT_PREFIXES = [".kilocode/", ".protocols/", "WorkFlowAI/.kilocode/", "src/WorkFlowAI/.kilocode/"] as const
const FILE_PREFIXES = [
	"AGENTS.md",
	".clinerules",
	".kilocodemodes",
	".kilocode/QUICK.md",
	"WorkFlowAI/AGENTS.md",
	"src/WorkFlowAI/AGENTS.md",
] as const
const CODE_ROOT_DIRS = ["src", "packages", "cli/src", "webview-ui/src", "apps"] as const
const DOC_EXT = new Set([".md", ".mdx", ".txt", ".yaml", ".yml", ".json"])
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".yaml", ".yml", ".md"])
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage", ".turbo", ".next", "out"])
const MAX_FILE_BYTES = 128 * 1024
const MAX_RESULTS = 5
const MIN_SCORE = 0.2

interface SearchScopeOptions {
	extensions: Set<string>
	sourceLabel: string
	sourceKind: (relativePath: string) => RetrievalSourceKind
}

export class ArtifactSearchService {
	constructor(private readonly workspacePath: string) {}

	public static shouldSearchArtifacts(query: string, directoryPrefix?: string): boolean {
		const prefix = this.normalize(directoryPrefix)
		if (prefix) {
			return this.isArtifactPath(prefix)
		}
		return ARTIFACT_QUERY_RE.test(query)
	}

	public async searchDetailed(
		request: Pick<CodeIndexSearchRequest, "query" | "directoryPrefix" | "retrievalMode">,
	): Promise<CodeIndexStructuredSearchResult> {
		const results = await this.searchFiles(request, {
			extensions: DOC_EXT,
			sourceLabel: "artifact match",
			sourceKind: (relativePath) => this.detectArtifactSourceKind(relativePath),
		})

		return {
			query: request.query,
			queryClass: "workflow_docs",
			retrievalMode: request.retrievalMode ?? "adaptive",
			retrievalConfidence: this.aggregateConfidence(results),
			results,
			keyPoints: results
				.slice(0, 3)
				.map(
					(entry) =>
						entry.citationLabel ?? `${this.toRelative(entry.filePath)}:${entry.startLine}-${entry.endLine}`,
				),
			sources: this.dedupeSources(results.flatMap((entry) => entry.sources ?? [])),
			warnings:
				results.length > 0
					? ["Artifact retrieval scanned workflow, protocol, and memory surfaces before broader code search."]
					: [],
			postprocessUsed: results.length > 0,
			compressionApplied: false,
		}
	}

	public async searchCodeFallbackDetailed(
		request: Pick<CodeIndexSearchRequest, "query" | "directoryPrefix" | "retrievalMode">,
	): Promise<CodeIndexStructuredSearchResult> {
		const results = await this.searchFiles(request, {
			extensions: CODE_EXT,
			sourceLabel: "degraded code fallback",
			sourceKind: (relativePath) => this.detectCodeSourceKind(relativePath),
		})

		return {
			query: request.query,
			queryClass: "implementation_search",
			retrievalMode: request.retrievalMode ?? "adaptive",
			retrievalConfidence: this.aggregateConfidence(results),
			results,
			keyPoints: results
				.slice(0, 3)
				.map(
					(entry) =>
						entry.citationLabel ?? `${this.toRelative(entry.filePath)}:${entry.startLine}-${entry.endLine}`,
				),
			sources: this.dedupeSources(results.flatMap((entry) => entry.sources ?? [])),
			warnings:
				results.length > 0
					? ["Semantic retrieval failed; returned bounded lexical fallback over code surfaces."]
					: [],
			postprocessUsed: results.length > 0,
			compressionApplied: false,
		}
	}

	private async searchFiles(
		request: Pick<CodeIndexSearchRequest, "query" | "directoryPrefix" | "retrievalMode">,
		scope: SearchScopeOptions,
	): Promise<VectorStoreSearchResult[]> {
		const files = await this.collectFiles(request.directoryPrefix, scope)
		const tokens = this.tokenize(request.query)
		return (await Promise.all(files.map((filePath) => this.scoreFile(filePath, request.query, tokens, scope))))
			.filter((entry): entry is VectorStoreSearchResult => Boolean(entry))
			.sort((left, right) =>
				right.score === left.score ? left.filePath.localeCompare(right.filePath) : right.score - left.score,
			)
			.slice(0, MAX_RESULTS)
	}

	private async collectFiles(directoryPrefix: string | undefined, scope: SearchScopeOptions): Promise<string[]> {
		const prefix = ArtifactSearchService.normalize(directoryPrefix)
		if (prefix) {
			return this.walk(path.join(this.workspacePath, prefix), scope.extensions)
		}

		const collected = new Set<string>()
		const roots = scope.extensions === DOC_EXT ? [...ROOT_DIRS, ...ROOT_FILES] : CODE_ROOT_DIRS
		for (const relativePath of roots) {
			for (const filePath of await this.walk(path.join(this.workspacePath, relativePath), scope.extensions)) {
				collected.add(filePath)
			}
		}
		return [...collected]
	}

	private async walk(targetPath: string, extensions: Set<string>): Promise<string[]> {
		try {
			const stat = await fs.stat(targetPath)
			if (stat.isFile()) {
				return this.isSearchable(targetPath, stat.size, extensions) ? [targetPath] : []
			}
			const dirName = path.basename(targetPath)
			if (IGNORED_DIRS.has(dirName)) {
				return []
			}
			const results: string[] = []
			for (const entry of await fs.readdir(targetPath, { withFileTypes: true })) {
				results.push(...(await this.walk(path.join(targetPath, entry.name), extensions)))
			}
			return results
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code
			if (code === "ENOENT" || code === "ENOTDIR") {
				return []
			}
			throw error
		}
	}

	private async scoreFile(
		filePath: string,
		query: string,
		tokens: string[],
		scope: SearchScopeOptions,
	): Promise<VectorStoreSearchResult | undefined> {
		const stat = await fs.stat(filePath)
		if (!stat.isFile() || !this.isSearchable(filePath, stat.size, scope.extensions)) {
			return undefined
		}
		const content = await fs.readFile(filePath, "utf8")
		const lines = content.split(/\r?\n/)
		const relativePath = this.toRelative(filePath)
		const pathTokens = this.tokenize(relativePath)
		const normalizedQuery = query.trim().toLowerCase()
		let bestIndex = 0
		let bestScore = 0

		for (let index = 0; index < lines.length; index += 1) {
			const window = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join("\n")
			const windowTokens = new Set([...this.tokenize(window), ...pathTokens])
			const overlap = tokens.filter((token) => windowTokens.has(token)).length
			const coverage = tokens.length > 0 ? overlap / tokens.length : 0
			const exactBonus = normalizedQuery.length > 0 && window.toLowerCase().includes(normalizedQuery) ? 0.35 : 0
			const headingBonus = lines[index].trim().startsWith("#") ? 0.1 : 0
			const pathBonus = tokens.some((token) => pathTokens.includes(token)) ? 0.15 : 0
			const score = Math.max(0, Math.min(1, coverage + exactBonus + headingBonus + pathBonus))
			if (score > bestScore) {
				bestScore = score
				bestIndex = index
			}
		}

		if (bestScore < MIN_SCORE && !relativePath.toLowerCase().includes(normalizedQuery)) {
			return undefined
		}
		if (bestScore < MIN_SCORE) {
			bestScore = 0.3
		}

		const startLine = Math.max(0, bestIndex - 1) + 1
		const endLine = Math.min(lines.length, bestIndex + 3)
		const codeChunk = lines
			.slice(startLine - 1, endLine)
			.join("\n")
			.trim()
		const source: RetrievalSource = {
			type: "lexical",
			label: `${scope.sourceLabel} in ${path.basename(relativePath)}`,
			score: bestScore,
			details: relativePath,
		}

		return {
			id: `${relativePath}:${startLine}`,
			score: bestScore,
			filePath,
			codeChunk,
			startLine,
			endLine,
			payload: { filePath, codeChunk, startLine, endLine },
			retrievalPath: ["workspace", ...ArtifactSearchService.normalize(relativePath).split("/")],
			sources: [source],
			postprocessUsed: true,
			sourceKind: scope.sourceKind(relativePath),
			citationLabel: `${relativePath}:${startLine}-${endLine}`,
			confidence: bestScore,
			retrievalConfidence: bestScore,
			scoreBreakdown: { total: bestScore, lexical: bestScore },
		}
	}

	private detectArtifactSourceKind(relativePath: string): RetrievalSourceKind {
		const normalized = ArtifactSearchService.normalize(relativePath)
		if (normalized.startsWith(".protocols/")) {
			return "protocol"
		}
		if (
			normalized.includes("/workflows/") ||
			normalized.endsWith("AGENTS.md") ||
			normalized.endsWith(".clinerules")
		) {
			return "workflow"
		}
		return [".json", ".yaml", ".yml"].includes(path.extname(normalized).toLowerCase()) ? "config" : "markdown"
	}

	private detectCodeSourceKind(relativePath: string): RetrievalSourceKind {
		const normalized = ArtifactSearchService.normalize(relativePath)
		if (/\b(__tests__|tests?)\b/i.test(normalized) || /\.(spec|test)\.[^.]+$/i.test(normalized)) {
			return "test"
		}
		const ext = path.extname(normalized).toLowerCase()
		if ([".json", ".yaml", ".yml"].includes(ext)) {
			return "config"
		}
		if ([".md", ".mdx"].includes(ext)) {
			return "markdown"
		}
		return "code"
	}

	private tokenize(value: string): string[] {
		return value
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.replace(/[_./\\:-]+/g, " ")
			.toLowerCase()
			.split(/[^\p{L}\p{N}]+/u)
			.map((token) => token.trim())
			.filter((token) => token.length >= 2)
	}

	private aggregateConfidence(results: VectorStoreSearchResult[]): number {
		if (results.length === 0) {
			return 0
		}
		const sample = results.slice(0, 3)
		return Math.max(
			0,
			Math.min(1, sample.reduce((sum, entry) => sum + (entry.confidence ?? entry.score), 0) / sample.length),
		)
	}

	private dedupeSources(sources: RetrievalSource[]): RetrievalSource[] {
		const seen = new Set<string>()
		return sources.filter((source) => {
			const key = `${source.type}:${source.label}:${source.details ?? ""}`
			if (seen.has(key)) {
				return false
			}
			seen.add(key)
			return true
		})
	}

	private toRelative(filePath: string): string {
		return ArtifactSearchService.normalize(path.relative(this.workspacePath, filePath))
	}

	private isSearchable(filePath: string, size: number, extensions: Set<string>): boolean {
		return size <= MAX_FILE_BYTES && extensions.has(path.extname(filePath).toLowerCase())
	}

	private static isArtifactPath(relativePath: string): boolean {
		return (
			ROOT_PREFIXES.some((prefix) => relativePath.startsWith(prefix)) ||
			FILE_PREFIXES.some((prefix) => relativePath === prefix)
		)
	}

	private static normalize(relativePath?: string): string {
		if (!relativePath) {
			return ""
		}
		const normalized = path.normalize(relativePath).replace(/\\/g, "/")
		return normalized.startsWith("./") ? normalized.slice(2) : normalized
	}
}
