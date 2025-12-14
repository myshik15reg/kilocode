import { describe, it, expect, beforeEach } from 'vitest'
import { OneCExtractor } from '../onec-extractor'
import path from 'path'

describe('OneCExtractor (Unified)', () => {
	let extractor: OneCExtractor
	const wasmPath = path.join(process.cwd(), 'dist/tree-sitter-onec.wasm')

	beforeEach(async () => {
		extractor = new OneCExtractor()
		await extractor.initialize(wasmPath)
	})

	describe('Function extraction', () => {
		it('should extract function entities', async () => {
			const code = `
Функция ПолучитьДанные(Параметр1, Параметр2)
	Возврат Параметр1 + Параметр2;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			// Должна быть файловая entity и функция
			expect(result.entities.length).toBeGreaterThanOrEqual(2)

			const functionEntity = result.entities.find((e) => e.type === 'function' && e.name === 'ПолучитьДанные')
			expect(functionEntity).toBeDefined()
			expect(functionEntity?.properties?.isProcedure).toBe(false)
		})

		it('should extract function with export modifier', async () => {
			const code = `
Функция ПолучитьДанные() Экспорт
	Возврат Истина;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const functionEntity = result.entities.find((e) => e.type === 'function')
			expect(functionEntity).toBeDefined()
			expect(functionEntity?.properties?.export).toBe(true)
		})

		it('should extract multiple functions', async () => {
			const code = `
Функция Функция1()
	Возврат 1;
КонецФункции

Функция Функция2()
	Возврат 2;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const functions = result.entities.filter((e) => e.type === 'function')
			expect(functions.length).toBe(2)
			expect(functions.find((f) => f.name === 'Функция1')).toBeDefined()
			expect(functions.find((f) => f.name === 'Функция2')).toBeDefined()
		})
	})

	describe('Procedure extraction', () => {
		it('should extract procedure entities', async () => {
			const code = `
Процедура ОбработатьДанные(Данные)
	// Обработка
КонецПроцедуры
			`
			const result = await extractor.extract(code, 'test.bsl')

			expect(result.entities.length).toBeGreaterThanOrEqual(2)

			const procedureEntity = result.entities.find((e) => e.type === 'function' && e.name === 'ОбработатьДанные')
			expect(procedureEntity).toBeDefined()
			expect(procedureEntity?.properties?.isProcedure).toBe(true)
		})

		it('should extract procedure with export modifier', async () => {
			const code = `
Процедура Инициализация() Экспорт
	// Код инициализации
КонецПроцедуры
			`
			const result = await extractor.extract(code, 'test.bsl')

			const procedureEntity = result.entities.find((e) => e.type === 'function')
			expect(procedureEntity).toBeDefined()
			expect(procedureEntity?.properties?.export).toBe(true)
			expect(procedureEntity?.properties?.isProcedure).toBe(true)
		})
	})

	describe('Parameter extraction', () => {
		it('should extract parameters as relationships', async () => {
			const code = `
Функция Сумма(А, Б)
	Возврат А + Б;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			// Должны быть entity параметров
			const paramEntities = result.entities.filter(
				(e) => e.type === 'variable' && e.properties?.isParameter === true
			)
			expect(paramEntities.length).toBe(2)

			// Проверяем имена параметров
			const paramNames = paramEntities.map((e) => e.name).sort()
			expect(paramNames).toEqual(['А', 'Б'])

			// Должны быть relationships 'contains' от функции к параметрам
			const paramRelations = result.relationships.filter((r) => r.type === 'contains')
			expect(paramRelations.length).toBeGreaterThanOrEqual(2)
		})

		it('should extract parameter with default value', async () => {
			const code = `
Функция ПолучитьЗначение(Параметр = 10)
	Возврат Параметр;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const paramEntity = result.entities.find(
				(e) => e.type === 'variable' && e.properties?.isParameter === true && e.name === 'Параметр'
			)
			expect(paramEntity).toBeDefined()
			expect(paramEntity?.properties?.hasDefault).toBe(true)
		})

		it('should extract parameter passed by value', async () => {
			const code = `
Функция Обработка(Знач Данные)
	Возврат Данные;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const paramEntity = result.entities.find(
				(e) => e.type === 'variable' && e.properties?.isParameter === true && e.name === 'Данные'
			)
			expect(paramEntity).toBeDefined()
			expect(paramEntity?.properties?.byValue).toBe(true)
		})
	})

	describe('Function calls extraction', () => {
		it('should extract function calls as relationships', async () => {
			const code = `
Функция ОсновнаяФункция()
	Результат = ВспомогательнаяФункция();
	Возврат Результат;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const callRelations = result.relationships.filter((r) => r.type === 'calls')
			expect(callRelations.length).toBeGreaterThanOrEqual(1)

			const call = callRelations.find((r) => r.target === 'function:ВспомогательнаяФункция')
			expect(call).toBeDefined()
			expect(call?.source).toContain('ОсновнаяФункция')
		})

		it('should extract multiple function calls', async () => {
			const code = `
Функция Обработка()
	Результат1 = Функция1();
	Результат2 = Функция2();
	Возврат Результат1 + Результат2;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const callRelations = result.relationships.filter((r) => r.type === 'calls')
			expect(callRelations.length).toBeGreaterThanOrEqual(2)
		})
	})

	describe('File entity', () => {
		it('should always create file entity', async () => {
			const code = `
Функция Тест()
	Возврат Истина;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const fileEntity = result.entities.find((e) => e.type === 'file')
			expect(fileEntity).toBeDefined()
			expect(fileEntity?.name).toBe('test.bsl')
			expect(fileEntity?.language).toBe('1c')
		})

		it('should create defines relationships from file to functions', async () => {
			const code = `
Функция Тест()
	Возврат Истина;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const definesRelations = result.relationships.filter((r) => r.type === 'defines')
			expect(definesRelations.length).toBeGreaterThanOrEqual(1)

			const defines = definesRelations.find((r) => r.source === 'file:test.bsl')
			expect(defines).toBeDefined()
			expect(defines?.properties?.entityType).toMatch(/function|procedure/)
		})
	})

	describe('Semantic search consistency', () => {
		it('should produce same entities as semantic search would', async () => {
			// Критический тест: убедиться что базовые определения
			// извлекаются одинаково для семантического поиска и графа
			const code = `
Функция Тест()
	Возврат Истина;
КонецФункции

Процедура ТестПроцедура()
	// Код
КонецПроцедуры
			`
			const result = await extractor.extract(code, 'test.bsl')

			// Должны быть извлечены 1 функция и 1 процедура + 1 файл
			const entities = result.entities.filter((e) => e.type === 'function')
			expect(entities).toHaveLength(2)

			const functionEntity = entities.find((e) => e.properties?.isProcedure === false)
			const procedureEntity = entities.find((e) => e.properties?.isProcedure === true)

			expect(functionEntity).toBeDefined()
			expect(functionEntity?.name).toBe('Тест')

			expect(procedureEntity).toBeDefined()
			expect(procedureEntity?.name).toBe('ТестПроцедура')
		})

		it('should extract line numbers for all entities', async () => {
			const code = `
Функция ПерваяФункция()
	Возврат 1;
КонецФункции

Функция ВтораяФункция()
	Возврат 2;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			const functions = result.entities.filter((e) => e.type === 'function')
			
			// Все функции должны иметь номера строк
			functions.forEach((func) => {
				expect(func.line).toBeGreaterThan(0)
			})

			// Проверяем что строки различаются
			const lines = functions.map((f) => f.line)
			expect(new Set(lines).size).toBe(functions.length)
		})
	})

	describe('Complex code extraction', () => {
		it('should handle complex code with nested calls', async () => {
			const code = `
Функция ВнешняяФункция()
	Результат = ВнутренняяФункция(ПолучитьДанные());
	Возврат Результат;
КонецФункции

Функция ВнутренняяФункция(Данные)
	Возврат Данные * 2;
КонецФункции

Функция ПолучитьДанные()
	Возврат 42;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			// Должны быть извлечены 3 функции
			const functions = result.entities.filter((e) => e.type === 'function')
			expect(functions).toHaveLength(3)

			// Должны быть вызовы функций
			const calls = result.relationships.filter((r) => r.type === 'calls')
			expect(calls.length).toBeGreaterThanOrEqual(2)
		})

		it('should handle functions and procedures mixed', async () => {
			const code = `
Процедура Инициализация()
	Данные = ПолучитьДанные();
	ОбработатьДанные(Данные);
КонецПроцедуры

Функция ПолучитьДанные()
	Возврат Новый Массив;
КонецФункции

Процедура ОбработатьДанные(Данные)
	// Обработка
КонецПроцедуры
			`
			const result = await extractor.extract(code, 'test.bsl')

			const procedures = result.entities.filter((e) => e.type === 'function' && e.properties?.isProcedure === true)
			const functions = result.entities.filter(
				(e) => e.type === 'function' && e.properties?.isProcedure === false
			)

			expect(procedures).toHaveLength(2)
			expect(functions).toHaveLength(1)
		})
	})

	describe('Error handling', () => {
		it('should throw error if not initialized', async () => {
			const uninitializedExtractor = new OneCExtractor()
			
			await expect(uninitializedExtractor.extract('code', 'test.bsl')).rejects.toThrow(
				'Extractor not initialized'
			)
		})

		it('should handle empty code gracefully', async () => {
			const result = await extractor.extract('', 'test.bsl')

			// Должна быть только файловая entity
			expect(result.entities).toHaveLength(1)
			expect(result.entities[0].type).toBe('file')
			expect(result.relationships).toHaveLength(0)
		})

		it('should handle code with syntax errors gracefully', async () => {
			const code = `
Функция НеполнаяФункция(
	// Отсутствует закрывающая скобка
			`
			
			// Не должно падать, просто не извлечёт некорректные конструкции
			const result = await extractor.extract(code, 'test.bsl')
			expect(result.entities).toBeDefined()
			expect(result.relationships).toBeDefined()
		})
	})

	describe('ILanguageExtractor interface compliance', () => {
		it('should implement extract method', () => {
			expect(typeof extractor.extract).toBe('function')
		})

		it('should return ExtractionResult', async () => {
			const code = `
Функция Тест()
	Возврат Истина;
КонецФункции
			`
			const result = await extractor.extract(code, 'test.bsl')

			expect(result).toHaveProperty('entities')
			expect(result).toHaveProperty('relationships')
			expect(Array.isArray(result.entities)).toBe(true)
			expect(Array.isArray(result.relationships)).toBe(true)
		})
	})
})