// Mocks must come first, before imports

vi.mock("fs/promises", () => ({
	readFile: vi.fn().mockImplementation(() => Promise.resolve("")),
}))

vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn().mockImplementation(() => Promise.resolve(true)),
}))

const { loadRequiredLanguageParsersMock } = vi.hoisted(() => ({
	loadRequiredLanguageParsersMock: vi.fn(),
}))

vi.mock("../languageParser", async () => {
	const actual = await vi.importActual<typeof import("../languageParser")>("../languageParser")
	return {
		...actual,
		loadRequiredLanguageParsers: loadRequiredLanguageParsersMock,
	}
})

import * as fs from "fs/promises"
import type { Mock } from "vitest"

import { parseSourceCodeDefinitionsForFile } from "../index"

describe("parseSourceCodeDefinitions (XML fallback)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns fallback definitions for 1C XML-like files without requiring tree-sitter", async () => {
		const xml = `<?xml version="1.0" encoding="utf-8"?>
<MetaDataObject>
  <Name>Configuration</Name>
</MetaDataObject>
`

		;(fs.readFile as Mock).mockImplementation(() => Promise.resolve(xml))
		loadRequiredLanguageParsersMock.mockRejectedValue(new Error("should not be called"))

		const result = await parseSourceCodeDefinitionsForFile("Configuration.mdo")
		expect(result).toBeDefined()
		expect(result).toContain("# Configuration.mdo")
		expect(result).toContain("2--2 | <MetaDataObject>")
		expect(loadRequiredLanguageParsersMock).not.toHaveBeenCalled()
	})
})
