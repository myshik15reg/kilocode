import { RooCodeEventName, TaskStatus } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { TaskRootStackLifecycleService, type TaskRootStackLifecycleRuntime } from "./TaskRootStackLifecycleService"

// kilocode_change - new file

describe("TaskRootStackLifecycleService", () => {
	let activeRoot: any
	let activeChild: any
	let backgroundRoot: any
	let backgroundChild: any
	let currentTask: any
	let currentStack: any[]
	let backgroundStacks: Map<string, any[]>
	let focusedRootTaskId: string | undefined
	let runtime: TaskRootStackLifecycleRuntime
	let service: TaskRootStackLifecycleService

	beforeEach(() => {
		activeRoot = { taskId: "root-1", emit: vi.fn(), taskStatus: undefined }
		activeChild = { taskId: "child-1", rootTask: activeRoot, emit: vi.fn(), taskStatus: TaskStatus.Running }
		backgroundRoot = { taskId: "root-2", emit: vi.fn(), taskStatus: undefined, abort: false, abandoned: false }
		backgroundChild = { taskId: "child-2", emit: vi.fn(), taskStatus: TaskStatus.Running }
		currentTask = activeChild
		currentStack = [activeRoot, activeChild]
		backgroundStacks = new Map([["root-2", [backgroundRoot, backgroundChild]]])
		focusedRootTaskId = undefined
		runtime = {
			getCurrentTask: () => currentTask,
			getCurrentStack: () => currentStack,
			setCurrentStack: (stack) => {
				currentStack = [...stack]
				currentTask = currentStack[currentStack.length - 1]
			},
			getBackgroundRootTaskStack: (rootTaskId) => backgroundStacks.get(rootTaskId),
			getBackgroundRootTaskEntries: () => backgroundStacks.entries(),
			setBackgroundRootTaskStack: (rootTaskId, stack) => {
				backgroundStacks.set(rootTaskId, [...stack])
			},
			deleteBackgroundRootTaskStack: (rootTaskId) => {
				backgroundStacks.delete(rootTaskId)
			},
			getFocusedRootTaskId: () => focusedRootTaskId,
			setFocusedRootTaskId: (rootTaskId) => {
				focusedRootTaskId = rootTaskId
			},
		}
		service = new TaskRootStackLifecycleService(runtime)
	})

	it("snapshots the active stack into background storage and preserves focused root ownership", () => {
		service.snapshotCurrentStackToBackground()

		expect(backgroundStacks.get("root-1")).toEqual([activeRoot, activeChild])
		expect(focusedRootTaskId).toBe("root-1")
	})

	it("derives root task ids through rootTask, rootTaskId, taskId, and empty-stack fallbacks", () => {
		expect(service.getRootTaskIdForStack([activeChild])).toBe("root-1")
		expect(service.getRootTaskIdForStack([{ rootTaskId: "root-from-id" } as any])).toBe("root-from-id")
		expect(service.getRootTaskIdForStack([{ taskId: "root-from-task" } as any])).toBe("root-from-task")
		expect(service.getRootTaskIdForStack([])).toBeUndefined()
	})

	it("skips snapshotting when the active stack is empty or has no derivable root task id", () => {
		currentStack = []
		service.snapshotCurrentStackToBackground()
		expect(backgroundStacks.has("root-1")).toBe(false)
		expect(focusedRootTaskId).toBeUndefined()

		currentStack = [{ emit: vi.fn() }]
		service.snapshotCurrentStackToBackground()
		expect(backgroundStacks.size).toBe(1)
		expect(focusedRootTaskId).toBeUndefined()
	})

	it("syncs the active stack to background storage only when a root task id is available", () => {
		expect(service.syncActiveStackToBackground("explicit-root")).toBe("explicit-root")
		expect(backgroundStacks.get("explicit-root")).toEqual([activeRoot, activeChild])

		currentStack = []
		expect(service.syncActiveStackToBackground()).toBeUndefined()

		currentStack = [{ emit: vi.fn() }]
		expect(service.syncActiveStackToBackground()).toBeUndefined()
		expect(backgroundStacks.size).toBe(2)
	})

	it("restores a background stack, re-focuses tasks, and removes stale empty roots", () => {
		const restored = service.restoreBackgroundStack("root-2")

		expect(restored).toBe(true)
		expect(currentStack).toEqual([backgroundRoot, backgroundChild])
		expect(focusedRootTaskId).toBe("root-2")
		expect(backgroundRoot.emit).toHaveBeenCalledWith(RooCodeEventName.TaskFocused)
		expect(backgroundChild.emit).toHaveBeenCalledWith(RooCodeEventName.TaskFocused)

		backgroundStacks.set("root-stale", [])
		expect(service.restoreBackgroundStack("root-stale")).toBe(false)
		expect(backgroundStacks.has("root-stale")).toBe(false)
	})

	it("preserves insertion-order active roots and next-root selection semantics", () => {
		service.snapshotCurrentStackToBackground()

		expect(service.getActiveRootTaskIds()).toEqual(["root-1", "root-2"])
		expect(service.getNextActiveRootTaskId("root-1")).toBe("root-2")
		expect(service.getNextActiveRootTaskId("root-2")).toBe("root-1")
	})

	it("derives running roots from active and background stacks without changing current semantics", () => {
		activeChild.isStreaming = false
		activeChild.isWaitingForFirstChunk = false
		backgroundChild.isStreaming = true
		backgroundChild.isWaitingForFirstChunk = false

		expect(service.getRunningRootTaskIds()).toEqual(["root-1", "root-2"])

		backgroundRoot.abort = true
		expect(service.getRunningRootTaskIds()).toEqual(["root-1"])
	})

	it("ignores non-running or malformed stacks when computing running root ids", () => {
		currentTask = undefined
		backgroundStacks = new Map([
			["root-empty", []],
			[
				"root-abandoned",
				[
					{ ...backgroundRoot, taskId: "root-abandoned", abandoned: true },
					{ ...backgroundChild, taskId: "child-abandoned", isStreaming: true },
				],
			],
			[
				"root-idle",
				[
					{ ...backgroundRoot, taskId: "root-idle" },
					{
						taskId: "child-idle",
						isStreaming: false,
						isWaitingForFirstChunk: false,
						taskStatus: TaskStatus.Idle,
					},
				],
			],
			["root-missing-active", [{ ...backgroundRoot, taskId: "root-missing-active" }, undefined as any]],
		])

		expect(service.getRunningRootTaskIds()).toEqual([])
	})

	it("removes completed background roots and recomputes focus from remaining active roots", () => {
		service.snapshotCurrentStackToBackground()
		focusedRootTaskId = "root-1"

		service.removeCompletedBackgroundRoot("root-1")

		expect(backgroundStacks.has("root-1")).toBe(false)
		expect(focusedRootTaskId).toBe("root-2")
	})

	it("keeps focus unchanged when deleting a background root that is not focused", () => {
		service.snapshotCurrentStackToBackground()
		focusedRootTaskId = "root-2"

		service.removeCompletedBackgroundRoot("root-1")

		expect(backgroundStacks.has("root-1")).toBe(false)
		expect(focusedRootTaskId).toBe("root-2")
	})
})
