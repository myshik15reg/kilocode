import type { HistoryItem } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ApiMessage } from "../../task-persistence/apiMessages"
import { TaskRestartService, type TaskRestartRuntime } from "./TaskRestartService"

// kilocode_change - new file

describe("TaskRestartService", () => {
	let historyItem: HistoryItem
	let apiConversationHistory: ApiMessage[]
	let getTaskWithId: ReturnType<typeof vi.fn>
	let getState: ReturnType<typeof vi.fn>
	let persistTaskStopState: ReturnType<typeof vi.fn>
	let showProblematicProcessNotification: ReturnType<typeof vi.fn>
	let buildRecoveryPacket: ReturnType<typeof vi.fn>
	let updateTaskHistory: ReturnType<typeof vi.fn>
	let createTaskWithHistoryItem: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>
	let submitUserMessage: ReturnType<typeof vi.fn>
	let runtime: TaskRestartRuntime

	beforeEach(() => {
		historyItem = {
			id: "task-1",
			number: 1,
			task: "Recover task",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "aborted",
			restartCount: 0,
		}
		apiConversationHistory = [{ ts: 1, type: "say", text: "hello" } as unknown as ApiMessage]
		getTaskWithId = vi.fn().mockResolvedValue({ historyItem, apiConversationHistory })
		getState = vi.fn().mockResolvedValue({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: 2,
		})
		persistTaskStopState = vi.fn().mockResolvedValue(historyItem)
		showProblematicProcessNotification = vi.fn().mockResolvedValue(undefined)
		buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Recovered summary",
			handoff: "Recovered handoff",
		})
		updateTaskHistory = vi.fn().mockResolvedValue([historyItem])
		submitUserMessage = vi.fn().mockResolvedValue(undefined)
		createTaskWithHistoryItem = vi.fn().mockResolvedValue({ submitUserMessage })
		log = vi.fn()
		runtime = {
			getTaskWithId,
			getState,
			persistTaskStopState,
			showProblematicProcessNotification,
			buildRecoveryPacket,
			updateTaskHistory,
			createTaskWithHistoryItem,
			log,
		}
	})

	it("returns false when the task history item does not exist", async () => {
		getTaskWithId.mockResolvedValueOnce({ historyItem: undefined, apiConversationHistory })
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("missing-task")).resolves.toBe(false)

		expect(getState).not.toHaveBeenCalled()
		expect(buildRecoveryPacket).not.toHaveBeenCalled()
	})

	it("respects the auto-restart policy unless force is enabled", async () => {
		getState.mockResolvedValueOnce({
			autoRestartProblematicProcesses: false,
			problematicProcessRestartLimit: 2,
		})
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(false)

		expect(buildRecoveryPacket).not.toHaveBeenCalled()
		expect(persistTaskStopState).not.toHaveBeenCalled()
	})

	it("allows a forced restart even when the auto-restart policy is disabled", async () => {
		getState.mockResolvedValueOnce({
			autoRestartProblematicProcesses: false,
			problematicProcessRestartLimit: 2,
		})
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1", { force: true })).resolves.toBe(true)

		expect(buildRecoveryPacket).toHaveBeenCalledWith({
			historyItem,
			apiConversationHistory,
		})
		expect(submitUserMessage).toHaveBeenCalledWith("Recovered handoff")
	})

	it("stops and notifies when the restart limit is exceeded", async () => {
		historyItem = {
			...historyItem,
			restartCount: 2,
		}
		getTaskWithId.mockResolvedValueOnce({ historyItem, apiConversationHistory })
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(false)

		expect(persistTaskStopState).toHaveBeenCalledWith(
			"task-1",
			"restart_limit_exceeded",
			"Problematic process was not restarted because the restart limit (2) was reached.",
			"aborted",
		)
		expect(showProblematicProcessNotification).toHaveBeenCalledWith({
			taskId: "task-1",
			reason: "restart_limit_exceeded",
			restartAttempt: 2,
			restartPlanned: false,
		})
		expect(buildRecoveryPacket).not.toHaveBeenCalled()
	})

	it("restarts the task with updated history and a default restart source id", async () => {
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(true)

		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				status: "active",
				restartCount: 1,
				restartSourceTaskId: "task-1",
				lastStopSummary: "Recovered summary",
			}),
		)
		expect(createTaskWithHistoryItem).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "task-1",
				status: "active",
				restartCount: 1,
			}),
		)
		expect(submitUserMessage).toHaveBeenCalledWith("Recovered handoff")
	})

	it("preserves the original restart source id when it already exists", async () => {
		historyItem = {
			...historyItem,
			restartSourceTaskId: "root-source",
		}
		getTaskWithId.mockResolvedValueOnce({ historyItem, apiConversationHistory })
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(true)

		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				restartSourceTaskId: "root-source",
			}),
		)
	})

	it("returns false when the replacement task cannot be created", async () => {
		createTaskWithHistoryItem.mockResolvedValueOnce(undefined)
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(false)

		expect(updateTaskHistory).toHaveBeenCalledTimes(1)
		expect(submitUserMessage).not.toHaveBeenCalled()
	})

	it("logs unexpected restart failures and returns false", async () => {
		buildRecoveryPacket.mockRejectedValueOnce(new Error("packet failed"))
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(false)

		expect(log).toHaveBeenCalledWith(
			"[restartTaskFromHistoryWithHandoff] Failed to restart task task-1: packet failed",
		)
	})
})
