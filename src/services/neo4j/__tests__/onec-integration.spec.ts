import { describe, it, expect, beforeAll } from 'vitest'
import { RelationshipExtractor } from '../relationship-extractor'

/**
 * Интеграционные тесты для проверки полной интеграции 1С в систему RelationshipExtractor.
 * Тесты проверяют:
 * - Определение языка по расширениям файлов
 * - Извлечение сущностей и связей из кода 1С
 * - Обработку модификаторов Экспорт и Знач
 */
describe('1C Integration with RelationshipExtractor', () => {
	let extractor: RelationshipExtractor

	beforeAll(() => {
		extractor = new RelationshipExtractor()
	})

	describe('Language Detection', () => {
		it('should detect 1C language from .bsl extension', () => {
			const filePath = 'test.bsl'
			const language = extractor.detectLanguage(filePath)
			expect(language).toBe('1c')
		})

		it('should detect 1C language from .os extension', () => {
			const filePath = 'module.os'
			const language = extractor.detectLanguage(filePath)
			expect(language).toBe('1c')
		})

		it('should handle uppercase extensions', () => {
			const language = extractor.detectLanguage('file.BSL')
			expect(language).toBe('1c')
		})

		it('should return null for unknown extensions', () => {
			const language = extractor.detectLanguage('file.unknown')
			expect(language).toBeNull()
		})
	})

	describe('Code Extraction', () => {
		it('should extract entities from 1C code with procedures', async () => {
			const code = `
Процедура ТестоваяПроцедура()
	Переменная = 10;
КонецПроцедуры
			`.trim()

			const result = await extractor.extract(code, 'test.bsl', '1c')

			expect(result.entities).toBeDefined()
			expect(result.relationships).toBeDefined()
			expect(result.entities.length).toBeGreaterThan(0)

			// Проверяем, что есть процедура
			const procedureEntity = result.entities.find(
				e => e.type === 'function' && e.properties?.isProcedure === true
			)
			expect(procedureEntity).toBeDefined()
			expect(procedureEntity?.name).toBe('ТестоваяПроцедура')
		})

		it('should extract entities from 1C code with functions', async () => {
			const code = `
Функция Сложить(А, Б)
	Возврат А + Б;
КонецФункции
			`.trim()

			const result = await extractor.extract(code, 'calc.bsl', '1c')

			expect(result.entities.length).toBeGreaterThan(0)

			// Проверяем функцию
			const functionEntity = result.entities.find(
				e => e.type === 'function' && e.name === 'Сложить'
			)
			expect(functionEntity).toBeDefined()
			expect(functionEntity?.properties?.isProcedure).toBe(false)

			// Проверяем параметры
			const parameters = result.entities.filter(
				e => e.type === 'variable' && e.properties?.isParameter === true
			)
			expect(parameters.length).toBe(2)
			expect(parameters.map(p => p.name)).toEqual(expect.arrayContaining(['А', 'Б']))
		})

		it('should extract relationships between entities', async () => {
			const code = `
Функция ВычислитьСумму(Число1, Число2)
	Результат = Число1 + Число2;
	Возврат Результат;
КонецФункции
			`.trim()

			const result = await extractor.extract(code, 'test.bsl', '1c')

			expect(result.relationships.length).toBeGreaterThan(0)

			// Проверяем типы relationships
			const relationshipTypes = result.relationships.map(r => r.type)
			expect(relationshipTypes).toEqual(expect.arrayContaining(['defines', 'contains']))
		})

		it('should handle bilingual 1C code (English keywords)', async () => {
			const code = `
Function Add(A, B)
	Return A + B;
EndFunction
			`.trim()

			const result = await extractor.extract(code, 'test.bsl', '1c')

			expect(result.entities.length).toBeGreaterThan(0)
			const functionEntity = result.entities.find(e => e.name === 'Add')
			expect(functionEntity).toBeDefined()
		})

		it('should auto-detect language from file extension', async () => {
			const code = `
Процедура Тест()
КонецПроцедуры
			`.trim()

			// Не передаем язык явно - должен определиться по расширению
			const result = await extractor.extract(code, 'module.bsl')

			expect(result.entities.length).toBeGreaterThan(0)
		})

		it('should throw error for unsupported language', async () => {
			await expect(
				extractor.extract('code', 'file.unsupported')
			).rejects.toThrow('Unable to detect language')
		})
	})

	describe('Export Modifier', () => {
		it('should detect export modifier on procedures', async () => {
			const code = `
Процедура ПубличнаяПроцедура() Экспорт
	// Код
КонецПроцедуры
			`.trim()

			const result = await extractor.extract(code, 'test.bsl', '1c')

			const exportedEntity = result.entities.find(
				e => e.name === 'ПубличнаяПроцедура'
			)
			expect(exportedEntity?.properties?.export).toBe(true)
		})
	})

	describe('Parameter Modifiers', () => {
		it('should detect parameter passed by value', async () => {
			const code = `
Функция Обработать(Знач Данные)
	Возврат Данные;
КонецФункции
			`.trim()

			const result = await extractor.extract(code, 'test.bsl', '1c')

			const paramEntity = result.entities.find(
				e => e.type === 'variable'
					&& e.name === 'Данные'
					&& e.properties?.isParameter === true
			)
			expect(paramEntity?.properties?.byValue).toBe(true)
		})
	})
})