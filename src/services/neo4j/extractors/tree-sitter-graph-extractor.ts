import path from 'path'
import type { Node as SyntaxNode, QueryCapture } from 'web-tree-sitter'
import { BaseExtractor } from '../../tree-sitter/base-extractor'
import type {
	CodeEntity,
	CodeEntityType,
	CodeRelationship,
	ExtractionResult,
	ILanguageExtractor,
} from '../interfaces'

const CAPTURE_DEFINITION_PATTERN = /definition\.([a-zA-Z0-9_.-]+)/
const NAME_CAPTURE_PREFIX = 'name.'

const CALL_CAPTURE_NAMES = new Set(['call.function', 'call.method', 'call.callee', 'name.definition.call'])

const entityType = (type: CodeEntityType, kind?: string): { type: CodeEntityType; kind?: string } =>
	kind ? { type, kind } : { type }

const ENTITY_TYPE_MAP: Record<string, { type: CodeEntityType; kind?: string }> = {
	function: entityType('function'),
	procedure: entityType('function', 'procedure'),
	method: entityType('function', 'method'),
	constructor: entityType('function', 'constructor'),
	accessor: entityType('function', 'accessor'),
	lambda: entityType('function', 'lambda'),
	generator: entityType('function', 'generator'),
	async_function: entityType('function', 'async_function'),
	async_arrow: entityType('function', 'async_arrow'),
	test: entityType('function', 'test'),
	class: entityType('class'),
	decorated_class: entityType('class', 'decorated_class'),
	struct: entityType('class', 'struct'),
	interface: entityType('interface'),
	module: entityType('module'),
	namespace: entityType('module', 'namespace'),
	package: entityType('module', 'package'),
	import: entityType('import'),
	variable: entityType('variable'),
	var: entityType('variable', 'var'),
	const: entityType('variable', 'const'),
	property: entityType('variable', 'property'),
	field: entityType('variable', 'field'),
	parameter: entityType('variable', 'parameter'),
	enum: entityType('type', 'enum'),
	type: entityType('type'),
	typedef: entityType('type', 'typedef'),
	type_alias: entityType('type', 'type_alias'),
	macro: entityType('type', 'macro'),
	object: entityType('type', 'object'),
	array: entityType('type', 'array'),
}

type DefinitionRecord = {
	entity: CodeEntity
	node: SyntaxNode
	rawType: string
}

export class TreeSitterGraphExtractor extends BaseExtractor implements ILanguageExtractor {
	private readonly query: string
	private readonly languageLabel: string

	constructor(languageId: string, query: string, languageLabel?: string) {
		super(languageId)
		this.query = query
		this.languageLabel = languageLabel ?? languageId
	}

	// kilocode_change: 2026-01-24 - unified graph extractor across languages
	async extract(code: string, filePath: string): Promise<ExtractionResult> {
		this.checkInitialized()

		const tree = await this.parseCode(code)
		const captures = this.executeQuery(tree, this.query)

		return this.buildExtraction(captures, filePath)
	}

	protected buildExtraction(captures: QueryCapture[], filePath: string): ExtractionResult {
		const entities: CodeEntity[] = []
		const relationships: CodeRelationship[] = []

		const fileEntity = this.createFileEntity(filePath)
		entities.push(fileEntity)

		const definitionRecords = this.extractDefinitions(captures, filePath)
		const entitiesByName = new Map<string, CodeEntity>()
		const definitionNodes = new Map<SyntaxNode, CodeEntity>()

		for (const record of definitionRecords) {
			entities.push(record.entity)
			if (!entitiesByName.has(record.entity.name)) {
				entitiesByName.set(record.entity.name, record.entity)
			}
			definitionNodes.set(record.node, record.entity)

			relationships.push({
				id: `rel:${fileEntity.id}:defines:${record.entity.id}`,
				type: 'defines',
				fromId: fileEntity.id,
				toId: record.entity.id,
				properties: {
					line: record.entity.line,
					entityType: record.entity.type,
					captureType: record.rawType,
					kind: record.entity.properties?.kind,
				},
			})
		}

		this.extractCalls(captures, filePath, entitiesByName, definitionNodes, relationships)

		return { entities, relationships }
	}

