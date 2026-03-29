import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Provider, createStore } from "jotai"
import { SessionSidebar } from "../SessionSidebar"
import { useExtensionState } from "../../../../context/ExtensionStateContext"
import {
	schedulerStateAtom,
	selectedRootTaskIdAtom,
	upsertSessionAtom,
	updateSessionGroupEventAtom,
	updateSessionGroupMessageAtom,
} from "../../state/atoms/sessions"
import type { TodoItem } from "@roo-code/types"
import { updateSessionTodosAtom } from "../../state/atoms/todos"

function setSessionTodos(store: ReturnType<typeof createStore>, sessionId: string, todos: TodoItem[]) {
	store.set(updateSessionTodosAtom, { sessionId, todos })
}

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, any>) => {
			if (key === "sidebar.queuedLabel") return `${options?.count} queued`
			if (key === "sidebar.budgetLabel") return `budget ${options?.value}`
			if (key === "sidebar.launchQueue")
				return `Launch queue: ${options?.queued} · Running: ${options?.active}/${options?.max}`
			if (key === "sidebar.perGroupLimit") return `Per-group limit: ${options?.count}`
			if (key === "sidebar.sessionCount") return `${options?.count} sessions`
			return key
		},
	}),
	initReactI18next: { type: "3rdParty", init: () => {} },
}))

vi.mock("../../utils/vscode", () => ({
	vscode: { postMessage: vi.fn() },
}))

vi.mock("../../../../context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(() => ({ focusedRootTaskId: undefined })),
}))

