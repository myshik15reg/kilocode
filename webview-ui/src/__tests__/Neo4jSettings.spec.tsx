// kilocode_change - new file
import React from "react"
import { render, fireEvent } from "@/utils/test-utils"

import { Neo4jSettings } from "@/components/chat/kilocode/Neo4jSettings"

vi.mock("@src/utils/vscode", () => ({
	vscode: { postMessage: vi.fn() },
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

describe("Neo4jSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("updates codebaseIndexNeo4jEnabled when checkbox is toggled", () => {
		const setCachedStateField = vi.fn()

		const { container } = render(
			<Neo4jSettings
				enabled={false}
				uri="bolt://localhost:7687"
				username="neo4j"
				database="neo4j"
				setCachedStateField={setCachedStateField}
			/>,
		)

		const checkbox = container.querySelector("vscode-checkbox") as unknown as { checked: boolean } | null
		expect(checkbox).not.toBeNull()

		checkbox!.checked = true
		fireEvent(checkbox as any, new Event("change", { bubbles: true }))

		expect(setCachedStateField).toHaveBeenCalledWith("codebaseIndexNeo4jEnabled", true)
	})
})
