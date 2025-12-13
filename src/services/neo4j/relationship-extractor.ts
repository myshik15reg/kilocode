/**
 * Relationship Extractor
 * 
 * Extracts code entities and relationships from AST (Abstract Syntax Tree).
 * Supports TypeScript, JavaScript, Python, Java, and more.
 */

import type { CodeEntity, CodeRelationship, EntityType, RelationshipType } from "./interfaces"
import type { SyntaxNode } from "web-tree-sitter"

interface ExtractionResult {
	entities: CodeEntity[]
	relationships: CodeRelationship[]
}

export class RelationshipExtractor {
	/**
	 * Extract entities and relationships from a file
	 * @param filePath File path (relative to workspace)
	 * @param content File content
	 * @param ast Tree-sitter AST root node
	 * @param language Programming language
	 * @returns Extracted entities and relationships
	 */
	public async extractFromFile(
		filePath: string,
		content: string,
		ast: SyntaxNode,
		language: string
	): Promise<ExtractionResult> {
		const entities: CodeEntity[] = []
		const relationships: CodeRelationship[] = []

		// Create file entity
		const fileEntity: CodeEntity = {
			id: `file:${filePath}`,
			type: "file",
			name: this.getFileName(filePath),
			filePath,
			line: 1,
			language,
		}
		entities.push(fileEntity)

		// Extract based on language
		switch (language.toLowerCase()) {
			case "typescript":
			case "tsx":
			case "javascript":
			case "jsx":
				this.extractTypeScript(ast, filePath, language, entities, relationships)
				break

			case "python":
				this.extractPython(ast, filePath, language, entities, relationships)
				break

			case "java":
				this.extractJava(ast, filePath, language, entities, relationships)
				break

			default:
				// Generic extraction for other languages
				this.extractGeneric(ast, filePath, language, entities, relationships)
				break
		}

		return { entities, relationships }
	}

	/**
	 * Extract TypeScript/JavaScript entities and relationships
	 */
	private extractTypeScript(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[]
	): void {
		const fileId = `file:${filePath}`

		// Visit all nodes
		this.visitNode(node, (n) => {
			const nodeType = n.type

			// Import statements
			if (nodeType === "import_statement") {
				this.extractImport(n, filePath, language, entities, relationships, fileId)
			}

			// Function declarations
			else if (nodeType === "function_declaration" || nodeType === "function") {
				this.extractFunction(n, filePath, language, entities, relationships, fileId)
			}

			// Arrow functions assigned to variables
			else if (nodeType === "lexical_declaration" || nodeType === "variable_declaration") {
				this.extractVariableWithFunction(n, filePath, language, entities, relationships, fileId)
			}

			// Class declarations
			else if (nodeType === "class_declaration") {
				this.extractClass(n, filePath, language, entities, relationships, fileId)
			}

			// Interface declarations
			else if (nodeType === "interface_declaration") {
				this.extractInterface(n, filePath, language, entities, relationships, fileId)
			}

			// Type alias
			else if (nodeType === "type_alias_declaration") {
				this.extractTypeAlias(n, filePath, language, entities, relationships, fileId)
			}

			// Export statements
			else if (nodeType === "export_statement") {
				this.extractExport(n, filePath, entities, relationships, fileId)
			}
		})
	}

	/**
	 * Extract Python entities and relationships
	 */
	private extractPython(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[]
	): void {
		const fileId = `file:${filePath}`

		this.visitNode(node, (n) => {
			const nodeType = n.type

			// Import statements
			if (nodeType === "import_statement" || nodeType === "import_from_statement") {
				this.extractPythonImport(n, filePath, language, entities, relationships, fileId)
			}

			// Function definitions
			else if (nodeType === "function_definition") {
				this.extractFunction(n, filePath, language, entities, relationships, fileId)
			}

			// Class definitions
			else if (nodeType === "class_definition") {
				this.extractClass(n, filePath, language, entities, relationships, fileId)
			}
		})
	}

	/**
	 * Extract Java entities and relationships
	 */
	private extractJava(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[]
	): void {
		const fileId = `file:${filePath}`

		this.visitNode(node, (n) => {
			const nodeType = n.type

			// Import declarations
			if (nodeType === "import_declaration") {
				this.extractJavaImport(n, filePath, language, entities, relationships, fileId)
			}

			// Class declarations
			else if (nodeType === "class_declaration") {
				this.extractClass(n, filePath, language, entities, relationships, fileId)
			}

			// Interface declarations
			else if (nodeType === "interface_declaration") {
				this.extractInterface(n, filePath, language, entities, relationships, fileId)
			}

			// Method declarations
			else if (nodeType === "method_declaration") {
				this.extractFunction(n, filePath, language, entities, relationships, fileId)
			}
		})
	}

	/**
	 * Generic extraction for unsupported languages
	 */
	private extractGeneric(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[]
	): void {
		// Basic extraction - just functions and classes
		const fileId = `file:${filePath}`

		this.visitNode(node, (n) => {
			const nodeType = n.type.toLowerCase()

			if (nodeType.includes("function") || nodeType.includes("method")) {
				this.extractFunction(n, filePath, language, entities, relationships, fileId)
			} else if (nodeType.includes("class")) {
				this.extractClass(n, filePath, language, entities, relationships, fileId)
			}
		})
	}

