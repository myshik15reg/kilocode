import * as fs from "fs/promises"
import * as path from "path"
import { LanguageParser, loadRequiredLanguageParsers } from "./languageParser"
import { fileExistsAtPath } from "../../utils/fs"
import { parseMarkdown } from "./markdownParser"
import { RooIgnoreController } from "../../core/ignore/RooIgnoreController"
import { QueryCapture } from "web-tree-sitter"
import { getDefinitionSupportedExtensions, resolveFileTypeByPath } from "../file-types/file-type-registry"
import { parseXml } from "../../utils/xml"

const METHOD_CAPTURE = ["definition.method", "definition.method.start"] // kilocode_change

// Private constant
const DEFAULT_MIN_COMPONENT_LINES_VALUE = 4

// Getter function for MIN_COMPONENT_LINES (for easier testing)
let currentMinComponentLines = DEFAULT_MIN_COMPONENT_LINES_VALUE

/**
 * Get the current minimum number of lines for a component to be included
 */
export function getMinComponentLines(): number {
	return currentMinComponentLines
}

/**
 * Set the minimum number of lines for a component (for testing)
 */
export function setMinComponentLines(value: number): void {
	currentMinComponentLines = value
}

// kilocode_change start
function shouldSkipMinLines(lineCount: number, capture: QueryCapture, language: string) {
	if (METHOD_CAPTURE.includes(capture.name)) {
		// In object-oriented programming languages, method signatures are only one line and should not be ignored.
		return false
	}
	return lineCount < getMinComponentLines()
}
// kilocode_change end

const extensions = getDefinitionSupportedExtensions()

export { extensions }

export async function parseSourceCodeDefinitionsForFile(
	filePath: string,
	rooIgnoreController?: RooIgnoreController,
): Promise<string | undefined> {
	// check if the file exists
	const fileExists = await fileExistsAtPath(path.resolve(filePath))
	if (!fileExists) {
		return "This file does not exist or you do not have permission to access it."
	}

	// Get file extension to determine parser
	const ext = path.extname(filePath).toLowerCase()
	// Check if the file extension is supported
	if (!extensions.includes(ext)) {
		return undefined
	}

	// Special case for markdown files
	if (ext === ".md" || ext === ".markdown") {
		// Check if we have permission to access this file
		if (rooIgnoreController && !rooIgnoreController.validateAccess(filePath)) {
			return undefined
		}

		// Read file content
		const fileContent = await fs.readFile(filePath, "utf8")

		// Split the file content into individual lines
		const lines = fileContent.split("\n")

		// Parse markdown content to get captures
		const markdownCaptures = parseMarkdown(fileContent)

		// Process the captures
		const markdownDefinitions = processCaptures(markdownCaptures, lines, "markdown")

		if (markdownDefinitions) {
			return `# ${path.basename(filePath)}\n${markdownDefinitions}`
		}
		return undefined
	}

	// For other file types, load parser and use tree-sitter
	const fileType = resolveFileTypeByPath(filePath)
	if (!fileType || fileType.contentKind === "skip") {
		return undefined
	}

	// Check if we have permission to access this file
	if (rooIgnoreController && !rooIgnoreController.validateAccess(filePath)) {
		return undefined
	}

	// Read file content once for both tree-sitter and fallbacks.
	const fileContent = await fs.readFile(filePath, "utf8")
	const lines = fileContent.split("\n")

	const fallbackDefinitions = buildFallbackDefinitions(fileType.contentKind, lines)

	if (fileType.contentKind === "treeSitter") {
		try {
			const languageParsers = await loadRequiredLanguageParsers([filePath])
			const definitions = await parseFile(filePath, languageParsers, rooIgnoreController)
			if (definitions) {
				return `# ${path.basename(filePath)}\n${definitions}`
			}
		} catch {
			// Graceful fallback: missing WASM, parser errors, etc.
		}
	}

	if (fallbackDefinitions) {
		return `# ${path.basename(filePath)}\n${fallbackDefinitions}`
	}

	return undefined
}

function buildFallbackDefinitions(contentKind: string, lines: string[]): string | null {
	if (contentKind === "xml") {
		// Best-effort validate; parsing errors should not crash definitions.
		try {
			parseXml(lines.join("\n"))
		} catch {
			// ignore
		}
		return extractXmlLikeDefinitions(lines)
	}

	if (contentKind === "plainText") {
		return extractPlainTextDefinitions(lines)
	}

	if (contentKind === "treeSitter") {
		// Tree-sitter fallbacks (e.g. missing WASM)
		return extractPlainTextDefinitions(lines)
	}

	return null
}

