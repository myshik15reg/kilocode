import { describe, it, expect, beforeEach, vi } from "vitest"
import { RelationshipExtractor } from "../relationship-extractor"

const initializeMock = vi.fn().mockResolvedValue(undefined)
const extractMock = vi.fn().mockResolvedValue({ entities: [], relationships: [] })
const constructorSpy = vi.fn()

vi.mock("../extractors/tree-sitter-graph-extractor", () => ({
	TreeSitterGraphExtractor: class {
		constructor(languageId: string, query: string) {
			constructorSpy(languageId, query)
		}
		initialize = initializeMock
		extract = extractMock
	},
}))

describe("RelationshipExtractor", () => {
	let extractor: RelationshipExtractor

	beforeEach(() => {
		extractor = new RelationshipExtractor()
		initializeMock.mockClear()
		extractMock.mockClear()
		constructorSpy.mockClear()
	})

	it("detects language by extension", () => {
		expect(extractor.detectLanguage("test.ts")).toBe("typescript")
		expect(extractor.detectLanguage("component.tsx")).toBe("tsx")
		expect(extractor.detectLanguage("module.bsl")).toBe("onec")
		expect(extractor.detectLanguage("module.os")).toBe("onec")
		expect(extractor.detectLanguage("Configuration.mdo")).toBe("xml")
		expect(extractor.detectLanguage("readme.md")).toBeNull()
		expect(extractor.detectLanguage("unknown.ext")).toBeNull()
	})

	it("extracts using normalized language id", async () => {
		await extractor.extract("code", "file.ts")

		expect(constructorSpy).toHaveBeenCalledTimes(1)
		expect(constructorSpy.mock.calls[0][0]).toBe("typescript")
		expect(initializeMock).toHaveBeenCalledTimes(1)
		expect(extractMock).toHaveBeenCalledWith("code", "file.ts")
	})

	it("reuses cached extractor instances", async () => {
		await extractor.extract("code", "file.ts")
		await extractor.extract("more", "another.ts")

		expect(constructorSpy).toHaveBeenCalledTimes(1)
		expect(initializeMock).toHaveBeenCalledTimes(1)
		expect(extractMock).toHaveBeenCalledTimes(2)
	})

	it("extracts XML-like files without tree-sitter", async () => {
		await extractor.extract("<Root />", "Configuration.mdo")

		expect(constructorSpy).not.toHaveBeenCalled()
		expect(initializeMock).not.toHaveBeenCalled()
	})

	it("falls back to plainText extractor when tree-sitter initialization fails (e.g. missing WASM)", async () => {
		initializeMock.mockRejectedValueOnce(new Error("WASM missing"))

		const result = await extractor.extract("code", "file.bsl")

		// Tree-sitter extractor was constructed, but initialize failed so extract() must not be used.
		expect(constructorSpy).toHaveBeenCalledTimes(1)
		expect(extractMock).not.toHaveBeenCalled()

		expect(result.entities).toHaveLength(1)
		expect(result.entities[0].type).toBe("file")
		expect(result.entities[0].language).toBe("onec")
	})

	it("throws when language cannot be resolved", async () => {
		await expect(extractor.extract("code", "file.unknown")).rejects.toThrow("Unable to detect language")
	})
})
