import { render, screen, fireEvent } from "@/utils/test-utils"

import TaskItem from "../TaskItem"

vi.mock("@src/utils/vscode")
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

const mockTask = {
	id: "1",
	number: 1,
	task: "Test task",
	ts: Date.now(),
	tokensIn: 100,
	tokensOut: 50,
	totalCost: 0.002,
	workspace: "/test/workspace",
}

describe("TaskItem", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders task information", () => {
		render(
			<TaskItem
				item={{ ...mockTask, status: "active" }}
				variant="full"
				isSelected={false}
				onToggleSelection={vi.fn()}
				isSelectionMode={false}
			/>,
		)

		expect(screen.getByText("Test task")).toBeInTheDocument()
		expect(screen.getByText("$0.00")).toBeInTheDocument()
	})

	it("handles selection in selection mode", () => {
		const onToggleSelection = vi.fn()
		render(
			<TaskItem
				item={mockTask}
				variant="full"
				isSelected={false}
				onToggleSelection={onToggleSelection}
				isSelectionMode={true}
			/>,
		)

		const checkbox = screen.getByRole("checkbox")
		fireEvent.click(checkbox)

		expect(onToggleSelection).toHaveBeenCalledWith("1", true)
	})

	it("shows action buttons", () => {
		render(
			<TaskItem
				item={mockTask}
				variant="full"
				isSelected={false}
				onToggleSelection={vi.fn()}
				isSelectionMode={false}
			/>,
		)

		expect(screen.getByTestId("copy-prompt-button")).toBeInTheDocument()
		expect(screen.getByTestId("export")).toBeInTheDocument()
		expect(screen.getByLabelText("Pause task")).toBeInTheDocument()
		expect(screen.getByLabelText("Branch task")).toBeInTheDocument()
	})

	it("displays time ago information", () => {
		render(
			<TaskItem
				item={mockTask}
				variant="full"
				isSelected={false}
				onToggleSelection={vi.fn()}
				isSelectionMode={false}
			/>,
		)

		expect(screen.getByText(/ago/)).toBeInTheDocument()
	})

	it("applies hover effect class", () => {
		render(
			<TaskItem
				item={mockTask}
				variant="full"
				isSelected={false}
				onToggleSelection={vi.fn()}
				isSelectionMode={false}
			/>,
		)

		const taskItem = screen.getByTestId("task-item-1")
		expect(taskItem).toHaveClass("hover:bg-vscode-list-hoverBackground")
	})

	it("does not show parent badge with child count anymore", () => {
		render(<TaskItem item={{ ...mockTask, id: "parent", childIds: ["a", "b"] }} variant="compact" />)

		expect(screen.queryByText(/history:parent/)).not.toBeInTheDocument()
	})

	it("shows descendant summary for root tasks", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "root" }}
				variant="compact"
				descendantSummary={{ totalDescendants: 4, active: 1, delegated: 1, completed: 1, aborted: 1 }}
			/>,
		)

		expect(screen.getByTestId("task-item-descendants-root")).toHaveTextContent("history:children 4")
		expect(screen.getByTestId("task-item-summary-root")).toHaveTextContent("history:active 1")
		expect(screen.getByTestId("task-item-summary-root")).toHaveTextContent("history:delegated 1")
		expect(screen.getByTestId("task-item-summary-root")).toHaveTextContent("history:done 1")
		expect(screen.getByTestId("task-item-summary-root")).toHaveTextContent("history:error 1")
	})

	it("renders running status badge for active roots", () => {
		render(
			<TaskItem
				item={{ ...mockTask, status: "active" }}
				variant="full"
				runningRootTaskIds={["1"]}
				isActiveRootTask={true}
				isFocusedRootTask={true}
				isSelected={false}
				onToggleSelection={vi.fn()}
				isSelectionMode={false}
			/>,
		)

		expect(screen.getByTestId("task-item-badges-1")).toBeInTheDocument()
		expect(screen.getByText("history:statusRunning")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-1")).toHaveClass("border-vscode-focusBorder")
	})

	it("renders stopped status for inactive unfinished roots", () => {
		render(<TaskItem item={{ ...mockTask, id: "inactive", status: "active" }} variant="compact" />)

		expect(screen.getByTestId("task-item-badges-inactive")).toHaveTextContent("history:statusStopped")
	})

	it("keeps stopped badge for resumable root opened from history", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "resumable-stopped", status: "active", lastStopReason: "user_cancelled" }}
				variant="compact"
			/>,
		)

		expect(screen.getByTestId("task-item-badges-resumable-stopped")).toHaveTextContent("history:statusStopped")
	})

	// kilocode_change start
	it("renders done status as bright until viewed", () => {
		render(
			<TaskItem
				item={{
					...mockTask,
					id: "done-bright",
					status: "completed",
					statusUpdatedAt: 200,
					lastStatusViewedAt: 100,
				}}
				variant="compact"
			/>,
		)

		const badge = screen.getByText("history:statusDone")
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass("text-green-300")
		expect(badge).toHaveClass("border-green-500/80")
	})

	it("renders done status as muted after viewed", () => {
		render(
			<TaskItem
				item={{
					...mockTask,
					id: "done-muted",
					status: "completed",
					statusUpdatedAt: 100,
					lastStatusViewedAt: 200,
				}}
				variant="compact"
			/>,
		)

		const badge = screen.getByText("history:statusDone")
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass("text-green-400/70")
		expect(badge).toHaveClass("border-green-500/40")
	})

	it("renders error status as bright until viewed", () => {
		render(
			<TaskItem
				item={{
					...mockTask,
					id: "error-bright",
					status: "aborted",
					lastStopReason: "loop_detected",
					statusUpdatedAt: 200,
					lastStatusViewedAt: 100,
				}}
				variant="compact"
			/>,
		)

		const badge = screen.getByText("history:statusError")
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass("text-red-300")
		expect(badge).toHaveClass("border-red-500/80")
	})

	it("renders error status as muted after viewed", () => {
		render(
			<TaskItem
				item={{
					...mockTask,
					id: "error-muted",
					status: "aborted",
					lastStopReason: "loop_detected",
					statusUpdatedAt: 100,
					lastStatusViewedAt: 200,
				}}
				variant="compact"
			/>,
		)

		const badge = screen.getByText("history:statusError")
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveClass("text-red-400/70")
		expect(badge).toHaveClass("border-red-500/40")
	})
	// kilocode_change end

	it("renders stopped status badge for user-stopped roots", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "stopped", status: "aborted", lastStopReason: "user_cancelled" }}
				variant="compact"
				isActiveRootTask={true}
			/>,
		)

		expect(screen.getByTestId("task-item-badges-stopped")).toHaveTextContent("history:statusStopped")
	})

	it("renders error status badge for failed roots", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "error", status: "aborted", lastStopReason: "loop_detected" }}
				variant="compact"
				isActiveRootTask={true}
			/>,
		)

		expect(screen.getByTestId("task-item-badges-error")).toHaveTextContent("history:statusError")
	})

	it("renders done status badge for completed roots even before opening task", () => {
		render(<TaskItem item={{ ...mockTask, id: "done", status: "completed" }} variant="compact" />)

		expect(screen.getByTestId("task-item-badges-done")).toHaveTextContent("history:statusDone")
	})

	it("renders orchestration status badge from activity state", () => {
		render(
			<TaskItem
				item={{
					...mockTask,
					id: "orchestrated",
					activity: [
						{
							kind: "subagent",
							id: "sa-1",
							taskId: "orchestrated",
							status: "paused",
							summary: "Waiting",
							timestamp: 1,
						},
					],
				}}
				variant="compact"
			/>,
		)

		expect(screen.getByTestId("task-item-badges-orchestrated")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-orchestration-orchestrated")).toBeInTheDocument()
		expect(screen.getByTestId("orchestration-status-badge-paused")).toBeInTheDocument()
		expect(screen.queryByText("chat:orchestration.title")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusStopped")).not.toBeInTheDocument()
	})

	it("renders orchestration status badge from background child history when activity has not arrived yet", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "parent", childIds: ["child"] }}
				taskHistory={
					[
						{ ...mockTask, id: "parent", childIds: ["child"] },
						{
							...mockTask,
							id: "child",
							task: "Background child",
							parentTaskId: "parent",
							rootTaskId: "parent",
							execution: "background",
							lifecycleState: "paused",
							status: "active",
						},
					] as any
				}
				variant="compact"
			/>,
		)

		expect(screen.getByTestId("task-item-badges-parent")).toBeInTheDocument()
		expect(screen.getByTestId("orchestration-status-badge-paused")).toBeInTheDocument()
	})

	it("renders recoverable orchestration badge from background child streaming failure history", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "parent-recoverable", childIds: ["child-recoverable"] }}
				taskHistory={
					[
						{ ...mockTask, id: "parent-recoverable", childIds: ["child-recoverable"] },
						{
							...mockTask,
							id: "child-recoverable",
							task: "Recoverable child",
							parentTaskId: "parent-recoverable",
							rootTaskId: "parent-recoverable",
							execution: "background",
							lifecycleState: "paused",
							lastStopReason: "streaming_failed",
							status: "active",
						},
					] as any
				}
				variant="compact"
			/>,
		)

		expect(screen.getByTestId("orchestration-status-badge-recoverable")).toBeInTheDocument()
	})

	it("renders completed orchestration badge from background child history", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "parent-complete", childIds: ["child-complete"] }}
				taskHistory={
					[
						{ ...mockTask, id: "parent-complete", childIds: ["child-complete"] },
						{
							...mockTask,
							id: "child-complete",
							task: "Completed child",
							parentTaskId: "parent-complete",
							rootTaskId: "parent-complete",
							execution: "background",
							lifecycleState: "completed",
							status: "completed",
						},
					] as any
				}
				variant="compact"
			/>,
		)

		expect(screen.getByTestId("orchestration-status-badge-completed")).toBeInTheDocument()
	})

	it("renders queued orchestration badge from background child history before activity arrives", () => {
		render(
			<TaskItem
				item={{ ...mockTask, id: "parent-queued", childIds: ["child-queued"] }}
				taskHistory={
					[
						{ ...mockTask, id: "parent-queued", childIds: ["child-queued"] },
						{
							...mockTask,
							id: "child-queued",
							task: "Queued child",
							parentTaskId: "parent-queued",
							rootTaskId: "parent-queued",
							execution: "background",
						},
					] as any
				}
				variant="compact"
			/>,
		)

		expect(screen.getByTestId("orchestration-status-badge-queued")).toBeInTheDocument()
	})

	it("does not show orchestration badge for relay-only activity", () => {
		render(
			<TaskItem
				item={{
					...mockTask,
					id: "relay-only",
					activity: [
						{
							kind: "relay",
							id: "relay-1",
							taskId: "relay-only",
							rootTaskId: "root-1",
							status: "delivered",
							envelope: {
								kind: "parent",
								fromTaskId: "child-1",
								toTaskId: "relay-only",
								rootTaskId: "root-1",
								content: "Need review",
								requiresParentVisibility: true,
								timestamp: 1,
							},
							summary: "Relay delivered",
							timestamp: 1,
						},
					],
				}}
				variant="compact"
			/>,
		)

		expect(screen.queryByTestId("orchestration-status-badge-completed")).not.toBeInTheDocument()
	})
})
