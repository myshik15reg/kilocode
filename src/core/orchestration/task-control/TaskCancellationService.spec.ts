import type { HistoryItem } from "@roo-code/types"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SubagentCoordinatorRuntime } from "../subagents/SubagentDelegationService"
import { TaskCancellationService, type TaskCancellationRuntime } from "./TaskCancellationService"

// kilocode_change - new file

describe("TaskCancellationService", () => {
	let historyItem: HistoryItem
	let currentTask:
		| {
				taskId: string
				instanceId: string
				rootTask?: object
				parentTask?: object
				isStreaming: boolean
				didFinishAbortingStream: boolean
				isWaitingForFirstChunk: boolean
				abandoned: boolean
				abortReason?: string
				cancelCurrentRequest: ReturnType<typeof vi.fn>
				abortTask: ReturnType<typeof vi.fn>
		  }
		| undefined
	let runtime: TaskCancellationRuntime
	let coordinator: Pick<SubagentCoordinatorRuntime, "getBindingForTask" | "cancel">
	let getBindingForTask: ReturnType<typeof vi.fn>
	let cancel: ReturnType<typeof vi.fn>
	let updateTaskHistory: ReturnType<typeof vi.fn>
	let publishActivity: ReturnType<typeof vi.fn>
	let postStateToWebview: ReturnType<typeof vi.fn>
	let cascadeStopDescendantTasks: ReturnType<typeof vi.fn>
	let createTaskWithHistoryItem: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	beforeEach(() => {
		historyItem = {
			id: "task-1",
			number: 1,
			task: "Primary task",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			lifecycleState: "running",
		}
		currentTask = {
			taskId: "task-1",
			instanceId: "instance-1",
			rootTask: { id: "root-1" },
			parentTask: { id: "parent-1" },
			isStreaming: false,
			didFinishAbortingStream: false,
			isWaitingForFirstChunk: false,
			abandoned: false,
			cancelCurrentRequest: vi.fn(),
			abortTask: vi.fn(),
		}
		getBindingForTask = vi.fn()
		cancel = vi.fn().mockResolvedValue(undefined)
		coordinator = {
			getBindingForTask,
			cancel,
		}
		updateTaskHistory = vi.fn().mockResolvedValue([historyItem])
		publishActivity = vi.fn().mockResolvedValue(undefined)
		postStateToWebview = vi.fn().mockResolvedValue(undefined)
		cascadeStopDescendantTasks = vi.fn().mockResolvedValue([])
		createTaskWithHistoryItem = vi.fn().mockResolvedValue(undefined)
		log = vi.fn()
		runtime = {
			getCurrentTask: vi.fn(() => currentTask as any),
			getTaskWithId: vi.fn(async () => ({ historyItem })),
			getTaskWithIdWithoutMessage: vi.fn(async () => ({ historyItem })),
			updateTaskHistory,
			publishActivity,
			postStateToWebview,
			cascadeStopDescendantTasks,
			createTaskWithHistoryItem,
			log,
			getSubagentCoordinator: vi.fn(() => coordinator),
		}
	})

	it("cancels background-bound tasks through the coordinator path before persisting cancelled history", async () => {
		getBindingForTask.mockReturnValue({ childTaskId: "task-1", sessionId: "session-1", status: "running" })
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(cancel).toHaveBeenCalledWith("task-1")
		expect(runtime.getTaskWithIdWithoutMessage as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("task-1")
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				status: "aborted",
				lastStopReason: "user_cancelled",
				lastStopSummary: "Background subagent cancelled by the user.",
				lifecycleState: "cancelled",
			}),
		)
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
		expect(publishActivity).not.toHaveBeenCalled()
		expect(cascadeStopDescendantTasks).toHaveBeenCalledWith(
			"task-1",
			"parent_cancelled",
			"Parent task task-1 was cancelled by the user.",
		)
		expect(createTaskWithHistoryItem).not.toHaveBeenCalled()
	})

	it("persists foreground cancellation, publishes activity, cascades descendants, and rehydrates", async () => {
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				status: "aborted",
				lastStopReason: "user_cancelled",
				lastStopSummary: "Task execution was cancelled by the user.",
			}),
		)
		expect(publishActivity).toHaveBeenCalledWith(
			"task-1",
			expect.objectContaining({
				kind: "taskControl",
				control: "pause",
				summary: "Task cancelled by user",
			}),
		)
		expect(cascadeStopDescendantTasks).toHaveBeenCalledWith(
			"task-1",
			"parent_cancelled",
			"Parent task task-1 was cancelled by the user.",
		)
		expect(currentTask?.abortReason).toBe("user_cancelled")
		expect(currentTask?.cancelCurrentRequest).toHaveBeenCalledTimes(1)
		expect(currentTask?.abortTask).toHaveBeenCalledTimes(1)
		expect(currentTask?.abandoned).toBe(true)
		expect(createTaskWithHistoryItem).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				rootTask: currentTask?.rootTask,
				parentTask: currentTask?.parentTask,
			}),
		)
	})

	it("logs activity publish failures without breaking the foreground cancel flow", async () => {
		publishActivity.mockRejectedValueOnce(new Error("activity failed"))
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(log).toHaveBeenCalledWith("Failed to publish cancel activity for task-1: activity failed")
		expect(cascadeStopDescendantTasks).toHaveBeenCalledWith(
			"task-1",
			"parent_cancelled",
			"Parent task task-1 was cancelled by the user.",
		)
		expect(createTaskWithHistoryItem).toHaveBeenCalledTimes(1)
	})

	it("falls back to stringifying non-Error publish failures", async () => {
		publishActivity.mockRejectedValueOnce("plain failure")
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(log).toHaveBeenCalledWith("Failed to publish cancel activity for task-1: plain failure")
		expect(createTaskWithHistoryItem).toHaveBeenCalledTimes(1)
	})

	it("returns without side effects when there is no current task", async () => {
		currentTask = undefined
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(updateTaskHistory).not.toHaveBeenCalled()
		expect(publishActivity).not.toHaveBeenCalled()
		expect(cascadeStopDescendantTasks).not.toHaveBeenCalled()
		expect(createTaskWithHistoryItem).not.toHaveBeenCalled()
	})

	it("skips rehydrate when the active instance changes before the guarded checks", async () => {
		const replacementTask = {
			...currentTask,
			instanceId: "instance-2",
		}
		;(runtime.getCurrentTask as ReturnType<typeof vi.fn>).mockImplementation(() => {
			const task = currentTask
			currentTask = replacementTask as any
			return task as any
		})
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(log).toHaveBeenCalledWith(
			"[cancelTask] Skipping rehydrate: current instance instance-2 != original instance-1",
		)
		expect(createTaskWithHistoryItem).not.toHaveBeenCalled()
	})

	it("skips rehydrate after the final guarded check when the active instance changes late", async () => {
		const originalTask = {
			...currentTask!,
			isStreaming: true,
			isWaitingForFirstChunk: true,
		}
		const replacementTask = {
			...originalTask,
			instanceId: "instance-2",
		}
		let getCurrentTaskCall = 0
		;(runtime.getCurrentTask as ReturnType<typeof vi.fn>).mockImplementation(() => {
			getCurrentTaskCall += 1
			if (getCurrentTaskCall === 4) {
				return replacementTask as any
			}

			return originalTask as any
		})
		const service = new TaskCancellationService(runtime)

		await service.cancelTask()

		expect(log).toHaveBeenCalledWith(
			"[cancelTask] Skipping rehydrate after final check: current instance instance-2 != original instance-1",
		)
		expect(createTaskWithHistoryItem).not.toHaveBeenCalled()
	})

	it("logs stream abort timeout failures without breaking cancellation persistence", async () => {
		vi.useFakeTimers()
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
		const stuckStreamingTask = {
			...currentTask!,
			isStreaming: true,
			didFinishAbortingStream: false,
			isWaitingForFirstChunk: false,
		}
		;(runtime.getCurrentTask as ReturnType<typeof vi.fn>).mockImplementation(() => stuckStreamingTask as any)
		const service = new TaskCancellationService(runtime)

		const cancelPromise = service.cancelTask()
		await vi.advanceTimersByTimeAsync(3_100)
		await cancelPromise

		expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to abort task")
		expect(createTaskWithHistoryItem).toHaveBeenCalledTimes(1)
	})
})
