import { describe, it, expect } from "vitest"
import { TreeSitterGraphExtractor } from "../tree-sitter-graph-extractor"

type MockNode = {
	text: string
	startPosition: { row: number; column: number }
	endPosition: { row: number; column: number }
	parent?: MockNode | null
	childForFieldName?: (name: string) => MockNode | null
	namedChildren?: MockNode[]
}

const createNode = (
	text: string,
	row: number,
	column: number,
	options: {
		parent?: MockNode | null
		fields?: Record<string, MockNode | null>
		namedChildren?: MockNode[]
	} = {},
): MockNode => ({
	text,
	startPosition: { row, column },
	endPosition: { row, column: column + text.length },
	parent: options.parent ?? null,
	childForFieldName: (name: string) => options.fields?.[name] ?? null,
	namedChildren: options.namedChildren ?? [],
})

class TestGraphExtractor extends TreeSitterGraphExtractor {
	public buildFromCaptures(captures: any[], filePath: string) {
		return this.buildExtraction(captures, filePath)
	}
}

describe("TreeSitterGraphExtractor", () => {
	it("creates file and definition entities from captures", () => {
		const functionNode = createNode("function foo() {}", 0, 0)
		const nameNode = createNode("foo", 0, 9, { parent: functionNode })
		functionNode.childForFieldName = (name: string) => (name === "name" ? nameNode : null)

		const captures = [
			{ name: "name.definition.function", node: nameNode },
			{ name: "definition.function", node: functionNode },
		]

		const extractor = new TestGraphExtractor("typescript", "")
		const result = extractor.buildFromCaptures(captures, "test.ts")

		const fileEntity = result.entities.find((entity) => entity.type === "file")
		const functionEntity = result.entities.find((entity) => entity.type === "function")

		expect(fileEntity).toBeDefined()
		expect(functionEntity?.id).toBe("function:test.ts:foo")
		expect(functionEntity?.name).toBe("foo")

		const definesRel = result.relationships.find((rel) => rel.type === "defines")
		expect(definesRel?.fromId).toBe("file:test.ts")
		expect(definesRel?.toId).toBe("function:test.ts:foo")
	})

	it("maps method captures to function entities with kind metadata", () => {
		const methodNode = createNode("method bar()", 1, 0)
		const nameNode = createNode("bar", 1, 7, { parent: methodNode })
		methodNode.childForFieldName = (name: string) => (name === "name" ? nameNode : null)

		const captures = [{ name: "definition.method", node: methodNode }]

		const extractor = new TestGraphExtractor("typescript", "")
		const result = extractor.buildFromCaptures(captures, "example.ts")

		const entity = result.entities.find((item) => item.type === "function")
		expect(entity?.name).toBe("bar")
		expect(entity?.properties?.kind).toBe("method")
	})

	it("falls back to child name when capture is missing name.definition", () => {
		const classNameNode = createNode("Widget", 0, 6)
		const classNode = createNode("class Widget {}", 0, 0, {
			fields: { name: classNameNode },
		})

		const captures = [{ name: "definition.class", node: classNode }]

		const extractor = new TestGraphExtractor("javascript", "")
		const result = extractor.buildFromCaptures(captures, "widget.js")

		const entity = result.entities.find((item) => item.type === "class")
		expect(entity?.name).toBe("Widget")
	})

	it("skips captures that do not map to entity types", () => {
		const ifNode = createNode("if (x)", 0, 0)
		const captures = [{ name: "definition.if", node: ifNode }]

		const extractor = new TestGraphExtractor("javascript", "")
		const result = extractor.buildFromCaptures(captures, "flow.js")

		expect(result.entities).toHaveLength(1)
		expect(result.entities[0].type).toBe("file")
	})

	it("creates call relationships when call captures are nested", () => {
		const functionNode = createNode("function caller()", 0, 0)
		const functionNameNode = createNode("caller", 0, 9, { parent: functionNode })
		functionNode.childForFieldName = (name: string) => (name === "name" ? functionNameNode : null)

		const callNode = createNode("callee", 1, 2, { parent: functionNode })

		const captures = [
			{ name: "definition.function", node: functionNode },
			{ name: "call.function", node: callNode },
		]

		const extractor = new TestGraphExtractor("typescript", "")
		const result = extractor.buildFromCaptures(captures, "calls.ts")

		const callRel = result.relationships.find((rel) => rel.type === "calls")
		expect(callRel?.fromId).toBe("function:calls.ts:caller")
		expect(callRel?.toId).toBe("function:callee")
	})
})
