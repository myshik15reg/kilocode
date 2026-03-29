import { describe, expect, it, vi } from "vitest"
import { AgentManagerRelayOrchestrator } from "../AgentManagerRelayOrchestrator"
import type { AgentSession } from "../types"
import type { HistoryItem } from "@roo-code/types"

function createSession(overrides: Partial<AgentSession> = {}): AgentSession {
	return {
		sessionId: "session-1",
		label: "Planner",
		status: "running",
		prompt: "repair task",
		sessionGroup: { groupId: "group-1", rootSessionId: "root-1" },
		...overrides,
	} as AgentSession
}

function createHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
	return {
		id: "session-1",
		number: 1,
		ts: 123,
		task: "repair task",
		tokensIn: 0,
		tokensOut: 0,
		totalCost: 0,
		status: "aborted",
		restartCount: 2,
		lastStopReason: "loop_detected",
		lastStopSummary: "Branch repeated the same broken patch.",
		...overrides,
	} as HistoryItem
}

function createOrchestrator(options?: {
	historyItem?: HistoryItem | undefined
	queuePressure?: number
	backpressure?: boolean
	apiConversationHistory?: unknown[]
	buildProviderRecoveryPacket?: ReturnType<typeof vi.fn>
}) {
	const deps = {
		getQueueKey: vi.fn(({ sessionGroup, sessionId }) => sessionGroup?.groupId || sessionId || "root:default"),
		getQueuePressure: vi.fn(() => options?.queuePressure ?? 0),
		getSchedulerState: vi.fn(() => ({ backpressure: options?.backpressure ?? false })),
		getSessionHistoryItem: vi.fn(() => options?.historyItem),
		getResumeSessionApiConversationHistory: vi.fn(() => options?.apiConversationHistory),
		buildProviderRecoveryPacket:
			options?.buildProviderRecoveryPacket ??
			vi.fn().mockResolvedValue({
				summary: "Pressure compact summary",
				handoff: "<restart_handoff> Verbose full handoff </restart_handoff>",
				recoveryMode: "pressure",
				stopReason: "loop_detected",
				restartAttempt: 3,
			}),
		getNow: vi.fn(() => 777),
	}

	return {
		deps,
		orchestrator: new AgentManagerRelayOrchestrator(deps),
	}
}

describe("AgentManagerRelayOrchestrator", () => {
	it("centralizes relay compact policy decisions", () => {
		const { orchestrator } = createOrchestrator({ queuePressure: 2 })
		const session = createSession()

		let decision = orchestrator.resolveRelayPolicy(session, { mode: "auto" })
		expect(decision).toEqual(
			expect.objectContaining({
				preferCompact: true,
				queueKey: "group-1",
				pressure: 2,
				backpressure: false,
			}),
		)

		decision = orchestrator.resolveRelayPolicy(session, { mode: "manual" })
		expect(decision.preferCompact).toBe(false)

		decision = orchestrator.resolveRelayPolicy(session, { compact: true, mode: "manual" })
		expect(decision.preferCompact).toBe(true)
	})

	it("reuses provider recovery packet for compact restart instructions", async () => {
		const buildProviderRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Cached branch summary",
			handoff:
				"Restart branch from latest valid state in compact recovery mode. Previous stop reason: loop_detected. Previous summary: Cached branch summary Use a short handoff, avoid replaying the whole branch, and continue with the minimal required context.",
			recoveryMode: "standard",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		const { orchestrator, deps } = createOrchestrator({
			historyItem: createHistoryItem(),
			buildProviderRecoveryPacket,
			apiConversationHistory: [{ role: "assistant", content: "cached" }],
		})

		const instruction = await orchestrator.buildRestartInstruction(createSession(), { compact: true })

		expect(buildProviderRecoveryPacket).toHaveBeenCalledWith(
			expect.objectContaining({
				historyItem: expect.objectContaining({
					id: "session-1",
					lastStopReason: "loop_detected",
				}),
				apiConversationHistory: [{ role: "assistant", content: "cached" }],
			}),
		)
		expect(instruction.prompt).toContain("Cached branch summary")
		expect(instruction.queueKey).toBe("group-1")
		expect(deps.getSessionHistoryItem).toHaveBeenCalledWith("session-1")
	})

	it("reuses cached relay content across repeated group broadcasts", async () => {
		const buildProviderRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Pressure compact summary",
			handoff: "<restart_handoff> Verbose full handoff </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		const { orchestrator } = createOrchestrator({
			historyItem: createHistoryItem({ lastStopSummary: "Verbose stop summary." }),
			queuePressure: 2,
			buildProviderRecoveryPacket,
		})
		const session = createSession({ label: "Leader" })

		const first = await orchestrator.composeGroupRelayMessage(session, {
			content: "Branch handoff from Leader: Verbose full handoff",
			includeSender: false,
		})
		const second = await orchestrator.composeGroupRelayMessage(session, {
			content: "Branch handoff from Leader: Verbose full handoff",
			includeSender: false,
		})

		expect(buildProviderRecoveryPacket).toHaveBeenCalledTimes(1)
		expect(first.formattedMessage).toContain("Pressure compact summary")
		expect(first.formattedMessage).toContain("compact: yes")
		expect(second.formattedMessage).toBe(first.formattedMessage)
	})

	it("preserves custom group relay content when it is not a recovery handoff", async () => {
		const buildProviderRecoveryPacket = vi.fn()
		const { orchestrator } = createOrchestrator({ buildProviderRecoveryPacket })

		const relay = await orchestrator.composeGroupRelayMessage(createSession({ label: "Leader" }), {
			content: "Coordinate on parser branch only",
			includeSender: false,
		})

		expect(buildProviderRecoveryPacket).not.toHaveBeenCalled()
		expect(relay.formattedMessage).toContain("Coordinate on parser branch only")
		expect(relay.formattedMessage).toContain("compact: no")
	})

	it("composes compact root relay messages with root metadata", async () => {
		const buildProviderRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Return only delta summary",
			handoff: "<restart_handoff> Return only delta summary </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		const { orchestrator } = createOrchestrator({
			historyItem: createHistoryItem(),
			buildProviderRecoveryPacket,
			queuePressure: 2,
		})
		const relay = await orchestrator.composeRootRelayMessage(
			createSession({ rootTaskId: "root-task-1", taskId: "root-task-1" }),
			{
				content: undefined,
				includeSender: false,
				compact: true,
			},
		)

		expect(relay.message).toMatchObject({
			rootTaskId: "root-task-1",
			content: "Branch handoff from Planner: Return only delta summary",
		})
		expect(relay.formattedMessage).toContain("<root_handoff>")
		expect(relay.formattedMessage).toContain("root_task_id: root-task-1")
	})
})
