// kilocode_change - new file
import type { ActivityItem, HistoryItem } from "@roo-code/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AgentManagerBridge } from "../bridge/AgentManagerBridge"
import { getActivityProjection } from "../events/projections"
import { publishOrchestrationActivity } from "../events/publish"
import { orchestrationEventStore } from "../events/store"
import { OrchestrationDispatcher } from "../OrchestrationDispatcher"
import { OrchestrationPolicy } from "../policy/OrchestrationPolicy"
import { SubagentCoordinator } from "../subagents/SubagentCoordinator"
import { TaskBranchService } from "../task-control/TaskBranchService"
import { TaskControlService, type TaskControlRuntime } from "../task-control/TaskControlService"

describe("orchestration v1 verification pack", () => {
	beforeEach(() => {
		for (const taskId of ["parent-1", "task-1", "branch-1"]) {
			orchestrationEventStore.clear(taskId)
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
		for (const taskId of ["parent-1", "task-1", "branch-1"]) {
			orchestrationEventStore.clear(taskId)
		}
	})

	it("routes background new_task decisions through dispatcher, coordinator, and bridge with projected activity", async () => {
		const policy = new OrchestrationPolicy()
		const dispatcher = new OrchestrationDispatcher()
		const agentManager = {
			hasBackgroundSubagentCapacity: vi.fn().mockReturnValue(true),
			startBackgroundSubagent: vi
				.fn()
				.mockResolvedValue({ taskId: "child-bg", sessionId: "session-bg", status: "running" as const }),
			onBackgroundSubagentStatus: vi.fn(),
			onBackgroundSubagentResult: vi.fn(),
			cancelSession: vi.fn().mockResolvedValue(undefined),
			pauseSession: vi.fn().mockResolvedValue(undefined),
			resumeBackgroundSubagent: vi.fn().mockResolvedValue(undefined),
			listBackgroundSubagentBindings: vi.fn().mockReturnValue([]),
			sendMessage: vi.fn().mockResolvedValue(undefined),
		}
		const bridge = new AgentManagerBridge(agentManager as any)
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge)
		const candidates = [
			{
				callId: "tool-1",
				tool: "new_task",
				arguments: {
					mode: "code",
					message: "Investigate parser issue independently",
					execution: "background",
					todos: "[ ] Inspect parser logs",
				},
			},
		] as const

		const decision = policy.decide({
			taskId: "parent-1",
			rootTaskId: "root-1",
			userIntent: "Independently research this issue in the background",
			candidateToolCalls: [...candidates],
			hasBackgroundCapacity: true,
			hasHelperRouting: false,
		})

		const result = await dispatcher.dispatch(decision, [...candidates], {
			executeToolBatch: vi.fn(),
			executeSubagent: async (_candidate, request) => {
				const launched = await coordinator.launch(request)
				return `Delegated to child task ${launched.childTaskId}`
			},
		})

		expect(decision).toMatchObject({
			kind: "subagent",
			payload: {
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				mode: "code",
				execution: "background",
				isolation: "auto",
				relayPolicy: "parent_only",
				handoff: {
					summary: "Investigate parser issue independently",
					context: ["[ ] Inspect parser logs"],
				},
			},
		})
		expect(result).toMatchObject({
			handled: true,
			route: "subagent",
			result: {
				callId: "tool-1",
				tool: "new_task",
				content: "Delegated to child task child-bg",
			},
		})
		expect(agentManager.hasBackgroundSubagentCapacity).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				mode: "code",
				execution: "background",
				isolation: "auto",
				relayPolicy: "parent_only",
				handoff: {
					summary: "Investigate parser issue independently",
					context: ["[ ] Inspect parser logs"],
				},
			}),
		)
		expect(agentManager.startBackgroundSubagent).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				mode: "code",
				execution: "background",
				isolation: "auto",
				relayPolicy: "parent_only",
			}),
		)
		expect(coordinator.getBindingForTask("child-bg")).toMatchObject({
			parentTaskId: "parent-1",
			childTaskId: "child-bg",
			sessionId: "session-bg",
			status: "running",
		})

		const projection = getActivityProjection([], orchestrationEventStore.get("parent-1"))
		expect(projection.items).toEqual([
			expect.objectContaining({
				kind: "subagent",
				taskId: "child-bg",
				sessionId: "session-bg",
				status: "running",
				summary: "Background subagent started",
			}),
		])
		expect(projection.activeItems).toEqual([expect.objectContaining({ kind: "subagent", status: "running" })])
		expect(projection.latestSummary).toBe("Background subagent started")
	})

	/**
	 * Verifies the smallest lifecycle round-trip that still proves V1 recovery semantics:
	 * pause -> resume -> continue -> branch, then rebuild the activity view from persisted history only.
	 */
	it("rebuilds lifecycle activity so pause/resume/continue stay active while branch remains timeline-only", async () => {
		vi.spyOn(Date, "now")
			.mockReturnValueOnce(100)
			.mockReturnValueOnce(101)
			.mockReturnValueOnce(102)
			.mockReturnValueOnce(103)
			.mockReturnValueOnce(104)

		const currentTask = {
			taskId: "task-1",
			isPaused: false,
			cancelCurrentRequest: vi.fn(),
			emit: vi.fn(),
		}
		const persistedActivityByTaskId = new Map<string, ActivityItem[]>([["task-1", []]])
		const historyById = new Map<string, HistoryItem>([
			[
				"task-1",
				{
					id: "task-1",
					number: 1,
					task: "Primary task",
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					lifecycleState: "running",
					lastStopSummary: "Last stop summary",
				},
			],
		])
		const getTaskWithId = vi.fn(async (taskId: string) => {
			const item = historyById.get(taskId)
			if (!item) {
				throw new Error(`Task ${taskId} not found`)
			}

			return { historyItem: item }
		})
		const updateTaskHistory = vi.fn(async (item: HistoryItem) => {
			historyById.set(item.id, item)
			return Array.from(historyById.values())
		})
		const publishActivity = vi.fn(async (taskId: string, activity: ActivityItem) => {
			const persistedActivity = persistedActivityByTaskId.get(taskId) ?? []
			await publishOrchestrationActivity({
				taskId,
				activity,
				loadPersistedActivity: async () => persistedActivity,
				persistActivity: async (_persistedTaskId, items) => {
					persistedActivityByTaskId.set(taskId, items)
				},
			})
		})
		const postStateToWebview = vi.fn().mockResolvedValue(undefined)
		const showTaskWithId = vi.fn().mockResolvedValue(undefined)
		const log = vi.fn()
		const getBindingForTask = vi.fn().mockReturnValue({ childTaskId: "task-1" })
		const coordinator = {
			getBindingForTask,
			pause: vi.fn().mockResolvedValue(undefined),
			resume: vi.fn().mockResolvedValue(undefined),
		}
		const controlRuntime: TaskControlRuntime = {
			getCurrentTask: vi.fn(() => currentTask as any),
			getTaskWithId,
			updateTaskHistory,
			publishActivity: publishActivity as any,
			postStateToWebview,
			showTaskWithId,
			log,
			getSubagentCoordinator: vi.fn(() => coordinator as any),
		}
		const createTask = vi.fn(async (text?: string) => {
			historyById.set("branch-1", {
				id: "branch-1",
				number: 2,
				task: text ?? "Branch task",
				ts: 2,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			})
			persistedActivityByTaskId.set("branch-1", [])
			return { taskId: "branch-1" } as any
		})
		const branchRuntime = {
			getTaskWithId,
			getState: vi.fn().mockResolvedValue({ apiConfiguration: {} }),
			createTask,
			updateTaskHistory,
			publishActivity,
			postStateToWebview,
			log,
			providerSettingsManager: {},
		}
		const controlService = new TaskControlService(controlRuntime)
		const branchService = new TaskBranchService(branchRuntime as any)
		const flushResume = async () => {
			await Promise.resolve()
			await Promise.resolve()
			await Promise.resolve()
		}

		await controlService.pauseTask("task-1", "Paused by user")
		controlService.resumeTask("task-1")
		await flushResume()
		controlService.resumeTask("task-1", "continue")
		await flushResume()
		await branchService.branchTask("task-1", {
			branchStrategy: "full",
			message: "Continue from resumed state",
		})

		orchestrationEventStore.clear("task-1")
		const projection = getActivityProjection(
			persistedActivityByTaskId.get("task-1"),
			orchestrationEventStore.get("task-1"),
		)

		expect(coordinator.pause).toHaveBeenCalledWith("task-1")
		expect(coordinator.resume).toHaveBeenCalledTimes(2)
		expect(coordinator.resume).toHaveBeenNthCalledWith(1, "task-1")
		expect(coordinator.resume).toHaveBeenNthCalledWith(2, "task-1")
		expect(projection.items).toEqual([
			expect.objectContaining({
				kind: "taskControl",
				control: "pause",
				summary: "Paused by user",
				timestamp: 101,
			}),
			expect.objectContaining({
				kind: "taskControl",
				control: "resume",
				summary: "Task resumed",
				timestamp: 102,
			}),
			expect.objectContaining({
				kind: "taskControl",
				control: "continue",
				summary: "Task continued",
				timestamp: 103,
			}),
			expect.objectContaining({
				kind: "taskControl",
				control: "branch",
				summary: "Branched into task branch-1",
				timestamp: 104,
			}),
		])
		expect(projection.activeItems).toEqual([
			expect.objectContaining({ kind: "taskControl", control: "pause" }),
			expect.objectContaining({ kind: "taskControl", control: "resume" }),
			expect.objectContaining({ kind: "taskControl", control: "continue" }),
		])
		expect(projection.latestSummary).toBe("Branched into task branch-1")
		expect(historyById.get("branch-1")).toMatchObject({
			branchFromTaskId: "task-1",
			branchStrategy: "full",
			branchSummary: "Branch of task task-1: Continue from resumed state",
		})
	})
})
