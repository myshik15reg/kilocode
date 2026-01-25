import * as path from "path"
import { Parser, Query } from "web-tree-sitter"
import { getParserManager } from "./parser-manager"
import {
	javascriptQuery,
	typescriptQuery,
	tsxQuery,
	pythonQuery,
	rustQuery,
	goQuery,
	cppQuery,
	cQuery,
	csharpQuery,
	rubyQuery,
	javaQuery,
	phpQuery,
	htmlQuery,
	swiftQuery,
	kotlinQuery,
	cssQuery,
	ocamlQuery,
	solidityQuery,
	tomlQuery,
	vueQuery,
	luaQuery,
	systemrdlQuery,
	tlaPlusQuery,
	zigQuery,
	embeddedTemplateQuery,
	elispQuery,
	elixirQuery,
	onecQuery,
} from "./queries"
import { onecQueries } from "./queries/onec"

export interface LanguageParser {
	[key: string]: {
		parser: Parser
		query: Query
	}
}

export type LanguageResolution =
	| {
			languageId: string
			parserKey: string
			query: string
	  }
	| { skip: true }

const EXTENSION_LANGUAGE_MAP: Record<string, LanguageResolution> = {
	js: { languageId: "javascript", parserKey: "js", query: javascriptQuery },
	jsx: { languageId: "javascript", parserKey: "jsx", query: javascriptQuery },
	json: { languageId: "javascript", parserKey: "json", query: javascriptQuery },
	ts: { languageId: "typescript", parserKey: "ts", query: typescriptQuery },
	tsx: { languageId: "tsx", parserKey: "tsx", query: tsxQuery },
	py: { languageId: "python", parserKey: "py", query: pythonQuery },
	rs: { languageId: "rust", parserKey: "rs", query: rustQuery },
	go: { languageId: "go", parserKey: "go", query: goQuery },
	cpp: { languageId: "cpp", parserKey: "cpp", query: cppQuery },
	hpp: { languageId: "cpp", parserKey: "hpp", query: cppQuery },
	c: { languageId: "c", parserKey: "c", query: cQuery },
	h: { languageId: "c", parserKey: "h", query: cQuery },
	cs: { languageId: "c_sharp", parserKey: "cs", query: csharpQuery },
	rb: { languageId: "ruby", parserKey: "rb", query: rubyQuery },
	java: { languageId: "java", parserKey: "java", query: javaQuery },
	php: { languageId: "php", parserKey: "php", query: phpQuery },
	swift: { languageId: "swift", parserKey: "swift", query: swiftQuery },
	kt: { languageId: "kotlin", parserKey: "kt", query: kotlinQuery },
	kts: { languageId: "kotlin", parserKey: "kts", query: kotlinQuery },
	css: { languageId: "css", parserKey: "css", query: cssQuery },
	html: { languageId: "html", parserKey: "html", query: htmlQuery },
	htm: { languageId: "html", parserKey: "htm", query: htmlQuery },
	ml: { languageId: "ocaml", parserKey: "ml", query: ocamlQuery },
	mli: { languageId: "ocaml", parserKey: "mli", query: ocamlQuery },
	scala: { languageId: "scala", parserKey: "scala", query: luaQuery },
	sol: { languageId: "solidity", parserKey: "sol", query: solidityQuery },
	toml: { languageId: "toml", parserKey: "toml", query: tomlQuery },
	vue: { languageId: "vue", parserKey: "vue", query: vueQuery },
	lua: { languageId: "lua", parserKey: "lua", query: luaQuery },
	rdl: { languageId: "systemrdl", parserKey: "rdl", query: systemrdlQuery },
	tla: { languageId: "tlaplus", parserKey: "tla", query: tlaPlusQuery },
	zig: { languageId: "zig", parserKey: "zig", query: zigQuery },
	ejs: { languageId: "embedded_template", parserKey: "embedded_template", query: embeddedTemplateQuery },
	erb: { languageId: "embedded_template", parserKey: "embedded_template", query: embeddedTemplateQuery },
	el: { languageId: "elisp", parserKey: "el", query: elispQuery },
	ex: { languageId: "elixir", parserKey: "ex", query: elixirQuery },
	exs: { languageId: "elixir", parserKey: "exs", query: elixirQuery },
	bsl: { languageId: "onec", parserKey: "bsl", query: onecQuery },
	os: { languageId: "onec", parserKey: "os", query: onecQuery },
	mdo: { skip: true },
	xdto: { skip: true },
	form: { skip: true },
	mxlx: { skip: true },
	vb: { skip: true },
}

