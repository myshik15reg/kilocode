import { fireEvent, render, screen } from "@/utils/test-utils"

import TechDebtView from "../TechDebtView"

const { mockUseExtensionState, postMessageMock } = vi.hoisted(() => ({
	mockUseExtensionState: vi.fn(),
	postMessageMock: vi.fn(),
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => mockUseExtensionState(),
}))

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: postMessageMock },
}))

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string, params?: Record<string, unknown>) => {
			if (key === "kilocode:techDebt.subtitle") {
				return `${params?.count ?? 0} suggested items`
			}
			return key
		},
	}),
}))

describe("TechDebtView", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseExtensionState.mockReturnValue({
			currentTaskItem: { id: "root-1", rootTaskId: "root-1" },
			techDebtBacklog: [
				{
					id: "debt-1",
					sourceTaskId: "source-1",
					rootTaskId: "root-1",
					title: "Add tests",
					summary: "Missing tests for helper routing fallback",
					category: "test_gap",
					severity: "medium",
					status: "suggested",
					evidence: ["src/core/helper-routing/HelperModelRouter.ts"],
					createdAt: 20,
				},
				{
					id: "debt-2",
					sourceTaskId: "source-2",
					rootTaskId: "root-2",
					title: "Old debt",
					summary: "Should not be shown for current root",
					category: "cleanup",
					severity: "low",
					status: "suggested",
					createdAt: 10,
				},
				{
					id: "debt-3",
					sourceTaskId: "source-3",
					rootTaskId: "root-1",
					title: "Dismissed debt",
					summary: "Should be hidden",
					category: "cleanup",
					severity: "low",
					status: "dismissed",
					createdAt: 30,
				},
			],
		})
	})

	it("renders only suggested items for the current root task", () => {
		render(<TechDebtView onDone={vi.fn()} />)

		expect(screen.getByTestId("tech-debt-item-debt-1")).toBeInTheDocument()
		expect(screen.queryByTestId("tech-debt-item-debt-2")).not.toBeInTheDocument()
		expect(screen.queryByTestId("tech-debt-item-debt-3")).not.toBeInTheDocument()
	})

	it("posts accept, dismiss, convert, and open-source actions", () => {
		render(<TechDebtView onDone={vi.fn()} />)

		fireEvent.click(screen.getByTestId("tech-debt-accept-debt-1"))
		expect(postMessageMock).toHaveBeenCalledWith({ type: "acceptTechDebt", text: "source-1", itemId: "debt-1" })

		fireEvent.click(screen.getByTestId("tech-debt-dismiss-debt-1"))
		expect(postMessageMock).toHaveBeenCalledWith({ type: "dismissTechDebt", text: "source-1", itemId: "debt-1" })

		fireEvent.click(screen.getByTestId("tech-debt-convert-debt-1"))
		expect(postMessageMock).toHaveBeenCalledWith({
			type: "convertTechDebtToTask",
			text: "source-1",
			itemId: "debt-1",
		})

		fireEvent.click(screen.getByTestId("tech-debt-open-source-debt-1"))
		expect(postMessageMock).toHaveBeenCalledWith({ type: "showTaskWithId", text: "source-1" })
	})

	it("shows an empty state when no suggested items exist", () => {
		mockUseExtensionState.mockReturnValue({
			currentTaskItem: { id: "root-1", rootTaskId: "root-1" },
			techDebtBacklog: [
				{
					id: "debt-3",
					sourceTaskId: "source-3",
					rootTaskId: "root-1",
					title: "Dismissed",
					summary: "Hidden",
					category: "cleanup",
					severity: "low",
					status: "dismissed",
					createdAt: 30,
				},
			],
		})

		render(<TechDebtView onDone={vi.fn()} />)

		expect(screen.getByTestId("tech-debt-empty")).toBeInTheDocument()
	})
})
