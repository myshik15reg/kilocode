// kilocode_change - new file
import type { Mock } from "vitest"

vi.mock("../../helper-routing/HelperModelRouter", () => ({
	HelperModelRouter: {
		selectConfig: vi.fn(),
	},
}))

vi.mock("../../../utils/single-completion-handler", () => ({
	singleCompletionHandler: vi.fn(),
}))

import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { singleCompletionHandler } from "../../../utils/single-completion-handler"
import { handleSingleCompletionRequest } from "../webviewSingleCompletion"

describe("handleSingleCompletionRequest", () => {
	const primaryConfig = {
		apiProvider: "anthropic",
		apiKey: "test-key",
		apiModelId: "claude-3-5-sonnet-20241022",
	} as const

	const helperConfig = {
		apiProvider: "openai",
		openAiApiKey: "helper-key",
		openAiModelId: "gpt-4.1-mini",
	} as const

	const provider = {
		getState: vi.fn(),
		postMessageToWebview: vi.fn(),
		providerSettingsManager: { getProfile: vi.fn() },
		log: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		provider.getState.mockResolvedValue({
			apiConfiguration: primaryConfig,
			enhancementApiConfigId: "helper-1",
			condensingApiConfigId: "helper-1",
			listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
		})
	})

	it("routes search_assist completions through HelperModelRouter", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "search_assist",
			config: helperConfig as any,
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		})
		;(singleCompletionHandler as Mock).mockResolvedValue("helper result")

		await handleSingleCompletionRequest(provider as any, {
			text: "Suggest the next query",
			completionRequestId: "req-1",
		})

		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith({
			job: "search_assist",
			state: {
				apiConfiguration: primaryConfig,
				enhancementApiConfigId: "helper-1",
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			},
			providerSettingsManager: provider.providerSettingsManager,
		})
		expect(singleCompletionHandler).toHaveBeenCalledWith(helperConfig, "Suggest the next query")
		expect(provider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleCompletionResult",
			completionRequestId: "req-1",
			completionText: "helper result",
			success: true,
		})
	})

	it("falls back to the primary model when helper routing throws", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockRejectedValue(new Error("helper offline"))
		;(singleCompletionHandler as Mock).mockResolvedValue("primary result")

		await handleSingleCompletionRequest(provider as any, {
			text: "Fallback query",
			completionRequestId: "req-2",
		})

		expect(singleCompletionHandler).toHaveBeenCalledWith(primaryConfig, "Fallback query")
		expect(provider.log).toHaveBeenCalledWith(
			expect.stringContaining("Helper routing failed for search_assist; using primary model:"),
		)
	})
})
