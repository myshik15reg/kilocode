// kilocode_change - new file
import React from "react"
import { render, fireEvent, screen, act } from "@/utils/test-utils"

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
				password=""
				onPasswordChange={vi.fn()}
				setCachedStateField={setCachedStateField}
			/>,
		)

		const checkbox = container.querySelector("vscode-checkbox") as unknown as { checked: boolean } | null
		expect(checkbox).not.toBeNull()

		checkbox!.checked = true
		fireEvent(checkbox as any, new Event("change", { bubbles: true }))

		expect(setCachedStateField).toHaveBeenCalledWith("codebaseIndexNeo4jEnabled", true)
	})

	it("does not render the Neo4j about/description block in the form body", () => {
		const setCachedStateField = vi.fn()

		render(
			<Neo4jSettings
				enabled={true}
				uri="bolt://localhost:7687"
				username="neo4j"
				database="neo4j"
				password=""
				onPasswordChange={vi.fn()}
				setCachedStateField={setCachedStateField}
			/>,
		)

		// These keys used to be rendered inside the removed "Description" section.
		expect(document.body.textContent).not.toContain("settings:codeIndex.neo4j.aboutTitle")
		expect(document.body.textContent).not.toContain("settings:codeIndex.neo4j.aboutDescription")
		expect(document.body.textContent).not.toContain("settings:codeIndex.neo4j.aboutPoint1")
		expect(document.body.textContent).not.toContain("settings:codeIndex.neo4j.aboutPoint2")
		expect(document.body.textContent).not.toContain("settings:codeIndex.neo4j.aboutPoint3")
	})

	it("shows auto-create hint and created-database message after successful test", () => {
		const setCachedStateField = vi.fn()

		render(
			<Neo4jSettings
				enabled={true}
				uri="bolt://localhost:7687"
				username="neo4j"
				database="project_graph"
				password=""
				onPasswordChange={vi.fn()}
				setCachedStateField={setCachedStateField}
			/>,
		)

		expect(screen.getByText("settings:codeIndex.neo4j.autoCreateHint")).toBeInTheDocument()

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "neo4jConnectionResult",
						neo4jConnectionResult: {
							success: true,
							message: "Successfully connected to Neo4j",
							databaseCreated: true,
						},
					},
				}),
			)
		})

		expect(screen.getByText("settings:codeIndex.neo4j.databaseCreatedHint")).toBeInTheDocument()
	})
})
