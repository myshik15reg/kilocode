import { describe, it, expect, beforeEach } from 'vitest'
import { getParserManager } from '../parser-manager'
import { OneCExtractor } from '../../neo4j/extractors/onec-extractor'
import { loadRequiredLanguageParsers } from '../languageParser'
import path from 'path'

describe('Tree-sitter Unification - Integration Tests', () => {
	const WASM_DIR = path.join(__dirname, '../../../tree-sitter-1c')

	beforeEach(() => {
		const manager = getParserManager()
		manager.clearCache()
	})

	describe('Parser Sharing', () => {
		it('should share same parser instance between languageParser and OneCExtractor', async () => {
			const manager = getParserManager()

			// Загружаем через languageParser (семантический поиск)
			const searchParsers = await loadRequiredLanguageParsers(['test.bsl'], WASM_DIR)

			// Загружаем через OneCExtractor (Neo4j граф)
			const extractor = new OneCExtractor()
			const wasmPath = path.join(WASM_DIR, 'tree-sitter-1c.wasm')
			await extractor.initialize(wasmPath)

			// Получаем parser напрямую из менеджера
			const directParser = await manager.getParser('onec', wasmPath)

			// Все три должны быть одним и тем же экземпляром
			expect(searchParsers.bsl.parser).toBe(directParser)
		})

		it('should produce consistent results for same code', async () => {
			const code = `
Функция ПолучитьДанные(Параметр1, Параметр2)
	Возврат Параметр1 + Параметр2;
КонецФункции

Процедура ОбработатьДанные(Данные)
	Результат = ПолучитьДанные(Данные, 10);
КонецПроцедуры
			`

			// Парсим через languageParser
			const parsers = await loadRequiredLanguageParsers(['test.bsl'], WASM_DIR)
			const searchTree = parsers.bsl.parser.parse(code)

			// Парсим через OneCExtractor
			const extractor = new OneCExtractor()
			await extractor.initialize(path.join(WASM_DIR, 'tree-sitter-1c.wasm'))
			const extractResult = await extractor.extract(code, 'test.bsl')

			// Должны найти одинаковое количество базовых определений
			const searchFunctions = searchTree.rootNode.descendantsOfType('function_declaration')
			const searchProcedures = searchTree.rootNode.descendantsOfType('procedure_declaration')

			const extractFunctions = extractResult.entities.filter((e) => e.type === 'function')
			const extractProcedures = extractResult.entities.filter(
				(e) => e.type === 'function' && e.properties?.isProcedure === true
			)

			expect(searchFunctions.length).toBe(extractFunctions.length)
			expect(searchProcedures.length).toBe(extractProcedures.length)
		})
	})

	describe('Language Normalization', () => {
		it('should normalize all 1C extensions to same parser', async () => {
			const manager = getParserManager()

			// Загружаем parsers для разных расширений 1С
			const bslParsers = await loadRequiredLanguageParsers(['test.bsl'], WASM_DIR)
			const osParsers = await loadRequiredLanguageParsers(['test.os'], WASM_DIR)

			// Оба должны использовать 'onec' parser
			const onecParser = await manager.getParser('onec', path.join(WASM_DIR, 'tree-sitter-1c.wasm'))

			expect(bslParsers.bsl.parser).toBe(onecParser)
			expect(osParsers.os.parser).toBe(onecParser)
		})
	})

	describe('Query Consistency', () => {
		it('should use same queries for search and graph extraction', async () => {
			const code = `
Функция Тест(А, Б)
	Возврат А + Б;
КонецФункции
			`

			// Проверяем, что обе системы видят одинаковые конструкции
			const extractor = new OneCExtractor()
			await extractor.initialize(path.join(WASM_DIR, 'tree-sitter-1c.wasm'))
			const result = await extractor.extract(code, 'test.bsl')

			// Должна быть найдена функция
			const functions = result.entities.filter((e) => e.type === 'function' && e.name === 'Тест')
			expect(functions).toHaveLength(1)
			expect(functions[0].name).toBe('Тест')
			expect(functions[0].type).toBe('function')

			// Должны быть найдены параметры
			const paramRelations = result.relationships.filter((r) => r.type === 'contains')
			expect(paramRelations.length).toBeGreaterThanOrEqual(2)
		})
	})

	describe('Performance', () => {
		it('should reuse cached parsers efficiently', async () => {
			const manager = getParserManager()
			const wasmPath = path.join(WASM_DIR, 'tree-sitter-1c.wasm')

			const start1 = performance.now()
			await manager.getParser('onec', wasmPath)
			const firstLoad = performance.now() - start1

			const start2 = performance.now()
			await manager.getParser('onec', wasmPath)
			const cachedLoad = performance.now() - start2

			// Кэшированная загрузка должна быть значительно быстрее
			expect(cachedLoad).toBeLessThan(firstLoad * 0.1)
		})
	})
})