import { describe, expect, it, vi } from "vitest"

import { AgentManagerBridge } from "./AgentManagerBridge"

describe("AgentManagerBridge", () => {
	it("normalizes launch requests and forwards them to the agent manager", async () => {
		const onStatus = vi.fn()
		const onResult = vi.fn()
		const provider = {
			onBackgroundSubagentStatus: vi.fn((listener) => {
				onStatus.mockImplementation(listener)
			}),
			onBackgroundSubagentResult: vi.fn((listener) => {
				onResult.mockImplementation(listener)
			}),
			hasBackgroundSubagentCapacity: vi.fn().mockReturnValue(true),
			startBackgroundSubagent: vi
				.fn()
				.mockResolvedValue({ taskId: "child-1", sessionId: "sess-1", status: "queued" }),
			cancelSession: vi.fn().mockResolvedValue(undefined),
			pauseSession: vi.fn().mockResolvedValue(undefined),
			resumeBackgroundSubagent: vi.fn().mockResolvedValue(undefined),
			listBackgroundSubagentBindings: vi.fn().mockReturnValue([]),
		} as any

		const bridge = new AgentManagerBridge(provider)
		const request = {
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			execution: "foreground",
			isolation: "auto",
			relayPolicy: "parent_only",
			handoff: {
				summary: "Research",
				goal: "Validate sources",
				budget: { maxSteps: 3 },
				canAbstain: true,
				strategy: "sequential",
			},
		} as const

		expect(bridge.hasCapacity(request)).toBe(true)
		await expect(bridge.launch(request)).resolves.toEqual({
			taskId: "child-1",
			sessionId: "sess-1",
			status: "queued",
		})

		expect(provider.hasBackgroundSubagentCapacity).toHaveBeenCalledWith(
			expect.objectContaining({
				execution: "foreground",
				isolation: "auto",
				relayPolicy: "parent_only",
				handoff: expect.objectContaining({ strategy: "sequential", canAbstain: true }),
			}),
		)
		expect(provider.startBackgroundSubagent).toHaveBeenCalledWith(
			expect.objectContaining({
				execution: "foreground",
				isolation: "auto",
				relayPolicy: "parent_only",
			}),
		)
	})

	it("surfaces abstained bindings and relays status and result events", () => {
		let statusListener: ((event: any) => void) | undefined
		let resultListener: ((event: any) => void) | undefined
		const provider = {
			onBackgroundSubagentStatus: vi.fn((listener) => {
				statusListener = listener
			}),
			onBackgroundSubagentResult: vi.fn((listener) => {
				resultListener = listener
			}),
			hasBackgroundSubagentCapacity: vi.fn(),
			startBackgroundSubagent: vi.fn(),
			cancelSession: vi.fn(),
			pauseSession: vi.fn(),
			resumeBackgroundSubagent: vi.fn(),
			listBackgroundSubagentBindings: vi.fn().mockReturnValue([
				{
					request: {
						parentTaskId: "parent-1",
						rootTaskId: "root-1",
						mode: "code",
						handoff: { summary: "Research" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					taskId: "child-1",
					sessionId: "sess-1",
					status: "abstained",
					updatedAt: 42,
				},
			]),
		} as any

		const bridge = new AgentManagerBridge(provider)
		const onStatus = vi.fn()
		const onResult = vi.fn()
		bridge.onStatus(onStatus)
		bridge.onResult(onResult)

		expect(bridge.listBindings()).toEqual([
			expect.objectContaining({
				childTaskId: "child-1",
				sessionId: "sess-1",
				status: "abstained",
			}),
		])

		statusListener?.({ taskId: "child-1", sessionId: "sess-1", state: "abstained", timestamp: 1 })
		resultListener?.({ taskId: "child-1", sessionId: "sess-1", status: "failed", output: "", timestamp: 2 })

		expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ taskId: "child-1", state: "abstained" }))
		expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ taskId: "child-1", status: "failed" }))
	})
	it("keeps short completion summaries unchanged", () => {
		const summary = AgentManagerBridge.summarizeCompletion([
			{ type: "say", say: "completion_result", text: "Implemented the requested fix.", ts: 1 } as any,
		])

		expect(summary).toBe("Implemented the requested fix.")
	})

	it("compacts long completion summaries for parent-facing paths", () => {
		const longSummary = [
			"Completed implementation and verification.",
			"Files changed:",
			"- src/core/orchestration/subagents/SubagentResumeService.ts",
			"- src/core/orchestration/bridge/AgentManagerBridge.ts",
			"",
			"A".repeat(1_600),
			"",
			"Evidence: src/core/orchestration/subagents/SubagentResumeService.ts:57",
		].join("\n")

		const summary = AgentManagerBridge.summarizeCompletion([
			{ type: "say", say: "completion_result", text: longSummary, ts: 1 } as any,
		])

		expect(summary.length).toBeLessThan(longSummary.length)
		expect(summary).toContain("[NOTE] Child completion summary truncated for parent context.")
		expect(summary).toContain("Completed implementation and verification.")
		expect(summary).toContain("Evidence: src/core/orchestration/subagents/SubagentResumeService.ts:57")
	})
})