function extractPlainTextDefinitions(lines: string[]): string | null {
	const results: string[] = []
	const max = 50

	const add = (lineIdx: number) => {
		const line = lines[lineIdx]
		if (!line) return
		results.push(`${lineIdx + 1}--${lineIdx + 1} | ${line}`)
	}

	for (let i = 0; i < lines.length && results.length < max; i++) {
		const line = lines[i] ?? ""
		const trimmed = line.trim()
		if (!trimmed) continue

		// 1C:Enterprise BSL (RU + EN keywords)
		if (/^(процедура|функция|procedure|function)\b/i.test(trimmed)) {
			add(i)
			continue
		}

		// Generic section headers
		if (/^={3,}$/.test(trimmed) || /^-{3,}$/.test(trimmed) || /^\[.+\]$/.test(trimmed)) {
			add(i)
			continue
		}

		// First non-empty line is still useful context
		if (results.length === 0) {
			add(i)
		}
	}

	return results.length > 0 ? results.join("\n") : null
}

function extractXmlLikeDefinitions(lines: string[]): string | null {
	const results: string[] = []
	const seenTags = new Set<string>()
	const max = 50

	for (let i = 0; i < lines.length && results.length < max; i++) {
		const raw = lines[i] ?? ""
		const trimmed = raw.trim()
		if (!trimmed) continue
		if (trimmed.startsWith("<?xml")) continue
		if (trimmed.startsWith("<!--")) continue
		if (trimmed.startsWith("</")) continue

		const match = trimmed.match(/^<([A-Za-z_][\w:.-]*)\b/)
		if (!match) continue
		const tag = match[1]
		if (!tag || seenTags.has(tag)) continue
		seenTags.add(tag)
		results.push(`${i + 1}--${i + 1} | ${raw}`)
	}

	if (results.length > 0) return results.join("\n")
	return extractPlainTextDefinitions(lines)
}

/*
Parsing files using tree-sitter

1. Parse the file content into an AST (Abstract Syntax Tree) using the appropriate language grammar (set of rules that define how the components of a language like keywords, expressions, and statements can be combined to create valid programs).
2. Create a query using a language-specific query string, and run it against the AST's root node to capture specific syntax elements.
    - We use tag queries to identify named entities in a program, and then use a syntax capture to label the entity and its name. A notable example of this is GitHub's search-based code navigation.
	- Our custom tag queries are based on tree-sitter's default tag queries, but modified to only capture definitions.
3. Sort the captures by their position in the file, output the name of the definition, and format by i.e. adding "|----\n" for gaps between captured sections.

This approach allows us to focus on the most relevant parts of the code (defined by our language-specific queries) and provides a concise yet informative view of the file's structure and key elements.

- https://github.com/tree-sitter/node-tree-sitter/blob/master/test/query_test.js
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/test/query-test.js
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/test/helper.js
- https://tree-sitter.github.io/tree-sitter/code-navigation-systems
*/
/**
 * Parse a file and extract code definitions using tree-sitter
 *
 * @param filePath - Path to the file to parse
 * @param languageParsers - Map of language parsers
 * @param rooIgnoreController - Optional controller to check file access permissions
 * @returns A formatted string with code definitions or null if no definitions found
 */

/**
 * Process captures from tree-sitter or markdown parser
 *
 * @param captures - The captures to process
 * @param lines - The lines of the file
 * @param minComponentLines - Minimum number of lines for a component to be included
 * @returns A formatted string with definitions
 */
