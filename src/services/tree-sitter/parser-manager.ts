import { Parser, Language } from 'web-tree-sitter'

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

		// Загружаем новый язык
		if (!wasmPath) {
			// Используем стандартное расположение
			wasmPath = `tree-sitter-${languageId}.wasm`
		}

		const language = await Language.load(wasmPath)
		this.languages.set(languageId, language)
		return language
	}

	/**
	 * Парсить код с использованием кэшированного парсера
	 */
	async parse(languageId: string, code: string, wasmPath?: string): Promise<ReturnType<Parser['parse']>> {
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