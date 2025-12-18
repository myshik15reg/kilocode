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

			const result = await extractor.extract(
				content,
				filePath,
			)

			expect(result.entities).toHaveLength(2) // File + function
			
			const fileEntity = result.entities.find((e: CodeEntity) => e.type === "file")
			expect(fileEntity).toBeDefined()
			expect(fileEntity?.name).toBe("test.ts")

			const funcEntity = result.entities.find((e: CodeEntity) => e.type === "function")
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			const classEntity = result.entities.find((e: CodeEntity) => e.type === "class")
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			const importEntity = result.entities.find((e: CodeEntity) => e.type === "import")
			expect(importEntity).toBeDefined()
			
			const importsRelation = result.relationships.find(
				(r: CodeRelationship) => r.relationType === "imports",
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			const funcEntity = result.entities.find((e: CodeEntity) => e.type === "function")
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			const classEntity = result.entities.find((e: CodeEntity) => e.type === "class")
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			const entities = result.entities.filter((e: CodeEntity) => e.type === "function")
			expect(entities).toHaveLength(2)
			
			const ids = entities.map((e: CodeEntity) => e.id)
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			const definesRelation = result.relationships.find(
				(r: CodeRelationship) => r.relationType === "defines",
			)
			expect(definesRelation).toBeDefined()
			expect(definesRelation?.fromId).toContain("file:")
			expect(definesRelation?.toId).toContain("function:")
		})
	})

	describe("Call Graph Extraction", () => {
		it("should extract simple function call", async () => {
			const content = `
function caller() {
	callee()
}
function callee() {}
			`.trim()

			const filePath = "test.ts"

			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 4, column: 1 },
				children: [
					{
						type: "function_declaration",
						text: "function caller() {\n\tcallee()\n}",
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 2, column: 1 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "caller" }
							}
							return null
						},
						children: [
							{
								type: "statement_block",
								children: [
									{
										type: "expression_statement",
										children: [
											{
												type: "call_expression",
												startPosition: { row: 1, column: 1 },
												childForFieldName: (name: string) => {
													if (name === "function") {
														return { text: "callee" }
													}
													return null
												},
												children: [],
											},
										],
									},
								],
							},
						],
					},
					{
						type: "function_declaration",
						text: "function callee() {}",
						startPosition: { row: 3, column: 0 },
						endPosition: { row: 3, column: 20 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "callee" }
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extract(content, filePath)
	
			const callsRel = result.relationships.find((r: CodeRelationship) => r.type === "calls")
			expect(callsRel).toBeDefined()
			expect(callsRel?.fromId).toContain("caller")
			expect(callsRel?.toId).toContain("callee")
		})

		it("should extract method call", async () => {
			const content = `
class MyClass {
	methodA() {
		this.methodB()
	}
	methodB() {}
}
			`.trim()

			const filePath = "test.ts"

			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 6, column: 1 },
				children: [
					{
						type: "class_declaration",
						text: content,
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 6, column: 1 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "MyClass" }
							}
							return null
						},
						children: [
							{
								type: "class_body",
								children: [
									{
										type: "method_definition",
										childForFieldName: (name: string) => {
											if (name === "name") {
												return { text: "methodA" }
											}
											return null
										},
										children: [
											{
												type: "statement_block",
												children: [
													{
														type: "expression_statement",
														children: [
															{
																type: "call_expression",
																startPosition: { row: 2, column: 2 },
																childForFieldName: (name: string) => {
																	if (name === "function") {
																		return {
																			type: "member_expression",
																			text: "this.methodB",
																		}
																	}
																	return null
																},
																children: [],
															},
														],
													},
												],
											},
										],
									},
									{
										type: "method_definition",
										childForFieldName: (name: string) => {
											if (name === "name") {
												return { text: "methodB" }
											}
											return null
										},
										children: [],
									},
								],
							},
						],
					},
				],
			} as any

			const result = await extractor.extract(content, filePath)
	
			const callsRel = result.relationships.find((r: CodeRelationship) => r.type === "calls")
			expect(callsRel).toBeDefined()
			expect(callsRel?.fromId).toContain("methodA")
		})

		it("should extract constructor call", async () => {
			const content = `
function createInstance() {
	return new MyClass()
}
			`.trim()

			const filePath = "test.ts"

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
								return { text: "createInstance" }
							}
							return null
						},
						children: [
							{
								type: "statement_block",
								children: [
									{
										type: "return_statement",
										children: [
											{
												type: "new_expression",
												startPosition: { row: 1, column: 8 },
												childForFieldName: (name: string) => {
													if (name === "constructor") {
														return { text: "MyClass" }
													}
													return null
												},
												children: [],
											},
										],
									},
								],
							},
						],
					},
				],
			} as any

			const result = await extractor.extract(content, filePath)
	
			const callsRel = result.relationships.find((r: CodeRelationship) => r.type === "calls")
			expect(callsRel).toBeDefined()
			expect(callsRel?.fromId).toContain("createInstance")
			expect(callsRel?.toId).toContain("MyClass")
		})

		it("should handle nested calls", async () => {
			const content = `
function outer() {
	if (condition) {
		inner()
	}
}
function inner() {}
			`.trim()

			const filePath = "test.ts"

			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 6, column: 1 },
				children: [
					{
						type: "function_declaration",
						text: "function outer() {\n\tif (condition) {\n\t\tinner()\n\t}\n}",
						startPosition: { row: 0, column: 0 },
						endPosition: { row: 4, column: 1 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "outer" }
							}
							return null
						},
						children: [
							{
								type: "statement_block",
								children: [
									{
										type: "if_statement",
										children: [
											{
												type: "statement_block",
												children: [
													{
														type: "expression_statement",
														children: [
															{
																type: "call_expression",
																startPosition: { row: 2, column: 2 },
																childForFieldName: (name: string) => {
																	if (name === "function") {
																		return { text: "inner" }
																	}
																	return null
																},
																children: [],
															},
														],
													},
												],
											},
										],
									},
								],
							},
						],
					},
					{
						type: "function_declaration",
						text: "function inner() {}",
						startPosition: { row: 5, column: 0 },
						endPosition: { row: 5, column: 19 },
						childForFieldName: (name: string) => {
							if (name === "name") {
								return { text: "inner" }
							}
							return null
						},
						children: [],
					},
				],
			} as any

			const result = await extractor.extract(content, filePath)
	
			const callsRel = result.relationships.find((r: CodeRelationship) => r.type === "calls")
			expect(callsRel).toBeDefined()
			expect(callsRel?.fromId).toContain("outer")
			expect(callsRel?.toId).toContain("inner")
		})

		it("should not extract calls outside of functions", async () => {
			const content = `
const result = globalFunction()
			`.trim()

			const filePath = "test.ts"

			const mockAST = {
				type: "program",
				text: content,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: 0, column: 32 },
				children: [
					{
						type: "lexical_declaration",
						children: [
							{
								type: "variable_declarator",
								childForFieldName: (name: string) => {
									if (name === "name") {
										return { text: "result" }
									}
									if (name === "value") {
										return {
											type: "call_expression",
											startPosition: { row: 0, column: 15 },
											childForFieldName: (fieldName: string) => {
												if (fieldName === "function") {
													return { text: "globalFunction" }
												}
												return null
											},
											children: [],
										}
									}
									return null
								},
								children: [],
							},
						],
					},
				],
			} as any

			const result = await extractor.extract(content, filePath)
	
			// Should not create 'calls' relationship for top-level calls
			const callsRel = result.relationships.find((r: CodeRelationship) => r.type === "calls")
			expect(callsRel).toBeUndefined()
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

			const result = await extractor.extract(
				content,
				filePath,
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

			const result = await extractor.extract(
				content,
				filePath,
			)

			// Should still create file entity and use generic extraction
			expect(result.entities.length).toBeGreaterThanOrEqual(1)
		})
	})
})