import Parser from 'web-tree-sitter'
import type { Language, Query } from 'web-tree-sitter'
import { getParserManager } from './parser-manager'

type QueryType = Query

/**
 * Базовый класс для всех языковых экстракторов
 * Обеспечивает единообразную работу с Tree-sitter
 */
export abstract class BaseExtractor {
	protected languageId: string
	protected parser: Parser | null = null
	protected language: Language | null = null

	constructor(languageId: string) {
		this.languageId = languageId
	}

	/**
	 * Инициализировать экстрактор
	 * Использует централизованный ParserManager
	 */
	async initialize(wasmPath?: string): Promise<void> {
		const manager = getParserManager()
		this.parser = await manager.getParser(this.languageId, wasmPath)
		this.language = await manager.getLanguage(this.languageId, wasmPath)
	}

	/**
	 * Парсить код в AST
	 */
	protected async parseCode(code: string): Promise<Parser.Tree> {
		if (!this.parser) {
			throw new Error(`Extractor not initialized. Call initialize() first.`)
		}
		return this.parser.parse(code)
	}

	/**
	 * Выполнить query на дереве
	 */
	protected executeQuery(tree: Parser.Tree, queryString: string): Parser.QueryCapture[] {
		if (!this.language) {
			throw new Error(`Extractor not initialized. Call initialize() first.`)
		}
		const query = this.language.query(queryString)
		return query.captures(tree.rootNode)
	}

	/**
	 * Проверить инициализацию
	 */
	protected checkInitialized(): void {
		if (!this.parser || !this.language) {
			throw new Error(`Extractor not initialized. Call initialize() first.`)
		}
	}
}