function processCaptures(captures: QueryCapture[], lines: string[], language: string): string | null {
	// Determine if HTML filtering is needed for this language
	const needsHtmlFiltering = ["jsx", "tsx"].includes(language)

	// Filter function to exclude HTML elements if needed
	const isNotHtmlElement = (line: string): boolean => {
		if (!needsHtmlFiltering) return true
		// Common HTML elements pattern
		const HTML_ELEMENTS = /^[^A-Z]*<\/?(?:div|span|button|input|h[1-6]|p|a|img|ul|li|form)\b/
		const trimmedLine = line.trim()
		return !HTML_ELEMENTS.test(trimmedLine)
	}

	// No definitions found
	if (captures.length === 0) {
		return null
	}

	let formattedOutput = ""

	// Sort captures by their start position
	captures.sort((a, b) => a.node.startPosition.row - b.node.startPosition.row)

	// Track already processed lines to avoid duplicates
	const processedLines = new Set<string>()

	// First pass - categorize captures by type
	captures.forEach((capture) => {
		const { node, name } = capture

		// Skip captures that don't represent definitions
		if (!name.includes("definition") && !name.includes("name")) {
			return
		}

		// Get the parent node that contains the full definition
		const definitionNode = name.includes("name") ? node.parent : node
		if (!definitionNode) return

		// Get the start and end lines of the full definition
		const startLine = definitionNode.startPosition.row
		const endLine = definitionNode.endPosition.row
		const lineCount = endLine - startLine + 1

		// Skip components that don't span enough lines
		if (shouldSkipMinLines(lineCount, capture, language) /*kilocode_change: orginal logic moved into function*/) {
			return
		}

		// Create unique key for this definition based on line range
		// This ensures we don't output the same line range multiple times
		const lineKey = `${startLine}-${endLine}`

		// Skip already processed lines
		if (processedLines.has(lineKey)) {
			return
		}

		// Check if this is a valid component definition (not an HTML element)
		const startLineContent = lines[startLine].trim()

		// Special handling for component name definitions
		if (name.includes("name.definition")) {
			// Extract component name
			const componentName = node.text

			// Add component name to output regardless of HTML filtering
			if (!processedLines.has(lineKey) && componentName) {
				formattedOutput += `${startLine + 1}--${endLine + 1} | ${lines[startLine]}\n`
				processedLines.add(lineKey)
			}
		}
		// For other component definitions
		else if (isNotHtmlElement(startLineContent)) {
			formattedOutput += `${startLine + 1}--${endLine + 1} | ${lines[startLine]}\n`
			processedLines.add(lineKey)

			// If this is part of a larger definition, include its non-HTML context
			if (node.parent && node.parent.lastChild) {
				const contextEnd = node.parent.lastChild.endPosition.row
				const contextSpan = contextEnd - node.parent.startPosition.row + 1

				// Only include context if it spans multiple lines
				if (contextSpan >= getMinComponentLines()) {
					// Add the full range first
					const rangeKey = `${node.parent.startPosition.row}-${contextEnd}`
					if (!processedLines.has(rangeKey)) {
						formattedOutput += `${node.parent.startPosition.row + 1}--${contextEnd + 1} | ${lines[node.parent.startPosition.row]}\n`
						processedLines.add(rangeKey)
					}
				}
			}
		}
	})

	if (formattedOutput.length > 0) {
		return formattedOutput
	}

	return null
}

/**
 * Parse a file and extract code definitions using tree-sitter
 *
 * @param filePath - Path to the file to parse
 * @param languageParsers - Map of language parsers
 * @param rooIgnoreController - Optional controller to check file access permissions
 * @returns A formatted string with code definitions or null if no definitions found
 */
async function parseFile(
	filePath: string,
	languageParsers: LanguageParser,
	rooIgnoreController?: RooIgnoreController,
): Promise<string | null> {
	// Check if we have permission to access this file
	if (rooIgnoreController && !rooIgnoreController.validateAccess(filePath)) {
		return null
	}

	// Read file content
	const fileContent = await fs.readFile(filePath, "utf8")
	const extLang = path.extname(filePath).toLowerCase().slice(1)

	// Check if we have a parser for this file type
	const { parser, query } = languageParsers[extLang] || {}
	if (!parser || !query) {
		return null
	}

	try {
		// Parse the file content into an Abstract Syntax Tree (AST)
		const tree = parser.parse(fileContent)

		// Apply the query to the AST and get the captures
		const captures = tree ? query.captures(tree.rootNode) : []

		// Split the file content into individual lines
		const lines = fileContent.split("\n")

		// Process the captures
		return processCaptures(captures, lines, extLang)
	} catch (error) {
		console.log(`Error parsing file: ${error}\n`)
		// Return null on parsing error to avoid showing error messages in the output
		return null
	}
}

// Экспорт новой инфраструктуры унификации
export { TreeSitterParserManager, getParserManager } from "./parser-manager"
export { BaseExtractor } from "./base-extractor"
export { onecQueries } from "./queries/onec"
