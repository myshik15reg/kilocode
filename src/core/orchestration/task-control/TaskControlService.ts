import { RooCodeEventName, type HistoryItem, type TaskResumeControl } from "@roo-code/types"

import type { SubagentCoordinatorRuntime } from "../subagents/SubagentDelegationService"
import type { Task } from "../../task/Task"

// kilocode_change - new file

type TaskActivity = NonNullable<HistoryItem["activity"]>[number]
type PauseResumeCoordinator = Pick<SubagentCoordinatorRuntime, "getBindingForTask" | "pause" | "resume">

export interface TaskControlRuntime {
	getCurrentTask(): Task | undefined
	getTaskWithId(taskId: string): Promise<{ historyItem: HistoryItem }>
	updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]>
	publishActivity(taskId: string, activity: TaskActivity): Promise<void>
	postStateToWebview(): Promise<void>
	showTaskWithId(taskId: string): Promise<void>
	log(message: string): void
	getSubagentCoordinator(): PauseResumeCoordinator | undefined
}

export class TaskControlService {
	constructor(private readonly runtime: TaskControlRuntime) {}

	public async pauseTask(taskId?: string, reason = "Paused by user"): Promise<void> {
		const targetTaskId = taskId ?? this.runtime.getCurrentTask()?.taskId
		if (!targetTaskId) {
			return
		}

		const coordinator = this.runtime.getSubagentCoordinator()
		const backgroundBinding = coordinator?.getBindingForTask?.(targetTaskId)
		if (backgroundBinding && coordinator?.pause) {
			await coordinator.pause(targetTaskId)
		}

		const currentTask = this.runtime.getCurrentTask()
		if (currentTask?.taskId === targetTaskId) {
			currentTask.isPaused = true
			currentTask.cancelCurrentRequest()
			currentTask.emit(RooCodeEventName.TaskPaused, targetTaskId)
		}

		const { historyItem } = await this.runtime.getTaskWithId(targetTaskId)
		await this.runtime.updateTaskHistory({
			...historyItem,
			lifecycleState: "paused",
			pauseReason: reason,
			pausedAt: Date.now(),
			resumeContextSummary: historyItem.resumeContextSummary ?? historyItem.lastStopSummary ?? historyItem.task,
		})

		try {
			const timestamp = Date.now()
			await this.runtime.publishActivity(targetTaskId, {
				kind: "taskControl",
				id: `task-control-pause-${timestamp}`,
				taskId: targetTaskId,
				control: "pause",
				summary: reason,
				timestamp,
			})
		} catch (error) {
			this.runtime.log(
				`Failed to publish pause activity for ${targetTaskId}: ${(error as Error)?.message ?? String(error)}`,
			)
		}

		await this.runtime.postStateToWebview()
	}

	public resumeTask(taskId: string, control: TaskResumeControl = "resume"): void {
		const coordinator = this.runtime.getSubagentCoordinator()
		const backgroundBinding = coordinator?.getBindingForTask?.(taskId)
		if (backgroundBinding && coordinator?.resume) {
			void coordinator.resume(taskId)
		}

		const task = this.runtime.getCurrentTask()
		if (task?.taskId === taskId) {
			task.isPaused = false
			task.emit(RooCodeEventName.TaskUnpaused, taskId)
		}

		void this.runtime
			.getTaskWithId(taskId)
			.then(({ historyItem }) =>
				this.runtime.updateTaskHistory({
					...historyItem,
					lifecycleState: "running",
					pauseReason: undefined,
					pausedAt: undefined,
				}),
			)
			.then(() => {
				const timestamp = Date.now()
				return this.runtime.publishActivity(taskId, {
					kind: "taskControl",
					id: `task-control-${control}-${timestamp}`,
					taskId,
					control,
					summary: control === "continue" ? "Task continued" : "Task resumed",
					timestamp,
				})
			})
			.catch((error) => {
				this.runtime.log(`Failed to update task state for resume ${taskId}: ${error.message}`)
			})

		// Use the existing showTaskWithId method which handles both current and
		// historical tasks.
		this.runtime.showTaskWithId(taskId).catch((error) => {
			this.runtime.log(`Failed to resume task ${taskId}: ${error.message}`)
		})
	}
}
