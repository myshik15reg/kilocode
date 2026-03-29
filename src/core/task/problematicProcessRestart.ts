// kilocode_change - new file
export async function handleProblematicProcessRestart(
	task: {
		providerRef: { deref(): any }
		taskId: string
		consecutiveMistakeLimit: number
		abort: boolean
		abandoned: boolean
		abortReason?: string
	},
	options: { force?: boolean } = {},
): Promise<boolean> {
	const provider = task.providerRef.deref()
	if (!provider) {
		return false
	}

	await provider.persistTaskStopState?.(
		task.taskId,
		"loop_detected",
		`Task reached consecutive mistake limit (${task.consecutiveMistakeLimit}).`,
		"aborted",
	)

	const historyItem = (await provider.getTaskWithId?.(task.taskId))?.historyItem
	const currentRestartCount = historyItem?.restartCount ?? 0
	const nextRestartAttempt = currentRestartCount + 1
	const state = await provider.getState?.()
	const restartLimit = state?.problematicProcessRestartLimit ?? 1
	const canRestartWithinLimit = currentRestartCount < restartLimit
	const shouldRestart =
		options.force === true
			? canRestartWithinLimit
			: state?.autoRestartProblematicProcesses === true && canRestartWithinLimit

	await provider.showProblematicProcessNotification?.({
		taskId: task.taskId,
		reason: shouldRestart ? "loop_detected" : "restart_limit_exceeded",
		restartAttempt: shouldRestart ? nextRestartAttempt : currentRestartCount,
		restartPlanned: shouldRestart,
	})

	if (!shouldRestart || !provider.restartTaskFromHistoryWithHandoff) {
		return false
	}

	const restarted = await provider.restartTaskFromHistoryWithHandoff(task.taskId, { force: true })
	if (restarted) {
		task.abort = true
		task.abandoned = true
		task.abortReason = "user_cancelled"
	}

	return restarted
}
