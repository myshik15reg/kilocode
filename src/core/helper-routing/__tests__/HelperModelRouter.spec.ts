import { HelperModelRouter } from "../HelperModelRouter"

vi.mock("../../../api/providers/fetchers/modelCache", () => ({
	getModels: vi.fn(),
}))

import { getModels } from "../../../api/providers/fetchers/modelCache"

describe("HelperModelRouter", () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it("prefers available local primary config", async () => {
		vi.mocked(getModels).mockResolvedValue({ "qwen2.5": {} } as any)

		const route = await HelperModelRouter.selectConfig({
			job: "condense",
			state: {
				apiConfiguration: {
					apiProvider: "ollama",
					ollamaModelId: "qwen2.5",
				},
				listApiConfigMeta: [],
			},
			providerSettingsManager: { getProfile: vi.fn() } as any,
		})

		expect(route.source).toBe("primary_local")
		expect(route.provider).toBe("ollama")
	})

	it("falls back to configured local profile when primary is remote", async () => {
		vi.mocked(getModels).mockResolvedValue({ mistral: {} } as any)
		const getProfile = vi.fn().mockResolvedValue({ apiProvider: "lmstudio", lmStudioModelId: "mistral" })

		const route = await HelperModelRouter.selectConfig({
			job: "search_assist",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				enhancementApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Local helper" }],
			},
			providerSettingsManager: { getProfile } as any,
		})

		expect(route.source).toBe("local_profile")
		expect(route.provider).toBe("lmstudio")
	})

	it("uses the enhancement helper slot for search_assist instead of condense routing", async () => {
		const enhancementProfile = { apiProvider: "openai", openAiModelId: "gpt-4.1-mini" }
		const getProfile = vi.fn().mockImplementation(async ({ id }: { id: string }) => {
			if (id === "enhance-1") {
				return enhancementProfile
			}

			if (id === "condense-1") {
				return { apiProvider: "openai", openAiModelId: "gpt-4.1-nano" }
			}

			return undefined
		})

		const route = await HelperModelRouter.selectConfig({
			job: "search_assist",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				enhancementApiConfigId: "enhance-1",
				condensingApiConfigId: "condense-1",
				listApiConfigMeta: [
					{ id: "enhance-1", name: "Enhance helper" },
					{ id: "condense-1", name: "Condense helper" },
				],
			},
			providerSettingsManager: { getProfile } as any,
		})

		expect(route.source).toBe("configured_helper")
		expect(route.config).toEqual(enhancementProfile)
		expect(getProfile).toHaveBeenCalledWith({ id: "enhance-1" })
	})

	it("uses configured helper when no local helper is available", async () => {
		const getProfile = vi.fn().mockResolvedValue({ apiProvider: "openai", openAiModelId: "gpt-4.1-mini" })

		const route = await HelperModelRouter.selectConfig({
			job: "summarize_branch",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				condensingApiConfigId: "helper-remote",
				listApiConfigMeta: [{ id: "helper-remote", name: "Remote helper" }],
			},
			providerSettingsManager: { getProfile } as any,
		})

		expect(route.source).toBe("configured_helper")
		expect(route.provider).toBe("openai")
	})

	it("falls back to primary when local helper is unavailable", async () => {
		vi.mocked(getModels).mockImplementation(async (options: any) => {
			if (options.provider === "ollama") {
				throw new Error("offline")
			}
			return {}
		})
		const getProfile = vi.fn().mockResolvedValue({ apiProvider: "ollama", ollamaModelId: "qwen2.5" })

		const route = await HelperModelRouter.selectConfig({
			job: "relay_compact",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				condensingApiConfigId: "helper-1",
				listApiConfigMeta: [{ id: "helper-1", name: "Local helper" }],
			},
			providerSettingsManager: { getProfile } as any,
		})

		expect(["configured_helper", "primary", "local_profile"]).toContain(route.source)
		expect(["ollama", "anthropic"]).toContain(route.provider)
	})

	it("falls back to primary when configured helper profile is missing", async () => {
		const route = await HelperModelRouter.selectConfig({
			job: "tech_debt_extract",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				condensingApiConfigId: "missing-helper",
				listApiConfigMeta: [{ id: "missing-helper", name: "Missing helper" }],
			},
			providerSettingsManager: { getProfile: vi.fn().mockResolvedValue(undefined) } as any,
		})

		expect(route.source).toBe("primary")
		expect(route.provider).toBe("anthropic")
	})
})
