// kilocode_change - new file
import { describe, expect, it, vi } from "vitest"
import { AgentRegistry } from "../AgentRegistry"
import { createAgentManagerBackgroundComposition } from "../AgentManagerBackgroundComposition"
import type { BackgroundSessionBinding } from "../BackgroundSubagentLifecycle"
import type { AgentSession, AgentStatus } from "../types"
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

function createDeps() {
	const registry = new AgentRegistry()
	const persistedBindings: Array<Map<string, BackgroundSessionBinding>> = []
	const persistBindings = vi.fn(async () => {
		persistedBindings.push(new Map(composition.backgroundSessionBindings))
	})
	const writeToStdin = vi.fn().mockResolvedValue(undefined)
	const stopSession = vi.fn()
	const resumeSession = vi.fn().mockResolvedValue(undefined)
	const updateTaskHistory = vi.fn().mockResolvedValue(undefined)
	const postStateToWebview = vi.fn()
	const postWebviewMessage = vi.fn()
	const log = vi.fn()
	const hasQueuedLaunches = vi.fn(() => false)
	const hasBackgroundSubagentCapacity = vi.fn(() => false)

	const deps = {
		getSession: (sessionId: string) => registry.getSession(sessionId),
		updateSession: (sessionId: string, patch: Partial<AgentSession>) => registry.updateSession(sessionId, patch),
		updateSessionStatus: (sessionId: string, status: AgentStatus, exitCode?: number, error?: string) =>
			registry.updateSessionStatus(sessionId, status, exitCode, error),
		persistBindings,
		hasStdin: vi.fn(() => true),
		writeToStdin,
		stopSession,
		resumeSession,
		getSessionHistoryItem: vi.fn(() => createHistoryItem({ resumeContextSummary: "Resume from checkpoint" })),
		updateTaskHistory,
		summarizeCompletion: vi.fn(() => "Completed summary"),
		postStateToWebview,
		log,
		now: () => 999,
		hasQueuedLaunches,
		hasBackgroundSubagentCapacity,
		createSession: (
			sessionId: string,
			prompt: string,
			startTime: number,
			options: Parameters<AgentRegistry["createSession"]>[3],
		) => registry.createSession(sessionId, prompt, startTime, options),
		postWebviewMessage,
	}

	const composition = createAgentManagerBackgroundComposition(deps)

	return {
		registry,
		composition,
		deps,
		persistBindings,
		persistedBindings,
		writeToStdin,
		stopSession,
		resumeSession,
		updateTaskHistory,
		postStateToWebview,
		postWebviewMessage,
		log,
		hasQueuedLaunches,
		hasBackgroundSubagentCapacity,
	}
}

