// kilocode_change - new file
import pWaitFor from "p-wait-for"

import type { HistoryItem } from "@roo-code/types"
import type { TaskResumeControl } from "@roo-code/types"

const RESUME_INTENT_PATTERN = /^(?:continue|resume|продолжить)$/i

export interface ResumeIntentProvider {
	getTaskHistory(): HistoryItem[]
	postMessageToWebview(message: { type: "invoke"; invoke: "setChatBoxMessage"; text: string }): Promise<void>
	resumeTask(taskId: string, control?: TaskResumeControl): void
	getCurrentTask(): { taskId?: string; handleWebviewAskResponse?(response: string): void } | undefined
	log(message: string): void
}

export const isResumeIntentMessage = (text?: string) => Boolean(text && RESUME_INTENT_PATTERN.test(text.trim()))

export const getPausedHistoryItems = (provider: Pick<ResumeIntentProvider, "getTaskHistory">): HistoryItem[] => {
	return provider
		.getTaskHistory()
		.filter((item) => item.lifecycleState === "paused")
		.sort((left, right) => (right.pausedAt ?? right.ts) - (left.pausedAt ?? left.ts))
}

export const buildPausedTasksSelectionMessage = (pausedTasks: HistoryItem[]) => {
	const taskList = pausedTasks
		.map((task, index) => `${index + 1}. ${task.task}${task.id ? ` (${task.id})` : ""}`)
		.join("\n")

	return `There are multiple paused tasks. Please choose which one to resume:\n${taskList}`
}

export async function tryHandleTextResumeIntent(
	provider: ResumeIntentProvider,
	text?: string,
	_images?: string[],
): Promise<boolean> {
	void _images
	if (!isResumeIntentMessage(text)) {
		return false
	}

	const pausedTasks = getPausedHistoryItems(provider)
	if (pausedTasks.length === 0) {
		return false
	}

	if (pausedTasks.length > 1) {
		await provider.postMessageToWebview({
			type: "invoke",
			invoke: "setChatBoxMessage",
			text: buildPausedTasksSelectionMessage(pausedTasks),
		})
		return true
	}

	const [pausedTask] = pausedTasks
	provider.resumeTask(pausedTask.id, "continue")

	try {
		await pWaitFor(() => provider.getCurrentTask()?.taskId === pausedTask.id, { timeout: 3_000 })
		provider.getCurrentTask()?.handleWebviewAskResponse?.("yesButtonClicked")
	} catch (error) {
		provider.log(
			`[textResumeIntent] Failed to confirm resume for ${pausedTask.id}: ${error instanceof Error ? error.message : String(error)}`,
		)
	}

	return true
}
