// kilocode_change - new file
import type { BranchTaskOptions, CreateTaskOptions, HistoryItem, ProviderSettings } from "@roo-code/types"

import type { ProviderSettingsManager } from "../../config/ProviderSettingsManager"
import type { Task } from "../../task/Task"
import { summarizeBranchMessage } from "../../webview/branchTask"

type TaskActivity = NonNullable<HistoryItem["activity"]>[number]

interface TaskBranchState {
	apiConfiguration: ProviderSettings
	condensingApiConfigId?: string
	listApiConfigMeta?: Array<{ id: string; name?: string }>
}

export interface TaskBranchRuntime {
	getTaskWithId(taskId: string): Promise<{ historyItem: HistoryItem }>
	getState(): Promise<TaskBranchState>
	createTask(text?: string, images?: string[], parentTask?: Task, options?: CreateTaskOptions): Promise<Task>
	updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]>
	publishActivity(taskId: string, activity: TaskActivity): Promise<void>
	postStateToWebview(): Promise<void>
	log(message: string): void
	providerSettingsManager: ProviderSettingsManager
}

// kilocode_change - new file
export class TaskBranchService {
	constructor(private readonly runtime: TaskBranchRuntime) {}

	public async branchTask(taskId: string, options?: BranchTaskOptions): Promise<Task> {
		const { historyItem } = await this.runtime.getTaskWithId(taskId)
		const rawBranchMessage =
			options?.message?.trim() ||
			historyItem.completionResultSummary ||
			historyItem.resumeContextSummary ||
			historyItem.task
		const state = await this.runtime.getState()
		const branchMessage = await summarizeBranchMessage({
			rawBranchMessage,
			branchStrategy: options?.branchStrategy,
			providerSettingsManager: this.runtime.providerSettingsManager,
			state: {
				apiConfiguration: state.apiConfiguration,
				condensingApiConfigId: state.condensingApiConfigId,
				listApiConfigMeta: state.listApiConfigMeta,
			},
		})
		const branchSummary = `Branch of task ${taskId}: ${branchMessage}`

		const branched = await this.runtime.createTask(branchSummary, undefined, undefined, {
			branchFromTaskId: taskId,
			branchStrategy: options?.branchStrategy ?? "summary",
			initialStatus: "active",
		})

		const { historyItem: branchHistory } = await this.runtime.getTaskWithId(branched.taskId)
		await this.runtime.updateTaskHistory({
			...branchHistory,
			branchFromTaskId: taskId,
			branchSummary,
			branchStrategy: options?.branchStrategy ?? "summary",
		})

		try {
			const timestamp = Date.now()
			await this.runtime.publishActivity(taskId, {
				kind: "taskControl",
				id: `task-control-branch-${timestamp}`,
				taskId,
				control: "branch",
				summary: `Branched into task ${branched.taskId}`,
				timestamp,
			})
		} catch (error) {
			this.runtime.log(
				`Failed to publish branch activity for ${taskId}: ${(error as Error)?.message ?? String(error)}`,
			)
		}

		await this.runtime.postStateToWebview()
		return branched
	}
}
