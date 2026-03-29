import { Parser, Language } from "web-tree-sitter"
import * as fs from "fs"
import * as path from "path"

/**
 * Централизованный менеджер для загрузки и кэширования Tree-sitter парсеров
 * Обеспечивает единую точку истины для всех компонентов системы
 */
export class TreeSitterParserManager {
	private static instance: TreeSitterParserManager
	private parsers: Map<string, Parser> = new Map()
	private languages: Map<string, Language> = new Map()
	private initialized: boolean = false

	private constructor() {}

	/**
	 * Получить singleton instance
	 */
	static getInstance(): TreeSitterParserManager {
		if (!TreeSitterParserManager.instance) {
			TreeSitterParserManager.instance = new TreeSitterParserManager()
		}
		return TreeSitterParserManager.instance
	}

	/**
	 * Инициализировать Tree-sitter (вызывается один раз)
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return
		await Parser.init()
		this.initialized = true
	}

	/**
	 * Получить парсер для языка (создаёт новый или возвращает из кэша)
	 * @param languageId - идентификатор языка (например, "onec", "typescript")
	 * @param wasmPath - опциональный путь к WASM файлу
	 */
	async getParser(languageId: string, wasmPath?: string): Promise<Parser> {
		await this.initialize()

		// Возвращаем из кэша если есть
		if (this.parsers.has(languageId)) {
			return this.parsers.get(languageId)!
		}

		// Создаём новый парсер
		const parser = new Parser()
		const language = await this.getLanguage(languageId, wasmPath)
		parser.setLanguage(language)
		this.parsers.set(languageId, parser)
		return parser
	}

	/**
	 * Получить язык для парсера
	 */
	async getLanguage(languageId: string, wasmPath?: string): Promise<Language> {
		await this.initialize()

		// Возвращаем из кэша если есть
		if (this.languages.has(languageId)) {
			return this.languages.get(languageId)!
		}

		const { wasmPath: resolvedWasmPath, triedPaths } = this.resolveWasmPath(languageId, wasmPath)
		try {
			const language = await Language.load(resolvedWasmPath)
			this.languages.set(languageId, language)
			return language
		} catch (error) {
			// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
			// Root cause: when wasmPath isn't provided, defaulting to `tree-sitter-${languageId}.wasm` relative to cwd breaks `cd src` test runs,
			// which makes Neo4j indexing silently fall back to the plainText extractor.
			const reason = error instanceof Error ? error.message : String(error)
			throw new Error(
				`Failed to load Tree-sitter language "${languageId}" from "${resolvedWasmPath}". Reason: ${reason}. Tried paths: ${triedPaths.join(
					", ",
				)}`,
			)
		}
	}

	// FIX: 2026-02-19-neo4j-integration (TestAnalyzer)
	// Root cause: default WASM path `tree-sitter-${languageId}.wasm` is cwd-dependent; integration tests run from `cd src`.
	// Resolution: prefer packaged/runtime locations and remove dependence on the repo-root grammar workspace.
	private resolveWasmPath(languageId: string, wasmPath?: string): { wasmPath: string; triedPaths: string[] } {
		if (wasmPath) {
			return { wasmPath, triedPaths: [wasmPath] }
		}

		const filename = `tree-sitter-${languageId}.wasm`

		const candidatePaths = [
			// TS source layout: src/services/tree-sitter -> src/dist
			path.join(__dirname, "..", "..", "dist", filename),
			// Compiled layout: dist/services/tree-sitter -> dist/
			path.join(__dirname, "..", "..", filename),
			// Node package layout for tests: src/node_modules/tree-sitter-wasms/out
			path.join(__dirname, "..", "..", "node_modules", "tree-sitter-wasms", "out", filename),

			// Monorepo root fallbacks
			path.join(__dirname, "..", "..", "..", "src", "dist", filename),
			path.join(__dirname, "..", "..", "..", "dist", filename),
			path.join(__dirname, "..", "..", "..", "src", "node_modules", "tree-sitter-wasms", "out", filename),
			path.join(__dirname, "..", "..", "..", "node_modules", "tree-sitter-wasms", "out", filename),

			// CWD-based fallbacks (legacy)
			path.join(process.cwd(), "dist", filename),
			path.join(process.cwd(), filename),
		]

		const resolved = candidatePaths.find((candidate) => fs.existsSync(candidate))
		return { wasmPath: resolved ?? filename, triedPaths: candidatePaths }
	}

	/**
	 * Парсить код с использованием кэшированного парсера
	 */
	async parse(languageId: string, code: string, wasmPath?: string): Promise<ReturnType<Parser["parse"]>> {
		const parser = await this.getParser(languageId, wasmPath)
		return parser.parse(code)
	}

	/**
	 * Очистить кэш (для тестов)
	 */
	clearCache(): void {
		this.parsers.clear()
		this.languages.clear()
	}
}

/**
 * Convenience функция для получения менеджера
 */
export function getParserManager(): TreeSitterParserManager {
	return TreeSitterParserManager.getInstance()
}
