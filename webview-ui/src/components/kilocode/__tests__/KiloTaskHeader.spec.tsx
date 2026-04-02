import React from "react"
import { fireEvent, render, screen } from "@/utils/test-utils"

import KiloTaskHeader from "../KiloTaskHeader"

const { postMessageMock } = vi.hoisted(() => ({
	postMessageMock: vi.fn(),
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
	initReactI18next: {
		type: "3rdParty",
		init: vi.fn(),
	},
}))

vi.mock("react-use", () => ({
	useWindowSize: () => ({ width: 800, height: 600 }),
}))

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: postMessageMock,
	},
}))

let mockExtensionState = {
	showTaskTimeline: false,
	showDiffStats: false,
	clineMessages: [],
	apiConfiguration: { apiProvider: "anthropic", apiModelId: "test-model" },
	currentTaskItem: { id: "root-1" },
	customModes: [],
	commands: [],
	taskHistory: [
		{ id: "root-1", task: "Root One", number: 1, ts: 1, tokensIn: 0, tokensOut: 0, totalCost: 0 },
		{ id: "root-2", task: "Root Two", number: 2, ts: 2, tokensIn: 0, tokensOut: 0, totalCost: 0 },
	],
	activeRootTaskIds: ["root-1", "root-2"],
	focusedRootTaskId: "root-1",
	currentTaskActivity: [],
} as any

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => mockExtensionState,
}))

vi.mock("@/components/ui/hooks/useSelectedModel", () => ({
	useSelectedModel: () => ({
		id: "test-model",
		info: { contextWindow: 200000 },
	}),
}))

vi.mock("@/components/ui/hooks/kilocode/useTaskDiffStats", () => ({
	useTaskDiffStats: () => ({ added: 0, removed: 0 }),
}))

vi.mock("../DiffStatsDisplay", () => ({
	default: () => null,
}))

vi.mock("../chat/TaskActions", () => ({
	TaskActions: () => null,
}))

vi.mock("../chat/ShareButton", () => ({
	ShareButton: () => null,
}))

vi.mock("../chat/ContextWindowProgress", () => ({
	ContextWindowProgress: () => <div data-testid="context-window-progress" />,
}))

vi.mock("../chat/TaskTimeline", () => ({
	TaskTimeline: () => null,
}))

vi.mock("../common/Thumbnails", () => ({
	default: () => null,
}))

vi.mock("../chat/TodoListDisplay", () => ({
	TodoListDisplay: () => null,
}))

