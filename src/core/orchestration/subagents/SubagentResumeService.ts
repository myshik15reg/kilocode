import type { ClineMessage, HistoryItem } from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import type { Task } from "../../task/Task"
import { readApiMessages, saveApiMessages, saveTaskMessages } from "../../task-persistence"
import { readTaskMessages } from "../../task-persistence/taskMessages"
import { validateAndFixToolResultIds } from "../../task/validateToolResultIds"

// kilocode_change - new file
export interface ReopenParentFromDelegationParams {
	parentTaskId: string
	childTaskId: string
	completionResultSummary: string
	preserveParentFocus?: boolean
}

type ResumeCapableTask = Pick<
	Task,
	"overwriteClineMessages" | "overwriteApiConversationHistory" | "resumeAfterDelegation"
>

export interface SubagentResumeRuntime {
	getGlobalStoragePath(): string
	getTaskWithId(taskId: string): Promise<{ historyItem: HistoryItem }>
	updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]>
	getCurrentTask(): Task | undefined
	removeClineFromStack(): Promise<void>
	getFocusedRootTaskId(): string | undefined
	restoreBackgroundStack(rootTaskId: string): boolean
	postStateToWebview(): Promise<void>
	createTaskWithHistoryItem(
		historyItem: HistoryItem & { rootTask?: Task; parentTask?: Task },
		options?: { startTask?: boolean },
	): Promise<ResumeCapableTask | undefined>
	emitTaskDelegationCompleted(parentTaskId: string, childTaskId: string, completionResultSummary: string): void
	emitTaskDelegationResumed(parentTaskId: string, childTaskId: string): void
	log(message: string): void
}

export class SubagentResumeService {
	constructor(private readonly runtime: SubagentResumeRuntime) {}

	public async reopenParentFromDelegation(params: ReopenParentFromDelegationParams): Promise<void> {
		const { parentTaskId, childTaskId, completionResultSummary, preserveParentFocus } = params
		const globalStoragePath = this.runtime.getGlobalStoragePath()
		const { historyItem } = await this.runtime.getTaskWithId(parentTaskId)
		const restoredHistories = await this.loadPersistedParentHistories(parentTaskId, globalStoragePath)
		const updatedHistories = this.injectDelegationCompletionIntoHistories({
			childTaskId,
			completionResultSummary,
			parentClineMessages: restoredHistories.parentClineMessages,
			parentApiMessages: restoredHistories.parentApiMessages,
		})

		await saveTaskMessages({
			messages: updatedHistories.parentClineMessages,
			taskId: parentTaskId,
			globalStoragePath,
		})
		await saveApiMessages({
			messages: updatedHistories.parentApiMessages as any,
			taskId: parentTaskId,
			globalStoragePath,
		})

		await this.persistCompletedChildStatus(childTaskId)
		const updatedHistory = await this.persistResumedParentStatus({
			historyItem,
			childTaskId,
			completionResultSummary,
		})

		TelemetryService.instance.captureDelegationCompleted(parentTaskId, childTaskId)
		try {
			this.runtime.emitTaskDelegationCompleted(parentTaskId, childTaskId, completionResultSummary)
		} catch {
			// non-fatal
		}

		const current = this.runtime.getCurrentTask()
		if (!preserveParentFocus && current?.taskId === childTaskId) {
			await this.runtime.removeClineFromStack()
		}

		if (await this.tryRestorePreservedParentFocus({ parentTaskId, childTaskId, preserveParentFocus })) {
			return
		}

		const parentInstance = await this.runtime.createTaskWithHistoryItem(updatedHistory, { startTask: false })
		if (parentInstance) {
			try {
				await parentInstance.overwriteClineMessages(updatedHistories.parentClineMessages)
			} catch {
				// non-fatal
			}
			try {
				await parentInstance.overwriteApiConversationHistory(updatedHistories.parentApiMessages as any)
			} catch {
				// non-fatal
			}

			await parentInstance.resumeAfterDelegation()
		}

		TelemetryService.instance.captureDelegationResumed(parentTaskId, childTaskId)
		try {
			this.runtime.emitTaskDelegationResumed(parentTaskId, childTaskId)
		} catch {
			// non-fatal
		}
	}

	private async loadPersistedParentHistories(
		parentTaskId: string,
		globalStoragePath: string,
	): Promise<{
		parentClineMessages: ClineMessage[]
		parentApiMessages: any[]
	}> {
		let parentClineMessages: ClineMessage[] = []
		try {
			parentClineMessages = await readTaskMessages({ taskId: parentTaskId, globalStoragePath })
		} catch {
			parentClineMessages = []
		}

		let parentApiMessages: any[] = []
		try {
			parentApiMessages = (await readApiMessages({ taskId: parentTaskId, globalStoragePath })) as any[]
		} catch {
			parentApiMessages = []
		}

		return {
			parentClineMessages: Array.isArray(parentClineMessages) ? [...parentClineMessages] : [],
			parentApiMessages: Array.isArray(parentApiMessages) ? [...parentApiMessages] : [],
		}
	}

