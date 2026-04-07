// kilocode_change - new file
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../api/providers/fetchers/modelCache", () => ({
	getModels: vi.fn(),
}))

vi.mock("../../helper-routing/HelperModelRouter", () => ({
	HelperModelRouter: {
		selectConfig: vi.fn(),
	},
}))

vi.mock("../../../utils/single-completion-handler", () => ({
	singleCompletionHandler: vi.fn(),
}))

import { getModels } from "../../../api/providers/fetchers/modelCache"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { singleCompletionHandler } from "../../../utils/single-completion-handler"
import { runLocalAiDiagnostics } from "../localAiDiagnostics"

describe("localAiDiagnostics", () => {
	const provider = {
		getState: vi.fn(),
		providerSettingsManager: {
			getProfile: vi.fn(),
		},
		contextProxy: {
			getSecret: vi.fn(),
		},
		log: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		provider.getState.mockResolvedValue({
			apiConfiguration: { apiProvider: "openai", openAiModelId: "gpt-5" },
			listApiConfigMeta: [],
			codebaseIndexConfig: {},
		})
		provider.providerSettingsManager.getProfile.mockImplementation(async ({ id }: { id: string }) => {
			if (id === "ollama-1") {
				return {
					id,
					name: "Ollama helper",
					apiProvider: "ollama",
					ollamaModelId: "qwen2.5-coder",
					ollamaBaseUrl: "http://localhost:11434",
				}
			}
			if (id === "litellm-1") {
				return {
					id,
					name: "LiteLLM",
					apiProvider: "litellm",
					litellmModelId: "qwen-local",
					litellmBaseUrl: "http://localhost:4000",
					litellmApiKey: "secret",
				}
			}
			return undefined
		})
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "search_assist",
			config: { apiProvider: "ollama", ollamaModelId: "qwen2.5-coder", ollamaBaseUrl: "http://localhost:11434" },
			source: "local_profile",
			provider: "ollama",
			modelId: "qwen2.5-coder",
		} as any)
		vi.mocked(singleCompletionHandler).mockResolvedValue("OK")
		vi.mocked(getModels).mockResolvedValue({ "qwen2.5-coder": { maxTokens: 1, contextWindow: 1 } } as any)
	})

	it("returns warnings in cloud-only mode without failing the stack", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "search_assist",
			config: { apiProvider: "openai", openAiModelId: "gpt-5" },
			source: "primary",
			provider: "openai",
			modelId: "gpt-5",
		} as any)

		const result = await runLocalAiDiagnostics(provider as any)

		expect(result.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ checkId: "ollama-service", status: "warning" }),
				expect.objectContaining({ checkId: "litellm-service", status: "warning" }),
				expect.objectContaining({ checkId: "local-helper-discovery", status: "warning" }),
				expect.objectContaining({ checkId: "local-helper-runtime", status: "warning" }),
			]),
		)
	})

	it("distinguishes service, auth/baseUrl, model missing, and runtime smoke failures", async () => {
		provider.getState.mockResolvedValue({
			apiConfiguration: { apiProvider: "openai", openAiModelId: "gpt-5" },
			listApiConfigMeta: [
				{ id: "ollama-1", name: "Ollama helper", apiProvider: "ollama" },
				{ id: "litellm-1", name: "LiteLLM", apiProvider: "litellm" },
			],
			codebaseIndexConfig: {},
		})
		vi.mocked(getModels).mockImplementation(async (options: any) => {
			if (options.provider === "ollama") {
				throw new Error("service unavailable")
			}
			if (options.provider === "litellm") {
				return { other: { maxTokens: 1, contextWindow: 1 } } as any
			}
			return {}
		})
		vi.mocked(singleCompletionHandler).mockRejectedValue(new Error("runtime smoke failure"))

		const result = await runLocalAiDiagnostics(provider as any)

		expect(result.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					checkId: "ollama-service",
					status: "failed",
					message: "Failed to reach Ollama: service unavailable",
				}),
				expect.objectContaining({
					checkId: "litellm-service",
					status: "failed",
					message: "LiteLLM is reachable, but model 'qwen-local' is not exposed by its model list.",
				}),
				expect.objectContaining({
					checkId: "local-helper-runtime",
					status: "failed",
					message: "Helper singleCompletion smoke failed: runtime smoke failure",
				}),
			]),
		)
	})

	it("checks local embedder and reranker when they are configured", async () => {
		provider.getState.mockResolvedValue({
			apiConfiguration: { apiProvider: "openai", openAiModelId: "gpt-5" },
			listApiConfigMeta: [{ id: "ollama-1", name: "Ollama helper", apiProvider: "ollama" }],
			helperLocalityPreference: "require",
			orchestrationEscalationSensitivity: "aggressive",
			orchestrationTelemetryEnabled: true,
			codebaseIndexConfig: {
				codebaseIndexEmbedderProvider: "ollama",
				codebaseIndexEmbedderBaseUrl: "http://localhost:11434",
				codebaseIndexEmbedderModelId: "qwen2.5-coder",
				codebaseIndexRerankEnabled: true,
				codebaseIndexRerankBaseUrl: "http://localhost:8080",
				codebaseIndexRerankModelId: "bge-reranker-v2-m3",
			},
		})
		provider.contextProxy.getSecret.mockReturnValue("rerank-secret")
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ id: "bge-reranker-v2-m3" }] }),
		})
		vi.stubGlobal("fetch", fetchMock)

		const result = await runLocalAiDiagnostics(provider as any)

		expect(result.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ checkId: "local-embedder", status: "ok" }),
				expect.objectContaining({ checkId: "local-reranker", status: "ok" }),
			]),
		)
		expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/v1/models", {
			headers: { Authorization: "Bearer rerank-secret" },
		})
		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith(
			expect.objectContaining({
				state: expect.objectContaining({
					helperLocalityPreference: "require",
					orchestrationEscalationSensitivity: "aggressive",
					orchestrationTelemetryEnabled: true,
				}),
			}),
		)
	})
})
