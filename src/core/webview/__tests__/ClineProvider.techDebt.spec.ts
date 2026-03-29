vi.mock("../../helper-routing/HelperModelRouter", () => ({
	HelperModelRouter: {
		selectConfig: vi.fn(),
	},
}))

vi.mock("../../tech-debt/TechDebtService", () => ({
	TechDebtService: {
		extractItems: vi.fn(),
		getConvertToTaskPrompt: vi.fn((item) => `Tech debt follow-up: ${item.title}`),
	},
}))

import { ClineProvider } from "../ClineProvider"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { TechDebtService } from "../../tech-debt/TechDebtService"

describe("ClineProvider tech debt", () => {
	it("routes tech_debt_extract through the selected helper config", async () => {
		const provider = Object.create(ClineProvider.prototype) as ClineProvider
		const helperConfig = {
			apiProvider: "openai",
			openAiApiKey: "helper-key",
			openAiModelId: "gpt-4.1-mini",
		} as const
		const extractedItems = [
			{
				id: "debt-1",
				sourceTaskId: "task-1",
				rootTaskId: "task-1",
				title: "Add follow-up tests",
				summary: "Coverage is missing for edge cases.",
				category: "test_gap",
				severity: "medium",
				status: "suggested",
				createdAt: 1,
			},
		]

		provider.getTaskWithId = vi.fn().mockResolvedValue({
			historyItem: {
				id: "task-1",
				rootTaskId: undefined,
				task: "Original task",
				techDebtItems: [],
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
		provider.addTechDebtItems = vi.fn().mockResolvedValue(extractedItems as any)

		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "tech_debt_extract",
			config: helperConfig as any,
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		})
		vi.mocked(TechDebtService.extractItems).mockResolvedValue(extractedItems as any)

		const result = await provider.extractTechDebtForTask({
			taskId: "task-1",
			completionSummary: "Completed the main fix",
			recentContext: "There may be follow-up tests needed",
		})

		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith({
			job: "tech_debt_extract",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			},
			providerSettingsManager: (provider as any).providerSettingsManager,
		})
		expect(TechDebtService.extractItems).toHaveBeenCalledWith({
			sourceTaskId: "task-1",
			rootTaskId: "task-1",
			task: "Original task",
			completionSummary: "Completed the main fix",
			recentContext: "There may be follow-up tests needed",
			existingItems: [],
			config: helperConfig,
		})
		expect(result).toEqual(extractedItems)
	})

	it("falls back to the primary config when helper routing returns the main profile", async () => {
		const provider = Object.create(ClineProvider.prototype) as ClineProvider
		const primaryConfig = {
			apiProvider: "anthropic",
			apiModelId: "claude-sonnet",
		} as const
		const extractedItems = [
			{
				id: "debt-primary",
				sourceTaskId: "task-1",
				rootTaskId: "task-1",
				title: "Document fallback behavior",
				summary: "Helper profile is unavailable.",
				category: "documentation",
				severity: "low",
				status: "suggested",
				createdAt: 1,
			},
		]

		provider.getTaskWithId = vi.fn().mockResolvedValue({
			historyItem: {
				id: "task-1",
				rootTaskId: undefined,
				task: "Original task",
				techDebtItems: [],
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		})
		provider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: primaryConfig,
			condensingApiConfigId: "missing-helper",
			listApiConfigMeta: [],
		}) as any
		;(provider as any).providerSettingsManager = { getProfile: vi.fn() }
		provider.addTechDebtItems = vi.fn().mockResolvedValue(extractedItems as any)

		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "tech_debt_extract",
			config: primaryConfig as any,
			source: "primary",
			provider: "anthropic",
			modelId: "claude-sonnet",
		})
		vi.mocked(TechDebtService.extractItems).mockResolvedValue(extractedItems as any)

		const result = await provider.extractTechDebtForTask({
			taskId: "task-1",
			completionSummary: "Completed the main fix",
			recentContext: "No helper route available",
		})

		expect(TechDebtService.extractItems).toHaveBeenCalledWith(
			expect.objectContaining({
				config: primaryConfig,
				recentContext: "No helper route available",
			}),
		)
		expect(result).toEqual(extractedItems)
	})

	it("converts tech debt item to task and updates statuses", async () => {
		const provider = Object.create(ClineProvider.prototype) as ClineProvider
		provider.getTaskWithId = vi.fn().mockResolvedValue({
			historyItem: {
				id: "task-1",
				number: 1,
				ts: 1,
				task: "Original task",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				techDebtItems: [
					{
						id: "debt-1",
						sourceTaskId: "task-1",
						rootTaskId: "task-1",
						title: "Add follow-up tests",
						summary: "Coverage is missing for edge cases.",
						category: "test_gap",
						severity: "medium",
						status: "suggested",
						createdAt: 1,
					},
				],
			},
		})
		provider.updateTechDebtStatus = vi.fn().mockResolvedValue(undefined as any)
		provider.createTask = vi.fn().mockResolvedValue({ taskId: "task-2" })

		const created = await provider.convertTechDebtToTask({ taskId: "task-1", itemId: "debt-1" })

		expect(provider.updateTechDebtStatus).toHaveBeenNthCalledWith(1, "task-1", "debt-1", "accepted")
		expect(provider.createTask).toHaveBeenCalledWith(expect.stringContaining("Add follow-up tests"))
		expect(provider.updateTechDebtStatus).toHaveBeenNthCalledWith(2, "task-1", "debt-1", "converted_to_task")
		expect(created).toEqual({ taskId: "task-2" })
	})
})
