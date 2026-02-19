// kilocode_change - new file
/**
 * Single Source of Truth (SoT) for file type handling.
 *
 * Goals:
 * - Keep extension lists consistent across tree-sitter, vector index (Qdrant), and graph index (Neo4j)
 * - Prioritize 1C (BSL + 1C XML-like artifacts)
 * - Provide safe fallbacks when tree-sitter WASM is missing/unavailable
 */

export type FileContentKind = "treeSitter" | "xml" | "plainText" | "skip"

export type IndexingEligibility = {
	vector: boolean
	graph: boolean
}

export type FileTypeRegistryEntry = {
	/** File extension including the dot, e.g. ".ts" */
	extension: `.${string}`
	/** How this file should be treated for extraction/parsing purposes. */
	contentKind: FileContentKind
	/**
	 * Optional language id (used by Neo4j extractor selection and/or tree-sitter).
	 * Example: "onec" for .bsl
	 */
	languageId?: string
	/**
	 * Vector-index parsing hint.
	 * When true, code-index MUST use fallback chunking even if tree-sitter exists.
	 * This is used for unstable/missing WASM cases (e.g. 1C:Enterprise).
	 */
	forceVectorFallbackChunking?: boolean
	/** Participation in vector/graph pipelines. */
	indexing: IndexingEligibility
	/** Optional rationale / risk notes. */
	notes?: string
}

function normalizeExtension(input: string): `.${string}` | null {
	const trimmed = input.trim().toLowerCase()
	if (!trimmed) return null

	const ext = trimmed.startsWith(".") ? trimmed : `.${trimmed}`
	// Reject a lone dot
	if (ext === ".") return null
	return ext as `.${string}`
}

const REGISTRY: readonly FileTypeRegistryEntry[] = [
	// --- Core code languages (tree-sitter) ---
	{ extension: ".tla", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".js", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".jsx", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".ts", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".tsx", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".vue", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".py", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".rs", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".go", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".c", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".h", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".cpp", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".hpp", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".cs", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".rb", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".java", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".php", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{
		extension: ".swift",
		contentKind: "treeSitter",
		forceVectorFallbackChunking: true,
		indexing: { vector: true, graph: true },
	},
	{ extension: ".sol", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".kt", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".kts", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".ex", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".exs", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".el", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".json", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".css", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".rdl", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".ml", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".mli", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".lua", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{
		extension: ".scala",
		contentKind: "treeSitter",
		forceVectorFallbackChunking: true,
		indexing: { vector: true, graph: true },
	},
	{ extension: ".toml", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".zig", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	// NOTE: Elm is treated as plain text until we have a stable tree-sitter WASM + query support.
	{ extension: ".elm", contentKind: "plainText", indexing: { vector: true, graph: false } },
	{ extension: ".ejs", contentKind: "treeSitter", indexing: { vector: true, graph: true } },
	{ extension: ".erb", contentKind: "treeSitter", indexing: { vector: true, graph: true } },

	// --- Docs / markup ---
	// NOTE: Keep HTML as tree-sitter-capable for better structure extraction,
	// but disable graph indexing to avoid noisy relationships.
	{ extension: ".html", contentKind: "treeSitter", indexing: { vector: true, graph: false } },
	{ extension: ".htm", contentKind: "treeSitter", indexing: { vector: true, graph: false } },
	{ extension: ".md", contentKind: "plainText", indexing: { vector: true, graph: false } },
	{ extension: ".markdown", contentKind: "plainText", indexing: { vector: true, graph: false } },
	{ extension: ".txt", contentKind: "plainText", indexing: { vector: true, graph: false } },

	// --- 1C:Enterprise (priority) ---
	{
		extension: ".bsl",
		contentKind: "treeSitter",
		languageId: "onec",
		forceVectorFallbackChunking: true,
		indexing: { vector: true, graph: true },
		notes: "Prefer tree-sitter when available; MUST gracefully fall back when tree-sitter-onec.wasm is missing.",
	},
	{
		extension: ".os",
		contentKind: "treeSitter",
		languageId: "onec",
		forceVectorFallbackChunking: true,
		indexing: { vector: true, graph: true },
		notes: "1C script (.os). Same handling as .bsl.",
	},
	{ extension: ".mdo", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".form", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".oform", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".rights", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".dcs", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".dcss", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".dcssca", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".cmi", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".xdto", contentKind: "xml", indexing: { vector: true, graph: true } },
	{
		extension: ".mxlx",
		contentKind: "xml",
		indexing: { vector: true, graph: false },
		notes: "1C templates/layouts. Graph extraction disabled in MVP.",
	},
	{ extension: ".schedule", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".scheme", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".htmldoc", contentKind: "plainText", indexing: { vector: true, graph: false } },
	{ extension: ".chart", contentKind: "xml", indexing: { vector: true, graph: true } },
	{ extension: ".pnrs", contentKind: "xml", indexing: { vector: true, graph: true } },

	// --- Legacy fallbacks / known skips ---
	{
		extension: ".vb",
		contentKind: "plainText",
		forceVectorFallbackChunking: true,
		indexing: { vector: true, graph: false },
		notes: "VB.NET has no stable/available tree-sitter WASM in this project.",
	},
	{
		extension: ".png",
		contentKind: "skip",
		indexing: { vector: false, graph: false },
		notes: "Binary image format. Explicitly excluded from vector/graph indexing.",
	},
] as const

const byExtension = new Map<string, FileTypeRegistryEntry>(REGISTRY.map((e) => [e.extension, e]))

export function resolveFileTypeByExtension(extension: string): FileTypeRegistryEntry | null {
	const ext = normalizeExtension(extension)
	if (!ext) return null
	return byExtension.get(ext) ?? null
}

export function resolveFileTypeByPath(filePath: string): FileTypeRegistryEntry | null {
	const idx = filePath.lastIndexOf(".")
	if (idx === -1) return null
	return resolveFileTypeByExtension(filePath.slice(idx))
}

export function getAllRegisteredExtensions(): string[] {
	return REGISTRY.map((e) => e.extension)
}

export function getVectorIndexExtensions(): string[] {
	return REGISTRY.filter((e) => e.indexing.vector).map((e) => e.extension)
}

export function getGraphIndexExtensions(): string[] {
	return REGISTRY.filter((e) => e.indexing.graph).map((e) => e.extension)
}

export function isVectorIndexEligiblePath(filePath: string): boolean {
	const entry = resolveFileTypeByPath(filePath)
	return Boolean(entry?.indexing.vector)
}

export function isGraphIndexEligiblePath(filePath: string): boolean {
	const entry = resolveFileTypeByPath(filePath)
	return Boolean(entry?.indexing.graph)
}

export function shouldUseVectorFallbackChunking(extension: string): boolean {
	const entry = resolveFileTypeByExtension(extension)
	if (!entry) return false
	if (!entry.indexing.vector) return false

	// Any non-tree-sitter kind is always fallback for vector.
	if (entry.contentKind !== "treeSitter") return true
	return Boolean(entry.forceVectorFallbackChunking)
}

export function getDefinitionSupportedExtensions(): string[] {
	// ReadFileTool / definitions view: support everything we don't explicitly skip.
	return REGISTRY.filter((e) => e.contentKind !== "skip").map((e) => e.extension)
}
