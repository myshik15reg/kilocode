import type { HistoryItem } from "@roo-code/types"
import pWaitFor from "p-wait-for"

import type { SubagentCoordinatorRuntime } from "../subagents/SubagentDelegationService"
import type { Task } from "../../task/Task"

// kilocode_change - new file

type TaskActivity = NonNullable<HistoryItem["activity"]>[number]
type TaskCancellationCoordinator = Pick<SubagentCoordinatorRuntime, "getBindingForTask" | "cancel">

type TaskLookup = { historyItem: HistoryItem }

export interface TaskCancellationRuntime {
	getCurrentTask(): Task | undefined
	getTaskWithId(taskId: string): Promise<TaskLookup>
	getTaskWithIdWithoutMessage(taskId: string): Promise<TaskLookup>
	updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]>
	publishActivity(taskId: string, activity: TaskActivity): Promise<void>
	postStateToWebview(): Promise<void>
	cascadeStopDescendantTasks(
		taskId: string,
		lastStopReason: HistoryItem["lastStopReason"],
		lastStopSummary: string,
	): Promise<string[]>
	createTaskWithHistoryItem(
		historyItem: HistoryItem & { rootTask?: Task; parentTask?: Task },
		options?: { startTask?: boolean },
	): Promise<Task | undefined>
	log(message: string): void
	getSubagentCoordinator(): TaskCancellationCoordinator | undefined
}

export class TaskCancellationService {
	constructor(private readonly runtime: TaskCancellationRuntime) {}

	public async cancelTask(): Promise<void> {
		const task = this.runtime.getCurrentTask()

		if (!task) {
			return
		}

		const coordinator = this.runtime.getSubagentCoordinator()
		const backgroundBinding = coordinator?.getBindingForTask?.(task.taskId)
		if (backgroundBinding && coordinator?.cancel) {
			await coordinator.cancel(task.taskId)
			const { historyItem } = await this.runtime.getTaskWithIdWithoutMessage(task.taskId)
			await this.runtime.updateTaskHistory({
				...historyItem,
				status: "aborted",
				statusUpdatedAt: Date.now(),
				lastStatusViewedAt: Date.now(),
				lastStopReason: "user_cancelled",
				lastStopSummary: "Background subagent cancelled by the user.",
				lifecycleState: "cancelled",
			})
			await this.runtime.postStateToWebview()
			return
		}

		console.log(`[cancelTask] cancelling task ${task.taskId}.${task.instanceId}`)

		const { historyItem } = await this.runtime.getTaskWithId(task.taskId)

		const rootTask = task.rootTask
		const parentTask = task.parentTask
		const updatedHistoryItem = {
			...historyItem,
			status: "aborted" as const,
			statusUpdatedAt: Date.now(),
			lastStatusViewedAt: Date.now(),
			lastStopReason: "user_cancelled" as const,
			lastStopSummary: "Task execution was cancelled by the user.",
		}

		await this.runtime.updateTaskHistory(updatedHistoryItem)
		try {
			const timestamp = Date.now()
			await this.runtime.publishActivity(task.taskId, {
				kind: "taskControl",
				id: `task-control-cancel-${timestamp}`,
				taskId: task.taskId,
				control: "pause",
				summary: "Task cancelled by user",
				timestamp,
			})
		} catch (error) {
			this.runtime.log(
				`Failed to publish cancel activity for ${task.taskId}: ${(error as Error)?.message ?? String(error)}`,
			)
		}
		await this.runtime.cascadeStopDescendantTasks(
			task.taskId,
			"parent_cancelled",
			`Parent task ${task.taskId} was cancelled by the user.`,
		)

		task.abortReason = "user_cancelled"

		const originalInstanceId = task.instanceId

		task.cancelCurrentRequest()
		task.abortTask()
		task.abandoned = true

		await pWaitFor(
			() => {
				const activeTask = this.runtime.getCurrentTask()
				return (
					activeTask === undefined ||
					activeTask.isStreaming === false ||
					activeTask.didFinishAbortingStream ||
					activeTask.isWaitingForFirstChunk
				)
			},
			{
				timeout: 3_000,
			},
		).catch(() => {
			console.error("Failed to abort task")
		})

		const current = this.runtime.getCurrentTask()
		if (current && current.instanceId !== originalInstanceId) {
			this.runtime.log(
				`[cancelTask] Skipping rehydrate: current instance ${current.instanceId} != original ${originalInstanceId}`,
			)
			return
		}

		{
			const currentAfterCheck = this.runtime.getCurrentTask()
			if (currentAfterCheck && currentAfterCheck.instanceId !== originalInstanceId) {
				this.runtime.log(
					`[cancelTask] Skipping rehydrate after final check: current instance ${currentAfterCheck.instanceId} != original ${originalInstanceId}`,
				)
				return
			}
		}

		await this.runtime.createTaskWithHistoryItem({ ...updatedHistoryItem, rootTask, parentTask })
	}
}
