import { describe, expect, it, vi } from "vitest"

import { HelperRoutingContextBuilder } from "../HelperRoutingContextBuilder"

describe("HelperRoutingContextBuilder", () => {
	it("builds a shared helper routing payload with normalized metrics", () => {
		const route = HelperRoutingContextBuilder.build({
			job: "condense",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" } as any,
				condensingApiConfigId: "condense-1",
				listApiConfigMeta: [{ id: "condense-1", name: "Cheap helper" }],
				helperLocalityPreference: "prefer",
				orchestrationEscalationSensitivity: "balanced",
				orchestrationTelemetryEnabled: true,
			},
			providerSettingsManager: { getProfile: vi.fn() } as any,
			decisionContext: {
				taskId: "task-1",
				contextWindowSize: 8192,
				retrievalConfidence: 0.42,
				retryCount: 2,
				toolDenialCount: 1,
			},
		})

		expect(route).toEqual({
			job: "condense",
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
				condensingApiConfigId: "condense-1",
				listApiConfigMeta: [{ id: "condense-1", name: "Cheap helper" }],
				helperLocalityPreference: "prefer",
				orchestrationEscalationSensitivity: "balanced",
				orchestrationTelemetryEnabled: true,
			},
			providerSettingsManager: expect.any(Object),
			decisionContext: {
				taskId: "task-1",
				contextWindowSize: 8192,
				retrievalConfidence: 0.42,
				retryCount: 2,
				toolDenialCount: 1,
			},
		})
	})

	it("omits empty decision context fields", () => {
		const route = HelperRoutingContextBuilder.build({
			job: "search_assist",
			state: {
				apiConfiguration: { apiProvider: "openai", openAiModelId: "gpt-4.1-mini" } as any,
			},
			providerSettingsManager: { getProfile: vi.fn() } as any,
			decisionContext: {},
		})

		expect(route).not.toHaveProperty("decisionContext")
	})
})
