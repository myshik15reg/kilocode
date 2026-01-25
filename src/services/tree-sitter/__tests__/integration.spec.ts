import { describe, it, expect, beforeEach, vi } from "vitest"
import { getParserManager } from "../parser-manager"
import { TreeSitterGraphExtractor } from "../../neo4j/extractors/tree-sitter-graph-extractor"
import { getGraphQueryForLanguage, loadRequiredLanguageParsers } from "../languageParser"

vi.mock("web-tree-sitter", () => {
	class MockLanguage {
		query = vi.fn().mockReturnValue({ captures: vi.fn().mockReturnValue([]) })
		static load = vi.fn().mockResolvedValue(new MockLanguage())
	}

	class MockParser {
		static init = vi.fn().mockResolvedValue(undefined)
		setLanguage = vi.fn()
		parse = vi.fn().mockReturnValue({ rootNode: {} })
	}

	return { Parser: MockParser, Language: MockLanguage }
})

describe("Tree-sitter Graph Integration", () => {
	beforeEach(() => {
		const manager = getParserManager()
		manager.clearCache()
	})

	it("shares parsers between languageParser and graph extractor", async () => {
		const manager = getParserManager()
		const parsers = await loadRequiredLanguageParsers(["test.ts"])

		const extractor = new TreeSitterGraphExtractor("typescript", getGraphQueryForLanguage("typescript") ?? "")
		await extractor.initialize()

		const directParser = await manager.getParser("typescript")

		expect(parsers.ts.parser).toBe(directParser)
	})

	it("returns file entity when no captures are found", async () => {
		const extractor = new TreeSitterGraphExtractor("typescript", getGraphQueryForLanguage("typescript") ?? "")
		await extractor.initialize()

		const result = await extractor.extract("const value = 1", "sample.ts")

		expect(result.entities).toHaveLength(1)
		expect(result.entities[0].type).toBe("file")
		expect(result.relationships).toHaveLength(0)
	})
})
