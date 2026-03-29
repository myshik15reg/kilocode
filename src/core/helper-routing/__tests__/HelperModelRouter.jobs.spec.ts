// kilocode_change - new file
vi.mock("../../../api/providers/fetchers/modelCache", () => ({
	getModels: vi.fn(),
}))

import { HelperModelRouter } from "../HelperModelRouter"

describe("HelperModelRouter planned jobs", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		;(HelperModelRouter as any).localAvailabilityCache.clear()
	})

	it("falls back to the primary config for condense when no helper profile is available", async () => {
		const route = await HelperModelRouter.selectConfig({
			job: "condense",
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

	it("falls back to the primary config for search_assist when no helper route is configured", async () => {
		const route = await HelperModelRouter.selectConfig({
			job: "search_assist",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				listApiConfigMeta: [],
			},
			providerSettingsManager: { getProfile: vi.fn() } as any,
		})

		expect(route.source).toBe("primary")
		expect(route.provider).toBe("anthropic")
	})
})
