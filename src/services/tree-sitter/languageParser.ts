import * as path from "path"
import Parser from "web-tree-sitter"
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

export interface LanguageParser {
	[key: string]: {
		parser: Parser
		query: Parser.Query
	}
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
		let language: Parser.Language
		let query: Parser.Query
		let parserKey = ext // Default to using extension as key

		switch (ext) {
		case "js":
		case "jsx":
		case "json":
			language = await loadLanguage("javascript", sourceDirectory)
			query = new Parser.Query(language, javascriptQuery)
			break
			case "ts":
				language = await loadLanguage("typescript", sourceDirectory)
				query = new Parser.Query(language, typescriptQuery)
				break
			case "tsx":
				language = await loadLanguage("tsx", sourceDirectory)
				query = new Parser.Query(language, tsxQuery)
				break
			case "py":
				language = await loadLanguage("python", sourceDirectory)
				query = new Parser.Query(language, pythonQuery)
				break
			case "rs":
				language = await loadLanguage("rust", sourceDirectory)
				query = new Parser.Query(language, rustQuery)
				break
			case "go":
				language = await loadLanguage("go", sourceDirectory)
				query = new Parser.Query(language, goQuery)
				break
			case "cpp":
			case "hpp":
				language = await loadLanguage("cpp", sourceDirectory)
				query = new Parser.Query(language, cppQuery)
				break
			case "c":
			case "h":
				language = await loadLanguage("c", sourceDirectory)
				query = new Parser.Query(language, cQuery)
				break
			case "cs":
				language = await loadLanguage("c_sharp", sourceDirectory)
				query = new Parser.Query(language, csharpQuery)
				break
			case "rb":
				language = await loadLanguage("ruby", sourceDirectory)
				query = new Parser.Query(language, rubyQuery)
				break
			case "java":
				language = await loadLanguage("java", sourceDirectory)
				query = new Parser.Query(language, javaQuery)
				break
			case "php":
				language = await loadLanguage("php", sourceDirectory)
				query = new Parser.Query(language, phpQuery)
				break
			case "swift":
				language = await loadLanguage("swift", sourceDirectory)
				query = new Parser.Query(language, swiftQuery)
				break
			case "kt":
			case "kts":
				language = await loadLanguage("kotlin", sourceDirectory)
				query = new Parser.Query(language, kotlinQuery)
				break
			case "css":
				language = await loadLanguage("css", sourceDirectory)
				query = new Parser.Query(language, cssQuery)
				break
			case "html":
				language = await loadLanguage("html", sourceDirectory)
				query = new Parser.Query(language, htmlQuery)
				break
			case "ml":
			case "mli":
				language = await loadLanguage("ocaml", sourceDirectory)
				query = new Parser.Query(language, ocamlQuery)
				break
			case "scala":
				language = await loadLanguage("scala", sourceDirectory)
				query = new Parser.Query(language, luaQuery) // Temporarily use Lua query until Scala is implemented
				break
			case "sol":
				language = await loadLanguage("solidity", sourceDirectory)
				query = new Parser.Query(language, solidityQuery)
				break
			case "toml":
				language = await loadLanguage("toml", sourceDirectory)
				query = new Parser.Query(language, tomlQuery)
				break
			case "vue":
				language = await loadLanguage("vue", sourceDirectory)
				query = new Parser.Query(language, vueQuery)
				break
			case "lua":
				language = await loadLanguage("lua", sourceDirectory)
				query = new Parser.Query(language, luaQuery)
				break
			case "rdl":
				language = await loadLanguage("systemrdl", sourceDirectory)
				query = new Parser.Query(language, systemrdlQuery)
				break
			case "tla":
				language = await loadLanguage("tlaplus", sourceDirectory)
				query = new Parser.Query(language, tlaPlusQuery)
				break
			case "zig":
				language = await loadLanguage("zig", sourceDirectory)
				query = new Parser.Query(language, zigQuery)
				break
			case "ejs":
			case "erb":
				parserKey = "embedded_template" // Use same key for both extensions.
				language = await loadLanguage("embedded_template", sourceDirectory)
				query = new Parser.Query(language, embeddedTemplateQuery)
				break
			case "el":
				language = await loadLanguage("elisp", sourceDirectory)
				query = new Parser.Query(language, elispQuery)
				break
			case "ex":
			case "exs":
				language = await loadLanguage("elixir", sourceDirectory)
				query = new Parser.Query(language, elixirQuery)
				break
			// 1C:Enterprise BSL files - use tree-sitter parser
			case "bsl":
			case "os":
				language = await loadLanguage("onec", sourceDirectory)
				query = new Parser.Query(language, onecQuery)
				break
			// 1C:Enterprise metadata files - use fallback chunking (not BSL code)
			case "mdo":
			case "xdto":
			case "form":
			case "mxlx":
				// Skip these extensions - they will be handled by fallback chunking in parser.ts
				continue
			case "vb":
				// Visual Basic .NET - uses fallback chunking
				continue
			default:
				throw new Error(`Unsupported language: ${ext}`)
		}

		// Получаем парсер через ParserManager для централизованного кэширования
		// Определяем languageId на основе расширения
		let languageId: string
		switch (ext) {
			case "js":
			case "jsx":
			case "json":
				languageId = "javascript"
				break
			case "ts":
				languageId = "typescript"
				break
			case "bsl":
			case "os":
				languageId = "onec"
				break
			case "ejs":
			case "erb":
				languageId = "embedded_template"
				break
			default:
				// Для остальных расширений используем parserKey
				languageId = parserKey
		}

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
