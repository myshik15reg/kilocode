import { TelemetryService } from "@roo-code/telemetry"
import type { HistoryItem } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	MAX_SUBAGENT_DELEGATION_DEPTH,
	SubagentDelegationService,
	type SubagentDelegationRuntime,
} from "./SubagentDelegationService"

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureTaskOutcomeDelegated: vi.fn(),
			captureDelegationHandoffUsed: vi.fn(),
		},
	},
}))

// kilocode_change - new file

describe("SubagentDelegationService", () => {
	let parentTask: any
	let childTask: any
	let runtime: SubagentDelegationRuntime
	let historyItem: HistoryItem
	let currentStack: any[]
	let backgroundStacks: Map<string, any[]>
	let coordinator: { hasCapacity: ReturnType<typeof vi.fn>; launch: ReturnType<typeof vi.fn> }

	beforeEach(() => {
		parentTask = {
			taskId: "parent-1",
			delegationDepth: 1,
			rootTaskId: "parent-root",
			rootTask: { taskId: "parent-root" },
			apiConversationHistory: [],
			flushPendingToolResultsToHistory: vi.fn().mockResolvedValue(undefined),
			emit: vi.fn(),
		}
		childTask = {
			taskId: "child-1",
			rootTaskId: "child-root",
			rootTask: { taskId: "child-root" },
			emit: vi.fn(),
		}
		historyItem = {
			id: "parent-1",
			number: 1,
			task: "Parent",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "active",
			childIds: [],
		}
		currentStack = [parentTask]
		backgroundStacks = new Map([["parent-root", [parentTask]]])
		coordinator = {
			hasCapacity: vi.fn().mockReturnValue(true),
			launch: vi.fn().mockResolvedValue({ mode: "background", childTaskId: "child-1" }),
		}
		runtime = {
			getCurrentTask: vi.fn(() => currentStack[currentStack.length - 1]),
			getCurrentStack: vi.fn(() => [...currentStack]),
			setCurrentStack: vi.fn((stack) => {
				currentStack = [...stack]
			}),
			getRootTaskIdForStack: vi.fn((stack) => stack[0]?.rootTaskId ?? stack[0]?.taskId),
			hasBackgroundRootTaskStack: vi.fn((rootTaskId) => backgroundStacks.has(rootTaskId)),
			setBackgroundRootTaskStack: vi.fn((rootTaskId, stack) => {
				backgroundStacks.set(rootTaskId, [...stack])
			}),
			deleteBackgroundRootTaskStack: vi.fn((rootTaskId) => {
				backgroundStacks.delete(rootTaskId)
			}),
			setFocusedRootTaskId: vi.fn(),
			restoreBackgroundStack: vi.fn((rootTaskId) => {
				const stack = backgroundStacks.get(rootTaskId)
				if (!stack) {
					return false
				}
				currentStack = [...stack]
				return true
			}),
			removeClineFromStack: vi.fn(async () => {
				currentStack = []
			}),
			handleModeSwitch: vi.fn().mockResolvedValue(undefined),
			createTask: vi.fn(async (_text, _images, parent, options) => {
				childTask.parentTask = parent
				childTask.createOptions = options
				currentStack = [childTask]
				return childTask
			}),
			getTaskWithId: vi.fn(async () => ({ historyItem })),
			updateTaskHistory: vi.fn(async (item) => {
				historyItem = item
				return [item]
			}),
			publishActivity: vi.fn().mockResolvedValue(undefined),
			emitTaskDelegated: vi.fn(),
			log: vi.fn(),
			getValue: vi.fn(() => undefined),
			setValue: vi.fn().mockResolvedValue(undefined),
			getSubagentCoordinator: vi.fn(() => coordinator),
		}
	})

	it("delegates foreground orchestration via runtime seam and restores parent focus", async () => {
		const service = new SubagentDelegationService(runtime)

		const result = await service.delegateParentAndOpenChild({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			execution: "foreground",
			isolation: "shared",
			goal: "Investigate logs",
		})

		expect(result).toBe(childTask)
		expect(parentTask.flushPendingToolResultsToHistory).toHaveBeenCalledTimes(1)
		expect(runtime.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(runtime.handleModeSwitch).toHaveBeenCalledWith("code")
		expect(runtime.createTask).toHaveBeenCalledWith(
			"Research",
			undefined,
			parentTask,
			expect.objectContaining({
				delegationDepth: 2,
				detachFromParentRoot: true,
				execution: "foreground",
				isolation: "shared",
				initialStatus: "active",
			}),
		)
		expect(runtime.setBackgroundRootTaskStack).toHaveBeenCalledWith("child-root", [childTask])
		expect(childTask.emit).toHaveBeenCalled()
		expect(runtime.restoreBackgroundStack).toHaveBeenCalledWith("parent-root")
		expect(runtime.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "delegated",
				delegatedToId: "child-1",
				awaitingChildId: "child-1",
				childIds: ["child-1"],
			}),
		)
		expect(runtime.publishActivity).toHaveBeenCalledWith(
			"parent-1",
			expect.objectContaining({
				status: "running",
				taskId: "child-1",
				explainability: expect.objectContaining({ strategy: "sequential", canAbstain: true }),
			}),
		)
		expect(runtime.emitTaskDelegated).toHaveBeenCalledWith("parent-1", "child-1")
		expect(TelemetryService.instance.captureTaskOutcomeDelegated).toHaveBeenCalledWith("parent-1", {
			childTaskId: "child-1",
			execution: "foreground",
			delegationDepth: 2,
			isBackground: false,
		})
		expect(TelemetryService.instance.captureDelegationHandoffUsed).toHaveBeenCalledWith(
			"parent-1",
			"child-1",
			"sequential",
			true,
		)
	})

	it("falls back to the explicit parent task when foreground delegation loses current stack state", async () => {
		currentStack = []
		const service = new SubagentDelegationService(runtime)

		const result = await service.delegateParentAndOpenChild({
			parentTaskId: "parent-1",
			parentTask,
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			execution: "foreground",
		})

		expect(result).toBe(childTask)
		expect(runtime.createTask).toHaveBeenCalledWith(
			"Research",
			undefined,
			parentTask,
			expect.objectContaining({ execution: "foreground" }),
		)
		expect(runtime.restoreBackgroundStack).toHaveBeenCalledWith("parent-root")
	})

	it("falls back to the explicit parent task when background launch has no current task", async () => {
		currentStack = []
		const service = new SubagentDelegationService(runtime)

		const result = await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			parentTask,
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
		})

		expect(result).toBe(childTask)
		expect(coordinator.launch).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: "parent-1",
				rootTaskId: "parent-root",
				mode: "code",
				execution: "background",
			}),
		)
	})

	it("preflights background capacity before creating child tasks and falls back cleanly", async () => {
		coordinator.hasCapacity.mockReturnValue(false)
		const service = new SubagentDelegationService(runtime)

		const result = await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
		})

		expect(result).toBeUndefined()
		expect(coordinator.hasCapacity).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: "parent-1",
				rootTaskId: "parent-root",
				mode: "code",
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
				handoff: expect.objectContaining({ strategy: "sequential", canAbstain: true }),
			}),
		)
		expect(runtime.createTask).not.toHaveBeenCalled()
		expect(coordinator.launch).not.toHaveBeenCalled()
	})

	it("launches background subagents through the coordinator after request assembly", async () => {
		const service = new SubagentDelegationService(runtime)

		const result = await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
			goal: "Check logs thoroughly",
			doneWhen: "Return root cause summary",
			constraints: ["No file edits"],
			budget: { maxSteps: 3 },
		})

		expect(result).toBe(childTask)
		expect(coordinator.hasCapacity).toHaveBeenCalledTimes(1)
		expect(runtime.createTask).toHaveBeenCalledWith(
			"Research",
			undefined,
			parentTask,
			expect.objectContaining({
				execution: "background",
				delegationDepth: 2,
			}),
		)
		expect(runtime.setBackgroundRootTaskStack).toHaveBeenCalledWith("child-root", [childTask])
		expect(runtime.setBackgroundRootTaskStack).toHaveBeenCalledWith("parent-root", [parentTask])
		expect(runtime.setCurrentStack).toHaveBeenCalledWith([parentTask])
		expect(runtime.setFocusedRootTaskId).toHaveBeenCalledWith("parent-root")
		expect(coordinator.launch).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: "parent-1",
				rootTaskId: "parent-root",
				targetTaskId: "child-1",
				mode: "code",
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
				handoff: expect.objectContaining({
					summary: "Research",
					goal: "Check logs thoroughly",
					doneWhen: "Return root cause summary",
					constraints: ["No file edits"],
					budget: { maxSteps: 3 },
					strategy: "sequential",
					canAbstain: true,
				}),
			}),
		)
		expect(runtime.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "active",
				delegatedToId: "child-1",
				awaitingChildId: "child-1",
			}),
		)
		expect(TelemetryService.instance.captureTaskOutcomeDelegated).toHaveBeenCalledWith("parent-1", {
			childTaskId: "child-1",
			execution: "background",
			delegationDepth: 2,
			isBackground: true,
		})
		expect(TelemetryService.instance.captureDelegationHandoffUsed).toHaveBeenCalledWith(
			"parent-1",
			"child-1",
			"sequential",
			true,
		)
	})

	it("passes helper profile metadata into background launch requests", async () => {
		const service = new SubagentDelegationService(runtime)

		await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
			helperProfile: "Cheap helper",
		})

		expect(coordinator.hasCapacity).toHaveBeenCalledWith(expect.objectContaining({ helperProfile: "Cheap helper" }))
		expect(coordinator.launch).toHaveBeenCalledWith(expect.objectContaining({ helperProfile: "Cheap helper" }))
	})

	it("includes trimmed recent history in background handoff context", async () => {
		parentTask.apiConversationHistory = [
			{ role: "user", content: [{ type: "text", text: "Investigate the stalled worker" }] },
			{ role: "assistant", content: [{ type: "text", text: "Worker is waiting on the queue drain" }] },
		]
		const service = new SubagentDelegationService(runtime)

		await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
		})

		expect(coordinator.launch).toHaveBeenCalledWith(
			expect.objectContaining({
				handoff: expect.objectContaining({
					summary: "Research",
					context: [
						"Recent context: user: Investigate the stalled worker",
						"Recent context: assistant: Worker is waiting on the queue drain",
						"- Check logs",
					],
				}),
			}),
		)
	})

	it("propagates structured delegation metadata into background launch and activity logs", async () => {
		const service = new SubagentDelegationService(runtime)

		await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
			role: "investigator",
			expectedArtifact: "incident-summary.md",
			retryBudget: 2,
			retrievalPackId: "pack-1",
			taskIntent: "research",
			retrievalMode: "hybrid",
			structuredDelegation: true,
		})

		expect(coordinator.launch).toHaveBeenCalledWith(
			expect.objectContaining({
				role: "investigator",
				expectedArtifact: "incident-summary.md",
				retryBudget: 2,
				retrievalPackId: "pack-1",
				taskIntent: "research",
				retrievalMode: "hybrid",
				structuredDelegation: true,
			}),
		)
		expect(runtime.publishActivity).toHaveBeenCalledWith(
			"parent-1",
			expect.objectContaining({
				explainability: expect.objectContaining({
					taskIntent: "research",
					retrievalMode: "hybrid",
					structuredDelegation: true,
				}),
			}),
		)
	})

	it("restores the parent stack when foreground child creation fails after the parent was removed", async () => {
		;(runtime.createTask as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("create failed"))
		const service = new SubagentDelegationService(runtime)

		await expect(
			service.delegateParentAndOpenChild({
				parentTaskId: "parent-1",
				message: "Research",
				initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
				mode: "code",
				execution: "foreground",
			}),
		).rejects.toThrow("create failed")

		expect(runtime.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(runtime.restoreBackgroundStack).toHaveBeenCalledWith("parent-root")
		expect(currentStack).toEqual([parentTask])
	})

	it("rolls back background launch state when coordinator launch throws", async () => {
		const childHistoryItem = {
			...historyItem,
			id: "child-1",
			task: "Child",
			status: "active",
		}
		;(runtime.getTaskWithId as ReturnType<typeof vi.fn>).mockImplementation(async (taskId: string) => ({
			historyItem: taskId === "child-1" ? childHistoryItem : historyItem,
		}))
		coordinator.launch.mockRejectedValueOnce(new Error("launch failed"))
		const service = new SubagentDelegationService(runtime)

		const result = await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
		})

		expect(result).toBeUndefined()
		expect(runtime.deleteBackgroundRootTaskStack).toHaveBeenCalledWith("child-root")
		expect(runtime.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-1",
				status: "aborted",
				lifecycleState: "cancelled",
				lastStopSummary: "Background delegation launch failed: launch failed",
			}),
		)
		expect(currentStack).toEqual([parentTask])
		expect(runtime.setFocusedRootTaskId).toHaveBeenCalledWith("parent-root")
	})

	it("rolls back background launch state when the coordinator falls back to foreground", async () => {
		const childHistoryItem = {
			...historyItem,
			id: "child-1",
			task: "Child",
			status: "active",
		}
		;(runtime.getTaskWithId as ReturnType<typeof vi.fn>).mockImplementation(async (taskId: string) => ({
			historyItem: taskId === "child-1" ? childHistoryItem : historyItem,
		}))
		coordinator.launch.mockResolvedValueOnce({ mode: "foreground", childTaskId: "child-1" })
		const service = new SubagentDelegationService(runtime)

		const result = await service.launchBackgroundSubagent({
			parentTaskId: "parent-1",
			message: "Research",
			initialTodos: [{ id: "todo-1", content: "Check logs", status: "pending" } as any],
			mode: "code",
			isolation: "shared",
		})

		expect(result).toBeUndefined()
		expect(runtime.deleteBackgroundRootTaskStack).toHaveBeenCalledWith("child-root")
		expect(runtime.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-1",
				status: "aborted",
				lifecycleState: "cancelled",
				lastStopSummary:
					"Background delegation launch failed: coordinator returned foreground fallback after background preflight",
			}),
		)
		expect(currentStack).toEqual([parentTask])
	})

	it("enforces the delegation depth limit consistently", async () => {
		parentTask.delegationDepth = MAX_SUBAGENT_DELEGATION_DEPTH
		const service = new SubagentDelegationService(runtime)

		await expect(
			service.launchBackgroundSubagent({
				parentTaskId: "parent-1",
				message: "Research",
				initialTodos: [],
				mode: "code",
			}),
		).rejects.toThrow(`Maximum delegation depth exceeded (${MAX_SUBAGENT_DELEGATION_DEPTH})`)
	})
})
