import type { HistoryItem } from "@roo-code/types"

import type { Task } from "../../task/Task"
import type { ApiMessage } from "../../task-persistence/apiMessages"
import type { TaskRecoveryPacket } from "./TaskRecoveryPacketService"

// kilocode_change - new file

type RestartedHistoryItem = HistoryItem & { rootTask?: Task; parentTask?: Task }

export interface TaskRestartRuntime {
	getTaskWithId(taskId: string): Promise<{
		historyItem: HistoryItem | undefined
		apiConversationHistory?: ApiMessage[]
	}>
	getState(): Promise<{
		autoRestartProblematicProcesses?: boolean
		problematicProcessRestartLimit?: number
	}>
	persistTaskStopState(
		taskId: string,
		lastStopReason: HistoryItem["lastStopReason"] | undefined,
		lastStopSummary: string,
		status?: HistoryItem["status"],
		extra?: Partial<HistoryItem>,
	): Promise<HistoryItem | undefined>
	showProblematicProcessNotification(params: {
		taskId: string
		reason: HistoryItem["lastStopReason"]
		restartAttempt?: number
		restartPlanned: boolean
	}): Promise<void>
	buildRecoveryPacket(params: {
		historyItem: HistoryItem
		apiConversationHistory?: ApiMessage[]
		useCache?: boolean
	}): Promise<TaskRecoveryPacket>
	updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]>
	createTaskWithHistoryItem(
		historyItem: RestartedHistoryItem,
		options?: { startTask?: boolean },
	): Promise<Task | undefined>
	log(message: string): void
}

export class TaskRestartService {
	constructor(private readonly runtime: TaskRestartRuntime) {}

	public async restartTaskFromHistoryWithHandoff(
		taskId: string,
		options: { force?: boolean } = {},
	): Promise<boolean> {
		try {
			const { historyItem, apiConversationHistory } = await this.runtime.getTaskWithId(taskId)
			if (!historyItem) {
				return false
			}

			const { autoRestartProblematicProcesses, problematicProcessRestartLimit } = await this.runtime.getState()
			const currentRestartCount = historyItem.restartCount ?? 0
			const restartLimit = problematicProcessRestartLimit ?? 1
			const shouldRespectPolicy = options.force !== true

			if (shouldRespectPolicy && !autoRestartProblematicProcesses) {
				return false
			}

			if (currentRestartCount >= restartLimit) {
				await this.runtime.persistTaskStopState(
					taskId,
					"restart_limit_exceeded",
					`Problematic process was not restarted because the restart limit (${restartLimit}) was reached.`,
					"aborted",
				)
				await this.runtime.showProblematicProcessNotification({
					taskId,
					reason: "restart_limit_exceeded",
					restartAttempt: currentRestartCount,
					restartPlanned: false,
				})
				return false
			}

			const recoveryPacket = await this.runtime.buildRecoveryPacket({
				historyItem,
				apiConversationHistory,
			})

			const restartedHistoryItem: RestartedHistoryItem = {
				...historyItem,
				status: "active",
				restartCount: currentRestartCount + 1,
				restartSourceTaskId: historyItem.restartSourceTaskId ?? historyItem.id,
				lastStopSummary: recoveryPacket.summary,
			}

			await this.runtime.updateTaskHistory(restartedHistoryItem)
			const task = await this.runtime.createTaskWithHistoryItem(restartedHistoryItem)
			if (!task) {
				return false
			}

			await task.submitUserMessage(recoveryPacket.handoff)
			return true
		} catch (error) {
			this.runtime.log(
				`[restartTaskFromHistoryWithHandoff] Failed to restart task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
			)
			return false
		}
	}
}
