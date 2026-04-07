import { describe, expect, it, vi } from "vitest"

import { RuntimeProcessHandler } from "../RuntimeProcessHandler"

describe("RuntimeProcessHandler", () => {
	it("builds agent config with guardrails and disables auto-approve in shadow mode", () => {
		const handler = new RuntimeProcessHandler(
			{} as any,
			{
				onLog: vi.fn(),
				onSessionLog: vi.fn(),
				onStateChanged: vi.fn(),
				onPendingSessionChanged: vi.fn(),
				onStartSessionFailed: vi.fn(),
				onChatMessages: vi.fn(),
				onSessionCreated: vi.fn(),
			},
			"/extension",
			"/vscode",
		)

		const config = (handler as any).buildAgentConfig("/workspace", "Prompt", {
			mode: "code",
			sessionId: "session-1",
			guardrails: {
				shadowMode: true,
				verificationMode: "strict",
				stepStatus: "verifying",
				budget: {
					maxSteps: 5,
					maxTotalCostUsd: 1,
				},
			},
		})

		expect(config.guardrails).toEqual({
			shadowMode: true,
			verificationMode: "strict",
			stepStatus: "verifying",
			budget: {
				maxSteps: 5,
				maxTotalCostUsd: 1,
			},
		})
		expect(config.autoApprove).toBe(false)
		expect(config.vscodeAppRoot).toBe("/vscode")
	})
})
