// kilocode_change - new file

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Task } from "../Task"

describe("Task problematic-process auto restart", () => {
	let mockProvider: any

	beforeEach(() => {
		mockProvider = {
			getState: vi.fn(),
			getTaskWithId: vi.fn(),
			persistTaskStopState: vi.fn().mockResolvedValue(undefined),
			showProblematicProcessNotification: vi.fn().mockResolvedValue(undefined),
			restartTaskFromHistoryWithHandoff: vi.fn().mockResolvedValue(true),
		}
	})

	function createTaskLike(taskId: string, consecutiveMistakeLimit: number) {
		const task = Object.create(Task.prototype) as any
		task.providerRef = { deref: () => mockProvider }
		task.taskId = taskId
		task.consecutiveMistakeLimit = consecutiveMistakeLimit
		task.abort = false
		task.abandoned = false
		task.abortReason = undefined
		return task
	}

	it("auto restarts when enabled and below restart limit", async () => {
		mockProvider.getState.mockResolvedValue({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: 2,
		})
		mockProvider.getTaskWithId.mockResolvedValue({
			historyItem: { id: "task-1", task: "Fix bug", restartCount: 0 },
		})

		const task = createTaskLike("task-1", 3)
		const restarted = await task.handleProblematicProcessRestart()

		expect(restarted).toBe(true)
		expect(mockProvider.persistTaskStopState).toHaveBeenCalledWith(
			"task-1",
			"loop_detected",
			expect.stringContaining("consecutive mistake limit (3)"),
			"aborted",
		)
		expect(mockProvider.showProblematicProcessNotification).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "loop_detected", restartPlanned: true, restartAttempt: 1 }),
		)
		expect(mockProvider.restartTaskFromHistoryWithHandoff).toHaveBeenCalledWith("task-1", { force: true })
		expect(task.abort).toBe(true)
		expect(task.abandoned).toBe(true)
	})

	it("allows forced manual restart even when auto restart is disabled", async () => {
		mockProvider.getState.mockResolvedValue({
			autoRestartProblematicProcesses: false,
			problematicProcessRestartLimit: 2,
		})
		mockProvider.getTaskWithId.mockResolvedValue({
			historyItem: { id: "task-2", task: "Retry branch", restartCount: 0 },
		})

		const task = createTaskLike("task-2", 4)
		const restarted = await task.handleProblematicProcessRestart({ force: true })

		expect(restarted).toBe(true)
		expect(mockProvider.restartTaskFromHistoryWithHandoff).toHaveBeenCalledWith("task-2", { force: true })
		expect(mockProvider.showProblematicProcessNotification).toHaveBeenCalledWith(
			expect.objectContaining({ reason: "loop_detected", restartPlanned: true, restartAttempt: 1 }),
		)
	})
})
