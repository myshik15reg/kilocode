import type { HistoryItem } from "@roo-code/types"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ApiMessage } from "../../../task-persistence/apiMessages"
import { TaskBranchService, type TaskBranchRuntime } from "../TaskBranchService"
import { TaskRestartService, type TaskRestartRuntime } from "../TaskRestartService"

// kilocode_change - new file

const summarizeBranchMessage = vi.fn()

vi.mock("../../../webview/branchTask", () => ({
	summarizeBranchMessage: (...args: Parameters<typeof summarizeBranchMessage>) => summarizeBranchMessage(...args),
}))

describe("TaskRestartService coverage pass", () => {
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

	afterEach(() => {
		vi.clearAllMocks()
	})

	/**
	 * Covers the nullish restart defaults so the first retry still succeeds
	 * when persisted counters or limits were never written.
	 */
	it("falls back to default restart counters when persisted values are missing", async () => {
		historyItem = {
			...historyItem,
			restartCount: undefined,
		}
		getTaskWithId.mockResolvedValueOnce({ historyItem, apiConversationHistory })
		getState.mockResolvedValueOnce({
			autoRestartProblematicProcesses: true,
			problematicProcessRestartLimit: undefined,
		})
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(true)

		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				restartCount: 1,
				restartSourceTaskId: "task-1",
			}),
		)
		expect(persistTaskStopState).not.toHaveBeenCalled()
		expect(submitUserMessage).toHaveBeenCalledWith("Recovered handoff")
	})

	it("logs non-Error failures via string coercion", async () => {
		buildRecoveryPacket.mockRejectedValueOnce("packet failed")
		const service = new TaskRestartService(runtime)

		await expect(service.restartTaskFromHistoryWithHandoff("task-1")).resolves.toBe(false)

		expect(log).toHaveBeenCalledWith(
			"[restartTaskFromHistoryWithHandoff] Failed to restart task task-1: packet failed",
		)
	})
})

describe("TaskBranchService coverage pass", () => {
	let sourceHistoryItem: HistoryItem
	let branchHistoryItem: HistoryItem
	let getTaskWithId: ReturnType<typeof vi.fn>
	let getState: ReturnType<typeof vi.fn>
	let createTask: ReturnType<typeof vi.fn>
	let updateTaskHistory: ReturnType<typeof vi.fn>
	let publishActivity: ReturnType<typeof vi.fn>
	let postStateToWebview: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>
	let runtime: TaskBranchRuntime

	beforeEach(() => {
		sourceHistoryItem = {
			id: "task-1",
			number: 1,
			task: "Original task",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
		}
		branchHistoryItem = {
			id: "branch-1",
			number: 2,
			task: "Branch task",
			ts: 2,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
		}
		getTaskWithId = vi.fn(async (taskId: string) => ({
			historyItem: taskId === "branch-1" ? branchHistoryItem : sourceHistoryItem,
		}))
		getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic" },
			condensingApiConfigId: "compact-model",
			listApiConfigMeta: [{ id: "compact-model", name: "Compact" }],
		})
		createTask = vi.fn().mockResolvedValue({ taskId: "branch-1" })
		updateTaskHistory = vi.fn().mockResolvedValue([branchHistoryItem])
		publishActivity = vi.fn().mockResolvedValue(undefined)
		postStateToWebview = vi.fn().mockResolvedValue(undefined)
		log = vi.fn()
		summarizeBranchMessage.mockReset()
		runtime = {
			getTaskWithId,
			getState,
			createTask,
			updateTaskHistory,
			publishActivity,
			postStateToWebview,
			log,
			providerSettingsManager: {} as TaskBranchRuntime["providerSettingsManager"],
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	/**
	 * Exercises the middle fallback in the message selection chain when a task
	 * has resume context but no completion summary and no explicit branch text.
	 */
	it("falls back to the resume summary when no explicit or completion summary is available", async () => {
		sourceHistoryItem = {
			...sourceHistoryItem,
			completionResultSummary: undefined,
			resumeContextSummary: "Resume summary",
		}
		getTaskWithId.mockImplementation(async (taskId: string) => ({
			historyItem: taskId === "branch-1" ? branchHistoryItem : sourceHistoryItem,
		}))
		summarizeBranchMessage.mockResolvedValue("Resume summary branch")
		const service = new TaskBranchService(runtime)

		await service.branchTask("task-1")

		expect(summarizeBranchMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				rawBranchMessage: "Resume summary",
			}),
		)
		expect(createTask).toHaveBeenCalledWith("Branch of task task-1: Resume summary branch", undefined, undefined, {
			branchFromTaskId: "task-1",
			branchStrategy: "summary",
			initialStatus: "active",
		})
	})

	it("falls back to the task text when the explicit message trims to empty and summaries are absent", async () => {
		sourceHistoryItem = {
			...sourceHistoryItem,
			completionResultSummary: undefined,
			resumeContextSummary: undefined,
			task: "Fallback task text",
		}
		getTaskWithId.mockImplementation(async (taskId: string) => ({
			historyItem: taskId === "branch-1" ? branchHistoryItem : sourceHistoryItem,
		}))
		summarizeBranchMessage.mockResolvedValue("Task fallback branch")
		const service = new TaskBranchService(runtime)

		await service.branchTask("task-1", {
			message: "   ",
		})

		expect(summarizeBranchMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				rawBranchMessage: "Fallback task text",
				branchStrategy: undefined,
			}),
		)
		expect(createTask).toHaveBeenCalledWith("Branch of task task-1: Task fallback branch", undefined, undefined, {
			branchFromTaskId: "task-1",
			branchStrategy: "summary",
			initialStatus: "active",
		})
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("logs non-Error publish failures using string coercion", async () => {
		sourceHistoryItem = {
			...sourceHistoryItem,
			completionResultSummary: "Completed summary",
		}
		summarizeBranchMessage.mockResolvedValue("Compact branch summary")
		publishActivity.mockRejectedValueOnce("publish failed")
		const service = new TaskBranchService(runtime)

		await service.branchTask("task-1")

		expect(log).toHaveBeenCalledWith("Failed to publish branch activity for task-1: publish failed")
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})
})
