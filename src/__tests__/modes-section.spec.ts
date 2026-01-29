// kilocode_change - new file

// This test validates our prompt-size optimization: when there are many modes,
// we keep descriptions only for built-in modes and list custom modes by name/slug.

vi.mock("../utils/globalContext", () => ({
	ensureSettingsDirectoryExists: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../shared/modes", async () => {
	const actual = await vi.importActual<typeof import("../shared/modes")>("../shared/modes")
	return {
		...actual,
		getAllModesWithPrompts: vi.fn(),
	}
})

import { getModesSection } from "../core/prompts/sections/modes"
import { getAllModesWithPrompts, modes } from "../shared/modes"

describe("getModesSection", () => {
	it("omits custom mode descriptions when many modes exist", async () => {
		const builtInCodeMode = modes.find((m) => m.slug === "code")
		if (!builtInCodeMode) {
			throw new Error("Expected built-in 'code' mode to exist")
		}

		const customModes = Array.from({ length: 25 }, (_, i) => ({
			slug: `custom-${i}`,
			name: `Custom ${i}`,
			roleDefinition: "Custom role.",
			whenToUse: "Use for custom work.",
		}))

		vi.mocked(getAllModesWithPrompts).mockResolvedValue([builtInCodeMode as any, ...(customModes as any)])

		const section = await getModesSection({} as any, true)

		// Built-in mode keeps description.
		expect(section).toContain('"Code" mode (code) -')

		// Custom modes are listed without descriptions.
		expect(section).toContain('"Custom 0" mode (custom-0)')
		expect(section).not.toContain('"Custom 0" mode (custom-0) -')
	})
})
