// npx vitest run __tests__/task-cascade-stop.spec.ts

import { describe, it, expect, vi } from "vitest"
import { ClineProvider } from "../core/webview/ClineProvider"
import { TaskCancellationService } from "../core/orchestration/task-control/TaskCancellationService"
import { TaskRootStackLifecycleService } from "../core/orchestration/task-control/TaskRootStackLifecycleService"
import type { HistoryItem } from "@roo-code/types"

describe("ClineProvider cascade stop handling", () => {
	it("finds descendants through direct parent chains", () => {
		const provider = Object.create(ClineProvider.prototype) as ClineProvider
		const history: HistoryItem[] = [
			{ id: "root", number: 1, ts: 4, task: "Root", tokensIn: 0, tokensOut: 0, totalCost: 0 },
			{
				id: "child",
				number: 2,
				ts: 3,
				task: "Child",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
			},
			{
				id: "grandchild",
				number: 3,
				ts: 2,
				task: "Grandchild",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				parentTaskId: "child",
				rootTaskId: "root",
			},
			{ id: "sibling-root", number: 4, ts: 1, task: "Sibling", tokensIn: 0, tokensOut: 0, totalCost: 0 },
		]

		expect((provider as any).getDescendantTaskIds("root", history)).toEqual(["child", "grandchild"])
		expect((provider as any).getDescendantTaskIds("child", history)).toEqual(["grandchild"])
	})

	it("cancelTask records stop reason and aborts unfinished descendants", async () => {
		const currentTask = {
			taskId: "parent",
			instanceId: "instance-parent",
			rootTask: undefined,
			parentTask: undefined,
			abortReason: undefined,
			abandoned: false,
			isStreaming: false,
			didFinishAbortingStream: true,
			isWaitingForFirstChunk: false,
			cancelCurrentRequest: vi.fn(),
			abortTask: vi.fn().mockResolvedValue(undefined),
		} as any
		const activeChild = {
			taskId: "child",
			abandoned: false,
			cancelCurrentRequest: vi.fn(),
			abortTask: vi.fn().mockResolvedValue(undefined),
		} as any

		const history: HistoryItem[] = [
			{
				id: "parent",
				number: 1,
				ts: 4,
				task: "Parent",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "active",
				childIds: ["child", "done-child"],
			},
			{
				id: "child",
				number: 2,
				ts: 3,
				task: "Child",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "active",
				parentTaskId: "parent",
				rootTaskId: "parent",
				childIds: ["grandchild"],
			},
			{
				id: "grandchild",
				number: 3,
				ts: 2,
				task: "Grandchild",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "delegated",
				parentTaskId: "child",
				rootTaskId: "parent",
			},
			{
				id: "done-child",
				number: 4,
				ts: 1,
				task: "Done",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "completed",
				parentTaskId: "parent",
				rootTaskId: "parent",
			},
		]

		const provider = Object.create(ClineProvider.prototype) as any
		provider.clineStack = [activeChild, currentTask]
		provider.getCurrentTask = vi.fn(() => currentTask)
		provider.getTaskWithId = vi.fn(async () => ({ historyItem: history[0], uiMessagesFilePath: "" }))
		provider.getTaskHistory = vi.fn(() => history)
		provider.updateTaskHistory = vi.fn(async (item: HistoryItem) =>
			history.map((entry) => (entry.id === item.id ? item : entry)),
		)
		provider.createTaskWithHistoryItem = vi.fn().mockResolvedValue(undefined)
		provider.log = vi.fn()
		provider.publishActivity = vi.fn().mockResolvedValue(undefined)
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined)
		provider.getTaskWithIdWithoutMessage = provider.getTaskWithId
		provider.cascadeStopDescendantTasks = vi.fn(
			(taskId: string, reason: HistoryItem["lastStopReason"], summary: string) =>
				ClineProvider.prototype["cascadeStopDescendantTasks"].call(provider, taskId, reason, summary),
		)
		provider.taskCancellationService = new TaskCancellationService({
			getCurrentTask: () => currentTask,
			getTaskWithId: provider.getTaskWithId,
			getTaskWithIdWithoutMessage: provider.getTaskWithIdWithoutMessage,
			updateTaskHistory: provider.updateTaskHistory,
			publishActivity: provider.publishActivity,
			postStateToWebview: provider.postStateToWebview,
			cascadeStopDescendantTasks: provider.cascadeStopDescendantTasks,
			createTaskWithHistoryItem: provider.createTaskWithHistoryItem,
			log: provider.log,
			getSubagentCoordinator: () => undefined,
		})

		await ClineProvider.prototype.cancelTask.call(provider)

		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "parent", lastStopReason: "user_cancelled" }),
		)
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "child", status: "aborted", lastStopReason: "parent_cancelled" }),
		)
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "grandchild", status: "aborted", lastStopReason: "parent_cancelled" }),
		)
		expect(provider.updateTaskHistory).not.toHaveBeenCalledWith(
			expect.objectContaining({ id: "done-child", status: "aborted" }),
		)
		expect(activeChild.cancelCurrentRequest).toHaveBeenCalled()
		expect(activeChild.abortTask).toHaveBeenCalledWith(true)
		expect(provider.createTaskWithHistoryItem).toHaveBeenCalledWith(
			expect.objectContaining({ id: "parent", lastStopReason: "user_cancelled" }),
		)
	})

	it("marks unfinished descendants aborted when parent completes", async () => {
		const history: HistoryItem[] = [
			{
				id: "parent",
				number: 1,
				ts: 3,
				task: "Parent",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "active",
				childIds: ["child"],
			},
			{
				id: "child",
				number: 2,
				ts: 2,
				task: "Child",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "active",
				parentTaskId: "parent",
				rootTaskId: "parent",
			},
			{
				id: "done-child",
				number: 3,
				ts: 1,
				task: "Done Child",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "completed",
				parentTaskId: "parent",
				rootTaskId: "parent",
			},
		]

		const provider = Object.create(ClineProvider.prototype) as any
		provider.clineStack = []
		provider.backgroundRootTaskStacks = new Map()
		provider.focusedRootTaskId = "parent"
		provider.taskRootStackLifecycleService = new TaskRootStackLifecycleService({
			getCurrentTask: () => provider.clineStack.at(-1),
			getCurrentStack: () => provider.clineStack,
			setCurrentStack: (stack: any[]) => {
				provider.clineStack = [...stack]
			},
			getBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.get(id),
			getBackgroundRootTaskEntries: () => provider.backgroundRootTaskStacks.entries(),
			setBackgroundRootTaskStack: (id: string, stack: any[]) =>
				provider.backgroundRootTaskStacks.set(id, [...stack]),
			deleteBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.delete(id),
			getFocusedRootTaskId: () => provider.focusedRootTaskId,
			setFocusedRootTaskId: (id: string | undefined) => {
				provider.focusedRootTaskId = id
			},
		})
		provider.getTaskWithId = vi.fn(async () => ({ historyItem: history[0] }))
		provider.getTaskHistory = vi.fn(() => history)
		provider.updateTaskHistory = vi.fn(async (item: HistoryItem) =>
			history.map((entry) => (entry.id === item.id ? item : entry)),
		)
		provider.log = vi.fn()

		await (provider as any).handleTaskCompletionLifecycle("parent")

		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "parent", status: "completed" }),
		)
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "child", status: "aborted", lastStopReason: "parent_completed" }),
		)
		expect(provider.updateTaskHistory).not.toHaveBeenCalledWith(
			expect.objectContaining({ id: "done-child", status: "aborted" }),
		)
	})
})
