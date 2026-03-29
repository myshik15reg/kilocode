import type { HistoryItem } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { TaskBranchService, type TaskBranchRuntime } from "./TaskBranchService"

// kilocode_change - new file

const summarizeBranchMessage = vi.fn()

vi.mock("../../webview/branchTask", () => ({
	summarizeBranchMessage: (...args: Parameters<typeof summarizeBranchMessage>) => summarizeBranchMessage(...args),
}))

describe("TaskBranchService", () => {
	let sourceHistoryItem: HistoryItem
	let branchHistoryItem: HistoryItem
	let runtime: TaskBranchRuntime
	let getTaskWithId: ReturnType<typeof vi.fn>
	let createTask: ReturnType<typeof vi.fn>
	let updateTaskHistory: ReturnType<typeof vi.fn>
	let publishActivity: ReturnType<typeof vi.fn>
	let postStateToWebview: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>

	beforeEach(() => {
		sourceHistoryItem = {
			id: "task-1",
			number: 1,
			task: "Original task",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			completionResultSummary: "Completed summary",
			resumeContextSummary: "Resume summary",
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
		createTask = vi.fn().mockResolvedValue({ taskId: "branch-1" })
		updateTaskHistory = vi.fn().mockResolvedValue([branchHistoryItem])
		publishActivity = vi.fn().mockResolvedValue(undefined)
		postStateToWebview = vi.fn().mockResolvedValue(undefined)
		log = vi.fn()
		summarizeBranchMessage.mockReset()
		runtime = {
			getTaskWithId,
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic" },
				condensingApiConfigId: "compact-model",
				listApiConfigMeta: [{ id: "compact-model", name: "Compact" }],
			}),
			createTask,
			updateTaskHistory,
			publishActivity,
			postStateToWebview,
			log,
			providerSettingsManager: {} as any,
		}
	})

	it("branches from the nearest persisted summary and records branch metadata", async () => {
		summarizeBranchMessage.mockResolvedValue("Compact branch summary")
		const service = new TaskBranchService(runtime)

		const branched = await service.branchTask("task-1")

		expect(branched).toEqual({ taskId: "branch-1" })
		expect(summarizeBranchMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				rawBranchMessage: "Completed summary",
				branchStrategy: undefined,
			}),
		)
		expect(createTask).toHaveBeenCalledWith("Branch of task task-1: Compact branch summary", undefined, undefined, {
			branchFromTaskId: "task-1",
			branchStrategy: "summary",
			initialStatus: "active",
		})
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "branch-1",
				branchFromTaskId: "task-1",
				branchSummary: "Branch of task task-1: Compact branch summary",
				branchStrategy: "summary",
			}),
		)
		expect(publishActivity).toHaveBeenCalledWith(
			"task-1",
			expect.objectContaining({
				kind: "taskControl",
				control: "branch",
				summary: "Branched into task branch-1",
			}),
		)
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("uses an explicit trimmed message, preserves the selected strategy, and logs publish failures", async () => {
		summarizeBranchMessage.mockResolvedValue("Keep this exact branch context")
		publishActivity.mockRejectedValueOnce(new Error("publish failed"))
		const service = new TaskBranchService(runtime)

		await service.branchTask("task-1", {
			message: "  Keep this exact branch context  ",
			branchStrategy: "full",
		})

		expect(summarizeBranchMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				rawBranchMessage: "Keep this exact branch context",
				branchStrategy: "full",
			}),
		)
		expect(createTask).toHaveBeenCalledWith(
			"Branch of task task-1: Keep this exact branch context",
			undefined,
			undefined,
			{
				branchFromTaskId: "task-1",
				branchStrategy: "full",
				initialStatus: "active",
			},
		)
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				branchStrategy: "full",
			}),
		)
		expect(log).toHaveBeenCalledWith("Failed to publish branch activity for task-1: publish failed")
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
	})
})
