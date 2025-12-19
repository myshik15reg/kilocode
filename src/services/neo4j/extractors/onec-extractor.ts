/**
 * OneCExtractor - Extractor for 1C:Enterprise Script Language (BSL)
 *
 * Использует унифицированную Tree-sitter инфраструктуру (Фаза 2)
 * - Наследуется от BaseExtractor
 * - Использует TreeSitterParserManager для управления парсерами
 * - Применяет onecQueries.graph для извлечения relationships
 *
 * Обеспечивает согласованность с семантическим поиском через общие queries.
 */

import type { SyntaxNode, Query, QueryCapture } from 'web-tree-sitter'
import { BaseExtractor } from '../../tree-sitter/base-extractor'
import { onecQueries } from '../../tree-sitter/queries/onec'
import type { CodeEntity, CodeRelationship, ExtractionResult, ILanguageExtractor } from '../interfaces'

/**
 * Экстрактор для 1С:Предприятие (BSL)
 * Использует унифицированную Tree-sitter инфраструктуру
 */
export class OneCExtractor extends BaseExtractor implements ILanguageExtractor {
	constructor() {
		super('onec') // Передаём languageId в базовый класс
	}

	/**
	 * Инициализация с использованием централизованного ParserManager
	 * @param wasmPath - путь к WASM файлу tree-sitter-1c
	 */
	override async initialize(wasmPath?: string): Promise<void> {
		// Используем инициализацию из BaseExtractor
		await super.initialize(wasmPath)
	}

	/**
	 * Извлечь entities и relationships из кода
	 */
	async extract(code: string, filePath: string): Promise<ExtractionResult> {
		this.checkInitialized()

		const entities: CodeEntity[] = []
		const relationships: CodeRelationship[] = []

		// Создаём файловую сущность (как в оригинальной реализации)
		const fileEntity: CodeEntity = {
			id: `file:${filePath}`,
			type: 'file',
			name: this.getFileName(filePath),
			filePath,
			line: 1,
			language: '1c',
		}
		entities.push(fileEntity)

		// Парсим код через базовый метод
		const tree = await this.parseCode(code)

		// Используем graph query для извлечения
		const captures = this.executeQuery(tree, onecQueries.graph)

		// Обрабатываем captures
		this.processCaptures(captures, entities, relationships, filePath, code)

		return { entities, relationships }
	}

	/**
	 * Обработка query captures в entities и relationships
	 */
	private processCaptures(
		captures: QueryCapture[],
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		filePath: string,
		code: string
	): void {
		// Группируем captures по функциям/процедурам для обработки параметров
		const functionCaptures = new Map<string, QueryCapture[]>()
		const procedureCaptures = new Map<string, QueryCapture[]>()

		// Первый проход: собираем все captures по типам
		for (const capture of captures) {
			const captureName = capture.name

			if (captureName === 'function.declaration' || captureName === 'function.name') {
				const nameCapture = captures.find(
					(c: QueryCapture) => c.name === 'function.name' && c.node.parent?.id === capture.node.id
				)
				if (nameCapture) {
					const funcName = nameCapture.node.text
					if (!functionCaptures.has(funcName)) {
						functionCaptures.set(funcName, [])
					}
					functionCaptures.get(funcName)!.push(capture)
				}
			} else if (captureName === 'procedure.declaration' || captureName === 'procedure.name') {
				const nameCapture = captures.find(
					(c: QueryCapture) => c.name === 'procedure.name' && c.node.parent?.id === capture.node.id
				)
				if (nameCapture) {
					const procName = nameCapture.node.text
					if (!procedureCaptures.has(procName)) {
						procedureCaptures.set(procName, [])
					}
					procedureCaptures.get(procName)!.push(capture)
				}
			}
		}

		// Второй проход: обрабатываем функции
		this.processFunctions(captures, entities, relationships, filePath, code)

		// Третий проход: обрабатываем процедуры
		this.processProcedures(captures, entities, relationships, filePath, code)

		// Четвёртый проход: обрабатываем вызовы функций
		this.processFunctionCalls(captures, relationships, filePath)
	}

	/**
	 * Обработка объявлений функций
	 */
	private processFunctions(
		captures: QueryCapture[],
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		filePath: string,
		code: string
	): void {
		const processedFunctions = new Set<string>()

		for (const capture of captures) {
			if (capture.name !== 'function.declaration') continue

			const nameNode = capture.node.childForFieldName('name')
			if (!nameNode) continue

			const name = nameNode.text
			if (processedFunctions.has(name)) continue
			processedFunctions.add(name)

			const isExport = capture.node.text.match(/экспорт|export/i) !== null
			const functionId = `file:${filePath}:${name}`

			// Создаём entity функции
			entities.push({
				id: functionId,
				name,
				type: 'function',
				filePath,
				line: capture.node.startPosition.row + 1,
				column: capture.node.startPosition.column,
				language: '1c',
				properties: {
					isProcedure: false,
					export: isExport,
				},
			})

			// Создаём relationship 'defines'
			relationships.push({
				id: `rel:${filePath}:defines:${name}`,
				fromId: `file:${filePath}`,
				toId: functionId,
				type: 'defines',
				properties: {
					line: capture.node.startPosition.row + 1,
					entityType: 'function',
				},
			})

			// Обрабатываем параметры функции
			this.extractParameters(capture.node, entities, relationships, filePath, name)
		}
	}

