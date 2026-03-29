import type { HistoryItem } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	MAX_SUBAGENT_DELEGATION_DEPTH,
	SubagentDelegationService,
	type SubagentDelegationRuntime,
} from "./SubagentDelegationService"

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
			expect.objectContaining({ status: "running", taskId: "child-1" }),
		)
		expect(runtime.emitTaskDelegated).toHaveBeenCalledWith("parent-1", "child-1")
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
				handoff: {
					summary: "Research",
					context: ["- Check logs"],
				},
			}),
		)
		expect(runtime.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "active",
				delegatedToId: "child-1",
				awaitingChildId: "child-1",
			}),
		)
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
