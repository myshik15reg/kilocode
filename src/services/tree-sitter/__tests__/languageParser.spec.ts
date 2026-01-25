// npx vitest services/tree-sitter/__tests__/languageParser.spec.ts

import * as path from "path"
import { describe, it, expect, beforeEach, vi } from "vitest"

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

import { loadRequiredLanguageParsers } from "../languageParser"
import { getParserManager } from "../parser-manager"

// Path to the directory containing the WASM files.
const WASM_DIR = path.join(__dirname, "../../../node_modules/tree-sitter-wasms/out")

describe("loadRequiredLanguageParsers", () => {
	it("should load Python parser for .py files", async () => {
		const files = ["test.py"]
		const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
		expect(parsers.py).toBeDefined()
	})

	it("should load JavaScript parser for .js and .jsx files", async () => {
		const files = ["test.js", "test.jsx"]
		const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
		expect(parsers.js).toBeDefined()
		expect(parsers.jsx).toBeDefined()
		expect(parsers.js.query).toBeDefined()
		expect(parsers.jsx.query).toBeDefined()
	})

	it("should load multiple language parsers as needed", async () => {
		const files = ["test.js", "test.py", "test.rs", "test.go"]
		const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
		expect(parsers.js).toBeDefined()
		expect(parsers.py).toBeDefined()
		expect(parsers.rs).toBeDefined()
		expect(parsers.go).toBeDefined()
	})

	it("should handle C/C++ files correctly", async () => {
		const files = ["test.c", "test.h", "test.cpp", "test.hpp"]
		const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
		expect(parsers.c).toBeDefined()
		expect(parsers.h).toBeDefined()
		expect(parsers.cpp).toBeDefined()
		expect(parsers.hpp).toBeDefined()
	})

	it("should handle Kotlin files correctly", async () => {
		const files = ["test.kt", "test.kts"]
		const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
		expect(parsers.kt).toBeDefined()
		expect(parsers.kts).toBeDefined()
		expect(parsers.kt.query).toBeDefined()
		expect(parsers.kts.query).toBeDefined()
	})

	it("should throw error for unsupported file extensions", async () => {
		const files = ["test.unsupported"]
		await expect(loadRequiredLanguageParsers(files, WASM_DIR)).rejects.toThrow("Unsupported language: unsupported")
	})

	describe("Integration with TreeSitterParserManager", () => {
		beforeEach(() => {
			// Очистить кэш перед каждым тестом
			const manager = getParserManager()
			manager.clearCache()
		})

		it("should use TreeSitterParserManager for loading parsers", async () => {
			const files = ["test.js"]
			const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
			
			// Проверяем, что парсер создан
			expect(parsers.js).toBeDefined()
			expect(parsers.js.parser).toBeDefined()
			
			// Проверяем, что парсер закэширован в менеджере
			const manager = getParserManager()
			const cachedParser = await manager.getParser("javascript", path.join(WASM_DIR, "tree-sitter-javascript.wasm"))
			
			// Должны получить тот же кэшированный парсер
			expect(parsers.js.parser).toBe(cachedParser)
		})

		it("should reuse cached parsers across multiple calls", async () => {
			const files1 = ["test1.ts"]
			const files2 = ["test2.ts"]
			
			const parsers1 = await loadRequiredLanguageParsers(files1, WASM_DIR)
			const parsers2 = await loadRequiredLanguageParsers(files2, WASM_DIR)
			
			// Должны получить тот же кэшированный парсер
			expect(parsers1.ts.parser).toBe(parsers2.ts.parser)
		})

		it("should handle 1C language normalization (bsl/os → onec)", async () => {
			const bslFiles = ["test.bsl"]
			const osFiles = ["test.os"]
			
			const bslParsers = await loadRequiredLanguageParsers(bslFiles, WASM_DIR)
			const osParsers = await loadRequiredLanguageParsers(osFiles, WASM_DIR)
			
			// Оба должны использовать парсер onec
			expect(bslParsers.bsl).toBeDefined()
			expect(osParsers.os).toBeDefined()
			
			// Проверяем, что оба используют один и тот же кэшированный парсер onec
			expect(bslParsers.bsl.parser).toBe(osParsers.os.parser)
		})

		it("should share parsers with ParserManager across different components", async () => {
			const manager = getParserManager()
			
			// Загружаем через languageParser
			const files = ["test.py"]
			const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
			
			// Загружаем напрямую через ParserManager (как это делает TreeSitterGraphExtractor)
			const directParser = await manager.getParser("python", path.join(WASM_DIR, "tree-sitter-python.wasm"))
			
			// Должны получить тот же кэшированный парсер
			expect(parsers.py.parser).toBe(directParser)
		})

		it("should handle embedded_template files with same parser", async () => {
			const files = ["test.ejs", "test.erb"]
			const parsers = await loadRequiredLanguageParsers(files, WASM_DIR)
			
			// Оба должны использовать один и тот же парсер
			expect(parsers.embedded_template).toBeDefined()
			expect(parsers.embedded_template.parser).toBeDefined()
		})
	})
})