	/**
	 * Обработка объявлений процедур
	 */
	private processProcedures(
		captures: QueryCapture[],
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		filePath: string,
		code: string
	): void {
		const processedProcedures = new Set<string>()

		for (const capture of captures) {
			if (capture.name !== 'procedure.declaration') continue

			const nameNode = capture.node.childForFieldName('name')
			if (!nameNode) continue

			const name = nameNode.text
			if (processedProcedures.has(name)) continue
			processedProcedures.add(name)

			const isExport = capture.node.text.match(/экспорт|export/i) !== null
			const procedureId = `file:${filePath}:${name}`

			// Создаём entity процедуры
			entities.push({
				id: procedureId,
				name,
				type: 'function',
				filePath,
				line: capture.node.startPosition.row + 1,
				column: capture.node.startPosition.column,
				language: '1c',
				properties: {
					isProcedure: true,
					export: isExport,
				},
			})

			// Создаём relationship 'defines'
			relationships.push({
				id: `rel:${filePath}:defines:${name}`,
				fromId: `file:${filePath}`,
				toId: procedureId,
				type: 'defines',
				properties: {
					line: capture.node.startPosition.row + 1,
					entityType: 'procedure',
				},
			})

			// Обрабатываем параметры процедуры
			this.extractParameters(capture.node, entities, relationships, filePath, name)
		}
	}

	/**
	 * Извлечение параметров функции/процедуры
	 */
	private extractParameters(
		node: SyntaxNode,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		filePath: string,
		functionName: string
	): void {
		const paramsNode = node.childForFieldName('parameters')
		if (!paramsNode) return

		const parameters = paramsNode.children.filter((c: SyntaxNode) => c.type === 'parameter')

		parameters.forEach((param: SyntaxNode, index: number) => {
			const paramNameNode = param.childForFieldName('name')
			if (!paramNameNode) return

			const paramName = paramNameNode.text
			const hasDefault = param.childForFieldName('default') !== null
			const isByValue = param.text.match(/знач|val/i) !== null

			const paramId = `file:${filePath}:${functionName}:param:${paramName}`

			// Создаём entity параметра
			entities.push({
				id: paramId,
				name: paramName,
				type: 'variable',
				filePath,
				line: param.startPosition.row + 1,
				column: param.startPosition.column,
				language: '1c',
				properties: {
					isParameter: true,
					index,
					hasDefault,
					byValue: isByValue,
					functionName,
				},
			})

			// Создаём relationship от функции к параметру
			relationships.push({
				id: `rel:${filePath}:${functionName}:contains:${paramName}`,
				fromId: `file:${filePath}:${functionName}`,
				toId: paramId,
				type: 'contains',
				properties: {
					line: param.startPosition.row + 1,
					parameterIndex: index,
				},
			})
		})
	}

	/**
	 * Обработка вызовов функций
	 */
	private processFunctionCalls(
		captures: QueryCapture[],
		relationships: CodeRelationship[],
		filePath: string
	): void {
		for (const capture of captures) {
			if (capture.name !== 'call.expression') continue

			const functionNode = capture.node.childForFieldName('function')
			if (!functionNode) continue

			const calledFunction = functionNode.text

			// Определяем контекст вызова (в какой функции/процедуре происходит вызов)
			const currentFunction = this.findContainingFunction(capture.node)
			if (!currentFunction) continue // Игнорируем вызовы на верхнем уровне

			// Создаём relationship 'calls'
			relationships.push({
				id: `rel:${filePath}:${currentFunction}:calls:${calledFunction}:${capture.node.startPosition.row}`,
				fromId: `file:${filePath}:${currentFunction}`,
				toId: `function:${calledFunction}`, // Generic reference
				type: 'calls',
				properties: {
					line: capture.node.startPosition.row + 1,
				},
			})
		}
	}

	/**
	 * Найти функцию/процедуру, содержащую данный узел
	 */
	private findContainingFunction(node: SyntaxNode): string | null {
		let current: SyntaxNode | null = node

		while (current) {
			if (current.type === 'function_declaration' || current.type === 'procedure_declaration') {
				const nameNode = current.childForFieldName('name')
				if (nameNode) {
					return nameNode.text
				}
			}
			current = current.parent
		}

		return null
	}

	/**
	 * Получить имя файла из пути
	 */
	private getFileName(filePath: string): string {
		return filePath.split(/[/\\]/).pop() || filePath
	}
}