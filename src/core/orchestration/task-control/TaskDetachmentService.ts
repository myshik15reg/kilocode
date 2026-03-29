import { RooCodeEventName } from "@roo-code/types"

import type { Task } from "../../task/Task"

// kilocode_change - new file

export interface TaskDetachmentRuntime {
	getCurrentStack(): Task[]
	getRootTaskIdForStack(stack: Task[]): string | undefined
	snapshotCurrentStackToBackground(): void
	restoreBackgroundStack(rootTaskId: string): boolean
	getNextActiveRootTaskId(excludeRootTaskId?: string): string | undefined
	setCurrentStack(stack: Task[]): void
	setFocusedRootTaskId(rootTaskId: string | undefined): void
}

export class TaskDetachmentService {
	constructor(private readonly runtime: TaskDetachmentRuntime) {}

	public async clearTask(): Promise<void> {
		const stack = this.runtime.getCurrentStack()
		if (stack.length === 0) {
			return
		}

		const task = stack[stack.length - 1]
		const currentRootTaskId = this.runtime.getRootTaskIdForStack(stack)
		console.log(`[clearTask] clearing task ${task.taskId}.${task.instanceId}`)
		this.detachActiveStack(stack)

		const nextRootTaskId = this.runtime.getNextActiveRootTaskId(currentRootTaskId)
		if (nextRootTaskId) {
			this.runtime.restoreBackgroundStack(nextRootTaskId)
		} else {
			this.runtime.setFocusedRootTaskId(currentRootTaskId)
		}
	}

	public async closeTaskToHistory(): Promise<void> {
		const stack = this.runtime.getCurrentStack()
		if (stack.length > 0) {
			const task = stack[stack.length - 1]
			console.log(`[closeTaskToHistory] closing task ${task.taskId}.${task.instanceId} to history view`)
			this.detachActiveStack(stack)
		}

		this.runtime.setFocusedRootTaskId(undefined)
	}

	private detachActiveStack(stack: Task[]): void {
		this.runtime.snapshotCurrentStackToBackground()
		for (const activeTask of stack) {
			activeTask.emit(RooCodeEventName.TaskUnfocused)
		}
		this.runtime.setCurrentStack([])
	}
}
