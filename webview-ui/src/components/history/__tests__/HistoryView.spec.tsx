import { render, screen, fireEvent } from "@/utils/test-utils"

const { postMessageMock } = vi.hoisted(() => ({ postMessageMock: vi.fn() }))

import { useExtensionState } from "@src/context/ExtensionStateContext"

import HistoryView from "../HistoryView"

vi.mock("@src/context/ExtensionStateContext")
vi.mock("@src/utils/vscode", () => ({ vscode: { postMessage: postMessageMock } }))
vi.mock("react-virtuoso", () => ({
	Virtuoso: ({ data, itemContent }: { data: any[]; itemContent: (index: number, item: any) => React.ReactNode }) => (
		<div data-testid="virtuoso-container">
			{data.map((item, index) => (
				<div key={item.item?.id ?? item.id ?? index}>{itemContent(index, item)}</div>
			))}
		</div>
	),
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@/kilocode/hooks/useTaskHistory")
import { useTaskHistory } from "@/kilocode/hooks/useTaskHistory"

const mockTaskHistory = [
	{
		id: "1",
		number: 1,
		task: "Test task 1",
		ts: Date.now(),
		tokensIn: 100,
		tokensOut: 50,
		totalCost: 0.002,
		workspace: "/test/workspace",
	},
	{
		id: "2",
		number: 2,
		task: "Test task 2",
		ts: Date.now() + 1000,
		tokensIn: 200,
		tokensOut: 100,
		totalCost: 0.003,
		workspace: "/test/workspace",
	},
]

describe("HistoryView", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: mockTaskHistory,
			cwd: "/test/workspace",
			runningRootTaskIds: [],
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: mockTaskHistory,
				pageIndex: 0,
				pageCount: 1,
			},
		})
	})

	it("renders the history interface", () => {
		const onDone = vi.fn()
		render(<HistoryView onDone={onDone} />)

		expect(screen.getByText("history:history")).toBeInTheDocument()
		expect(screen.getByText("history:done")).toBeInTheDocument()
		expect(screen.getByPlaceholderText("history:searchPlaceholder")).toBeInTheDocument()
	})

	it("calls onDone when done button is clicked", () => {
		const onDone = vi.fn()
		render(<HistoryView onDone={onDone} />)

		const doneButton = screen.getByText("history:done")
		fireEvent.click(doneButton)

		expect(onDone).toHaveBeenCalled()
	})

	it("renders active root quick switcher and posts task focus messages", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{ id: "root-a", number: 1, task: "Root A", ts: Date.now(), tokensIn: 0, tokensOut: 0, totalCost: 0 },
				{
					id: "root-b",
					number: 2,
					task: "Root B",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: ["root-a", "root-b"],
			runningRootTaskIds: ["root-a", "root-b"],
			focusedRootTaskId: "root-a",
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{
						id: "root-a",
						number: 1,
						task: "Root A",
						ts: Date.now(),
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
					{
						id: "root-b",
						number: 2,
						task: "Root B",
						ts: Date.now() - 1,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-active-root-switcher")).toBeInTheDocument()
		fireEvent.click(screen.getByTestId("history-root-switch-root-b"))
		expect(postMessageMock).toHaveBeenCalledWith({ type: "showTaskWithId", text: "root-b" })
	})

	it("keeps active root quick switcher visible even when paged history omits those roots", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{ id: "root-a", number: 1, task: "Root A", ts: Date.now(), tokensIn: 0, tokensOut: 0, totalCost: 0 },
				{
					id: "root-b",
					number: 2,
					task: "Root B",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: ["root-a", "root-b"],
			runningRootTaskIds: ["root-a", "root-b"],
			focusedRootTaskId: "root-a",
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-active-root-switcher")).toBeInTheDocument()
		expect(screen.getByTestId("history-root-switch-root-a")).toBeInTheDocument()
		expect(screen.getByTestId("history-root-switch-root-b")).toBeInTheDocument()
	})
	it("shows root branch summary inside active root switcher", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-a",
					number: 1,
					task: "Root A",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-a"],
				},
				{
					id: "child-a",
					number: 2,
					task: "Child A",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-a",
					rootTaskId: "root-a",
					status: "active",
				},
				{
					id: "root-b",
					number: 3,
					task: "Root B",
					ts: Date.now() - 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: ["root-a", "root-b"],
			runningRootTaskIds: ["root-a", "root-b"],
			focusedRootTaskId: "root-a",
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{
						id: "root-a",
						number: 1,
						task: "Root A",
						ts: Date.now(),
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						childIds: ["child-a"],
					},
					{
						id: "child-a",
						number: 2,
						task: "Child A",
						ts: Date.now() - 1,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						parentTaskId: "root-a",
						rootTaskId: "root-a",
						status: "active",
					},
					{
						id: "root-b",
						number: 3,
						task: "Root B",
						ts: Date.now() - 2,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-root-switch-root-a")).toHaveTextContent("history:children 1")
	})

	it("shows active root summary from full history even when current page omits descendants", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-a",
					number: 1,
					task: "Root A",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-a"],
				},
				{
					id: "child-a",
					number: 2,
					task: "Child A",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-a",
					rootTaskId: "root-a",
					status: "active",
				},
				{
					id: "root-b",
					number: 3,
					task: "Root B",
					ts: Date.now() - 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: ["root-a", "root-b"],
			runningRootTaskIds: ["root-a", "root-b"],
			focusedRootTaskId: "root-a",
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{
						id: "root-a",
						number: 1,
						task: "Root A",
						ts: Date.now(),
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
					{
						id: "root-b",
						number: 3,
						task: "Root B",
						ts: Date.now() - 2,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-root-switch-root-a")).toHaveTextContent("history:children 1")
		expect(screen.getByTestId("history-root-switch-root-a")).toHaveTextContent("A1")
	})

	it("shows all root task statuses in summary even without multiple active roots", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-run",
					number: 1,
					task: "Root run",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					status: "active",
				},
				{
					id: "root-done",
					number: 2,
					task: "Root done",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					status: "completed",
				},
				{
					id: "root-stop",
					number: 3,
					task: "Root stop",
					ts: Date.now() - 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					status: "aborted",
					lastStopReason: "user_cancelled",
				},
				{
					id: "root-error",
					number: 4,
					task: "Root error",
					ts: Date.now() - 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					status: "aborted",
					lastStopReason: "loop_detected",
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: ["root-run"],
			runningRootTaskIds: ["root-run"],
			focusedRootTaskId: "root-run",
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{
						id: "root-run",
						number: 1,
						task: "Root run",
						ts: Date.now(),
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						status: "active",
					},
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-active-root-switcher")).toHaveTextContent("history:statusRunning 1")
		expect(screen.getByTestId("history-active-root-switcher")).toHaveTextContent("history:statusDone 1")
		expect(screen.getByTestId("history-active-root-switcher")).toHaveTextContent("history:statusStopped 1")
		expect(screen.getByTestId("history-active-root-switcher")).toHaveTextContent("history:statusError 1")
	})

	it("shows orchestration summary from history-only background lifecycle after reload", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-1",
					number: 1,
					task: "Root",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-paused", "child-done", "child-cancelled"],
				},
				{
					id: "child-paused",
					number: 2,
					task: "Paused child",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-1",
					rootTaskId: "root-1",
					execution: "background",
					status: "active",
					lifecycleState: "paused",
				},
				{
					id: "child-done",
					number: 3,
					task: "Done child",
					ts: Date.now() - 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-1",
					rootTaskId: "root-1",
					execution: "background",
					status: "completed",
					lifecycleState: "completed",
				},
				{
					id: "child-cancelled",
					number: 4,
					task: "Cancelled child",
					ts: Date.now() - 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-1",
					rootTaskId: "root-1",
					execution: "background",
					status: "aborted",
					lifecycleState: "cancelled",
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: [],
			runningRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{ id: "root-1", number: 1, task: "Root", ts: Date.now(), tokensIn: 0, tokensOut: 0, totalCost: 0 },
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-orchestration-summary")).toBeInTheDocument()
		expect(screen.getByTestId("history-orchestration-summary")).toHaveTextContent("1 paused")
		expect(screen.getByTestId("history-orchestration-summary")).toHaveTextContent("1 cancelled")
		expect(screen.queryByText(/completed 1/i)).not.toBeInTheDocument()
	})

	it("prefers running summary label when running and cancelled states coexist", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-1",
					number: 1,
					task: "Root",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-running", "child-cancelled"],
				},
				{
					id: "child-running",
					number: 2,
					task: "Running child",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-1",
					rootTaskId: "root-1",
					execution: "background",
					status: "active",
				},
				{
					id: "child-cancelled",
					number: 3,
					task: "Cancelled child",
					ts: Date.now() - 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-1",
					rootTaskId: "root-1",
					execution: "background",
					status: "aborted",
					lifecycleState: "cancelled",
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: [],
			runningRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{ id: "root-1", number: 1, task: "Root", ts: Date.now(), tokensIn: 0, tokensOut: 0, totalCost: 0 },
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-orchestration-summary")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-running").length).toBeGreaterThan(0)
		expect(screen.getByTestId("history-orchestration-summary")).toHaveTextContent("1 cancelled")
	})

	it("shows queued orchestration summary from history-only background child state", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-1",
					number: 1,
					task: "Root",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-queued"],
				},
				{
					id: "child-queued",
					number: 2,
					task: "Queued child",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-1",
					rootTaskId: "root-1",
					execution: "background",
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: [],
			runningRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{ id: "root-1", number: 1, task: "Root", ts: Date.now(), tokensIn: 0, tokensOut: 0, totalCost: 0 },
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-orchestration-summary")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-queued").length).toBeGreaterThan(0)
		expect(screen.queryByText(/running 1/i)).not.toBeInTheDocument()
	})

	it("does not relabel opened stopped root as running", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-stopped",
					number: 1,
					task: "Root stopped",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					status: "active",
					lastStopReason: "user_cancelled",
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: ["root-stopped"],
			runningRootTaskIds: [],
			focusedRootTaskId: "root-stopped",
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [
					{
						id: "root-stopped",
						number: 1,
						task: "Root stopped",
						ts: Date.now(),
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
						status: "active",
						lastStopReason: "user_cancelled",
					},
				],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-active-root-switcher")).toHaveTextContent("history:statusStopped 1")
		expect(screen.queryByText("history:statusRunning")).not.toBeInTheDocument()
	})

	it("shows orchestration badge in header even when root status summary is unavailable", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-orch",
					number: 1,
					task: "Root orchestration",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "shadow-parent",
					activity: [
						{
							kind: "subagent",
							id: "sa-1",
							taskId: "root-orch",
							status: "paused",
							summary: "Waiting",
							timestamp: 1,
						},
					],
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: [],
			runningRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-active-root-switcher")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-paused").length).toBeGreaterThan(0)
		expect(screen.queryByText("chat:orchestration.title")).not.toBeInTheDocument()
	})

	it("shows recoverable orchestration badge in header for paused streaming failure history", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-recoverable",
					number: 1,
					task: "Root recoverable",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-recoverable"],
				},
				{
					id: "child-recoverable",
					number: 2,
					task: "Recoverable child",
					ts: Date.now() - 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "root-recoverable",
					rootTaskId: "root-recoverable",
					execution: "background",
					status: "active",
					lifecycleState: "paused",
					lastStopReason: "streaming_failed",
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: [],
			runningRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: { requestId: "", historyItems: [], pageIndex: 0, pageCount: 1 },
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("history-active-root-switcher")).toBeInTheDocument()
		expect(screen.getAllByTestId("orchestration-status-badge-recoverable").length).toBeGreaterThan(0)
	})

	it("does not show orchestration badge in header for relay-only activity", () => {
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [
				{
					id: "root-relay",
					number: 1,
					task: "Root relay",
					ts: Date.now(),
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "shadow-parent",
					activity: [
						{
							kind: "relay",
							id: "relay-1",
							taskId: "root-relay",
							rootTaskId: "root-1",
							status: "delivered",
							envelope: {
								kind: "parent",
								fromTaskId: "child-1",
								toTaskId: "root-relay",
								rootTaskId: "root-1",
								content: "Need review",
								requiresParentVisibility: true,
								timestamp: 1,
							},
							summary: "Relay delivered",
							timestamp: 1,
						},
					],
				},
			],
			cwd: "/test/workspace",
			activeRootTaskIds: [],
			runningRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.queryByTestId("history-active-root-switcher")).not.toBeInTheDocument()
		expect(screen.queryByTestId("orchestration-status-badge-completed")).not.toBeInTheDocument()
	})

	it("renders grouped tasks collapsed by default and expands children on toggle", () => {
		const parentTask = {
			id: "parent",
			number: 1,
			task: "Parent task",
			ts: Date.now() + 1000,
			tokensIn: 10,
			tokensOut: 10,
			totalCost: 0.001,
			workspace: "/test/workspace",
			childIds: ["child"],
		}
		const childTask = {
			id: "child",
			number: 2,
			task: "Child task",
			ts: Date.now(),
			tokensIn: 5,
			tokensOut: 5,
			totalCost: 0.001,
			workspace: "/test/workspace",
			parentTaskId: "parent",
			rootTaskId: "parent",
		}

		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [parentTask, childTask],
			cwd: "/test/workspace",
			runningRootTaskIds: [],
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [parentTask],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.getByTestId("task-item-parent")).toBeInTheDocument()
		expect(screen.queryByTestId("task-item-child")).not.toBeInTheDocument()
		expect(screen.queryByText(/history:parent/)).not.toBeInTheDocument()

		fireEvent.click(screen.getByTestId("task-group-toggle-parent"))

		expect(screen.getByTestId("task-item-child")).toBeInTheDocument()
	})

	it("expands paged parent rows using descendants from extension history", () => {
		const parentTask = {
			id: "parent",
			number: 1,
			task: "Parent task",
			ts: Date.now() + 1000,
			tokensIn: 10,
			tokensOut: 10,
			totalCost: 0.001,
			workspace: "/test/workspace",
			childIds: ["child"],
		}
		const childTask = {
			id: "child",
			number: 2,
			task: "Child task",
			ts: Date.now(),
			tokensIn: 5,
			tokensOut: 5,
			totalCost: 0.001,
			workspace: "/test/workspace",
			parentTaskId: "parent",
			rootTaskId: "parent",
			lifecycleState: "paused",
		}

		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: [parentTask, childTask],
			cwd: "/test/workspace",
			runningRootTaskIds: [],
			activeRootTaskIds: [],
			focusedRootTaskId: undefined,
		})
		;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: {
				requestId: "",
				historyItems: [parentTask],
				pageIndex: 0,
				pageCount: 1,
			},
		})

		render(<HistoryView onDone={vi.fn()} />)

		expect(screen.queryByTestId("task-item-child")).not.toBeInTheDocument()
		fireEvent.click(screen.getByTestId("task-group-toggle-parent"))
		expect(screen.getByTestId("task-item-child")).toBeInTheDocument()
		expect(screen.getByTestId("history-active-root-switcher")).toHaveTextContent("history:statusStopped 1")
	})
})
