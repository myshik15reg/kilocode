import { describe, it, expect, vi, beforeEach } from "vitest"

import { AgentManagerBridge } from "../AgentManagerBridge"

describe("AgentManagerBridge", () => {
	let agentManager: {
		hasBackgroundSubagentCapacity: ReturnType<typeof vi.fn>
		startBackgroundSubagent: ReturnType<typeof vi.fn>
		onBackgroundSubagentStatus: ReturnType<typeof vi.fn>
		onBackgroundSubagentResult: ReturnType<typeof vi.fn>
		cancelSession: ReturnType<typeof vi.fn>
		pauseSession: ReturnType<typeof vi.fn>
		resumeBackgroundSubagent: ReturnType<typeof vi.fn>
		listBackgroundSubagentBindings: ReturnType<typeof vi.fn>
		sendMessage: ReturnType<typeof vi.fn>
		releaseBackgroundSubagentBinding: ReturnType<typeof vi.fn>
	}

	beforeEach(() => {
		agentManager = {
			hasBackgroundSubagentCapacity: vi.fn().mockReturnValue(true),
			startBackgroundSubagent: vi
				.fn()
				.mockResolvedValue({ taskId: "parent-1", sessionId: "parent-1", status: "running" }),
			onBackgroundSubagentStatus: vi.fn(),
			onBackgroundSubagentResult: vi.fn(),
			cancelSession: vi.fn().mockResolvedValue(undefined),
			pauseSession: vi.fn().mockResolvedValue(undefined),
			resumeBackgroundSubagent: vi.fn().mockResolvedValue(undefined),
			listBackgroundSubagentBindings: vi.fn().mockReturnValue([]),
			sendMessage: vi.fn().mockResolvedValue(undefined),
			releaseBackgroundSubagentBinding: vi.fn().mockResolvedValue(undefined),
		}
	})

	it("normalizes legacy requests before checking capacity", () => {
		const bridge = new AgentManagerBridge(agentManager as any)

		const hasCapacity = bridge.hasCapacity({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			handoff: { summary: "Do work" },
		} as any)

		expect(hasCapacity).toBe(true)
		expect(agentManager.hasBackgroundSubagentCapacity).toHaveBeenCalledWith({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			handoff: { summary: "Do work" },
			execution: "foreground",
			isolation: "auto",
			relayPolicy: "parent_only",
		})
	})

	it("normalizes legacy requests before launching background subagents", async () => {
		const bridge = new AgentManagerBridge(agentManager as any)

		const result = await bridge.launch({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			handoff: { summary: "Do work" },
		} as any)

		expect(agentManager.startBackgroundSubagent).toHaveBeenCalledWith({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			handoff: { summary: "Do work" },
			execution: "foreground",
			isolation: "auto",
			relayPolicy: "parent_only",
		})
		expect(result).toEqual({ taskId: "parent-1", sessionId: "parent-1", status: "running" })
	})

	it("maps abstained background bindings in listBindings", () => {
		agentManager.listBackgroundSubagentBindings.mockReturnValue([
			{
				request: {
					parentTaskId: "parent-1",
					rootTaskId: "root-1",
					mode: "code",
					handoff: { summary: "Research" },
				},
				taskId: "child-1",
				sessionId: "session-1",
				status: "abstained",
				updatedAt: 123,
			},
		])
		const bridge = new AgentManagerBridge(agentManager as any)

		expect(bridge.listBindings()).toEqual([
			{
				request: {
					parentTaskId: "parent-1",
					rootTaskId: "root-1",
					mode: "code",
					handoff: { summary: "Research" },
				},
				parentTaskId: "parent-1",
				childTaskId: "child-1",
				sessionId: "session-1",
				status: "abstained",
				updatedAt: 123,
			},
		])
	})

	it("releases background bindings through the agent manager", async () => {
		const bridge = new AgentManagerBridge(agentManager as any)

		await bridge.release("session-1")

		expect(agentManager.releaseBackgroundSubagentBinding).toHaveBeenCalledWith("session-1")
	})

	it("formats relay envelopes and sends them to each recipient", async () => {
		const bridge = new AgentManagerBridge(agentManager as any)

		await bridge.relay({
			envelope: {
				kind: "parent",
				fromTaskId: "child-1",
				rootTaskId: "root-1",
				toTaskId: "parent-1",
				content: "Need fresh verification",
				requiresParentVisibility: true,
				timestamp: 456,
				metadata: { reason: "insufficient_context" },
			},
			recipientTaskIds: ["parent-1", "observer-1"],
		})

		expect(agentManager.sendMessage).toHaveBeenCalledTimes(2)
		expect(agentManager.sendMessage).toHaveBeenNthCalledWith(1, "parent-1", expect.stringContaining("<task_relay>"))
		expect(agentManager.sendMessage).toHaveBeenNthCalledWith(
			2,
			"observer-1",
			expect.stringContaining("reason: insufficient_context"),
		)
	})
})
