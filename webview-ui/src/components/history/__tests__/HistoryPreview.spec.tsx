import { render, screen } from "@/utils/test-utils"

import type { HistoryItem } from "@roo-code/types"

import HistoryPreview from "../HistoryPreview"

vi.mock("@/kilocode/hooks/useTaskHistory")
const extensionStateMock = vi.hoisted(
	() =>
		({
			state: {
				activeRootTaskIds: ["task-1"],
				runningRootTaskIds: ["task-1"],
				focusedRootTaskId: "task-1",
				taskHistory: [] as HistoryItem[],
			},
		}) as {
			state: {
				activeRootTaskIds: string[]
				runningRootTaskIds: string[]
				focusedRootTaskId?: string
				taskHistory: HistoryItem[]
			}
		},
)

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => extensionStateMock.state,
}))

vi.mock("../TaskItem", () => {
	return {
		default: vi.fn(({ item, variant, className }) => (
			<div data-testid={`task-item-${item.id}`} data-variant={variant} data-class-name={className}>
				{item.task}
			</div>
		)),
	}
})

import { useTaskSearch } from "../useTaskSearch"
import TaskItem from "../TaskItem"

import { useTaskHistory } from "@/kilocode/hooks/useTaskHistory"

function kiloCodeSetUpUseTaskHistoryMock(useTaskSearchReturnValue: Partial<ReturnType<typeof useTaskSearch>>) {
	;(useTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue({
		data: {
			requestId: "",
			historyItems: useTaskSearchReturnValue.tasks ?? [],
			pageIndex: 0,
			pageCount: 1,
		},
	})
}

const mockTaskItem = TaskItem as any

const mockTasks: HistoryItem[] = [
	{
		id: "task-1",
		number: 1,
		task: "First task",
		ts: Date.now(),
		tokensIn: 100,
		tokensOut: 50,
		totalCost: 0.01,
	},
	{
		id: "task-2",
		number: 2,
		task: "Second task",
		ts: Date.now(),
		tokensIn: 200,
		tokensOut: 100,
		totalCost: 0.02,
	},
	{
		id: "task-3",
		number: 3,
		task: "Third task",
		ts: Date.now(),
		tokensIn: 150,
		tokensOut: 75,
		totalCost: 0.015,
	},
	{
		id: "task-4",
		number: 4,
		task: "Fourth task",
		ts: Date.now(),
		tokensIn: 300,
		tokensOut: 150,
		totalCost: 0.03,
	},
	{
		id: "task-5",
		number: 5,
		task: "Fifth task",
		ts: Date.now(),
		tokensIn: 250,
		tokensOut: 125,
		totalCost: 0.025,
	},
	{
		id: "task-6",
		number: 6,
		task: "Sixth task",
		ts: Date.now(),
		tokensIn: 400,
		tokensOut: 200,
		totalCost: 0.04,
	},
]

const mockKiloCodeTaskHistoryVersion = 0

describe("HistoryPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		extensionStateMock.state = {
			activeRootTaskIds: ["task-1"],
			runningRootTaskIds: ["task-1"],
			focusedRootTaskId: "task-1",
			taskHistory: [] as HistoryItem[],
		}
	})

	it("renders nothing when no tasks are available", () => {
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: [],
			searchQuery: "",
			setSearchQuery: vi.fn(),
			sortOption: "newest",
			setSortOption: vi.fn(),
			lastNonRelevantSort: null,
			setLastNonRelevantSort: vi.fn(),
			showAllWorkspaces: false,
			setShowAllWorkspaces: vi.fn(),
		})

		const { container } = render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(container.firstChild).toHaveClass("flex", "min-h-0", "flex-1", "flex-col", "gap-3")
		expect(screen.queryByTestId(/task-item-/)).not.toBeInTheDocument()
	})

	it("renders all available tasks on the welcome screen", () => {
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: mockTasks,
			searchQuery: "",
			setSearchQuery: vi.fn(),
			sortOption: "newest",
			setSortOption: vi.fn(),
			lastNonRelevantSort: null,
			setLastNonRelevantSort: vi.fn(),
			showAllWorkspaces: false,
			setShowAllWorkspaces: vi.fn(),
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-2")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-3")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-4")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-5")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-6")).toBeInTheDocument()
	})

	it("renders all tasks when there are 4 or fewer", () => {
		const fourTasks = mockTasks.slice(0, 4)
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: fourTasks,
			searchQuery: "",
			setSearchQuery: vi.fn(),
			sortOption: "newest",
			setSortOption: vi.fn(),
			lastNonRelevantSort: null,
			setLastNonRelevantSort: vi.fn(),
			showAllWorkspaces: false,
			setShowAllWorkspaces: vi.fn(),
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-2")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-3")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-task-4")).toBeInTheDocument()
		expect(screen.queryByTestId("task-item-task-5")).not.toBeInTheDocument()
	})

	it("renders only 1 task when there is only 1 task", () => {
		const oneTask = mockTasks.slice(0, 1)
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: oneTask,
			searchQuery: "",
			setSearchQuery: vi.fn(),
			sortOption: "newest",
			setSortOption: vi.fn(),
			lastNonRelevantSort: null,
			setLastNonRelevantSort: vi.fn(),
			showAllWorkspaces: false,
			setShowAllWorkspaces: vi.fn(),
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument()
		expect(screen.queryByTestId("task-item-task-2")).not.toBeInTheDocument()
	})

	it("does not show root status summary on the main page preview", () => {
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: [
				{
					id: "task-1",
					number: 1,
					task: "First task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
				},
				{
					id: "task-2",
					number: 2,
					task: "Second task",
					ts: Date.now() - 1,
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
				},
			],
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.queryByTestId("history-preview-active-roots")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusRunning")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusStopped")).not.toBeInTheDocument()
	})

	it("does not show summary even when history contains mixed root statuses", () => {
		extensionStateMock.state = {
			activeRootTaskIds: ["task-1"],
			runningRootTaskIds: ["task-1"],
			focusedRootTaskId: "task-1",
			taskHistory: [
				{
					id: "task-1",
					number: 1,
					task: "First task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					status: "active",
				},
				{
					id: "task-2",
					number: 2,
					task: "Second task",
					ts: Date.now() - 1,
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					status: "completed",
				},
				{
					id: "task-3",
					number: 3,
					task: "Third task",
					ts: Date.now() - 2,
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					status: "aborted",
					lastStopReason: "user_cancelled",
				},
				{
					id: "task-4",
					number: 4,
					task: "Fourth task",
					ts: Date.now() - 3,
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					status: "aborted",
					lastStopReason: "loop_detected",
				},
			],
		}
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: [
				{
					id: "task-1",
					number: 1,
					task: "First task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
				},
			],
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.queryByTestId("history-preview-active-roots")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusRunning")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusDone")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusStopped")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusError")).not.toBeInTheDocument()
	})

	it("does not show stopped or running summary for an opened resumable root", () => {
		extensionStateMock.state = {
			activeRootTaskIds: ["task-1"],
			runningRootTaskIds: [],
			focusedRootTaskId: "task-1",
			taskHistory: [
				{
					id: "task-1",
					number: 1,
					task: "First task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					status: "active",
					lastStopReason: "user_cancelled",
				},
			],
		}
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: [
				{
					id: "task-1",
					number: 1,
					task: "First task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					status: "active",
					lastStopReason: "user_cancelled",
				},
			],
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.queryByText("history:statusRunning")).not.toBeInTheDocument()
		expect(screen.queryByText("history:statusStopped")).not.toBeInTheDocument()
	})

	it("passes correct props to TaskItem components", () => {
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: mockTasks.slice(0, 3),
			searchQuery: "",
			setSearchQuery: vi.fn(),
			sortOption: "newest",
			setSortOption: vi.fn(),
			lastNonRelevantSort: null,
			setLastNonRelevantSort: vi.fn(),
			showAllWorkspaces: false,
			setShowAllWorkspaces: vi.fn(),
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(mockTaskItem).toHaveBeenCalledWith(
			expect.objectContaining({
				item: mockTasks[0],
				variant: "compact",
				isActiveRootTask: true,
				isFocusedRootTask: true,
				runningRootTaskIds: ["task-1"],
				className: "flex-1 min-w-0",
			}),
			expect.anything(),
		)
		expect(mockTaskItem).toHaveBeenCalledWith(
			expect.objectContaining({
				item: mockTasks[1],
				variant: "compact",
				className: "flex-1 min-w-0",
			}),
			expect.anything(),
		)
		expect(mockTaskItem).toHaveBeenCalledWith(
			expect.objectContaining({
				item: mockTasks[2],
				variant: "compact",
				className: "flex-1 min-w-0",
			}),
			expect.anything(),
		)
	})

	it("expands parent rows on the main page using descendants from extension state", async () => {
		extensionStateMock.state = {
			activeRootTaskIds: ["parent"],
			runningRootTaskIds: ["parent"],
			focusedRootTaskId: "parent",
			taskHistory: [
				{
					id: "parent",
					number: 1,
					task: "Parent task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					number: 2,
					task: "Child task",
					ts: Date.now() - 1,
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
					parentTaskId: "parent",
					rootTaskId: "parent",
					lifecycleState: "running",
					status: "active",
				},
			],
		}
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: [
				{
					id: "parent",
					number: 1,
					task: "Parent task",
					ts: Date.now(),
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 0,
				},
			],
		})

		render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.getByTestId("task-item-parent")).toBeInTheDocument()
		expect(screen.getByTestId("task-item-child")).toBeInTheDocument()

		const toggleButton = screen.getByTestId("history-preview-toggle-parent")
		expect(toggleButton).toHaveClass("top-1/2", "-translate-y-1/2")

		await toggleButton.click()

		expect(screen.queryByTestId("task-item-child")).not.toBeInTheDocument()
	})

	it("keeps a manually collapsed branch collapsed after history refresh", async () => {
		const parentTask = {
			id: "parent",
			number: 1,
			task: "Parent task",
			ts: Date.now(),
			tokensIn: 1,
			tokensOut: 1,
			totalCost: 0,
			childIds: ["child"],
		}
		const childTask = {
			id: "child",
			number: 2,
			task: "Child task",
			ts: Date.now() - 1,
			tokensIn: 1,
			tokensOut: 1,
			totalCost: 0,
			parentTaskId: "parent",
			rootTaskId: "parent",
			status: "active",
		}

		extensionStateMock.state = {
			activeRootTaskIds: ["parent"],
			runningRootTaskIds: ["parent"],
			focusedRootTaskId: "parent",
			taskHistory: [parentTask, childTask],
		}
		kiloCodeSetUpUseTaskHistoryMock({ tasks: [parentTask] })

		const { rerender } = render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(screen.getByTestId("task-item-child")).toBeInTheDocument()
		await screen.getByTestId("history-preview-toggle-parent").click()
		expect(screen.queryByTestId("task-item-child")).not.toBeInTheDocument()

		extensionStateMock.state = {
			...extensionStateMock.state,
			taskHistory: [{ ...parentTask }, { ...childTask }],
		}
		kiloCodeSetUpUseTaskHistoryMock({ tasks: [{ ...parentTask }] })
		rerender(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion + 1} />)

		expect(screen.queryByTestId("task-item-child")).not.toBeInTheDocument()
	})

	it("renders with correct container classes", () => {
		kiloCodeSetUpUseTaskHistoryMock({
			tasks: mockTasks.slice(0, 1),
			searchQuery: "",
			setSearchQuery: vi.fn(),
			sortOption: "newest",
			setSortOption: vi.fn(),
			lastNonRelevantSort: null,
			setLastNonRelevantSort: vi.fn(),
			showAllWorkspaces: false,
			setShowAllWorkspaces: vi.fn(),
		})

		const { container } = render(<HistoryPreview taskHistoryVersion={mockKiloCodeTaskHistoryVersion} />)

		expect(container.firstChild).toHaveClass("flex", "min-h-0", "flex-1", "flex-col", "gap-3")
	})
})