describe("SessionSidebar", () => {
	beforeEach(() => {
		vi.mocked(useExtensionState).mockReturnValue({ focusedRootTaskId: undefined } as any)
	})

	it("shows root-scoped rollup badges in the root switcher", async () => {
		const store = createStore()
		store.set(selectedRootTaskIdAtom, "root-a")
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 2,
			queuedLaunchCount: 1,
			activeRootCount: 2,
			queuedRootLaunchCount: 2,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-root-a": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-a-session",
			label: "Root A",
			prompt: "Build A",
			status: "error",
			startTime: 100,
			source: "local",
			taskId: "root-a",
			rootTaskId: "root-a",
			sessionGroup: {
				groupId: "group-root-a",
				rootSessionId: "root-a-session",
				label: "Root A swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-b-session",
			label: "Root B",
			prompt: "Build B",
			status: "running",
			startTime: 101,
			source: "local",
			taskId: "root-b",
			rootTaskId: "root-b",
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-root-a",
			sessionId: "root-a-session",
			eventType: "error",
			summary: "loop_detected",
			timestamp: 2,
		})
		store.set(updateSessionGroupMessageAtom, {
			messageId: "root-a-msg",
			groupId: "group-root-a",
			sourceSessionId: "root-a-session",
			sourceLabel: "Planner",
			content: "Return only delta summary for this root.",
			timestamp: 3,
		})
		setSessionTodos(store, "root-a-session", [{ id: "todo-a", content: "Task A", status: "in_progress" }])
		setSessionTodos(store, "root-b-session", [{ id: "todo-b", content: "Task B", status: "pending" }])

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("agent-root-status-root-a")).toHaveTextContent("status.error")
		expect(screen.getByTestId("agent-root-status-root-b")).toHaveTextContent("status.running")
	})

	it("marks completed root as seen after opening it", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-done-session",
			label: "Done Root",
			prompt: "Build done",
			status: "done",
			startTime: 110,
			source: "local",
			taskId: "root-done",
			rootTaskId: "root-done",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-run-session",
			label: "Run Root",
			prompt: "Build run",
			status: "running",
			startTime: 120,
			source: "local",
			taskId: "root-run",
			rootTaskId: "root-run",
		})
		setSessionTodos(store, "root-done-session", [{ id: "todo-done", content: "Done task", status: "completed" }])
		setSessionTodos(store, "root-run-session", [{ id: "todo-run", content: "Run task", status: "in_progress" }])

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		const doneBadge = screen.getByTestId("agent-root-status-root-done")
		expect(doneBadge).toHaveTextContent("status.done")
		expect(doneBadge.className).toContain("am-root-task-status-seen")

		fireEvent.click(screen.getByTestId("agent-root-switch-root-run"))
		expect(screen.getByTestId("agent-root-status-root-run").className).not.toContain("am-root-task-status-seen")

		fireEvent.click(screen.getByTestId("agent-root-switch-root-done"))
		expect(screen.getByTestId("agent-root-status-root-done").className).toContain("am-root-task-status-seen")
	})

	it("shows root switcher when multiple background roots exist", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-a-session",
			label: "Root A",
			prompt: "Build A",
			status: "running",
			startTime: 100,
			source: "local",
			taskId: "root-a",
			rootTaskId: "root-a",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-b-session",
			label: "Root B",
			prompt: "Build B",
			status: "running",
			startTime: 101,
			source: "local",
			taskId: "root-b",
			rootTaskId: "root-b",
		})
		setSessionTodos(store, "root-a-session", [{ id: "todo-a", content: "Task A", status: "in_progress" }])
		setSessionTodos(store, "root-b-session", [{ id: "todo-b", content: "Task B", status: "pending" }])

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("agent-root-switcher")).toBeInTheDocument()
		expect(screen.getByTestId("agent-root-switch-root-a")).toBeInTheDocument()
		expect(screen.getByTestId("agent-root-switch-root-b")).toBeInTheDocument()
		expect(screen.getByTestId("agent-root-status-summary")).toHaveTextContent("status.running 2")
		expect(screen.getByTestId("agent-root-status-summary-running").className).toContain(
			"am-root-task-rollup-running",
		)
	})

	it("shows root status summary counts for mixed root tasks", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-run",
			label: "Run",
			prompt: "Run",
			status: "running",
			startTime: 1,
			source: "local",
			taskId: "root-run",
			rootTaskId: "root-run",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-done",
			label: "Done",
			prompt: "Done",
			status: "done",
			startTime: 2,
			source: "local",
			taskId: "root-done",
			rootTaskId: "root-done",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-stop",
			label: "Stop",
			prompt: "Stop",
			status: "stopped",
			startTime: 3,
			source: "local",
			taskId: "root-stop",
			rootTaskId: "root-stop",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-error",
			label: "Error",
			prompt: "Error",
			status: "error",
			startTime: 4,
			source: "local",
			taskId: "root-error",
			rootTaskId: "root-error",
		})
		setSessionTodos(store, "root-run", [{ id: "todo-run", content: "Run task", status: "in_progress" }])
		setSessionTodos(store, "root-done", [{ id: "todo-done", content: "Done task", status: "completed" }])
		setSessionTodos(store, "root-stop", [{ id: "todo-stop", content: "Stop task", status: "pending" }])
		setSessionTodos(store, "root-error", [{ id: "todo-error", content: "Error task", status: "pending" }])

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("agent-root-status-summary")).toHaveTextContent("status.done 1")
		expect(screen.getByTestId("agent-root-status-summary")).toHaveTextContent("status.running 1")
		expect(screen.getByTestId("agent-root-status-summary")).toHaveTextContent("status.stopped 1")
		expect(screen.getByTestId("agent-root-status-summary")).toHaveTextContent("status.error 1")
		expect(screen.getByTestId("agent-root-status-summary-done").className).toContain("am-root-task-rollup-done")
		expect(screen.getByTestId("agent-root-status-summary-running").className).toContain(
			"am-root-task-rollup-running",
		)
		expect(screen.getByTestId("agent-root-status-summary-stopped").className).toContain(
			"am-root-task-rollup-stopped",
		)
		expect(screen.getByTestId("agent-root-status-summary-error").className).toContain("am-root-task-rollup-error")
	})

	it("hides root task status when there are no todos", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-a-session",
			label: "Root A",
			prompt: "Build A",
			status: "error",
			startTime: 100,
			source: "local",
			taskId: "root-a",
			rootTaskId: "root-a",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-b-session",
			label: "Root B",
			prompt: "Build B",
			status: "running",
			startTime: 101,
			source: "local",
			taskId: "root-b",
			rootTaskId: "root-b",
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("agent-root-switcher")).toBeInTheDocument()
		expect(screen.queryByTestId("agent-root-status-root-a")).not.toBeInTheDocument()
		expect(screen.queryByTestId("agent-root-status-root-b")).not.toBeInTheDocument()
		expect(screen.queryByTestId("agent-root-status-summary")).not.toBeInTheDocument()
	})

	it("filters visible sessions by selected root and switches roots on click", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(selectedRootTaskIdAtom, "root-a")
		store.set(upsertSessionAtom, {
			sessionId: "root-a-session",
			label: "Root A",
			prompt: "Build A",
			status: "running",
			startTime: 100,
			source: "local",
			taskId: "root-a",
			rootTaskId: "root-a",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-a-child",
			label: "Root A Child",
			prompt: "Build A child",
			status: "running",
			startTime: 101,
			source: "local",
			taskId: "root-a-child",
			rootTaskId: "root-a",
			parentTaskId: "root-a",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-b-session",
			label: "Root B",
			prompt: "Build B",
			status: "running",
			startTime: 102,
			source: "local",
			taskId: "root-b",
			rootTaskId: "root-b",
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getAllByText("Root A").length).toBeGreaterThan(0)
		expect(screen.getByText("Root A Child")).toBeInTheDocument()
		expect(screen.queryByTestId("session-task-linkage-root-b-session")).not.toBeInTheDocument()

		fireEvent.click(screen.getByTestId("agent-root-switch-root-b"))

		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "showTaskWithId", text: "root-b" })
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.selectSession",
			sessionId: "root-b-session",
		})
	})

	it("prefers extension focused root when available", () => {
		vi.mocked(useExtensionState).mockReturnValue({ focusedRootTaskId: "root-b" } as any)
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-a-session",
			label: "Root A",
			prompt: "Build A",
			status: "running",
			startTime: 100,
			source: "local",
			taskId: "root-a",
			rootTaskId: "root-a",
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-b-session",
			label: "Root B",
			prompt: "Build B",
			status: "running",
			startTime: 101,
			source: "local",
			taskId: "root-b",
			rootTaskId: "root-b",
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.queryByTestId("session-task-linkage-root-a-session")).not.toBeInTheDocument()
		expect(screen.getByTestId("session-task-linkage-root-b-session")).toHaveTextContent("root task")
	})

	it("groups multi-version sessions by shared sessionGroup", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-1",
			label: "Variant A",
			prompt: "Build feature",
			status: "creating",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-1",
				rootSessionId: "root-1",
				label: "Build feature",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-2",
			label: "Variant B",
			prompt: "Build feature",
			status: "running",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-1",
				rootSessionId: "root-1",
				label: "Build feature",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByText("Build feature")).toBeInTheDocument()
		expect(screen.getByText("2 sessions")).toBeInTheDocument()
		expect(screen.getByTestId("group-status-group-1")).toHaveTextContent("status.running")
	})

	it("shows explicit root-task linkage badge for grouped swarms", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-link-1",
			label: "Root swarm A",
			prompt: "Build feature",
			status: "running",
			startTime: 100,
			source: "local",
			taskId: "root-task-1",
			rootTaskId: "root-task-1",
			sessionGroup: {
				groupId: "group-root-link",
				rootSessionId: "root-link-1",
				label: "Root linked swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-link-2",
			label: "Root swarm B",
			prompt: "Build feature",
			status: "running",
			startTime: 101,
			source: "local",
			taskId: "child-task-1",
			rootTaskId: "root-task-1",
			parentTaskId: "root-task-1",
			sessionGroup: {
				groupId: "group-root-link",
				rootSessionId: "root-link-1",
				label: "Root linked swarm",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-task-linkage-group-root-link")).toHaveTextContent("root root-task-1")
		expect(screen.getByTestId("group-task-linkage-group-root-link")).toHaveTextContent("subtasks 1")
	})

	it("shows explicit subtask linkage badge for single sessions", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "subtask-session-1",
			label: "Subtask branch",
			prompt: "Implement child branch",
			status: "running",
			startTime: 100,
			source: "local",
			taskId: "child-task-77",
			rootTaskId: "root-task-77",
			parentTaskId: "parent-task-77",
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("session-task-linkage-subtask-session-1")).toHaveTextContent(
			"subtask of parent-task-77",
		)
	})

	it("shows latest group event and stop control for active groups", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "root-1",
			label: "Variant A",
			prompt: "Build feature",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-1",
				rootSessionId: "root-1",
				label: "Build feature",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-1",
			sessionId: "root-1",
			eventType: "running",
			summary: "Worker active",
			timestamp: 1,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-status-group-1")).toHaveTextContent("status.running")
		expect(screen.getByTitle("Stop group")).toBeInTheDocument()
	})

	it("shows scheduler backpressure summary when launch queue is non-empty", () => {
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 2,
			activeSessionLoad: 2,
			queuedLaunchCount: 3,
			maxConcurrentPerQueueKey: 1,
			backpressure: true,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("scheduler-backpressure")).toHaveTextContent("Launch queue: 3")
		expect(screen.getByTestId("scheduler-backpressure")).toHaveTextContent("Running: 2/2")
		expect(screen.getByTestId("scheduler-backpressure")).toHaveTextContent("Per-group limit: 1")
	})

	it("shows queued count hint for incomplete grouped swarm", () => {
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 1,
			queuedLaunchCount: 0,
			maxConcurrentPerQueueKey: 1,
			backpressure: false,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-1",
			label: "Variant A",
			prompt: "Build feature",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-queued",
				rootSessionId: "root-1",
				label: "Build feature",
				sessionIndex: 0,
				sessionCount: 3,
			},
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByText("2 queued")).toBeInTheDocument()
		expect(screen.getByText("budget 1/1")).toBeInTheDocument()
	})
	it("shows pressure indicator for throttled groups", () => {
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 1,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-hot": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-hot",
			label: "Hot swarm",
			prompt: "Stabilize swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-hot",
				rootSessionId: "root-hot",
				label: "Hot swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-pressure-group-hot")).toHaveTextContent("pressure 2 · throttled")
	})

	it("offers restart action for throttled problematic groups", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 1,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-restart": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-restart",
			label: "Restart swarm",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-restart",
				rootSessionId: "root-restart",
				label: "Restart swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		fireEvent.click(screen.getByTestId("group-restart-group-restart"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.restartSession",
			sessionId: "root-restart",
		})
	})
	it("shows stop reason badge for problematic throttled group", () => {
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 1,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-reason": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-reason",
			label: "Reason swarm",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-reason",
				rootSessionId: "root-reason",
				label: "Reason swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-reason",
			sessionId: "root-reason",
			eventType: "error",
			summary: "loop_detected",
			timestamp: 2,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-stop-reason-group-reason")).toHaveTextContent("loop detected")
	})

	it("normalizes restart limit and interruption stop reasons", () => {
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 1,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-limit": 2, "group-interrupted": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-limit",
			label: "Limit swarm",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-limit",
				rootSessionId: "root-limit",
				label: "Limit swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-limit",
			sessionId: "root-limit",
			eventType: "error",
			summary: "restart_limit_exceeded",
			timestamp: 2,
		})
		store.set(upsertSessionAtom, {
			sessionId: "root-interrupted",
			label: "Interrupted swarm",
			prompt: "Recover branch",
			status: "stopped",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-interrupted",
				rootSessionId: "root-interrupted",
				label: "Interrupted swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-interrupted",
			sessionId: "root-interrupted",
			eventType: "stopped",
			summary: "Stopped by user",
			timestamp: 3,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-stop-reason-group-limit")).toHaveTextContent("restart limit")
		expect(screen.getByTestId("group-stop-reason-group-interrupted")).toHaveTextContent("interrupted")
	})

	it("prefers latest event session when restarting a problematic group", async () => {
		const { vscode } = await import("../../utils/vscode")
		vi.mocked(vscode.postMessage).mockClear()

		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 1,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-pick": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "pick-stopped",
			label: "Stopped branch",
			prompt: "Recover branch",
			status: "stopped",
			startTime: 100,
			endTime: 130,
			source: "local",
			sessionGroup: {
				groupId: "group-pick",
				rootSessionId: "pick-root",
				label: "Pick swarm",
				sessionIndex: 0,
				sessionCount: 3,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "pick-error-old",
			label: "Old error branch",
			prompt: "Recover branch",
			status: "error",
			startTime: 101,
			endTime: 120,
			source: "local",
			sessionGroup: {
				groupId: "group-pick",
				rootSessionId: "pick-root",
				label: "Pick swarm",
				sessionIndex: 1,
				sessionCount: 3,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "pick-error-latest",
			label: "Latest error branch",
			prompt: "Recover branch",
			status: "error",
			startTime: 102,
			endTime: 140,
			source: "local",
			sessionGroup: {
				groupId: "group-pick",
				rootSessionId: "pick-root",
				label: "Pick swarm",
				sessionIndex: 2,
				sessionCount: 3,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-pick",
			sessionId: "pick-error-latest",
			eventType: "error",
			summary: "Exit code 1",
			timestamp: 4,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		fireEvent.click(screen.getByTestId("group-restart-group-pick"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.restartSession",
			sessionId: "pick-error-latest",
		})
	})

	it("shows latest inter-agent relay summary for a swarm group", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "relay-root",
			label: "Relay swarm",
			prompt: "Coordinate agents",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-relay",
				rootSessionId: "relay-root",
				label: "Relay swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		store.set(updateSessionGroupMessageAtom, {
			messageId: "relay-1",
			groupId: "group-relay",
			sourceSessionId: "relay-root",
			sourceLabel: "Planner",
			content: "Take parser branch and return only summary deltas.",
			includeSender: false,
			timestamp: 10,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-relay-group-relay")).toHaveTextContent("Planner -> Take parser branch")
	})

	it("shows loop and budget guardrail badges for problematic swarms", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "guard-loop",
			label: "Loop swarm",
			prompt: "Stabilize loop",
			status: "error",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-guard-loop",
				rootSessionId: "guard-loop",
				label: "Loop swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-guard-loop",
			sessionId: "guard-loop",
			eventType: "error",
			summary: "Task reached consecutive mistake limit (3).",
			timestamp: 1,
		})
		store.set(upsertSessionAtom, {
			sessionId: "guard-budget",
			label: "Budget swarm",
			prompt: "Stabilize budget",
			status: "error",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-guard-budget",
				rootSessionId: "guard-budget",
				label: "Budget swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-guard-budget",
			sessionId: "guard-budget",
			eventType: "error",
			summary: "The branch looped on the same broken patch and exceeded safety budget.",
			timestamp: 2,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-guardrail-group-guard-loop")).toHaveTextContent("guard loop")
		expect(screen.getByTestId("group-guardrail-group-guard-budget")).toHaveTextContent("guard budget")
	})

	it("shows restart policy badges for problematic swarm branches", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "policy-branch",
			label: "Policy swarm",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			restartCount: 2,
			restartLimit: 4,
			autoRestartEnabled: true,
			sessionGroup: {
				groupId: "group-policy",
				rootSessionId: "policy-branch",
				label: "Policy swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-policy",
			sessionId: "policy-branch",
			eventType: "error",
			summary: "loop_detected",
			timestamp: 5,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-restart-policy-group-policy")).toHaveTextContent("restarts 2/4")
		expect(screen.getByTestId("group-auto-restart-group-policy")).toHaveTextContent("auto-restart on")
	})

	it("offers compact restart, root handoff broadcast, and auto-restart disable actions for problematic swarm branches", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "policy-actions-branch",
			label: "Policy actions swarm",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			rootTaskId: "root-policy-actions",
			taskId: "policy-actions-branch",
			restartCount: 2,
			restartLimit: 4,
			autoRestartEnabled: true,
			lastStopReason: "loop_detected",
			lastStopSummary: "Branch stopped after repeated retries.",
			restartHandoff: "Stop reason: loop_detected. Previous summary: Branch stopped after repeated retries.",
			sessionGroup: {
				groupId: "group-policy-actions",
				rootSessionId: "policy-actions-branch",
				label: "Policy actions swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-policy-actions",
			sessionId: "policy-actions-branch",
			eventType: "error",
			summary: "loop_detected",
			timestamp: 5,
		})
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 1,
			activeSessionLoad: 1,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-policy-actions": 2 },
			backpressure: true,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		fireEvent.click(screen.getByTestId("group-restart-compact-group-policy-actions"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.restartSessionCompact",
			sessionId: "policy-actions-branch",
		})
		fireEvent.click(screen.getByTestId("group-broadcast-siblings-group-policy-actions"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.broadcastToGroup",
			sessionId: "policy-actions-branch",
			content:
				"Branch handoff from Policy actions swarm: Stop reason: loop_detected. Previous summary: Branch stopped after repeated retries.",
			includeSender: false,
		})
		fireEvent.click(screen.getByTestId("group-broadcast-siblings-compact-group-policy-actions"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.broadcastToGroup",
			sessionId: "policy-actions-branch",
			content: "Branch handoff from Policy actions swarm: Branch stopped after repeated retries.",
			includeSender: false,
		})
		fireEvent.click(screen.getByTestId("group-broadcast-root-group-policy-actions"))
		expect(screen.getByTestId("group-relay-policy-group-policy-actions")).toHaveTextContent("relay compact")
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.broadcastToRootTask",
			sessionId: "policy-actions-branch",
			content:
				"Branch handoff from Policy actions swarm: Stop reason: loop_detected. Previous summary: Branch stopped after repeated retries.",
			includeSender: false,
			compact: false,
		})
		fireEvent.click(screen.getByTestId("group-broadcast-root-compact-group-policy-actions"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.broadcastToRootTask",
			sessionId: "policy-actions-branch",
			content: "Branch handoff from Policy actions swarm: Branch stopped after repeated retries.",
			includeSender: false,
			compact: true,
		})
		fireEvent.click(screen.getByTestId("group-toggle-auto-restart-group-policy-actions"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.setSessionAutoRestart",
			sessionId: "policy-actions-branch",
			enabled: false,
		})
	})

	it("offers compact batch restart for problematic swarm groups", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "policy-batch-1",
			label: "Policy batch A",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			restartCount: 2,
			restartLimit: 4,
			autoRestartEnabled: true,
			sessionGroup: {
				groupId: "group-policy-batch",
				rootSessionId: "policy-batch-1",
				label: "Policy batch swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "policy-batch-2",
			label: "Policy batch B",
			prompt: "Recover branch",
			status: "stopped",
			startTime: 101,
			source: "local",
			restartCount: 1,
			restartLimit: 4,
			autoRestartEnabled: true,
			sessionGroup: {
				groupId: "group-policy-batch",
				rootSessionId: "policy-batch-1",
				label: "Policy batch swarm",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-policy-batch",
			sessionId: "policy-batch-2",
			eventType: "stopped",
			summary: "loop_detected",
			timestamp: 5,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		fireEvent.click(screen.getByTestId("group-restart-all-compact-group-policy-batch"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.restartSessionGroupCompact",
			groupId: "group-policy-batch",
		})
	})

	it("shows compact batch restart only when multiple problematic branches exist", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "policy-batch-single-problem",
			label: "Policy batch single problem",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			restartCount: 2,
			restartLimit: 4,
			autoRestartEnabled: true,
			sessionGroup: {
				groupId: "group-policy-single-problem",
				rootSessionId: "policy-batch-single-problem",
				label: "Policy single-problem swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "policy-batch-healthy",
			label: "Policy batch healthy",
			prompt: "Continue branch",
			status: "running",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-policy-single-problem",
				rootSessionId: "policy-batch-single-problem",
				label: "Policy single-problem swarm",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-policy-single-problem",
			sessionId: "policy-batch-single-problem",
			eventType: "error",
			summary: "loop_detected",
			timestamp: 5,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.queryByTestId("group-restart-all-compact-group-policy-single-problem")).not.toBeInTheDocument()
	})

	it("can re-enable auto-restart for problematic swarm branches", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "policy-actions-enable-branch",
			label: "Policy enable swarm",
			prompt: "Recover branch",
			status: "error",
			startTime: 100,
			source: "local",
			restartCount: 2,
			restartLimit: 4,
			autoRestartEnabled: false,
			sessionGroup: {
				groupId: "group-policy-enable",
				rootSessionId: "policy-actions-enable-branch",
				label: "Policy enable swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-policy-enable",
			sessionId: "policy-actions-enable-branch",
			eventType: "error",
			summary: "loop_detected",
			timestamp: 5,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		fireEvent.click(screen.getByTestId("group-toggle-auto-restart-group-policy-enable"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.setSessionAutoRestart",
			sessionId: "policy-actions-enable-branch",
			enabled: true,
		})
	})

	it("shows manual and stream guardrail badges when applicable", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "guard-manual",
			label: "Manual swarm",
			prompt: "Manual stop",
			status: "stopped",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-guard-manual",
				rootSessionId: "guard-manual",
				label: "Manual swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-guard-manual",
			sessionId: "guard-manual",
			eventType: "stopped",
			summary: "Stopped by user",
			timestamp: 3,
		})
		store.set(upsertSessionAtom, {
			sessionId: "guard-stream",
			label: "Stream swarm",
			prompt: "Stream failure",
			status: "error",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-guard-stream",
				rootSessionId: "guard-stream",
				label: "Stream swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-guard-stream",
			sessionId: "guard-stream",
			eventType: "error",
			summary: "Task stopped because the model stream failed.",
			timestamp: 4,
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-guardrail-group-guard-manual")).toHaveTextContent("guard manual")
		expect(screen.getByTestId("group-guardrail-group-guard-stream")).toHaveTextContent("guard stream")
	})

	it("shows recovery actions for standalone problematic sessions", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "standalone-problem",
			label: "Standalone problem",
			prompt: "Recover standalone branch",
			status: "error",
			startTime: 100,
			source: "local",
			restartCount: 1,
			restartLimit: 3,
			autoRestartEnabled: false,
			lastStopSummary: "Repeated the same failing patch.",
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("session-restart-policy-standalone-problem")).toHaveTextContent("restarts 1/3")
		expect(screen.getByTestId("session-auto-restart-standalone-problem")).toHaveTextContent("auto-restart off")
		fireEvent.click(screen.getByTestId("session-restart-standalone-problem"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.restartSession",
			sessionId: "standalone-problem",
		})
		fireEvent.click(screen.getByTestId("session-restart-compact-standalone-problem"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.restartSessionCompact",
			sessionId: "standalone-problem",
		})
		fireEvent.click(screen.getByTestId("session-toggle-auto-restart-standalone-problem"))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "agentManager.setSessionAutoRestart",
			sessionId: "standalone-problem",
			enabled: true,
		})
	})

	it("stops descendant swarm groups when parent group is stopped", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "parent-stop-root",
			label: "Parent stop root",
			prompt: "Coordinate parent swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-parent-stop",
				rootSessionId: "parent-stop-root",
				label: "Parent stop swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "child-stop-root",
			label: "Child stop root",
			prompt: "Coordinate child swarm",
			status: "running",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-child-stop",
				rootSessionId: "child-stop-root",
				parentGroupId: "group-parent-stop",
				label: "Child stop swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "grandchild-stop-root",
			label: "Grandchild stop root",
			prompt: "Coordinate grandchild swarm",
			status: "running",
			startTime: 102,
			source: "local",
			sessionGroup: {
				groupId: "group-grandchild-stop",
				rootSessionId: "grandchild-stop-root",
				parentGroupId: "group-child-stop",
				label: "Grandchild stop swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		vi.mocked(vscode.postMessage).mockClear()
		fireEvent.click(screen.getByTestId("group-stop-group-parent-stop"))
		expect(vscode.postMessage).toHaveBeenNthCalledWith(1, {
			type: "agentManager.stopSessionGroup",
			groupId: "group-parent-stop",
		})
		expect(vscode.postMessage).toHaveBeenNthCalledWith(2, {
			type: "agentManager.stopSessionGroup",
			groupId: "group-child-stop",
		})
		expect(vscode.postMessage).toHaveBeenNthCalledWith(3, {
			type: "agentManager.stopSessionGroup",
			groupId: "group-grandchild-stop",
		})
	})

	it("offers compact restart for problematic descendant swarm groups from parent row", async () => {
		const { vscode } = await import("../../utils/vscode")
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "subtree-restart-parent-root",
			label: "Subtree Restart Parent",
			prompt: "Coordinate parent swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-restart-parent",
				rootSessionId: "subtree-restart-parent-root",
				label: "Subtree restart parent",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-restart-child-root",
			label: "Subtree Restart Child",
			prompt: "Coordinate child swarm",
			status: "error",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-restart-child",
				rootSessionId: "subtree-restart-child-root",
				parentGroupId: "group-subtree-restart-parent",
				label: "Subtree restart child",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-restart-grandchild-root",
			label: "Subtree Restart Grandchild",
			prompt: "Coordinate grandchild swarm",
			status: "stopped",
			startTime: 102,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-restart-grandchild",
				rootSessionId: "subtree-restart-grandchild-root",
				parentGroupId: "group-subtree-restart-child",
				label: "Subtree restart grandchild",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		vi.mocked(vscode.postMessage).mockClear()
		fireEvent.click(screen.getByTestId("group-restart-subtree-compact-group-subtree-restart-parent"))
		expect(vscode.postMessage).toHaveBeenNthCalledWith(1, {
			type: "agentManager.restartSessionGroupCompact",
			groupId: "group-subtree-restart-child",
		})
		expect(vscode.postMessage).toHaveBeenNthCalledWith(2, {
			type: "agentManager.restartSessionGroupCompact",
			groupId: "group-subtree-restart-grandchild",
		})
	})

	it("shows subtree relay and guardrail badges for parent swarm groups", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "subtree-relay-parent-root",
			label: "Subtree Relay Parent",
			prompt: "Coordinate parent swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-relay-parent",
				rootSessionId: "subtree-relay-parent-root",
				label: "Subtree relay parent",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-relay-child-root",
			label: "Subtree Relay Child",
			prompt: "Coordinate child swarm",
			status: "error",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-relay-child",
				rootSessionId: "subtree-relay-child-root",
				parentGroupId: "group-subtree-relay-parent",
				label: "Subtree relay child",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(updateSessionGroupMessageAtom, {
			messageId: "subtree-relay-1",
			groupId: "group-subtree-relay-child",
			sourceSessionId: "subtree-relay-child-root",
			sourceLabel: "Planner",
			content: "Take parser branch and return only summary deltas.",
			timestamp: 5,
		})
		store.set(updateSessionGroupEventAtom, {
			groupId: "group-subtree-relay-child",
			sessionId: "subtree-relay-child-root",
			eventType: "error",
			summary: "The branch looped on the same broken patch and exceeded safety budget.",
			timestamp: 6,
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("group-subtree-relay-group-subtree-relay-parent")).toHaveTextContent(
			"subtree Planner -> Take parser branch",
		)
		expect(screen.getByTestId("group-subtree-guardrail-group-subtree-relay-parent")).toHaveTextContent(
			"subtree guard budget",
		)
	})

	it("shows subtree pressure and issue badges for parent swarm groups", () => {
		const store = createStore()
		store.set(schedulerStateAtom, {
			maxConcurrentStarts: 4,
			activeSessionLoad: 2,
			queuedLaunchCount: 1,
			maxConcurrentPerQueueKey: 1,
			queueKeyPressure: { "group-subtree-pressure-child": 2 },
			backpressure: true,
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-pressure-parent-root",
			label: "Subtree Pressure Parent",
			prompt: "Coordinate parent swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-pressure-parent",
				rootSessionId: "subtree-pressure-parent-root",
				label: "Subtree pressure parent",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-pressure-child-root",
			label: "Subtree Pressure Child",
			prompt: "Coordinate child swarm",
			status: "error",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-pressure-child",
				rootSessionId: "subtree-pressure-child-root",
				parentGroupId: "group-subtree-pressure-parent",
				label: "Subtree pressure child",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("group-subtree-pressure-group-subtree-pressure-parent")).toHaveTextContent(
			"subtree pressure 2 · throttled",
		)
		expect(screen.getByTestId("group-subtree-problems-group-subtree-pressure-parent")).toHaveTextContent(
			"subtree issues 1",
		)
	})

	it("shows subtree summary rollup for parent swarm groups", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "subtree-parent-root",
			label: "Subtree Parent",
			prompt: "Coordinate parent swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-parent",
				rootSessionId: "subtree-parent-root",
				label: "Subtree parent",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-child-root",
			label: "Subtree Child",
			prompt: "Coordinate child swarm",
			status: "creating",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-child",
				rootSessionId: "subtree-child-root",
				parentGroupId: "group-subtree-parent",
				label: "Subtree child",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "subtree-grandchild-root",
			label: "Subtree Grandchild",
			prompt: "Coordinate grandchild swarm",
			status: "error",
			startTime: 102,
			source: "local",
			sessionGroup: {
				groupId: "group-subtree-grandchild",
				rootSessionId: "subtree-grandchild-root",
				parentGroupId: "group-subtree-child",
				label: "Subtree grandchild",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("group-subtree-summary-group-subtree-parent")).toHaveTextContent(
			"subtree Branches 3 · C1 · A1 · Err 1",
		)
	})

	it("renders nested swarm groups using parentGroupId hierarchy", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "parent-root",
			label: "Parent root",
			prompt: "Coordinate parent swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-parent",
				rootSessionId: "parent-root",
				label: "Parent swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "child-root",
			label: "Child root",
			prompt: "Coordinate child swarm",
			status: "creating",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-child",
				rootSessionId: "child-root",
				parentGroupId: "group-parent",
				label: "Child swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "grandchild-root",
			label: "Grandchild root",
			prompt: "Coordinate grandchild swarm",
			status: "error",
			startTime: 102,
			source: "local",
			sessionGroup: {
				groupId: "group-grandchild",
				rootSessionId: "grandchild-root",
				parentGroupId: "group-child",
				label: "Grandchild swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("group-item-group-parent")).toHaveTextContent("Parent swarm")
		expect(screen.getByTestId("group-item-group-child")).toHaveTextContent("↳ Child swarm")
		expect(screen.getByTestId("group-item-group-grandchild")).toHaveTextContent("↳ Grandchild swarm")
		expect(screen.getByTestId("group-item-group-child")).toHaveStyle({ paddingLeft: "16px" })
		expect(screen.getByTestId("group-item-group-grandchild")).toHaveStyle({ paddingLeft: "32px" })
	})

	it("shows localized group status instead of active count", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "group-running-root",
			label: "Running swarm",
			prompt: "Run swarm",
			status: "running",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-running",
				rootSessionId: "group-running-root",
				label: "Running swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "group-running-worker",
			label: "Running worker",
			prompt: "Run worker",
			status: "creating",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-running",
				rootSessionId: "group-running-root",
				label: "Running swarm",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("group-status-group-running")).toHaveTextContent("status.running")
		expect(screen.getByTestId("group-item-group-running")).not.toHaveTextContent("active")
	})

	it("shows error status for failed group cards before opening them", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "group-error-root",
			label: "Error swarm",
			prompt: "Error swarm",
			status: "error",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-error",
				rootSessionId: "group-error-root",
				label: "Error swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)

		expect(screen.getByTestId("group-status-group-error")).toHaveTextContent("status.error")
	})

	it("shows branch summary label for grouped swarm sessions", () => {
		const store = createStore()
		store.set(upsertSessionAtom, {
			sessionId: "summary-creating",
			label: "Summary swarm",
			prompt: "Coordinate swarm",
			status: "creating",
			startTime: 100,
			source: "local",
			sessionGroup: {
				groupId: "group-summary",
				rootSessionId: "summary-creating",
				label: "Summary swarm",
				sessionIndex: 0,
				sessionCount: 3,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "summary-running",
			label: "Summary swarm run",
			prompt: "Coordinate swarm",
			status: "running",
			startTime: 101,
			source: "local",
			sessionGroup: {
				groupId: "group-summary",
				rootSessionId: "summary-creating",
				label: "Summary swarm",
				sessionIndex: 1,
				sessionCount: 3,
			},
		})
		store.set(upsertSessionAtom, {
			sessionId: "summary-error",
			label: "Summary swarm error",
			prompt: "Coordinate swarm",
			status: "error",
			startTime: 102,
			source: "local",
			sessionGroup: {
				groupId: "group-summary",
				rootSessionId: "summary-creating",
				label: "Summary swarm",
				sessionIndex: 2,
				sessionCount: 3,
			},
		})
		render(
			<Provider store={store}>
				<SessionSidebar />
			</Provider>,
		)
		expect(screen.getByTestId("group-branch-summary-group-summary")).toHaveTextContent(
			"Branches 3 · C1 · A1 · Err 1",
		)
	})
})
