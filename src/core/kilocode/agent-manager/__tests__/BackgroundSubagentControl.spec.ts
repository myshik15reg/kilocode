import { describe, expect, it, vi } from "vitest"
import { AgentRegistry } from "../AgentRegistry"
import { BackgroundSubagentControl } from "../BackgroundSubagentControl"
import type { HistoryItem, SubagentLaunchRequest } from "@roo-code/types"

function createRequest(overrides: Partial<SubagentLaunchRequest> = {}): SubagentLaunchRequest {
	return {
		parentTaskId: "parent-1",
		rootTaskId: "root-1",
		targetTaskId: "child-1",
		mode: "code",
		handoff: { summary: "Do work" },
		execution: "background",
		isolation: "shared",
		relayPolicy: "parent_only",
		...overrides,
	}
}

function createHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
	return {
		id: "child-1",
		rootTaskId: "root-1",
		parentTaskId: "parent-1",
		number: 1,
		ts: 100,
		task: "background task",
		tokensIn: 0,
		tokensOut: 0,
		totalCost: 0,
		...overrides,
	}
}

function createControl(options?: { historyItem?: HistoryItem | undefined; hasStdin?: boolean; summary?: string }) {
	const registry = new AgentRegistry()
	const persistBindings = vi.fn().mockResolvedValue(undefined)
	const writeToStdin = vi.fn().mockResolvedValue(undefined)
	const stopSession = vi.fn()
	const resumeSession = vi.fn().mockResolvedValue(undefined)
	const updateTaskHistory = vi.fn().mockResolvedValue(undefined)
	const postStateToWebview = vi.fn()
	const log = vi.fn()
	const control = new BackgroundSubagentControl({
		getSession: (sessionId) => registry.getSession(sessionId),
		updateSession: (sessionId, patch) => {
			registry.updateSession(sessionId, patch)
		},
		updateSessionStatus: (sessionId, status, exitCode, error) => {
			registry.updateSessionStatus(sessionId, status, exitCode, error)
		},
		persistBindings,
		hasStdin: vi.fn(() => options?.hasStdin ?? true),
		writeToStdin,
		stopSession,
		resumeSession,
		getSessionHistoryItem: vi.fn(() => options?.historyItem),
		updateTaskHistory,
		summarizeCompletion: vi.fn(() => options?.summary ?? "Completed summary"),
		postStateToWebview,
		log,
		now: () => 999,
	})

	return {
		registry,
		control,
		persistBindings,
		writeToStdin,
		stopSession,
		resumeSession,
		updateTaskHistory,
		postStateToWebview,
		log,
	}
}

describe("BackgroundSubagentControl", () => {
	it("emits completion status and result for successful terminal background sessions", async () => {
		const { registry, control, persistBindings } = createControl({ summary: "Final summary" })
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
		})
		await control.bindSession("child-1", { request: createRequest(), taskId: "child-1" })

		const statusListener = vi.fn()
		const resultListener = vi.fn()
		control.onStatus(statusListener)
		control.onResult(resultListener)

		const outcome = control.handleSessionCompleted("child-1", 0)

		expect(outcome).toEqual({ isSuccess: true, terminalStatus: "completed" })
		expect(registry.getSession("child-1")).toMatchObject({
			lifecycleStatus: "completed",
			activityState: "idle",
			needsAttention: false,
		})
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", state: "completed" }),
		)
		expect(resultListener).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "child-1",
				sessionId: "child-1",
				status: "completed",
				summary: "Final summary",
			}),
		)
		expect(control.bindings.has("child-1")).toBe(false)
		expect(persistBindings).toHaveBeenCalledTimes(2)
	})

	it("cancels non-running background sessions by stopping process and consuming binding", async () => {
		const { registry, control, stopSession, writeToStdin, persistBindings } = createControl({ hasStdin: false })
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
		})
		await control.bindSession("child-1", { request: createRequest(), taskId: "child-1" })

		const statusListener = vi.fn()
		control.onStatus(statusListener)

		await control.cancelSession("child-1")

		expect(stopSession).toHaveBeenCalledWith("child-1")
		expect(writeToStdin).not.toHaveBeenCalled()
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", state: "cancelled" }),
		)
		expect(control.bindings.has("child-1")).toBe(false)
		expect(persistBindings).toHaveBeenCalledTimes(2)
	})

	it("pauses and resumes background sessions with history synchronization and resume handoff", async () => {
		const historyItem = createHistoryItem({
			resumeContextSummary: "Resume from checkpoint",
			lastStopSummary: "Fallback summary",
		})
		const { registry, control, writeToStdin, resumeSession, updateTaskHistory, postStateToWebview } = createControl(
			{
				historyItem,
			},
		)
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			labelOverride: "background task",
		})
		await control.bindSession("child-1", { request: createRequest(), taskId: "child-1" })

		const statusListener = vi.fn()
		control.onStatus(statusListener)

		await control.pauseSession("child-1")
		expect(writeToStdin).toHaveBeenCalledWith(
			"child-1",
			expect.objectContaining({ type: "pauseTask", text: "child-1" }),
			"pause",
		)
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-1",
				lifecycleState: "paused",
				pauseReason: "Paused by user",
				resumeContextSummary: "Resume from checkpoint",
			}),
		)
		expect(registry.getSession("child-1")).toMatchObject({
			status: "stopped",
			lifecycleStatus: "paused",
			recoveryState: "recoverable",
			pendingReaction: "resume",
		})

		await control.resumeBackgroundSubagent("child-1")
		expect(resumeSession).toHaveBeenCalledWith("child-1", "Resume from checkpoint", "background task")
		expect(updateTaskHistory).toHaveBeenLastCalledWith(
			expect.objectContaining({
				id: "child-1",
				status: "active",
				statusUpdatedAt: 999,
				lifecycleState: "running",
				pauseReason: undefined,
				pausedAt: undefined,
			}),
		)
		expect(registry.getSession("child-1")).toMatchObject({
			lifecycleStatus: "active",
			activityState: "active",
			recoveryState: undefined,
			pendingReaction: undefined,
		})
		expect(statusListener).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", state: "paused" }),
		)
		expect(statusListener).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", state: "running" }),
		)
		expect(postStateToWebview).toHaveBeenCalledTimes(2)
	})
})