	private injectDelegationCompletionIntoHistories(params: {
		childTaskId: string
		completionResultSummary: string
		parentClineMessages: ClineMessage[]
		parentApiMessages: any[]
	}): {
		parentClineMessages: ClineMessage[]
		parentApiMessages: any[]
	} {
		const { childTaskId, completionResultSummary } = params
		const parentClineMessages = Array.isArray(params.parentClineMessages) ? [...params.parentClineMessages] : []
		const parentApiMessages = Array.isArray(params.parentApiMessages) ? [...params.parentApiMessages] : []
		const ts = Date.now()

		parentClineMessages.push({
			type: "say",
			say: "subtask_result",
			text: completionResultSummary,
			ts,
		})

		let toolUseId: string | undefined
		for (let i = parentApiMessages.length - 1; i >= 0; i--) {
			const msg = parentApiMessages[i]
			if (msg.role === "assistant" && Array.isArray(msg.content)) {
				for (const block of msg.content) {
					if (block.type === "tool_use" && block.name === "new_task") {
						toolUseId = block.id
						break
					}
				}
				if (toolUseId) {
					break
				}
			}
		}

		const completionContent = this.buildCompletionContent(childTaskId, completionResultSummary)
		if (toolUseId) {
			const lastMsg = parentApiMessages[parentApiMessages.length - 1]
			let alreadyHasToolResult = false
			if (lastMsg?.role === "user" && Array.isArray(lastMsg.content)) {
				for (const block of lastMsg.content) {
					if (block.type === "tool_result" && block.tool_use_id === toolUseId) {
						block.content = completionContent
						alreadyHasToolResult = true
						break
					}
				}
			}

			if (!alreadyHasToolResult) {
				parentApiMessages.push({
					role: "user",
					content: [
						{
							type: "tool_result" as const,
							tool_use_id: toolUseId,
							content: completionContent,
						},
					],
					ts,
				})
			}
		} else {
			parentApiMessages.push({
				role: "user",
				content: [{ type: "text", text: completionContent }],
				ts,
			})
		}

		const lastMessage = parentApiMessages[parentApiMessages.length - 1]
		if (lastMessage?.role === "user") {
			parentApiMessages[parentApiMessages.length - 1] = validateAndFixToolResultIds(
				lastMessage,
				parentApiMessages.slice(0, -1),
			)
		}

		return { parentClineMessages, parentApiMessages }
	}

	private buildCompletionContent(childTaskId: string, completionResultSummary: string): string {
		return `Subtask ${childTaskId} completed.\n\nResult:\n${completionResultSummary}`
	}

	private async persistCompletedChildStatus(childTaskId: string): Promise<void> {
		try {
			const { historyItem: childHistory } = await this.runtime.getTaskWithId(childTaskId)
			await this.runtime.updateTaskHistory({
				...childHistory,
				status: "completed",
				lifecycleState: "completed",
				pauseReason: undefined,
				pausedAt: undefined,
			})
		} catch (error) {
			this.runtime.log(
				`[reopenParentFromDelegation] Failed to persist child completed status for ${childTaskId}: ${
					(error as Error)?.message ?? String(error)
				}`,
			)
		}
	}

	private async persistResumedParentStatus(params: {
		historyItem: HistoryItem
		childTaskId: string
		completionResultSummary: string
	}): Promise<HistoryItem> {
		const childIds = Array.from(new Set([...(params.historyItem.childIds ?? []), params.childTaskId]))
		const updatedHistory: HistoryItem = {
			...params.historyItem,
			status: "active",
			lifecycleState: "running",
			delegatedToId: undefined,
			completedByChildId: params.childTaskId,
			completionResultSummary: params.completionResultSummary,
			awaitingChildId: undefined,
			childIds,
		}
		await this.runtime.updateTaskHistory(updatedHistory)
		return updatedHistory
	}

	private async tryRestorePreservedParentFocus(params: {
		parentTaskId: string
		childTaskId: string
		preserveParentFocus?: boolean
	}): Promise<boolean> {
		if (!params.preserveParentFocus || this.runtime.getFocusedRootTaskId() !== params.parentTaskId) {
			return false
		}

		const restoredParent = this.runtime.restoreBackgroundStack(params.parentTaskId)
		if (!restoredParent) {
			return false
		}

		await this.runtime.postStateToWebview()
		TelemetryService.instance.captureDelegationResumed(params.parentTaskId, params.childTaskId)
		try {
			this.runtime.emitTaskDelegationResumed(params.parentTaskId, params.childTaskId)
		} catch {
			// non-fatal
		}
		return true
	}
}
