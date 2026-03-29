import { RooCodeEventName, type HistoryItem, type ModeConfig, type ProviderSettingsEntry } from "@roo-code/types"

import { defaultModeSlug, getModeBySlug } from "../../../shared/modes"
import type { Task } from "../../task/Task"

// kilocode_change - new file

export type RehydratableHistoryItem = HistoryItem & { rootTask?: Task; parentTask?: Task }

export interface TaskRehydrationRuntime {
	getCurrentTask(): Task | undefined
	getCurrentStack(): Task[]
	setCurrentStack(stack: Task[]): void
	snapshotCurrentStackToBackground(): void
	restoreBackgroundStack(rootTaskId: string): boolean
	postStateToWebview(): Promise<void>
	cleanupTaskEventListeners(task: Task): void
	performPreparationTasks(task: Task): Promise<void>
	getCustomModes(): Promise<ModeConfig[]>
	updateGlobalState(key: "mode" | "listApiConfigMeta", value: string | ProviderSettingsEntry[]): Promise<void>
	getModeConfigId(mode: string): Promise<string | undefined>
	listProviderProfiles(): Promise<ProviderSettingsEntry[]>
	getProviderProfile(params: { name: string }): Promise<{ apiProvider?: string }>
	activateProviderProfile(
		args: { name: string },
		options?: { persistModeConfig?: boolean; persistTaskHistory?: boolean },
	): Promise<void>
	getPendingEditOperation(operationId: string):
		| {
				messageTs: number
				editedContent: string
				images?: string[]
				messageIndex: number
				apiConversationHistoryIndex: number
		  }
		| undefined
	clearPendingEditOperation(operationId: string): boolean
	log(message: string): void
}

export interface TaskRehydrationDecision {
	targetRootTaskId: string
	isRehydratingCurrentTask: boolean
	restoredTask?: Task
}

export class TaskRehydrationService {
	constructor(private readonly runtime: TaskRehydrationRuntime) {}

	public async prepareRehydration(historyItem: RehydratableHistoryItem): Promise<TaskRehydrationDecision> {
		const targetRootTaskId = historyItem.rootTaskId ?? historyItem.id
		const currentTask = this.runtime.getCurrentTask()
		const isRehydratingCurrentTask = !!currentTask && currentTask.taskId === historyItem.id

		if (!isRehydratingCurrentTask) {
			this.runtime.snapshotCurrentStackToBackground()
			this.runtime.setCurrentStack([])

			const shouldRestoreBackgroundRootStack = historyItem.id === targetRootTaskId
			if (shouldRestoreBackgroundRootStack && this.runtime.restoreBackgroundStack(targetRootTaskId)) {
				await this.runtime.postStateToWebview()
				return {
					targetRootTaskId,
					isRehydratingCurrentTask,
					restoredTask: this.runtime.getCurrentTask(),
				}
			}
		}

		return {
			targetRootTaskId,
			isRehydratingCurrentTask,
		}
	}

	public async restoreModeAndProfile(historyItem: RehydratableHistoryItem): Promise<void> {
		if (historyItem.mode) {
			const customModes = await this.runtime.getCustomModes()
			const modeExists = getModeBySlug(historyItem.mode, customModes) !== undefined

			if (!modeExists) {
				this.runtime.log(
					`Mode '${historyItem.mode}' from history no longer exists. Falling back to default mode '${defaultModeSlug}'.`,
				)
				historyItem.mode = defaultModeSlug
			}

			await this.runtime.updateGlobalState("mode", historyItem.mode)

			if (!historyItem.apiConfigName) {
				await this.restoreModeProfile(historyItem.mode)
			}
		}

		if (historyItem.apiConfigName) {
			await this.restoreExplicitTaskProfile(historyItem.apiConfigName)
		}
	}

	public replayPendingEditIfNeeded(task: Task): void {
		const operationId = `task-${task.taskId}`
		const pendingEdit = this.runtime.getPendingEditOperation(operationId)
		if (!pendingEdit) {
			return
		}

		this.runtime.clearPendingEditOperation(operationId)
		this.runtime.log(`[createTaskWithHistoryItem] Processing pending edit after checkpoint restoration`)

		setTimeout(async () => {
			try {
				const messageIndex = task.clineMessages.findIndex((message) => message.ts === pendingEdit.messageTs)
				const apiConversationHistoryIndex = task.apiConversationHistory.findIndex(
					(message) => message.ts === pendingEdit.messageTs,
				)

				if (messageIndex === -1) {
					return
				}

				await task.overwriteClineMessages(task.clineMessages.slice(0, messageIndex))

				if (apiConversationHistoryIndex !== -1) {
					await task.overwriteApiConversationHistory(
						task.apiConversationHistory.slice(0, apiConversationHistoryIndex),
					)
				}

				await task.handleWebviewAskResponse("messageResponse", pendingEdit.editedContent, pendingEdit.images)
			} catch (error) {
				this.runtime.log(`[createTaskWithHistoryItem] Error processing pending edit: ${error}`)
			}
		}, 100)
	}

	public async replaceCurrentTaskInPlace(task: Task): Promise<void> {
		const stack = this.runtime.getCurrentStack()
		const stackIndex = stack.length - 1
		const oldTask = stack[stackIndex]!

		try {
			await oldTask.abortTask(true)
		} catch (error) {
			this.runtime.log(
				`[createTaskWithHistoryItem] abortTask() failed for old task ${oldTask.taskId}.${oldTask.instanceId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}

		this.runtime.cleanupTaskEventListeners(oldTask)
		stack[stackIndex] = task
		this.runtime.setCurrentStack(stack)
		task.emit(RooCodeEventName.TaskFocused)
		await this.runtime.performPreparationTasks(task)
		this.runtime.log(
			`[createTaskWithHistoryItem] rehydrated task ${task.taskId}.${task.instanceId} in-place (flicker-free)`,
		)
	}

	private async restoreModeProfile(mode: string): Promise<void> {
		const savedConfigId = await this.runtime.getModeConfigId(mode)
		const listApiConfig = await this.runtime.listProviderProfiles()

		await this.runtime.updateGlobalState("listApiConfigMeta", listApiConfig)

		if (!savedConfigId) {
			return
		}

		const profile = listApiConfig.find(({ id }) => id === savedConfigId)
		if (!profile?.name) {
			return
		}

		try {
			const fullProfile = await this.runtime.getProviderProfile({ name: profile.name })
			const hasActualSettings = !!fullProfile.apiProvider

			if (hasActualSettings) {
				await this.runtime.activateProviderProfile({ name: profile.name })
			}
		} catch (error) {
			this.runtime.log(
				`Failed to restore API configuration for mode '${mode}': ${
					error instanceof Error ? error.message : String(error)
				}. Continuing with default configuration.`,
			)
		}
	}

	private async restoreExplicitTaskProfile(apiConfigName: string): Promise<void> {
		const listApiConfig = await this.runtime.listProviderProfiles()
		await this.runtime.updateGlobalState("listApiConfigMeta", listApiConfig)
		const profile = listApiConfig.find(({ name }) => name === apiConfigName)

		if (!profile?.name) {
			this.runtime.log(
				`Provider profile '${apiConfigName}' from history no longer exists. Using current configuration.`,
			)
			return
		}

		try {
			await this.runtime.activateProviderProfile(
				{ name: profile.name },
				{ persistModeConfig: false, persistTaskHistory: false },
			)
		} catch (error) {
			this.runtime.log(
				`Failed to restore API configuration '${apiConfigName}' for task: ${
					error instanceof Error ? error.message : String(error)
				}. Continuing with current configuration.`,
			)
		}
	}
}
