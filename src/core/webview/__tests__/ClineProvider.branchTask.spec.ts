// kilocode_change - new file
import { beforeEach, describe, expect, it, vi } from "vitest"

import { orchestrationEventStore } from "../../orchestration/events/store"

vi.mock("../../helper-routing/HelperModelRouter", () => ({
	HelperModelRouter: {
		selectConfig: vi.fn(),
	},
}))

vi.mock("../../../utils/single-completion-handler", () => ({
	singleCompletionHandler: vi.fn(),
}))

import { ClineProvider } from "../ClineProvider"
import { TaskBranchService } from "../../orchestration/task-control/TaskBranchService"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { singleCompletionHandler } from "../../../utils/single-completion-handler"

describe("ClineProvider branchTask", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		orchestrationEventStore.clear("task-1")
	})

	it("routes summarize_branch through the selected helper config", async () => {
		const helperConfig = {
			apiProvider: "openai",
			openAiApiKey: "helper-key",
			openAiModelId: "gpt-4.1-mini",
		} as const

		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "summarize_branch",
			config: helperConfig as any,
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		})
		vi.mocked(singleCompletionHandler).mockResolvedValue("Compact branch handoff")

		const provider = Object.create(ClineProvider.prototype) as ClineProvider
		;(provider as any).taskBranchService = new TaskBranchService(provider as any)
		provider.getTaskWithId = vi
			.fn()
			.mockResolvedValueOnce({
				historyItem: {
					id: "task-1",
					task: "Investigate parser failure",
					completionResultSummary: "Keep only the latest safe next step",
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			})
			.mockResolvedValueOnce({
				historyItem: {
					id: "branch-1",
					task: "Branch task 1",
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			})
		provider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "helper-1",
			listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
		}) as any
		;(provider as any).providerSettingsManager = { getProfile: vi.fn() }
		;(provider as any).outputChannel = { appendLine: vi.fn() }
		provider.createTask = vi.fn().mockResolvedValue({ taskId: "branch-1" }) as any
		provider.updateTaskHistory = vi.fn().mockResolvedValue(undefined as any)
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined as any)

		await provider.branchTask("task-1", { branchStrategy: "summary" })

		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith({
			job: "summarize_branch",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			},
			providerSettingsManager: (provider as any).providerSettingsManager,
		})
		expect(singleCompletionHandler).toHaveBeenCalledWith(
			helperConfig,
			expect.stringContaining("Create a compact branch handoff summary under 500 characters."),
		)
		expect(provider.createTask).toHaveBeenCalledWith(
			"Branch of task task-1: Compact branch handoff",
			undefined,
			undefined,
			expect.objectContaining({ branchFromTaskId: "task-1", branchStrategy: "summary", initialStatus: "active" }),
		)
	})

	it("falls back to raw summary when helper routing or summarization fails", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockRejectedValue(new Error("helper offline"))

		const provider = Object.create(ClineProvider.prototype) as ClineProvider
		;(provider as any).taskBranchService = new TaskBranchService(provider as any)
		provider.getTaskWithId = vi
			.fn()
			.mockResolvedValueOnce({
				historyItem: {
					id: "task-1",
					task: "Investigate parser failure",
					completionResultSummary: "Keep only the latest safe next step",
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			})
			.mockResolvedValueOnce({
				historyItem: {
					id: "branch-1",
					task: "Branch task 1",
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
				},
			})
		provider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "helper-1",
			listApiConfigMeta: [{ id: "helper-1", name: "Local helper" }],
		}) as any
		;(provider as any).providerSettingsManager = { getProfile: vi.fn() }
		;(provider as any).outputChannel = { appendLine: vi.fn() }
		provider.createTask = vi.fn().mockResolvedValue({ taskId: "branch-1" }) as any
		provider.updateTaskHistory = vi.fn().mockResolvedValue(undefined as any)
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined as any)

		const branched = await provider.branchTask("task-1", { branchStrategy: "summary" })

		expect(branched).toEqual({ taskId: "branch-1" })
		expect(singleCompletionHandler).not.toHaveBeenCalled()
		expect(provider.createTask).toHaveBeenCalledWith(
			"Branch of task task-1: Keep only the latest safe next step",
			undefined,
			undefined,
			expect.objectContaining({ branchFromTaskId: "task-1", branchStrategy: "summary", initialStatus: "active" }),
		)
		expect(provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ branchFromTaskId: "task-1", branchStrategy: "summary" }),
		)
		expect(orchestrationEventStore.get("task-1").at(-1)).toMatchObject({
			kind: "taskControl",
			control: "branch",
			summary: "Branched into task branch-1",
		})
	})
})
