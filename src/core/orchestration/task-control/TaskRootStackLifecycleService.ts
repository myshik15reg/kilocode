import { RooCodeEventName, TaskStatus } from "@roo-code/types"

import type { Task } from "../../task/Task"

// kilocode_change - new file

export interface TaskRootStackLifecycleRuntime {
	getCurrentTask(): Task | undefined
	getCurrentStack(): Task[]
	setCurrentStack(stack: Task[]): void
	getBackgroundRootTaskStack(rootTaskId: string): Task[] | undefined
	getBackgroundRootTaskEntries(): IterableIterator<[string, Task[]]>
	setBackgroundRootTaskStack(rootTaskId: string, stack: Task[]): void
	deleteBackgroundRootTaskStack(rootTaskId: string): void
	getFocusedRootTaskId(): string | undefined
	setFocusedRootTaskId(rootTaskId: string | undefined): void
}

export class TaskRootStackLifecycleService {
	constructor(private readonly runtime: TaskRootStackLifecycleRuntime) {}

	public getRootTaskIdForStack(stack: Task[]): string | undefined {
		const firstTask = stack[0]
		return firstTask?.rootTask?.taskId ?? firstTask?.rootTaskId ?? firstTask?.taskId
	}

	public snapshotCurrentStackToBackground(): void {
		const stack = this.runtime.getCurrentStack()
		if (stack.length === 0) {
			return
		}

		const rootTaskId = this.getRootTaskIdForStack(stack)
		if (!rootTaskId) {
			return
		}

		this.runtime.setBackgroundRootTaskStack(rootTaskId, [...stack])
		this.runtime.setFocusedRootTaskId(rootTaskId)
	}

	public syncActiveStackToBackground(rootTaskId?: string): string | undefined {
		const stack = this.runtime.getCurrentStack()
		if (stack.length === 0) {
			return undefined
		}

		const activeRootTaskId = rootTaskId ?? this.getRootTaskIdForStack(stack)
		if (!activeRootTaskId) {
			return undefined
		}

		this.runtime.setBackgroundRootTaskStack(activeRootTaskId, [...stack])
		return activeRootTaskId
	}

	public restoreBackgroundStack(rootTaskId: string): boolean {
		const stack = this.runtime.getBackgroundRootTaskStack(rootTaskId)
		if (!stack || stack.length === 0) {
			this.runtime.deleteBackgroundRootTaskStack(rootTaskId)
			return false
		}

		this.runtime.setCurrentStack([...stack])
		this.runtime.setFocusedRootTaskId(rootTaskId)
		for (const task of this.runtime.getCurrentStack()) {
			task.emit(RooCodeEventName.TaskFocused)
		}
		return true
	}

	public getNextActiveRootTaskId(excludeRootTaskId?: string): string | undefined {
		return this.getActiveRootTaskIds().find((rootTaskId) => rootTaskId !== excludeRootTaskId)
	}

	public getActiveRootTaskIds(): string[] {
		const rootIds = new Set<string>()
		const currentRootTaskId = this.getRootTaskIdForStack(this.runtime.getCurrentStack())
		if (currentRootTaskId) {
			rootIds.add(currentRootTaskId)
		}

		for (const [rootTaskId, stack] of this.runtime.getBackgroundRootTaskEntries()) {
			if (stack.length > 0) {
				rootIds.add(rootTaskId)
			}
		}

		return Array.from(rootIds)
	}

	public getRunningRootTaskIds(): string[] {
		const rootIds = new Set<string>()
		const currentRootTaskId = this.getRootTaskIdForStack(this.runtime.getCurrentStack())

		if (currentRootTaskId) {
			const currentTask = this.runtime.getCurrentTask()
			const isRunning = currentTask
				? currentTask.isStreaming ||
					currentTask.isWaitingForFirstChunk ||
					currentTask.taskStatus === TaskStatus.Running
				: false

			if (isRunning) {
				rootIds.add(currentRootTaskId)
			}
		}

		for (const [rootTaskId, stack] of this.runtime.getBackgroundRootTaskEntries()) {
			if (stack.length === 0) {
				continue
			}

			const rootTask = stack[0]
			const activeTask = stack[stack.length - 1]
			const isRunning = activeTask
				? activeTask.isStreaming ||
					activeTask.isWaitingForFirstChunk ||
					activeTask.taskStatus === TaskStatus.Running
				: false

			if (!rootTask?.abort && !rootTask?.abandoned && isRunning) {
				rootIds.add(rootTaskId)
			}
		}

		return Array.from(rootIds)
	}

	public removeCompletedBackgroundRoot(taskId: string): void {
		this.runtime.deleteBackgroundRootTaskStack(taskId)
		if (this.runtime.getFocusedRootTaskId() === taskId) {
			this.runtime.setFocusedRootTaskId(this.getActiveRootTaskIds().find((id) => id !== taskId))
		}
	}
}