	private extractDefinitions(captures: QueryCapture[], filePath: string): DefinitionRecord[] {
		const records: DefinitionRecord[] = []
		const seenNodes = new Set<SyntaxNode>()
		const seenEntities = new Set<string>()
		const nameCaptures = captures.filter((capture) => this.isNameCapture(capture))

		for (const capture of captures) {
			const definitionType = this.getDefinitionType(capture.name)
			if (!definitionType) continue

			const mapping = this.mapEntityType(definitionType.baseType)
			if (!mapping) continue

			const definitionNode = this.resolveDefinitionNode(capture)
			if (seenNodes.has(definitionNode)) continue
			seenNodes.add(definitionNode)

			const nameCapture = this.findNameCapture(definitionNode, definitionType.baseType, nameCaptures)
			const nameNode = nameCapture?.node ?? this.findNameNode(definitionNode)
			const resolvedName = this.resolveName(definitionNode, nameNode, definitionType.baseType)

			const id = `${mapping.type}:${filePath}:${resolvedName}`
			if (seenEntities.has(id)) continue
			seenEntities.add(id)

			const positionNode = nameNode ?? definitionNode
			const entity: CodeEntity = {
				id,
				type: mapping.type,
				name: resolvedName,
				filePath,
				line: positionNode.startPosition.row + 1,
				column: positionNode.startPosition.column,
				language: this.languageLabel,
				properties: {
					captureType: definitionType.rawType,
					kind: mapping.kind,
				},
			}

			records.push({ entity, node: definitionNode, rawType: definitionType.rawType })
		}

		return records
	}

	private extractCalls(
		captures: QueryCapture[],
		filePath: string,
		entitiesByName: Map<string, CodeEntity>,
		definitionNodes: Map<SyntaxNode, CodeEntity>,
		relationships: CodeRelationship[],
	): void {
		for (const capture of captures) {
			if (!CALL_CAPTURE_NAMES.has(capture.name)) continue

			const caller = this.findContainingEntity(capture.node, definitionNodes)
			if (!caller) continue

			const calledName = this.normalizeCalledName(capture.node.text)
			if (!calledName) continue

			const targetEntity = entitiesByName.get(calledName)
			const targetId = targetEntity?.id ?? `function:${calledName}`

			relationships.push({
				id: `rel:${filePath}:calls:${caller.id}:${targetId}:${capture.node.startPosition.row + 1}`,
				type: 'calls',
				fromId: caller.id,
				toId: targetId,
				properties: {
					line: capture.node.startPosition.row + 1,
				},
			})
		}
	}

	private isNameCapture(capture: QueryCapture): boolean {
		return capture.name === 'name' || capture.name.startsWith(NAME_CAPTURE_PREFIX)
	}

	private getDefinitionType(name: string): { rawType: string; baseType: string } | null {
		const match = name.match(CAPTURE_DEFINITION_PATTERN)
		if (!match || !match[1]) return null

		const rawType = match[1]
		const baseType = rawType.split('.')[0]
		return { rawType, baseType }
	}

	private mapEntityType(baseType: string): { type: CodeEntityType; kind?: string } | null {
		return ENTITY_TYPE_MAP[baseType] ?? null
	}

	private resolveDefinitionNode(capture: QueryCapture): SyntaxNode {
		if (capture.name.startsWith(NAME_CAPTURE_PREFIX) && capture.node.parent) {
			return capture.node.parent
		}
		return capture.node
	}

	private findNameCapture(
		definitionNode: SyntaxNode,
		baseType: string,
		nameCaptures: QueryCapture[],
	): QueryCapture | undefined {
		return nameCaptures.find((capture) => {
			const captureType = this.getDefinitionType(capture.name)?.baseType
			if (captureType && captureType !== baseType) return false
			return this.isDescendant(capture.node, definitionNode)
		})
	}

	private findNameNode(definitionNode: SyntaxNode): SyntaxNode | null {
		return (
			definitionNode.childForFieldName?.('name') ??
			definitionNode.childForFieldName?.('identifier') ??
			definitionNode.namedChildren?.[0] ??
			null
		)
	}

	private resolveName(definitionNode: SyntaxNode, nameNode: SyntaxNode | null, baseType: string): string {
		const raw = (nameNode?.text ?? '').trim()
		if (raw) {
			return this.sanitizeName(raw)
		}

		const fallbackText = (definitionNode.text ?? '').trim()
		if (fallbackText) {
			return this.sanitizeName(fallbackText.split(/\r?\n/)[0])
		}

		return `${baseType}@${definitionNode.startPosition.row + 1}`
	}

	private sanitizeName(name: string): string {
		return name.replace(/\s+/g, ' ').trim()
	}

	private findContainingEntity(node: SyntaxNode, definitionNodes: Map<SyntaxNode, CodeEntity>): CodeEntity | null {
		let current: SyntaxNode | null = node

		while (current) {
			const entity = definitionNodes.get(current)
			if (entity) return entity
			current = current.parent
		}

		return null
	}

	private normalizeCalledName(rawName: string): string {
		const trimmed = rawName.trim()
		if (!trimmed) return ''
		const parts = trimmed.split('.')
		return parts[parts.length - 1] || trimmed
	}

	private isDescendant(descendant: SyntaxNode, ancestor: SyntaxNode): boolean {
		let current: SyntaxNode | null = descendant

		while (current) {
			if (current === ancestor) return true
			current = current.parent
		}

		return false
	}

	private createFileEntity(filePath: string): CodeEntity {
		return {
			id: `file:${filePath}`,
			type: 'file',
			name: path.basename(filePath),
			filePath,
			line: 1,
			language: this.languageLabel,
		}
	}
}
