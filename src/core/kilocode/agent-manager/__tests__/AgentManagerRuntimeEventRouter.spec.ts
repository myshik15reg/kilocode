import { describe, expect, it, vi } from "vitest"
import { AgentRegistry } from "../AgentRegistry"
import { AgentManagerRuntimeEventRouter } from "../AgentManagerRuntimeEventRouter"
import { buildParallelModeWorktreePath } from "../parallelModeParser"
import type { StreamEvent } from "../CliOutputParser"

function createHarness() {
	const registry = new AgentRegistry()
	const deps = {
		processStartTimes: new Map<string, number>(),
		registry,
		log: vi.fn<(message: string) => void>(),
		logSession: vi.fn<(sessionId: string, line: string) => void>(),
		postStateToWebview: vi.fn<() => void>(),
		handleKilocodeEvent:
			vi.fn<(sessionId: string, event: Extract<StreamEvent, { streamEventType: "kilocode" }>) => void>(),
		handleSessionError: vi.fn(),
		handleSessionComplete: vi.fn(),
		handleSessionInterrupted: vi.fn(),
	}
	const router = new AgentManagerRuntimeEventRouter(deps)

	return { router, registry, deps }
}

describe("AgentManagerRuntimeEventRouter", () => {
	it("filters replayed kilocode events before delegating", () => {
		const { router, registry, deps } = createHarness()
		const sessionId = "session-replay"
		registry.createSession(sessionId, "prompt")
		deps.processStartTimes.set(sessionId, 2_000)

		router.handleEvent(sessionId, {
			streamEventType: "kilocode",
			payload: { say: "api_req_started", timestamp: 1_500 },
		})

		expect(deps.handleKilocodeEvent).not.toHaveBeenCalled()
		expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("Filtering replayed event: api_req_started"))
	})

	it("delegates non-replayed kilocode events to the kilocode processor seam", () => {
		const { router, registry, deps } = createHarness()
		const sessionId = "session-live"
		registry.createSession(sessionId, "prompt")
		deps.processStartTimes.set(sessionId, 2_000)
		const event: Extract<StreamEvent, { streamEventType: "kilocode" }> = {
			streamEventType: "kilocode",
			payload: { say: "api_req_started", timestamp: 2_100 },
		}

		router.handleEvent(sessionId, event)

		expect(deps.handleKilocodeEvent).toHaveBeenCalledWith(sessionId, event)
		expect(deps.log).not.toHaveBeenCalled()
	})

	it("parses parallel-mode status and output side-channel metadata", () => {
		const { router, registry, deps } = createHarness()
		const sessionId = "session-parallel"
		registry.createSession(sessionId, "prompt")

		router.handleEvent(sessionId, {
			streamEventType: "status",
			message: "Creating worktree with branch: feature/runtime-router",
			timestamp: new Date().toISOString(),
		})
		router.handleEvent(sessionId, {
			streamEventType: "status",
			message: "Created worktree at: /tmp/runtime-router-worktree",
			timestamp: new Date().toISOString(),
		})
		router.handleEvent(sessionId, {
			streamEventType: "output",
			content: "✓ Parallel mode complete! Changes committed to: feature/runtime-router",
			source: "stdout",
			timestamp: new Date().toISOString(),
		})

		expect(registry.getSession(sessionId)?.parallelMode).toMatchObject({
			enabled: true,
			branch: "feature/runtime-router",
			worktreePath: "/tmp/runtime-router-worktree",
			completionMessage: "✓ Parallel mode complete! Changes committed to: feature/runtime-router",
		})
		expect(deps.logSession).toHaveBeenNthCalledWith(
			1,
			sessionId,
			"Creating worktree with branch: feature/runtime-router",
		)
		expect(deps.logSession).toHaveBeenNthCalledWith(
			2,
			sessionId,
			"Created worktree at: /tmp/runtime-router-worktree",
		)
		expect(deps.logSession).toHaveBeenNthCalledWith(
			3,
			sessionId,
			"[stdout] ✓ Parallel mode complete! Changes committed to: feature/runtime-router",
		)
		expect(deps.postStateToWebview).toHaveBeenCalledTimes(3)
	})

	it("applies welcome metadata and derives a worktree path when only branch is present", () => {
		const { router, registry, deps } = createHarness()
		const sessionId = "session-welcome"
		registry.createSession(sessionId, "prompt")

		router.handleEvent(sessionId, {
			streamEventType: "welcome",
			worktreeBranch: "feature/welcome",
			timestamp: 1,
		})

		expect(registry.getSession(sessionId)?.parallelMode).toMatchObject({
			enabled: true,
			branch: "feature/welcome",
			worktreePath: buildParallelModeWorktreePath("feature/welcome"),
		})
		expect(deps.log).toHaveBeenCalledWith(
			expect.stringContaining("Session session-welcome worktree branch: feature/welcome"),
		)
		expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("Session session-welcome derived worktree path:"))
		expect(deps.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("delegates terminal lifecycle events with the current session snapshot", () => {
		const { router, registry, deps } = createHarness()
		const sessionId = "session-terminal"
		registry.createSession(sessionId, "prompt")
		const session = registry.getSession(sessionId)
		const errorEvent: Extract<StreamEvent, { streamEventType: "error" }> = {
			streamEventType: "error",
			error: "boom",
			timestamp: new Date().toISOString(),
		}
		const completeEvent: Extract<StreamEvent, { streamEventType: "complete" }> = {
			streamEventType: "complete",
			exitCode: 0,
		}
		const interruptedEvent: Extract<StreamEvent, { streamEventType: "interrupted" }> = {
			streamEventType: "interrupted",
			reason: "cancelled",
			timestamp: new Date().toISOString(),
		}

		router.handleEvent(sessionId, errorEvent)
		router.handleEvent(sessionId, completeEvent)
		router.handleEvent(sessionId, interruptedEvent)

		expect(deps.handleSessionError).toHaveBeenCalledWith({ sessionId, session, event: errorEvent })
		expect(deps.handleSessionComplete).toHaveBeenCalledWith({ sessionId, session, event: completeEvent })
		expect(deps.handleSessionInterrupted).toHaveBeenCalledWith({ sessionId, session, event: interruptedEvent })
	})

	it("silently ignores unhandled runtime event types", () => {
		const { router, deps } = createHarness()

		expect(() =>
			router.handleEvent("session-ignored", {
				streamEventType: "mode_changed",
				mode: "code",
				previousMode: "ask",
				timestamp: 123,
			}),
		).not.toThrow()

		expect(deps.handleKilocodeEvent).not.toHaveBeenCalled()
		expect(deps.handleSessionError).not.toHaveBeenCalled()
		expect(deps.handleSessionComplete).not.toHaveBeenCalled()
		expect(deps.handleSessionInterrupted).not.toHaveBeenCalled()
		expect(deps.postStateToWebview).not.toHaveBeenCalled()
	})
})
