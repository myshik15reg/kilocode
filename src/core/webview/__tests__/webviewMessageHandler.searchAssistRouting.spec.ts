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

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
	},
}))

import type { ClineProvider } from "../ClineProvider"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { webviewMessageHandler } from "../webviewMessageHandler"
import * as singleCompletionHandlerModule from "../../../utils/single-completion-handler"

const mockSingleCompletionHandler = singleCompletionHandlerModule.singleCompletionHandler as Mock

describe("webviewMessageHandler search_assist routing", () => {
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

	const mockClineProvider = {
		getState: vi.fn(),
		postMessageToWebview: vi.fn(),
		log: vi.fn(),
		providerSettingsManager: { getProfile: vi.fn() },
		contextProxy: {
			getValue: vi.fn(),
			setValue: vi.fn(),
		},
	} as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: primaryConfig,
			enhancementApiConfigId: "helper-1",
			condensingApiConfigId: "helper-1",
			listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
		})
	})

	it("routes singleCompletion through the search_assist helper config", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "search_assist",
			config: helperConfig as any,
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		})
		mockSingleCompletionHandler.mockResolvedValue("helper result")

		await webviewMessageHandler(mockClineProvider, {
			type: "singleCompletion",
			text: "Suggest the next search query",
			completionRequestId: "req-1",
		} as any)

		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith({
			job: "search_assist",
			state: {
				apiConfiguration: primaryConfig,
				enhancementApiConfigId: "helper-1",
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper" }],
			},
			providerSettingsManager: mockClineProvider.providerSettingsManager,
		})
		expect(mockSingleCompletionHandler).toHaveBeenCalledWith(helperConfig, "Suggest the next search query")
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleCompletionResult",
			completionRequestId: "req-1",
			completionText: "helper result",
			success: true,
		})
	})

	it("keeps the primary model when the router falls back to primary", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "search_assist",
			config: primaryConfig as any,
			source: "primary",
			provider: "anthropic",
			modelId: primaryConfig.apiModelId,
		})
		mockSingleCompletionHandler.mockResolvedValue("primary result")

		await webviewMessageHandler(mockClineProvider, {
			type: "singleCompletion",
			text: "Complete from the main model",
			completionRequestId: "req-2",
		} as any)

		expect(mockSingleCompletionHandler).toHaveBeenCalledWith(primaryConfig, "Complete from the main model")
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleCompletionResult",
			completionRequestId: "req-2",
			completionText: "primary result",
			success: true,
		})
	})

	it("falls back to the primary model when helper routing throws", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockRejectedValue(new Error("helper offline"))
		mockSingleCompletionHandler.mockResolvedValue("primary after fallback")

		await webviewMessageHandler(mockClineProvider, {
			type: "singleCompletion",
			text: "Fallback search assist",
			completionRequestId: "req-3",
		} as any)

		expect(mockSingleCompletionHandler).toHaveBeenCalledWith(primaryConfig, "Fallback search assist")
		expect(mockClineProvider.log).toHaveBeenCalledWith(
			expect.stringContaining("Helper routing failed for search_assist; using primary model:"),
		)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleCompletionResult",
			completionRequestId: "req-3",
			completionText: "primary after fallback",
			success: true,
		})
	})
})
