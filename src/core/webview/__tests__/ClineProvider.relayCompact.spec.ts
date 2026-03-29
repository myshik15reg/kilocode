// kilocode_change - new file
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../helper-routing/HelperModelRouter", () => ({
	HelperModelRouter: {
		selectConfig: vi.fn(),
	},
}))

vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn(),
}))

import { buildApiHandler } from "../../../api"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { TaskRecoveryPacketService } from "../../orchestration/task-control/TaskRecoveryPacketService"

async function* textStream(text: string) {
	yield { type: "text", text }
}

describe("ClineProvider relay_compact", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("routes relay_compact through the selected helper config", async () => {
		const helperConfig = {
			apiProvider: "openai",
			openAiApiKey: "helper-key",
			openAiModelId: "gpt-4.1-mini",
		} as const

		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "relay_compact",
			config: helperConfig as any,
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		})
		vi.mocked(buildApiHandler).mockReturnValue({
			createMessage: vi.fn().mockReturnValue(textStream("  Helper restart summary  ")),
		} as any)

		const provider = {
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			}),
			providerSettingsManager: { getProfile: vi.fn() },
			log: vi.fn(),
		} as any
		const service = new TaskRecoveryPacketService(provider)

		const result = await (service as any).maybeBuildCheapRestartSummary({
			historyItem: {
				id: "task-1",
				task: "Recover failed generation",
				lastStopReason: "api_error",
				restartCount: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Continue from the failure point" }] },
				{ role: "assistant", content: [{ type: "text", text: "The request timed out" }] },
			],
		})

		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith({
			job: "relay_compact",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			},
			providerSettingsManager: provider.providerSettingsManager,
		})
		expect(buildApiHandler).toHaveBeenCalledWith(helperConfig)
		expect(result).toBe("Helper restart summary")
	})

	it("falls back to the heuristic summary when relay_compact routing fails", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockRejectedValue(new Error("helper offline"))

		const provider = {
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			}),
			providerSettingsManager: { getProfile: vi.fn() },
			log: vi.fn(),
		} as any
		const service = new TaskRecoveryPacketService(provider)

		const result = await (service as any).maybeBuildCheapRestartSummary({
			historyItem: {
				id: "task-1",
				task: "Recover failed generation",
				lastStopReason: "api_error",
				restartCount: 2,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		})

		expect(buildApiHandler).not.toHaveBeenCalled()
		expect(result).toBe("Recovery mode: compact retry after api_error.")
		expect(provider.log).toHaveBeenCalledWith(
			expect.stringContaining("[maybeBuildCheapRestartSummary] Falling back to heuristic summary:"),
		)
	})
})