	/**
	 * Extract import statement
	 */
	private extractImport(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const sourceNode = node.childForFieldName("source")
		if (!sourceNode) return

		const importPath = sourceNode.text.replace(/['"]/g, "")
		const importId = `import:${filePath}:${importPath}`

		const importEntity: CodeEntity = {
			id: importId,
			type: "import",
			name: importPath,
			filePath,
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			language,
		}

		entities.push(importEntity)

		// File imports module
		relationships.push({
			fromId: fileId,
			toId: importId,
			type: "imports",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Extract Python import
	 */
	private extractPythonImport(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const nameNode = node.childForFieldName("name") || node.childForFieldName("module")
		if (!nameNode) return

		const importPath = nameNode.text
		const importId = `import:${filePath}:${importPath}`

		entities.push({
			id: importId,
			type: "import",
			name: importPath,
			filePath,
			line: node.startPosition.row + 1,
			language,
		})

		relationships.push({
			fromId: fileId,
			toId: importId,
			type: "imports",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Extract Java import
	 */
	private extractJavaImport(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const importPath = node.text.replace(/^import\s+/, "").replace(/;$/, "").trim()
		const importId = `import:${filePath}:${importPath}`

		entities.push({
			id: importId,
			type: "import",
			name: importPath,
			filePath,
			line: node.startPosition.row + 1,
			language,
		})

		relationships.push({
			fromId: fileId,
			toId: importId,
			type: "imports",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Extract function/method declaration
	 */
	private extractFunction(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const nameNode = node.childForFieldName("name")
		if (!nameNode) return

		const functionName = nameNode.text
		const functionId = `file:${filePath}:${functionName}`

		entities.push({
			id: functionId,
			type: "function",
			name: functionName,
			filePath,
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			language,
		})

		// File defines function
		relationships.push({
			fromId: fileId,
			toId: functionId,
			type: "defines",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Extract variable with arrow function
	 */
	private extractVariableWithFunction(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		// Look for arrow functions in variable declarations
		const declarator = node.descendantsOfType("variable_declarator")[0]
		if (!declarator) return

		const nameNode = declarator.childForFieldName("name")
		const valueNode = declarator.childForFieldName("value")

		if (!nameNode || !valueNode) return

		// Check if value is an arrow function
		if (valueNode.type === "arrow_function") {
			const functionName = nameNode.text
			const functionId = `file:${filePath}:${functionName}`

			entities.push({
				id: functionId,
				type: "function",
				name: functionName,
				filePath,
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				language,
			})

			relationships.push({
				fromId: fileId,
				toId: functionId,
				type: "defines",
				properties: { line: node.startPosition.row + 1 },
			})
		}
	}

	/**
	 * Extract class declaration
	 */
	private extractClass(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const nameNode = node.childForFieldName("name")
		if (!nameNode) return

		const className = nameNode.text
		const classId = `file:${filePath}:${className}`

		entities.push({
			id: classId,
			type: "class",
			name: className,
			filePath,
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			language,
		})

		// File defines class
		relationships.push({
			fromId: fileId,
			toId: classId,
			type: "defines",
			properties: { line: node.startPosition.row + 1 },
		})

		// Extract inheritance
		const heritageNode = node.childForFieldName("heritage")
		if (heritageNode) {
			const extendsNode = heritageNode.descendantsOfType("extends_clause")[0]
			if (extendsNode) {
				const superClassNode = extendsNode.childForFieldName("value")
				if (superClassNode) {
					const superClassName = superClassNode.text
					relationships.push({
						fromId: classId,
						toId: `class:${superClassName}`, // Generic reference
						type: "inherits",
						properties: { line: extendsNode.startPosition.row + 1 },
					})
				}
			}
		}
	}

	/**
	 * Extract interface declaration
	 */
	private extractInterface(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const nameNode = node.childForFieldName("name")
		if (!nameNode) return

		const interfaceName = nameNode.text
		const interfaceId = `file:${filePath}:${interfaceName}`

		entities.push({
			id: interfaceId,
			type: "interface",
			name: interfaceName,
			filePath,
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			language,
		})

		relationships.push({
			fromId: fileId,
			toId: interfaceId,
			type: "defines",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Extract type alias
	 */
	private extractTypeAlias(
		node: SyntaxNode,
		filePath: string,
		language: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		const nameNode = node.childForFieldName("name")
		if (!nameNode) return

		const typeName = nameNode.text
		const typeId = `file:${filePath}:${typeName}`

		entities.push({
			id: typeId,
			type: "type",
			name: typeName,
			filePath,
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			language,
		})

		relationships.push({
			fromId: fileId,
			toId: typeId,
			type: "defines",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Extract export statement
	 */
	private extractExport(
		node: SyntaxNode,
		filePath: string,
		entities: CodeEntity[],
		relationships: CodeRelationship[],
		fileId: string
	): void {
		// Find what is being exported
		const declaration = node.childForFieldName("declaration")
		if (!declaration) return

		const nameNode = declaration.childForFieldName("name")
		if (!nameNode) return

		const exportedName = nameNode.text
		const exportedId = `file:${filePath}:${exportedName}`

		// Create export relationship
		relationships.push({
			fromId: fileId,
			toId: exportedId,
			type: "exports",
			properties: { line: node.startPosition.row + 1 },
		})
	}

	/**
	 * Visit all nodes in the tree
	 */
	private visitNode(node: SyntaxNode, visitor: (node: SyntaxNode) => void): void {
		visitor(node)

		for (const child of node.children) {
			this.visitNode(child, visitor)
		}
	}

	/**
	 * Get file name from path
	 */
	private getFileName(filePath: string): string {
		return filePath.split(/[/\\]/).pop() || filePath
	}
}