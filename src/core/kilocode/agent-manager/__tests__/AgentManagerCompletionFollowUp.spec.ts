import { describe, it, expect, vi, beforeEach } from "vitest"
import * as telemetry from "../telemetry"
import { AgentManagerCompletionFollowUp } from "../AgentManagerCompletionFollowUp"

vi.mock("../telemetry", () => ({
	captureAgentManagerSessionCompleted: vi.fn(),
	captureAgentManagerSessionError: vi.fn(),
	captureAgentManagerSessionStopped: vi.fn(),
}))

describe("AgentManagerCompletionFollowUp", () => {
	let deps: any
	let followUp: AgentManagerCompletionFollowUp
	let queueKeyPressure: Map<string, number>

	beforeEach(() => {
		vi.clearAllMocks()
		queueKeyPressure = new Map<string, number>()
		deps = {
			queueKeyPressure,
			maxConcurrentPerQueueKey: vi.fn(() => 1),
			getQueueKey: vi.fn(({ sessionGroup, sessionId }) => sessionGroup?.groupId || sessionId || "root:default"),
			updateSessionStatus: vi.fn(),
			updateSession: vi.fn(),
			log: vi.fn(),
			publishSessionGroupEvent: vi.fn(),
			postStateEvent: vi.fn(),
			fetchAndPostRemoteSessions: vi.fn().mockResolvedValue(undefined),
			postStateToWebview: vi.fn(),
			drainQueuedSessionLaunches: vi.fn().mockResolvedValue(undefined),
			postStartSessionFailed: vi.fn(),
			showPaymentRequiredPrompt: vi.fn(),
			handleStartSessionApiFailure: vi.fn(),
			showAgentError: vi.fn(),
		}
		followUp = new AgentManagerCompletionFollowUp(deps)
	})

	it("posts completion state and telemetry only for successful completion", () => {
		const session = {
			sessionId: "session-success",
			status: "running",
			parallelMode: { enabled: true },
			sessionGroup: { groupId: "group-1", rootSessionId: "root-1" },
		} as any
		queueKeyPressure.set("group-1", 2)

		followUp.handleSessionComplete({
			sessionId: "session-success",
			session,
			exitCode: 0,
		})

		expect(deps.updateSessionStatus).toHaveBeenCalledWith("session-success", "done", 0)
		expect(deps.updateSession).toHaveBeenCalledWith(
			"session-success",
			expect.objectContaining({
				lifecycleStatus: "completed",
				activityState: "idle",
				needsAttention: false,
				recoveryState: undefined,
				pendingReaction: undefined,
			}),
		)
		expect(queueKeyPressure.get("group-1") ?? 0).toBe(1)
		expect(deps.publishSessionGroupEvent).toHaveBeenCalledWith(
			session,
			"session-success",
			"completed",
			"Agent completed",
		)
		expect(deps.fetchAndPostRemoteSessions).toHaveBeenCalledTimes(1)
		expect(deps.postStateEvent).toHaveBeenCalledWith("session-success", { eventType: "ask_completion_result" })
		expect(telemetry.captureAgentManagerSessionCompleted).toHaveBeenCalledWith("session-success", true)
		expect(telemetry.captureAgentManagerSessionError).not.toHaveBeenCalled()
	})

	it("temporarily saturates repeatedly problematic groups", () => {
		queueKeyPressure.set("group-1", 2)

		expect(followUp.getEffectiveQueueKeyCap("group-1")).toBe(0)
	})

	it("records failed completion without posting completion state event", () => {
		const session = {
			sessionId: "session-failed",
			status: "running",
			parallelMode: { enabled: false },
			sessionGroup: { groupId: "group-2", rootSessionId: "root-2" },
		} as any

		followUp.handleSessionComplete({
			sessionId: "session-failed",
			session,
			exitCode: 7,
		})

		expect(deps.updateSessionStatus).toHaveBeenCalledWith("session-failed", "error", 7)
		expect(deps.publishSessionGroupEvent).toHaveBeenCalledWith(session, "session-failed", "error", "Exit code 7")
		expect(deps.postStateEvent).not.toHaveBeenCalled()
		expect(telemetry.captureAgentManagerSessionCompleted).not.toHaveBeenCalled()
		expect(telemetry.captureAgentManagerSessionError).toHaveBeenCalledWith("session-failed", false, "Exit code 7")
	})

	it("schedules queue draining after runtime state changes and start failures", () => {
		followUp.handleRuntimeStateChanged()
		followUp.handleStartSessionFailed({
			type: "payment_required",
			message: "Need credits",
			payload: { text: "Need credits" },
		})

		expect(deps.postStateToWebview).toHaveBeenCalledTimes(1)
		expect(deps.postStartSessionFailed).toHaveBeenCalledTimes(1)
		expect(deps.showPaymentRequiredPrompt).toHaveBeenCalledWith({ text: "Need credits" })
		expect(deps.drainQueuedSessionLaunches).toHaveBeenCalledTimes(2)
	})
})