const LANGUAGE_QUERY_MAP: Record<string, string> = {
	javascript: javascriptQuery,
	typescript: typescriptQuery,
	tsx: tsxQuery,
	python: pythonQuery,
	rust: rustQuery,
	go: goQuery,
	cpp: cppQuery,
	c: cQuery,
	c_sharp: csharpQuery,
	ruby: rubyQuery,
	java: javaQuery,
	php: phpQuery,
	swift: swiftQuery,
	kotlin: kotlinQuery,
	css: cssQuery,
	html: htmlQuery,
	ocaml: ocamlQuery,
	scala: luaQuery,
	solidity: solidityQuery,
	toml: tomlQuery,
	vue: vueQuery,
	lua: luaQuery,
	systemrdl: systemrdlQuery,
	tlaplus: tlaPlusQuery,
	zig: zigQuery,
	embedded_template: embeddedTemplateQuery,
	elisp: elispQuery,
	elixir: elixirQuery,
	onec: onecQuery,
}

// kilocode_change: 2026-01-24 - shared language resolution for graph + search
export function resolveLanguageConfig(extension: string): LanguageResolution | null {
	return EXTENSION_LANGUAGE_MAP[extension.toLowerCase()] ?? null
}

export function normalizeLanguageId(language: string): string | null {
	const normalized = language.trim().toLowerCase().replace(/^\./, "")
	if (normalized === "1c") {
		return "onec"
	}

	const resolved = resolveLanguageConfig(normalized)
	if (resolved && !("skip" in resolved)) {
		return resolved.languageId
	}

	return LANGUAGE_QUERY_MAP[normalized] ? normalized : null
}

export function getDefinitionQueryForLanguage(languageId: string): string | null {
	return LANGUAGE_QUERY_MAP[languageId] ?? null
}

export function getGraphQueryForLanguage(languageId: string): string | null {
	if (languageId === "onec") {
		return onecQueries.full
	}
	return getDefinitionQueryForLanguage(languageId)
}

/**
 * Загрузка языка через TreeSitterParserManager
 * Обеспечивает централизованное кэширование и единообразную инициализацию
 */
async function loadLanguage(langName: string, sourceDirectory?: string) {
	const manager = getParserManager()
	
	// Определяем путь к WASM файлу
	let wasmPath: string | undefined
	if (sourceDirectory) {
		wasmPath = path.join(sourceDirectory, `tree-sitter-${langName}.wasm`)
	}

	try {
		// Используем централизованный ParserManager для загрузки
		return await manager.getLanguage(langName, wasmPath)
	} catch (error) {
		console.error(`Error loading language ${langName}: ${error instanceof Error ? error.message : error}`)
		throw error
	}
}

/*
Using node bindings for tree-sitter is problematic in vscode extensions
because of incompatibility with electron. Going the .wasm route has the
advantage of not having to build for multiple architectures.

We use web-tree-sitter and tree-sitter-wasms which provides auto-updating
prebuilt WASM binaries for tree-sitter's language parsers.

This function loads WASM modules for relevant language parsers based on input files:
1. Extracts unique file extensions
2. Maps extensions to language names
3. Loads corresponding WASM files (containing grammar rules)
4. Uses WASM modules to initialize tree-sitter parsers via TreeSitterParserManager

This approach optimizes performance by loading only necessary parsers once for all relevant files.
The TreeSitterParserManager ensures consistent initialization and caching across all components.

Sources:
- https://github.com/tree-sitter/node-tree-sitter/issues/169
- https://github.com/tree-sitter/node-tree-sitter/issues/168
- https://github.com/Gregoor/tree-sitter-wasms/blob/main/README.md
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/test/query-test.js
*/
export async function loadRequiredLanguageParsers(filesToParse: string[], sourceDirectory?: string) {
	// Используем централизованный ParserManager для инициализации и кэширования
	const manager = getParserManager()

	const extensionsToLoad = new Set(filesToParse.map((file) => path.extname(file).toLowerCase().slice(1)))
	const parsers: LanguageParser = {}

	for (const ext of extensionsToLoad) {
		const resolution = resolveLanguageConfig(ext)
		if (!resolution) {
			throw new Error(`Unsupported language: ${ext}`)
		}
		if ("skip" in resolution) {
			continue
		}

		const language = await loadLanguage(resolution.languageId, sourceDirectory)
		const query = language.query(resolution.query)
		const parserKey = resolution.parserKey
		const languageId = resolution.languageId

		// Определяем путь к WASM (если указан sourceDirectory)
		let wasmPath: string | undefined
		if (sourceDirectory) {
			wasmPath = path.join(sourceDirectory, `tree-sitter-${languageId}.wasm`)
		}

		const parser = await manager.getParser(languageId, wasmPath)
		parsers[parserKey] = { parser, query }
	}

	return parsers
}
