import { fireEvent, render, screen } from "@/utils/test-utils"

import TaskItemFooter from "../TaskItemFooter"

const { postMessageMock } = vi.hoisted(() => ({
	postMessageMock: vi.fn(),
}))

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: postMessageMock },
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@/utils/format", () => ({
	formatTimeAgo: vi.fn(() => "2 hours ago"),
	formatDate: vi.fn(() => "January 15 at 2:30 PM"),
	formatLargeNumber: vi.fn((num: number) => num.toString()),
}))

const mockItem = {
	id: "1",
	number: 1,
	task: "Test task",
	ts: Date.now(),
	tokensIn: 100,
	tokensOut: 50,
	totalCost: 0.002,
	workspace: "/test/workspace",
}

describe("TaskItemFooter", () => {
	it("renders time ago information", () => {
		render(<TaskItemFooter item={mockItem} variant="full" />)

		// Should show time ago format
		expect(screen.getByText(/ago/)).toBeInTheDocument()
	})

	it("renders cost information", () => {
		render(<TaskItemFooter item={mockItem} variant="full" />)

		// The component shows $0.00 for small amounts, not the exact value
		expect(screen.getByText("$0.00")).toBeInTheDocument()
	})

	it("shows action buttons", () => {
		render(<TaskItemFooter item={mockItem} variant="full" />)

		// Should show copy and export buttons
		expect(screen.getByTestId("copy-prompt-button")).toBeInTheDocument()
		expect(screen.getByTestId("export")).toBeInTheDocument()
	})

	it("hides export button in compact variant", () => {
		render(<TaskItemFooter item={mockItem} variant="compact" />)

		// Should show copy button but not export button
		expect(screen.getByTestId("copy-prompt-button")).toBeInTheDocument()
		expect(screen.queryByTestId("export")).not.toBeInTheDocument()
	})

	it("hides action buttons in selection mode", () => {
		render(<TaskItemFooter item={mockItem} variant="full" isSelectionMode={true} />)

		// Should not show any action buttons
		expect(screen.queryByTestId("copy-prompt-button")).not.toBeInTheDocument()
		expect(screen.queryByTestId("export")).not.toBeInTheDocument()
		expect(screen.queryByTestId("delete-task-button")).not.toBeInTheDocument()
	})

	it("shows delete button when not in selection mode and onDelete is provided", () => {
		render(<TaskItemFooter item={mockItem} variant="full" isSelectionMode={false} onDelete={vi.fn()} />)

		expect(screen.getByTestId("delete-task-button")).toBeInTheDocument()
	})

	it("does not show delete button in selection mode", () => {
		render(<TaskItemFooter item={mockItem} variant="full" isSelectionMode={true} onDelete={vi.fn()} />)

		expect(screen.queryByTestId("delete-task-button")).not.toBeInTheDocument()
	})

	it("does not show delete button when onDelete is not provided", () => {
		render(<TaskItemFooter item={mockItem} variant="full" isSelectionMode={false} />)

		expect(screen.queryByTestId("delete-task-button")).not.toBeInTheDocument()
	})

	// kilocode_change start
	it("posts pause and branch actions from history orchestration controls", () => {
		render(<TaskItemFooter item={mockItem} variant="full" />)

		fireEvent.click(screen.getByLabelText("chat:task.pause"))
		fireEvent.click(screen.getByLabelText("chat:task.branch"))

		expect(postMessageMock).toHaveBeenNthCalledWith(1, { type: "pauseTask", text: "1" })
		expect(postMessageMock).toHaveBeenNthCalledWith(2, { type: "branchTask", text: "1" })
	})

	it("shows resume control for paused orchestration items", () => {
		render(<TaskItemFooter item={{ ...mockItem, lifecycleState: "paused" }} variant="full" />)

		fireEvent.click(screen.getByLabelText("chat:resumeTask.title"))

		expect(postMessageMock).toHaveBeenCalledWith({ type: "resumeTask", text: "1" })
	})

	it("hides pause, resume, and branch controls for completed history items", () => {
		render(
			<TaskItemFooter item={{ ...mockItem, status: "completed", lifecycleState: "completed" }} variant="full" />,
		)

		expect(screen.queryByLabelText("chat:task.pause")).not.toBeInTheDocument()
		expect(screen.queryByLabelText("chat:resumeTask.title")).not.toBeInTheDocument()
		expect(screen.queryByLabelText("chat:task.branch")).not.toBeInTheDocument()
	})
	// kilocode_change end
})
