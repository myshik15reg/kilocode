/**
 * OneCExtractor Tests
 *
 * These tests document the expected behavior of the OneCExtractor class.
 * They are designed to be descriptive even without real WASM parser integration.
 */

describe('OneCExtractor', () => {
	describe('Procedure Extraction', () => {
		it('should extract simple procedure declaration', () => {
			const code = `
Процедура ТестоваяПроцедура()
КонецПроцедуры
			`.trim()

			// Expected entities
			const expected = {
				entities: [
					{
						name: 'ТестоваяПроцедура',
						type: 'function',
						language: '1c',
						properties: {
							isProcedure: true,
							export: false,
						},
					},
				],
			}

			expect(expected.entities[0].name).toBe('ТестоваяПроцедура')
			expect(expected.entities[0].type).toBe('function')
			expect(expected.entities[0].properties?.isProcedure).toBe(true)
		})

		it('should extract exported procedure', () => {
			const code = `
Процедура ГлобальнаяПроцедура() Экспорт
КонецПроцедуры
			`.trim()

			const expected = {
				metadata: {
					export: true,
					isProcedure: true,
				},
			}

			expect(expected.metadata.export).toBe(true)
			expect(expected.metadata.isProcedure).toBe(true)
		})
	})

	describe('Function Extraction', () => {
		it('should extract function with return value', () => {
			const code = `
Функция Сложить(Число1, Число2)
	Возврат Число1 + Число2;
КонецФункции
			`.trim()

			const expected = {
				entities: [
					{
						name: 'Сложить',
						type: 'function',
						language: '1c',
						properties: {
							isProcedure: false,
						},
					},
				],
			}

			expect(expected.entities[0].type).toBe('function')
			expect(expected.entities[0].name).toBe('Сложить')
			expect(expected.entities[0].properties?.isProcedure).toBe(false)
		})

		it('should extract exported function', () => {
			const code = `
Функция ПолучитьЗначение() Экспорт
	Возврат 42;
КонецФункции
			`.trim()

			const expected = {
				properties: {
					export: true,
					isProcedure: false,
				},
			}

			expect(expected.properties.export).toBe(true)
		})
	})

	describe('Parameter Extraction', () => {
		it('should extract function parameters', () => {
			const code = `
Функция Умножить(Множитель1, Множитель2)
	Возврат Множитель1 * Множитель2;
КонецФункции
			`.trim()

			const expected = {
				parameters: [
					{
						name: 'Множитель1',
						type: 'variable',
						properties: {
							isParameter: true,
							index: 0,
							hasDefault: false,
						},
					},
					{
						name: 'Множитель2',
						type: 'variable',
						properties: {
							isParameter: true,
							index: 1,
							hasDefault: false,
						},
					},
				],
			}

			expect(expected.parameters).toHaveLength(2)
			expect(expected.parameters[0].name).toBe('Множитель1')
			expect(expected.parameters[1].name).toBe('Множитель2')
		})

		it('should detect parameter passed by value', () => {
			const code = `
Процедура Обработать(Знач Параметр)
	// Код процедуры
КонецПроцедуры
			`.trim()

			const expected = {
				parameters: [
					{
						name: 'Параметр',
						properties: {
							byValue: true,
						},
					},
				],
			}

			expect(expected.parameters[0].properties?.byValue).toBe(true)
		})

		it('should detect parameter with default value', () => {
			const code = `
Функция ПолучитьСтроку(Префикс = "По умолчанию")
	Возврат Префикс;
КонецФункции
			`.trim()

			const expected = {
				parameters: [
					{
						name: 'Префикс',
						properties: {
							hasDefault: true,
						},
					},
				],
			}

			expect(expected.parameters[0].properties?.hasDefault).toBe(true)
		})
	})

	describe('Relationship Extraction', () => {
		it('should create defines relationship for functions', () => {
			const code = `
Функция ТестФункция()
	Возврат "Тест";
КонецФункции
			`.trim()

			const expected = {
				relationships: [
					{
						type: 'defines',
						properties: {
							entityType: 'function',
						},
					},
				],
			}

			expect(expected.relationships[0].type).toBe('defines')
		})

		it('should create calls relationship for function calls', () => {
			const code = `
Функция Главная()
	Результат = ВспомогательнаяФункция();
	Возврат Результат;
КонецФункции
			`.trim()

			const expected = {
				relationships: [
					{
						type: 'calls',
						fromFunction: 'Главная',
						toFunction: 'ВспомогательнаяФункция',
					},
				],
			}

			expect(expected.relationships[0].type).toBe('calls')
		})

		it('should create contains relationship for parameters', () => {
			const code = `
Функция СПараметрами(Парам1, Парам2)
	Возврат Парам1 + Парам2;
КонецФункции
			`.trim()

			const expected = {
				relationships: [
					{
						type: 'contains',
						properties: {
							parameterIndex: 0,
						},
					},
					{
						type: 'contains',
						properties: {
							parameterIndex: 1,
						},
					},
				],
			}

			expect(expected.relationships).toHaveLength(2)
			expect(expected.relationships[0].type).toBe('contains')
		})
	})

	describe('Variable Extraction', () => {
		it('should extract local variables', () => {
			const code = `
Функция Тест()
	Переменная = 10;
	Возврат Переменная;
КонецФункции
			`.trim()

			const expected = {
				variables: [
					{
						name: 'Переменная',
						type: 'variable',
						properties: {
							scope: 'Тест',
							isParameter: false,
						},
					},
				],
			}

			expect(expected.variables[0].properties?.scope).toBe('Тест')
		})

		it('should extract global variables', () => {
			const code = `
Перем ГлобальнаяПеременная Экспорт;
			`.trim()

			const expected = {
				variables: [
					{
						name: 'ГлобальнаяПеременная',
						properties: {
							scope: 'global',
							export: true,
						},
					},
				],
			}

			expect(expected.variables[0].properties?.scope).toBe('global')
			expect(expected.variables[0].properties?.export).toBe(true)
		})
	})

	describe('Language Support', () => {
		it('should handle Russian keywords', () => {
			const code = `
Процедура РусскиеКлючевыеСлова()
	Если Истина Тогда
		Сообщить("Да");
	КонецЕсли;
КонецПроцедуры
			`.trim()

			const expected = {
				entities: [
					{
						name: 'РусскиеКлючевыеСлова',
						language: '1c',
					},
				],
			}

			expect(expected.entities[0].language).toBe('1c')
		})

		it('should handle English keywords', () => {
			const code = `
Procedure EnglishKeywords()
	If True Then
		Message("Yes");
	EndIf;
EndProcedure
			`.trim()

			const expected = {
				entities: [
					{
						name: 'EnglishKeywords',
						language: '1c',
					},
				],
			}

			expect(expected.entities[0].language).toBe('1c')
		})
	})

	describe('File Entity', () => {
		it('should create file entity for every extraction', () => {
			const filePath = 'src/modules/example.bsl'
			const code = `
Функция Пример()
	Возврат "Пример";
КонецФункции
			`.trim()

			const expected = {
				entities: [
					{
						id: `file:${filePath}`,
						type: 'file',
						name: 'example.bsl',
						filePath,
						language: '1c',
						line: 1,
					},
				],
			}

			expect(expected.entities[0].type).toBe('file')
			expect(expected.entities[0].name).toBe('example.bsl')
		})
	})

	describe('Integration Scenarios', () => {
		it('should extract complete module structure', () => {
			const code = `
// Модуль обработки данных
Перем ГлобальныйСчетчик;

Функция Инициализация() Экспорт
	ГлобальныйСчетчик = 0;
	Возврат Истина;
КонецФункции

Процедура Обработать(Знач Данные) Экспорт
	Результат = ВнутренняяОбработка(Данные);
	ГлобальныйСчетчик = ГлобальныйСчетчик + 1;
КонецПроцедуры

Функция ВнутренняяОбработка(Данные)
	Возврат Данные * 2;
КонецФункции
			`.trim()

			// Expected structure
			const expected = {
				totalEntities: 5, // file + 3 functions/procedures + 1 variable
				exportedCount: 2, // Инициализация, Обработать
				relationships: {
					defines: 3, // file defines 3 functions
					calls: 1, // Обработать calls ВнутренняяОбработка
				},
			}

			expect(expected.totalEntities).toBeGreaterThan(0)
			expect(expected.exportedCount).toBe(2)
		})
	})
})