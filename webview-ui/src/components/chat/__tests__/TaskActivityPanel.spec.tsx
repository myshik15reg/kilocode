// kilocode_change - new file
import { render, screen } from "@/utils/test-utils"

import TaskActivityPanel from "../TaskActivityPanel"

const { postMessageMock } = vi.hoisted(() => ({
	postMessageMock: vi.fn(),
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) => {
			if (key === "chat:orchestration.itemFallback") {
				return "chat:orchestration.itemFallback"
			}
			if (typeof options?.count === "number") {
				return `${key} ${options.count}`
			}
			return key
		},
	}),
}))

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: postMessageMock,
	},
}))

describe("TaskActivityPanel", () => {
	beforeEach(() => {
		postMessageMock.mockClear()
	})

	it("renders nothing for empty orchestration state", () => {
		const { container } = render(<TaskActivityPanel />)

		expect(container.firstChild).toBeNull()
	})

	it("shows summary-only state when background subagents exist without activity details", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "active",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("task-activity-panel")).toBeInTheDocument()
		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-running").length).toBeGreaterThan(0)
		expect(screen.getByTestId("child-task-link-child-1")).toBeInTheDocument()
	})

	it("derives paused summary-only state from child lifecycle after reload", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Paused background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "active",
							lifecycleState: "paused",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-paused").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.pausedCount 1")).not.toBeInTheDocument()
	})

	it("derives recoverable summary-only state from paused streaming failure after reload", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Recoverable background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "active",
							lifecycleState: "paused",
							lastStopReason: "streaming_failed",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-recoverable").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.recoverableCount 1")).not.toBeInTheDocument()
	})

	it("derives cancelled summary-only state from child lifecycle after reload", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Cancelled background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "aborted",
							lifecycleState: "cancelled",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-cancelled").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.cancelledCount 1")).not.toBeInTheDocument()
	})

	it("derives completed summary-only state from child lifecycle after reload", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Completed background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "completed",
							lifecycleState: "completed",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-completed").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.completedCount 1")).not.toBeInTheDocument()
	})

	it("derives abstained summary-only state from persisted delegation outcome after reload", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Abstained background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "aborted",
							lifecycleState: "completed",
							delegationOutcomeStatus: "abstained",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-abstained").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.abstainedCount 1")).not.toBeInTheDocument()
	})

	it("derives queued summary-only state from background child history before activity arrives", () => {
		render(
			<TaskActivityPanel
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Queued background child",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-queued").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.queuedCount 1")).not.toBeInTheDocument()
	})

	it("renders failed and partial activity details with fallback summary text", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "toolBatch",
							id: "tb-1",
							requestId: "req-1",
							taskId: "parent-1",
							status: "failed",
							summary: "",
							timestamp: 10,
						},
						{
							kind: "subagent",
							id: "sa-1",
							taskId: "child-1",
							sessionId: "session-1",
							status: "queued",
							summary: "Queued helper",
							timestamp: 20,
						},
					] as any
				}
				currentTaskItem={{ id: "parent-1", childIds: ["child-1"] } as any}
				taskHistory={
					[
						{
							id: "parent-1",
							task: "Parent task",
							number: 1,
							ts: 1,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							childIds: ["child-1"],
						},
						{
							id: "child-1",
							task: "Child task",
							number: 2,
							ts: 2,
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
							parentTaskId: "parent-1",
							rootTaskId: "parent-1",
							execution: "background",
							status: "active",
						},
					] as any
				}
			/>,
		)

		expect(screen.getAllByTestId("orchestration-status-badge-failed").length).toBeGreaterThan(0)
		expect(screen.getByTestId("orchestration-summary")).toHaveTextContent("1 failed · 1 queued")
		expect(screen.getByText("chat:orchestration.itemFallback")).toBeInTheDocument()
		expect(screen.queryByTestId("child-task-link-child-1")).not.toBeInTheDocument()
	})

	it("shows completed state when the latest status for a subagent is completed", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "subagent",
							id: "sa-1",
							taskId: "child-1",
							sessionId: "session-1",
							status: "queued",
							summary: "Queued helper",
							timestamp: 10,
						},
						{
							kind: "subagent",
							id: "sa-2",
							taskId: "child-1",
							sessionId: "session-1",
							status: "running",
							summary: "Running helper",
							timestamp: 20,
						},
						{
							kind: "subagent",
							id: "sa-3",
							taskId: "child-1",
							sessionId: "session-1",
							status: "completed",
							summary: "Completed helper",
							timestamp: 30,
						},
					] as any
				}
			/>,
		)

		expect(screen.getAllByTestId("orchestration-status-badge-completed").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.completedCount 1")).not.toBeInTheDocument()
		expect(screen.queryByText("chat:orchestration.queuedCount 1")).not.toBeInTheDocument()
		expect(screen.queryByText("chat:orchestration.runningCount 1")).not.toBeInTheDocument()
	})

	it("keeps summary counts when more than one orchestration item contributes", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "subagent",
							id: "sa-1",
							taskId: "child-1",
							sessionId: "session-1",
							status: "running",
							summary: "Running helper",
							timestamp: 10,
						},
						{
							kind: "subagent",
							id: "sa-2",
							taskId: "child-2",
							sessionId: "session-2",
							status: "running",
							summary: "Running helper 2",
							timestamp: 20,
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("orchestration-summary")).toHaveTextContent("2 running")
	})

	it("includes tech debt events in the activity timeline group", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "techDebt",
							id: "td-1",
							taskId: "parent-1",
							itemId: "debt-1",
							status: "accepted",
							summary: "Track follow-up cleanup",
							timestamp: 30,
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("activity-group-timeline")).toBeInTheDocument()
		expect(screen.getByText("Track follow-up cleanup")).toBeInTheDocument()
	})

	it("renders relay events in the timeline without showing an orchestration status badge", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "relay",
							id: "relay-1",
							taskId: "parent-1",
							rootTaskId: "root-1",
							status: "delivered",
							envelope: {
								kind: "parent",
								fromTaskId: "child-1",
								toTaskId: "parent-1",
								rootTaskId: "root-1",
								content: "Need review",
								requiresParentVisibility: true,
								timestamp: 30,
							},
							summary: "Relay delivered from child-1 to parent parent-1 (1 recipients).",
							timestamp: 30,
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("activity-group-timeline")).toBeInTheDocument()
		expect(screen.getByText("Relay delivered from child-1 to parent parent-1 (1 recipients).")).toBeInTheDocument()
		expect(screen.queryByTestId("orchestration-status-badge-completed")).not.toBeInTheDocument()
	})

	it("renders structured delegation and outcome explanations without duplicating rows", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "subagent",
							id: "sa-delegation",
							taskId: "child-1",
							sessionId: "session-1",
							status: "queued",
							summary: "Background subagent queued",
							explainability: {
								stage: "delegation",
								reasonCode: "historical_background_win",
								source: "recommended",
								mode: "code",
								execution: "background",
								profileClass: "cheap",
								helperProfile: "Fast helper",
								recommendationReasonCode: "historical_background_win",
							},
							timestamp: 10,
						},
						{
							kind: "subagent",
							id: "sa-outcome",
							taskId: "child-2",
							sessionId: "session-2",
							status: "completed",
							summary: "Child completed successfully",
							explainability: {
								stage: "outcome",
								reasonCode: "subagent_completed",
								source: "status",
								mode: "code",
								execution: "background",
								outcomeSummary: "Produced concise implementation summary",
							},
							timestamp: 20,
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("activity-item-explanation-sa-delegation")).toHaveTextContent(
			"route: background · code · helper: cheap · Fast helper · 10",
		)
		expect(screen.getByTestId("activity-item-explanation-sa-outcome")).toHaveTextContent(
			"outcome: Produced concise implementation summary · 20",
		)
	})

	it("collapses repeated stop entries in the timeline down to the latest duplicate", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "taskControl",
							id: "tc-1",
							taskId: "parent-1",
							control: "pause",
							summary: "Task cancelled by user",
							timestamp: 10,
						},
						{
							kind: "taskControl",
							id: "tc-2",
							taskId: "parent-1",
							control: "pause",
							summary: "Task cancelled by user",
							timestamp: 20,
						},
						{
							kind: "taskControl",
							id: "tc-3",
							taskId: "parent-1",
							control: "pause",
							summary: "Task cancelled by user",
							timestamp: 30,
						},
					] as any
				}
			/>,
		)

		expect(screen.getAllByText("Task cancelled by user")).toHaveLength(1)
		expect(screen.getByTestId("activity-item-tc-3")).toBeInTheDocument()
		expect(screen.queryByTestId("activity-item-tc-1")).not.toBeInTheDocument()
	})

	it("renders blocked relay events with a failed orchestration badge", () => {
		render(
			<TaskActivityPanel
				activity={
					[
						{
							kind: "relay",
							id: "relay-blocked-1",
							taskId: "child-1",
							rootTaskId: "root-1",
							status: "blocked",
							envelope: {
								kind: "group",
								fromTaskId: "child-1",
								groupId: "group-1",
								rootTaskId: "root-1",
								content: "Cross-root relay denied",
								requiresParentVisibility: false,
								timestamp: 31,
							},
							summary: "Relay blocked from child-1 due to root mismatch.",
							timestamp: 31,
						},
					] as any
				}
			/>,
		)

		expect(screen.getByTestId("activity-group-timeline")).toBeInTheDocument()
		expect(screen.getByText("Relay blocked from child-1 due to root mismatch.")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-failed")).toHaveLength(2)
	})
})