describe("createAgentManagerBackgroundComposition", () => {
	it("assembles control, bindings, bridge, and coordinator around the shared binding map", async () => {
		const {
			registry,
			composition,
			persistBindings,
			persistedBindings,
			postWebviewMessage,
			hasQueuedLaunches,
			hasBackgroundSubagentCapacity,
		} = createDeps()
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
		})

		const statusListener = vi.fn()
		const resultListener = vi.fn()
		const disposeStatus = composition.backgroundSubagentEventBridge.onStatus(statusListener)
		const disposeResult = composition.backgroundSubagentEventBridge.onResult(resultListener)

		const launch = await composition.backgroundSubagentBindingCoordinator.prepareLaunch(
			createRequest({ helperProfile: "helper-profile" }),
		)
		expect(launch).toEqual({
			taskId: "child-1",
			sessionId: "child-1",
			prompt: "Do work",
			queued: true,
			startOptions: {
				parallelMode: false,
				labelOverride: "Background: code",
				sessionId: "child-1",
				mode: "code",
				helperProfile: "helper-profile",
				sessionGroup: {
					groupId: "root-1",
					rootSessionId: "root-1",
					label: "subagent:parent-1",
				},
			},
		})
		expect(composition.backgroundSessionBindings).toBe(composition.backgroundSubagentControl.bindings)
		expect(composition.backgroundSessionBindings.get("child-1")).toEqual({
			request: expect.objectContaining({ targetTaskId: "child-1", helperProfile: "helper-profile" }),
			taskId: "child-1",
		})
		expect(hasQueuedLaunches).toHaveBeenCalledTimes(1)
		expect(hasBackgroundSubagentCapacity).toHaveBeenCalledWith(
			expect.objectContaining({ targetTaskId: "child-1", helperProfile: "helper-profile" }),
		)

		composition.backgroundSubagentEventBridge.announceLaunch("child-1", launch.queued)
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", state: "queued" }),
		)

		composition.backgroundSubagentEventBridge.handleSessionCompleted("child-1", 0)
		expect(statusListener).toHaveBeenLastCalledWith(
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", state: "completed" }),
		)
		expect(resultListener).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: "child-1", sessionId: "child-1", status: "completed" }),
		)
		expect(postWebviewMessage).toHaveBeenCalledWith({
			type: "agentManager.stateEvent",
			sessionId: "child-1",
			eventType: "ask_completion_result",
		})
		expect(composition.backgroundSessionBindings.has("child-1")).toBe(false)
		expect(persistBindings).toHaveBeenCalledTimes(2)
		expect(persistedBindings.at(-1)).toEqual(new Map())

		disposeStatus()
		disposeResult()
	})

	it("delegates pause and rename flows through the assembled control and coordinator seam", async () => {
		const {
			registry,
			composition,
			writeToStdin,
			resumeSession,
			updateTaskHistory,
			postStateToWebview,
			persistBindings,
		} = createDeps()
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			labelOverride: "background task",
		})

		await composition.backgroundSubagentBindingCoordinator.prepareLaunch(createRequest())
		composition.backgroundSubagentBindingCoordinator.handleSessionRenamed("child-1", "child-2")

		expect(composition.backgroundSessionBindings.has("child-1")).toBe(false)
		expect(composition.backgroundSessionBindings.get("child-2")).toEqual({
			request: expect.objectContaining({ targetTaskId: "child-1" }),
			taskId: "child-1",
		})

		registry.createSession("child-2", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			labelOverride: "background task",
		})
		await composition.backgroundSubagentControl.pauseSession("child-2")
		await composition.backgroundSubagentControl.resumeBackgroundSubagent("child-2")

		expect(writeToStdin).toHaveBeenCalledWith(
			"child-2",
			expect.objectContaining({ type: "pauseTask", text: "child-1" }),
			"pause",
		)
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "child-2", lifecycleState: "paused" }),
		)
		expect(resumeSession).toHaveBeenCalledWith("child-2", "Resume from checkpoint", "background task")
		expect(postStateToWebview).toHaveBeenCalledTimes(2)
		expect(persistBindings).toHaveBeenCalledTimes(2)
	})

	it("covers a queued background lifecycle through rename, persisted pause state, resume, and terminal cleanup", async () => {
		const {
			registry,
			composition,
			persistBindings,
			persistedBindings,
			writeToStdin,
			resumeSession,
			updateTaskHistory,
			postStateToWebview,
			postWebviewMessage,
			hasQueuedLaunches,
			hasBackgroundSubagentCapacity,
		} = createDeps()
		hasQueuedLaunches.mockReturnValue(true)
		hasBackgroundSubagentCapacity.mockReturnValue(false)

		const statusListener = vi.fn()
		const resultListener = vi.fn()
		composition.backgroundSubagentEventBridge.onStatus(statusListener)
		composition.backgroundSubagentEventBridge.onResult(resultListener)

		const launch = await composition.backgroundSubagentBindingCoordinator.prepareLaunch(
			createRequest({
				parentTaskId: "parent-queued",
				rootTaskId: "root-queued",
				targetTaskId: "child-queued",
				handoff: { summary: "Investigate queued work", context: ["[ ] capture status"] },
			}),
		)

		expect(launch).toMatchObject({
			taskId: "child-queued",
			sessionId: "child-queued",
			queued: true,
			prompt: "Investigate queued work\n\n[ ] capture status",
		})
		expect(composition.backgroundSessionBindings.get("child-queued")).toEqual({
			request: expect.objectContaining({
				parentTaskId: "parent-queued",
				rootTaskId: "root-queued",
				targetTaskId: "child-queued",
			}),
			taskId: "child-queued",
		})

		composition.backgroundSubagentEventBridge.announceLaunch("child-queued", launch.queued)
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: "child-queued", sessionId: "child-queued", state: "queued" }),
		)

		composition.backgroundSubagentBindingCoordinator.handleSessionRenamed("child-queued", "child-rebound")
		expect(composition.backgroundSessionBindings.has("child-queued")).toBe(false)
		expect(composition.backgroundSessionBindings.get("child-rebound")).toEqual({
			request: expect.objectContaining({ targetTaskId: "child-queued" }),
			taskId: "child-queued",
		})
		expect(persistedBindings.at(-1)?.get("child-rebound")).toEqual(
			expect.objectContaining({ taskId: "child-queued" }),
		)

		registry.createSession("child-rebound", "background task", Date.now(), {
			taskId: "child-queued",
			rootTaskId: "root-queued",
			parentTaskId: "parent-queued",
			labelOverride: "background task",
		})

		await composition.backgroundSubagentControl.pauseSession("child-rebound")
		expect(writeToStdin).toHaveBeenCalledWith(
			"child-rebound",
			expect.objectContaining({ type: "pauseTask", text: "child-queued" }),
			"pause",
		)
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "child-rebound", lifecycleState: "paused" }),
		)
		expect(composition.backgroundSubagentControl.listBindings()).toEqual([
			expect.objectContaining({
				taskId: "child-queued",
				sessionId: "child-rebound",
				status: "paused",
			}),
		])

		await composition.backgroundSubagentControl.resumeBackgroundSubagent("child-rebound")
		expect(resumeSession).toHaveBeenCalledWith("child-rebound", "Resume from checkpoint", "background task")
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "child-rebound", lifecycleState: "running", pausedAt: undefined }),
		)

		composition.backgroundSubagentEventBridge.handleSessionCompleted("child-rebound", 0)
		expect(resultListener).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "child-queued",
				sessionId: "child-rebound",
				status: "completed",
			}),
		)
		expect(composition.backgroundSubagentControl.listBindings()).toEqual([])
		expect(postStateToWebview).toHaveBeenCalledTimes(2)
		expect(persistBindings).toHaveBeenCalledTimes(3)
		expect(postWebviewMessage).toHaveBeenCalledWith({
			type: "agentManager.stateEvent",
			sessionId: "child-rebound",
			eventType: "ask_completion_result",
		})
	})
})
