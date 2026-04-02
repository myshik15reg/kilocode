import { RooCodeEventName, type HistoryItem } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SubagentCoordinatorRuntime } from "../subagents/SubagentDelegationService"
import { TaskControlService, type TaskControlRuntime } from "./TaskControlService"

// kilocode_change - new file

describe("TaskControlService", () => {
	let historyItem: HistoryItem
	let currentTask:
		| {
				taskId: string
				isPaused: boolean
				cancelCurrentRequest: ReturnType<typeof vi.fn>
				emit: ReturnType<typeof vi.fn>
		  }
		| undefined
	let runtime: TaskControlRuntime
	let coordinator: SubagentCoordinatorRuntime
	let getBindingForTask: ReturnType<typeof vi.fn>
	let pause: ReturnType<typeof vi.fn>
	let resume: ReturnType<typeof vi.fn>
	let updateTaskHistory: ReturnType<typeof vi.fn>
	let publishActivity: ReturnType<typeof vi.fn>
	let showTaskWithId: ReturnType<typeof vi.fn>
	let postStateToWebview: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>

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
			lastStopSummary: "Last stop summary",
		}
		currentTask = {
			taskId: "task-1",
			isPaused: false,
			cancelCurrentRequest: vi.fn(),
			emit: vi.fn(),
		}
		getBindingForTask = vi.fn()
		pause = vi.fn().mockResolvedValue(undefined)
		resume = vi.fn().mockResolvedValue(undefined)
		coordinator = {
			getBindingForTask,
			pause,
			resume,
		} as unknown as SubagentCoordinatorRuntime
		updateTaskHistory = vi.fn().mockResolvedValue([historyItem])
		publishActivity = vi.fn().mockResolvedValue(undefined)
		showTaskWithId = vi.fn().mockResolvedValue(undefined)
		postStateToWebview = vi.fn().mockResolvedValue(undefined)
		log = vi.fn()
		runtime = {
			getCurrentTask: vi.fn(() => currentTask as any),
			getTaskWithId: vi.fn(async () => ({ historyItem })),
			updateTaskHistory,
			publishActivity,
			postStateToWebview,
			showTaskWithId,
			cascadeResumeDescendantTasks: vi.fn().mockResolvedValue([]),
			log,
			getSubagentCoordinator: vi.fn(() => coordinator),
		}
	})

	it("pauses the bound task, persists pause metadata, and publishes pause activity", async () => {
		getBindingForTask.mockReturnValue({ childTaskId: "task-1" })
		const service = new TaskControlService(runtime)

		await service.pauseTask("task-1", "Paused by user")

		expect(coordinator.pause).toHaveBeenCalledWith("task-1")
		expect(currentTask?.isPaused).toBe(true)
		expect(currentTask?.cancelCurrentRequest).toHaveBeenCalledTimes(1)
		expect(currentTask?.emit).toHaveBeenCalledWith(RooCodeEventName.TaskPaused, "task-1")
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				lifecycleState: "paused",
				pauseReason: "Paused by user",
				resumeContextSummary: "Last stop summary",
				pausedAt: expect.any(Number),
			}),
		)
		expect(publishActivity).toHaveBeenCalledWith(
			"task-1",
			expect.objectContaining({ kind: "taskControl", control: "pause", summary: "Paused by user" }),
		)
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("uses resumeContextSummary before lastStopSummary when pausing", async () => {
		historyItem = {
			...historyItem,
			resumeContextSummary: "Existing resume summary",
		}
		;(runtime.getTaskWithId as ReturnType<typeof vi.fn>).mockResolvedValue({ historyItem })
		const service = new TaskControlService(runtime)

		await service.pauseTask("task-1", "Paused by user")

		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ resumeContextSummary: "Existing resume summary" }),
		)
	})

	it("resumes the bound task, normalizes parent status, cascades resume to unfinished descendants, publishes resume activity, and reopens the task", async () => {
		historyItem = {
			...historyItem,
			status: "delegated",
			lifecycleState: "paused",
			awaitingChildId: "child-1",
		}
		getBindingForTask.mockReturnValue({ childTaskId: "task-1" })
		const service = new TaskControlService(runtime)

		service.resumeTask("task-1")
		await vi.waitFor(() => expect(updateTaskHistory).toHaveBeenCalled())

		expect(coordinator.resume).toHaveBeenCalledWith("task-1")
		expect(currentTask?.isPaused).toBe(false)
		expect(currentTask?.emit).toHaveBeenCalledWith(RooCodeEventName.TaskUnpaused, "task-1")
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				status: "active",
				statusUpdatedAt: expect.any(Number),
				lifecycleState: "running",
				pauseReason: undefined,
				pausedAt: undefined,
			}),
		)
		expect(runtime.cascadeResumeDescendantTasks).toHaveBeenCalledWith("task-1")
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
		expect(publishActivity).toHaveBeenCalledWith(
			"task-1",
			expect.objectContaining({ kind: "taskControl", control: "resume", summary: "Task resumed" }),
		)
		expect(showTaskWithId).toHaveBeenCalledWith("task-1")
	})

	it("publishes continue activity when resume control is continue", async () => {
		const service = new TaskControlService(runtime)

		service.resumeTask("task-1", "continue")
		await vi.waitFor(() => expect(publishActivity).toHaveBeenCalled())

		expect(publishActivity).toHaveBeenCalledWith(
			"task-1",
			expect.objectContaining({ kind: "taskControl", control: "continue", summary: "Task continued" }),
		)
	})

	it("logs resume persistence failures without interrupting task reopening", async () => {
		updateTaskHistory.mockRejectedValueOnce(new Error("history failed"))
		const service = new TaskControlService(runtime)

		service.resumeTask("task-1")
		await vi.waitFor(() => expect(log).toHaveBeenCalled())

		expect(log).toHaveBeenCalledWith("Failed to update task state for resume task-1: history failed")
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
		expect(showTaskWithId).toHaveBeenCalledWith("task-1")
	})

	it("keeps completed and aborted descendants untouched when parent resume triggers cascade", async () => {
		const service = new TaskControlService(runtime)

		service.resumeTask("task-1")
		await vi.waitFor(() => expect(runtime.cascadeResumeDescendantTasks).toHaveBeenCalledWith("task-1"))

		expect(runtime.cascadeResumeDescendantTasks).toHaveBeenCalledTimes(1)
	})

	it("returns early when pauseTask has no explicit task id and no current task", async () => {
		;(runtime.getCurrentTask as ReturnType<typeof vi.fn>).mockReturnValue(undefined)
		const service = new TaskControlService(runtime)

		await service.pauseTask(undefined, "Paused by user")

		expect(updateTaskHistory).not.toHaveBeenCalled()
		expect(publishActivity).not.toHaveBeenCalled()
		expect(postStateToWebview).not.toHaveBeenCalled()
	})

	it("logs pause activity publish failures and still posts state to the webview", async () => {
		publishActivity.mockRejectedValueOnce(new Error("pause activity failed"))
		const service = new TaskControlService(runtime)

		await service.pauseTask("task-1", "Paused by user")

		expect(log).toHaveBeenCalledWith("Failed to publish pause activity for task-1: pause activity failed")
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("logs showTaskWithId failures during resume", async () => {
		showTaskWithId.mockRejectedValueOnce(new Error("show failed"))
		const service = new TaskControlService(runtime)

		service.resumeTask("task-1")
		await vi.waitFor(() => expect(log).toHaveBeenCalledWith("Failed to resume task task-1: show failed"))

		expect(log).toHaveBeenCalledWith("Failed to resume task task-1: show failed")
	})
})