describe("KiloTaskHeader", () => {
	beforeEach(() => {
		postMessageMock.mockClear()
		mockExtensionState = {
			showTaskTimeline: false,
			showDiffStats: false,
			clineMessages: [],
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "test-model" },
			currentTaskItem: { id: "root-1" },
			customModes: [],
			commands: [],
			taskHistory: [
				{ id: "root-1", task: "Root One", number: 1, ts: 1, tokensIn: 0, tokensOut: 0, totalCost: 0 },
				{ id: "root-2", task: "Root Two", number: 2, ts: 2, tokensIn: 0, tokensOut: 0, totalCost: 0 },
			],
			activeRootTaskIds: ["root-1", "root-2"],
			focusedRootTaskId: "root-1",
			currentTaskActivity: [],
		} as any
	})

	it("renders activity groups without duplicating child summary links when detailed activity exists", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1"] },
			taskHistory: [
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
					task: "Background child task",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
					execution: "background",
				},
			],
			currentTaskActivity: [
				{
					kind: "toolBatch",
					id: "tb-1",
					requestId: "req-1",
					taskId: "parent-1",
					status: "progress",
					summary: "Scanning files",
					timestamp: 10,
				},
				{
					kind: "subagent",
					id: "sa-1",
					taskId: "child-1",
					sessionId: "session-1",
					status: "running",
					summary: "Background child running",
					timestamp: 20,
				},
				{
					kind: "taskControl",
					id: "tc-1",
					taskId: "parent-1",
					control: "pause",
					summary: "Paused parent",
					timestamp: 30,
				},
			],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Parent task", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-orchestration-badge")).toBeInTheDocument()
		fireEvent.click(screen.getAllByText("Parent task")[0])
		expect(screen.getByTestId("activity-group-backgroundActions")).toBeInTheDocument()
		expect(screen.getByTestId("activity-group-subagents")).toBeInTheDocument()
		expect(screen.getByTestId("activity-group-timeline")).toBeInTheDocument()
		expect(screen.queryByTestId("child-task-link-child-1")).not.toBeInTheDocument()
	})

	it("does not show header orchestration badge for relay-only activity", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskActivity: [
				{
					kind: "relay",
					id: "relay-1",
					taskId: "root-1",
					rootTaskId: "root-1",
					status: "delivered",
					envelope: {
						kind: "parent",
						fromTaskId: "child-1",
						toTaskId: "root-1",
						rootTaskId: "root-1",
						content: "Need review",
						requiresParentVisibility: true,
						timestamp: 10,
					},
					summary: "Relay delivered from child-1 to parent root-1 (1 recipients).",
					timestamp: 10,
				},
			],
		} as any

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Root task", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.queryByTestId("task-orchestration-badge")).not.toBeInTheDocument()
		fireEvent.click(screen.getAllByText("Root task")[0])
		expect(screen.getByTestId("activity-group-timeline")).toBeInTheDocument()
	})

	it("does not render unrelated active root tasks in the task hierarchy area", () => {
		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Current root", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.queryByTestId("background-root-switcher")).not.toBeInTheDocument()
		expect(screen.queryByTestId("root-task-switch-root-2")).not.toBeInTheDocument()
		expect(screen.queryByTestId("task-hierarchy-nav")).not.toBeInTheDocument()
	})

	it("shows orchestration badge from background child state before detailed activity arrives", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1"] },
			taskHistory: [
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
					task: "Background child task",
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
			],
			currentTaskActivity: [],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Parent task", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-orchestration-badge")).toBeInTheDocument()
		expect(screen.queryByText("chat:orchestration.title")).not.toBeInTheDocument()
		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
	})

	it("shows queued orchestration badge from background child state before detailed activity arrives", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1"] },
			taskHistory: [
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
					task: "Queued background child task",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
					execution: "background",
				},
			],
			currentTaskActivity: [],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Parent task", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-orchestration-badge")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-queued").length).toBeGreaterThan(0)
	})

	it("shows recoverable orchestration badge from paused streaming failure before detailed activity arrives", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1"] },
			taskHistory: [
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
					task: "Recoverable background child task",
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
			],
			currentTaskActivity: [],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Parent task", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-orchestration-badge")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-recoverable").length).toBeGreaterThan(0)
	})

	it("moves orchestration title into expanded activity panel instead of duplicating it in header", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskActivity: [
				{
					kind: "subagent",
					id: "sa-1",
					taskId: "root-1",
					sessionId: "session-1",
					status: "running",
					summary: "Running helper",
					timestamp: 1,
				},
			],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Root One", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-orchestration-summary")).toBeInTheDocument()
		expect(screen.queryByText("chat:orchestration.title")).not.toBeInTheDocument()

		fireEvent.click(screen.getAllByText("Root One")[0])

		expect(screen.queryByTestId("task-orchestration-summary")).not.toBeInTheDocument()
		expect(screen.getByTestId("orchestration-summary")).toBeInTheDocument()
		expect(screen.getByText("chat:orchestration.title")).toBeInTheDocument()
	})

	it("shows completed orchestration badge from background child history after reload", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1"] },
			taskHistory: [
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
					task: "Background child task",
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
			],
			currentTaskActivity: [],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Parent task", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-orchestration-badge")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-completed").length).toBeGreaterThan(0)
		expect(screen.getByTestId("orchestration-summary-only")).toBeInTheDocument()
	})

	it("renders parent and child task hierarchy and navigates to child task", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1", "child-2"] },
			taskHistory: [
				{
					id: "parent-1",
					task: "Main orchestration task that coordinates helpers",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-1", "child-2"],
				},
				{
					id: "child-1",
					task: "Parser fix subtask for broken response handling",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
				{
					id: "child-2",
					task: "UI follow-up subtask for compact header overflow",
					number: 3,
					ts: 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
			],
			activeRootTaskIds: ["parent-1"],
			focusedRootTaskId: "parent-1",
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Current root", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-hierarchy-nav")).toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-parent-1")).toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-child-1")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("task-hierarchy-item-child-1"))

		expect(postMessageMock).toHaveBeenCalledWith({ type: "showTaskWithId", text: "child-1" })
	})

	it("shows parent plus child hierarchy items without overflow collapsing on the main page", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: {
				id: "parent-1",
				parentTaskId: "root-0",
				childIds: ["child-1", "child-2", "child-3", "child-4"],
			},
			taskHistory: [
				{
					id: "root-0",
					task: "Original parent task",
					number: 0,
					ts: 0,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
				{
					id: "parent-1",
					task: "Main orchestration task",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-1", "child-2", "child-3", "child-4"],
				},
				{
					id: "child-1",
					task: "Parser helper task",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
				{
					id: "child-2",
					task: "UI helper task",
					number: 3,
					ts: 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
				{
					id: "child-3",
					task: "Docs helper task",
					number: 4,
					ts: 4,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
				{
					id: "child-4",
					task: "Tests helper task",
					number: 5,
					ts: 5,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
			],
			activeRootTaskIds: ["parent-1"],
			focusedRootTaskId: "parent-1",
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Current root", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.queryByTestId("task-hierarchy-overflow-toggle")).not.toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-root-0")).toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-child-4")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("task-hierarchy-item-child-4"))

		expect(postMessageMock).toHaveBeenCalledWith({ type: "showTaskWithId", text: "child-4" })
	})

	it("does not render a second compact '+ more' list when hierarchy chips already show child tasks", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: {
				id: "parent-1",
				childIds: ["child-1", "child-2", "child-3", "child-4"],
			},
			taskHistory: [
				{
					id: "parent-1",
					task: "Main orchestration task",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-1", "child-2", "child-3", "child-4"],
				},
				{
					id: "child-1",
					task: "Parser helper task",
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
				{
					id: "child-2",
					task: "UI helper task",
					number: 3,
					ts: 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
					execution: "background",
					status: "active",
				},
				{
					id: "child-3",
					task: "Docs helper task",
					number: 4,
					ts: 4,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
					execution: "background",
					status: "active",
				},
				{
					id: "child-4",
					task: "Tests helper task",
					number: 5,
					ts: 5,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
					execution: "background",
					status: "active",
				},
			],
			currentTaskActivity: [],
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Current root", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.queryByTestId("child-task-more-indicator")).not.toBeInTheDocument()
		expect(screen.queryByTestId("child-task-link-child-4")).not.toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-child-4")).toBeInTheDocument()
	})

	it("does not mix in an unrelated task with the same title into parent-child hierarchy", () => {
		mockExtensionState = {
			...mockExtensionState,
			currentTaskItem: { id: "parent-1", childIds: ["child-1"] },
			taskHistory: [
				{
					id: "parent-1",
					task: "Duplicate title",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-1"],
				},
				{
					id: "child-1",
					task: "Linked child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent-1",
					rootTaskId: "parent-1",
				},
				{
					id: "other-root",
					task: "Duplicate title",
					number: 3,
					ts: 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			],
			activeRootTaskIds: ["parent-1", "other-root"],
			focusedRootTaskId: "parent-1",
		}

		render(
			<KiloTaskHeader
				task={{ type: "say", ts: Date.now(), text: "Duplicate title", images: [] } as any}
				tokensIn={0}
				tokensOut={0}
				totalCost={0}
				contextTokens={0}
				buttonsDisabled={false}
				handleCondenseContext={vi.fn()}
				onClose={vi.fn()}
				groupedMessages={[]}
			/>,
		)

		expect(screen.getByTestId("task-hierarchy-nav")).toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-parent-1")).toBeInTheDocument()
		expect(screen.getByTestId("task-hierarchy-item-child-1")).toBeInTheDocument()
		expect(screen.queryByTestId("task-hierarchy-item-other-root")).not.toBeInTheDocument()
		expect(screen.queryByTestId("root-task-switch-other-root")).not.toBeInTheDocument()
	})
})
