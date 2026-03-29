import { RooCodeEventName } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { TaskDetachmentService, type TaskDetachmentRuntime } from "./TaskDetachmentService"

// kilocode_change - new file

describe("TaskDetachmentService", () => {
	let focusedTask: {
		taskId: string
		instanceId: string
		emit: ReturnType<typeof vi.fn>
	}
	let childTask: {
		taskId: string
		instanceId: string
		emit: ReturnType<typeof vi.fn>
	}
	let backgroundTask: {
		taskId: string
		instanceId: string
		emit: ReturnType<typeof vi.fn>
	}
	let currentStack: Array<typeof focusedTask | typeof childTask>
	let runtime: TaskDetachmentRuntime
	let snapshotCurrentStackToBackground: ReturnType<typeof vi.fn>
	let restoreBackgroundStack: ReturnType<typeof vi.fn>
	let getNextActiveRootTaskId: ReturnType<typeof vi.fn>
	let setFocusedRootTaskId: ReturnType<typeof vi.fn>

	beforeEach(() => {
		focusedTask = { taskId: "root-1", instanceId: "inst-1", emit: vi.fn() }
		childTask = { taskId: "child-1", instanceId: "inst-2", emit: vi.fn() }
		backgroundTask = { taskId: "root-2", instanceId: "inst-3", emit: vi.fn() }
		currentStack = [focusedTask, childTask]
		snapshotCurrentStackToBackground = vi.fn()
		restoreBackgroundStack = vi.fn(() => true)
		getNextActiveRootTaskId = vi.fn()
		setFocusedRootTaskId = vi.fn()
		runtime = {
			getCurrentStack: vi.fn(() => [...currentStack] as any),
			getRootTaskIdForStack: vi.fn((stack) => stack[0]?.taskId),
			snapshotCurrentStackToBackground,
			restoreBackgroundStack,
			getNextActiveRootTaskId,
			setCurrentStack: vi.fn((stack) => {
				currentStack = [...(stack as any)]
			}),
			setFocusedRootTaskId,
		}
	})

	it("detaches the active stack and restores the next active root during clearTask", async () => {
		getNextActiveRootTaskId.mockReturnValue("root-2")
		const service = new TaskDetachmentService(runtime)

		await service.clearTask()

		expect(snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(focusedTask.emit).toHaveBeenCalledWith(RooCodeEventName.TaskUnfocused)
		expect(childTask.emit).toHaveBeenCalledWith(RooCodeEventName.TaskUnfocused)
		expect(currentStack).toEqual([])
		expect(getNextActiveRootTaskId).toHaveBeenCalledWith("root-1")
		expect(restoreBackgroundStack).toHaveBeenCalledWith("root-2")
		expect(setFocusedRootTaskId).not.toHaveBeenCalled()
	})

	it("preserves previous root marker semantics when clearTask has no next active root", async () => {
		getNextActiveRootTaskId.mockReturnValue(undefined)
		const service = new TaskDetachmentService(runtime)

		await service.clearTask()

		expect(snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(currentStack).toEqual([])
		expect(restoreBackgroundStack).not.toHaveBeenCalled()
		expect(setFocusedRootTaskId).toHaveBeenCalledWith("root-1")
	})

	it("detaches the active stack and clears focused root during closeTaskToHistory", async () => {
		const service = new TaskDetachmentService(runtime)

		await service.closeTaskToHistory()

		expect(snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(focusedTask.emit).toHaveBeenCalledWith(RooCodeEventName.TaskUnfocused)
		expect(childTask.emit).toHaveBeenCalledWith(RooCodeEventName.TaskUnfocused)
		expect(currentStack).toEqual([])
		expect(restoreBackgroundStack).not.toHaveBeenCalled()
		expect(getNextActiveRootTaskId).not.toHaveBeenCalled()
		expect(setFocusedRootTaskId).toHaveBeenCalledWith(undefined)
		expect(backgroundTask.emit).not.toHaveBeenCalled()
	})
})
