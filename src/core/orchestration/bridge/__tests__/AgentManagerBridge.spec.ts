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
})
