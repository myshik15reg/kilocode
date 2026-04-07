// @ts-nocheck
// kilocode_change - new file
import { describe, expect, it } from "vitest"

import { buildInitialExtensionState } from "../process.js"

describe("agent process state bootstrap", () => {
	it("injects guardrails and keeps auto-approve disabled in shadow mode", () => {
		const state = buildInitialExtensionState({
			providerSettings: { apiProvider: "anthropic", apiKey: "test-key" } as any,
			mode: "code",
			autoApprove: true,
			guardrails: {
				shadowMode: true,
				verificationMode: "strict",
				stepStatus: "verifying",
				budget: { maxSteps: 4, maxInputTokens: 2000, maxOutputTokens: 1000 },
			},
		})

		expect(state.agentGuardrails).toEqual({
			shadowMode: true,
			verificationMode: "strict",
			stepStatus: "verifying",
			budget: { maxSteps: 4, maxInputTokens: 2000, maxOutputTokens: 1000 },
		})
		expect(state.autoApprovalEnabled).toBe(false)
		expect(state.allowedCommands).toBeUndefined()
	})

	it("enables blanket approvals only when shadow mode is off", () => {
		const state = buildInitialExtensionState({
			providerSettings: { apiProvider: "anthropic", apiKey: "test-key" } as any,
			mode: "debug",
			autoApprove: true,
		})

		expect(state.mode).toBe("debug")
		expect(state.autoApprovalEnabled).toBe(true)
		expect(state.alwaysAllowReadOnly).toBe(true)
		expect(state.alwaysAllowExecute).toBe(true)
		expect(state.allowedCommands).toEqual(["*"])
	})
})
