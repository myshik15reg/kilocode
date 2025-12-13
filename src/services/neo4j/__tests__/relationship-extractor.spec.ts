/**
 * Unit tests for RelationshipExtractor
 * Tests extraction of code entities and relationships from AST
 */

import { describe, it, expect, beforeEach } from "vitest"
import { RelationshipExtractor } from "../relationship-extractor"
import type { CodeEntity, CodeRelationship } from "../interfaces"
import Parser from "web-tree-sitter"

describe("RelationshipExtractor", () => {
	let extractor: RelationshipExtractor
	let parser: Parser

	beforeEach(async () => {
		extractor = new RelationshipExtractor()
		
		// Initialize Tree-sitter parser
		await Parser.init()
		parser = new Parser()
	})

	describe("TypeScript/JavaScript extraction", () => {
		it("should extract function declarations", async () => {
			const content = `
function calculateSum(a: number, b: number): number {
	return a + b;
}
			`.trim()

			const filePath = "test.ts"
			
			// Mock AST node for testing
			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 2, column: 1 },
				children: [
					{
						type: "function_declaration",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 2, column: 1 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return {
									type: "identifier",
									text: "calculateSum",
									startPosition: { row: 0, column: 9 },
									endPosition: { row: 0, column: 20 },
								}
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"typescript",
			)

			expect(result.entities).toHaveLength(2) // File + function
			
			const fileEntity = result.entities.find(e => e.type === "file")
			expect(fileEntity).toBeDefined()
			expect(fileEntity?.name).toBe("test.ts")

			const funcEntity = result.entities.find(e => e.type === "function")
			expect(funcEntity).toBeDefined()
			expect(funcEntity?.name).toBe("calculateSum")
		})

		it("should extract class declarations", async () => {
			const content = `
class Calculator {
	add(a: number, b: number): number {
		return a + b;
	}
}
			`.trim()

			const filePath = "calculator.ts"
			
			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 4, column: 1 },
				children: [
					{
						type: "class_declaration",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 4, column: 1 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return {
									type: "identifier",
									text: "Calculator",
									startPosition: { row: 0, column: 6 },
									endPosition: { row: 0, column: 16 },
								}
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"typescript",
			)

			const classEntity = result.entities.find(e => e.type === "class")
			expect(classEntity).toBeDefined()
			expect(classEntity?.name).toBe("Calculator")
		})

		it("should extract import statements", async () => {
			const content = `import { sum } from './math';`

			const filePath = "index.ts"
			
			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 0, column: 30 },
				children: [
					{
						type: "import_statement",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 0, column: 30 },
						children: [
							{
								type: "import_clause",
								text: "{ sum }",
								children: [
									{
										type: "named_imports",
										children: [
											{
												type: "import_specifier",
												childForFieldName: (name: string) => {
													if (name === "name") {
														return { text: "sum" }
													}
													return null
												},
											},
										],
									},
								],
							},
							{
								type: "string",
								text: "'./math'",
							},
						],
						childForFieldName: () => null,
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"typescript",
			)

			const importEntity = result.entities.find(e => e.type === "import")
			expect(importEntity).toBeDefined()
			
			const importsRelation = result.relationships.find(
				r => r.relationType === "imports",
			)
			expect(importsRelation).toBeDefined()
		})
	})

	describe("Python extraction", () => {
		it("should extract function definitions", async () => {
			const content = `
def calculate_sum(a, b):
    return a + b
			`.trim()

			const filePath = "test.py"
			
			const mockAST = {
				type: "module",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 1, column: 16 },
				children: [
					{
						type: "function_definition",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 1, column: 16 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return {
									type: "identifier",
									text: "calculate_sum",
									startPosition: { row: 0, column: 4 },
									endPosition: { row: 0, column: 17 },
								}
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"python",
			)

			const funcEntity = result.entities.find(e => e.type === "function")
			expect(funcEntity).toBeDefined()
			expect(funcEntity?.name).toBe("calculate_sum")
		})

		it("should extract class definitions", async () => {
			const content = `
class Calculator:
    def add(self, a, b):
        return a + b
			`.trim()

			const filePath = "calculator.py"
			
			const mockAST = {
				type: "module",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 2, column: 20 },
				children: [
					{
						type: "class_definition",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 2, column: 20 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return {
									type: "identifier",
									text: "Calculator",
									startPosition: { row: 0, column: 6 },
									endPosition: { row: 0, column: 16 },
								}
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"python",
			)

			const classEntity = result.entities.find(e => e.type === "class")
			expect(classEntity).toBeDefined()
			expect(classEntity?.name).toBe("Calculator")
		})
	})

	describe("Entity ID generation", () => {
		it("should generate unique IDs for entities", async () => {
			const content = `
function test1() {}
function test2() {}
			`.trim()

			const filePath = "test.ts"
			
			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 1, column: 19 },
				children: [
					{
						type: "function_declaration",
						text: "function test1() {}",
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 0, column: 19 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "test1" }
							}
							return null
						},
						children: [],
					},
					{
						type: "function_declaration",
						text: "function test2() {}",
						startPosition: { row: 1, column: 0 },
						endPosition: { row: 1, column: 19 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "test2" }
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"typescript",
			)

			const entities = result.entities.filter(e => e.type === "function")
			expect(entities).toHaveLength(2)
			
			const ids = entities.map(e => e.id)
			expect(new Set(ids).size).toBe(2) // All IDs should be unique
		})
	})

	describe("Relationship extraction", () => {
		it("should create 'defines' relationship between file and entities", async () => {
			const content = `function test() {}`

			const filePath = "test.ts"
			
			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 0, column: 18 },
				children: [
					{
						type: "function_declaration",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 0, column: 18 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "test" }
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"typescript",
			)

			const definesRelation = result.relationships.find(
				r => r.relationType === "defines",
			)
			expect(definesRelation).toBeDefined()
			expect(definesRelation?.fromId).toContain("file:")
			expect(definesRelation?.toId).toContain("function:")
		})
	})

	describe("Error handling", () => {
		it("should handle empty AST gracefully", async () => {
			const content = ""
			const filePath = "empty.ts"
			
			const mockAST = {
				type: "program",
				text: "",
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 0, column: 0 },
				children: [],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"typescript",
			)

			// Should at least have file entity
			expect(result.entities.length).toBeGreaterThanOrEqual(1)
			expect(result.entities[0].type).toBe("file")
		})

		it("should handle unsupported language gracefully", async () => {
			const content = "some content"
			const filePath = "test.unknown"
			
			const mockAST = {
				type: "program",
				text: content,
				children: [],
			} as any

			const result = await extractor.extractFromFile(
				filePath,
				content,
				mockAST,
				"unknown",
			)

			// Should still create file entity and use generic extraction
			expect(result.entities.length).toBeGreaterThanOrEqual(1)
		})
	})
})