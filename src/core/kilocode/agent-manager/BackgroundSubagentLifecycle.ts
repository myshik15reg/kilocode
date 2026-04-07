import type { CreateSessionOptions } from "./AgentRegistry"
import type { AgentSession } from "./types"
import {
	normalizeSubagentLaunchRequest,
	resolveSubagentLaunchTargetTaskId,
	type HistoryItem,
	type SubagentLaunchRequest,
	type SubagentStatusEvent,
} from "@roo-code/types"

export interface BackgroundSessionBinding {
	request: SubagentLaunchRequest
	taskId: string
}

export interface PersistedBackgroundBinding {
	sessionId: string
	taskId: string
	request: SubagentLaunchRequest
	lastKnownState?: SubagentStatusEvent["state"]
	updatedAt: number
}

export interface PersistedAgentManagerRecoveryState {
	backgroundBindings: PersistedBackgroundBinding[]
}

export interface BackgroundBindingWorkspaceState {
	get<T>(key: string): T | undefined
	update(key: string, value: PersistedAgentManagerRecoveryState): PromiseLike<void> | void
}

export interface PreparedBackgroundSubagentLaunch {
	normalizedRequest: SubagentLaunchRequest
	sessionId: string
	prompt: string
	queueKey: string
}

export interface RestoredBackgroundBindingPlan {
	sessionId: string
	binding: BackgroundSessionBinding
	historyItem: HistoryItem | undefined
	updatedAt: number
	restoredLifecycleStatus: AgentSession["lifecycleStatus"]
	restoredActivityState: AgentSession["activityState"]
	restoredRecoveryState: AgentSession["recoveryState"]
	restoredPendingReaction: AgentSession["pendingReaction"]
}

export interface PlannedBackgroundBindingRestoration {
	plans: RestoredBackgroundBindingPlan[]
	terminalSessionIds: string[]
	removedTerminalBindings: boolean
}

export interface ListedBackgroundSubagentBinding {
	request: SubagentLaunchRequest
	taskId: string
	sessionId: string
	status: SubagentStatusEvent["state"]
	updatedAt: number
}

export const AGENT_MANAGER_RECOVERY_STATE_KEY = "kilocode.agentManager.recoveryState"

export function prepareBackgroundSubagentLaunch(request: SubagentLaunchRequest): PreparedBackgroundSubagentLaunch {
	const normalizedRequest = normalizeSubagentLaunchRequest(request)
	const sessionId = resolveSubagentLaunchTargetTaskId(normalizedRequest)
	const prompt = normalizedRequest.handoff.context?.length
		? `${normalizedRequest.handoff.summary}\n\n${normalizedRequest.handoff.context.join("\n")}`
		: normalizedRequest.handoff.summary
	const queueKey = normalizedRequest.rootTaskId || normalizedRequest.parentTaskId || sessionId

	return {
		normalizedRequest,
		sessionId,
		prompt,
		queueKey,
	}
}

export function mapSessionToBackgroundSubagentState(
	session: AgentSession | undefined,
): SubagentStatusEvent["state"] | undefined {
	if (!session) {
		return undefined
	}
	if (session.lifecycleStatus === "completed") {
		return "completed"
	}
	if (session.lifecycleStatus === "failed") {
		return "failed"
	}
	if (session.lifecycleStatus === "cancelled") {
		return "cancelled"
	}
	if (session.lifecycleStatus === "recoverable" || session.recoveryState === "recoverable") {
		return "paused"
	}
	if (session.lifecycleStatus === "paused" || session.activityState === "paused") {
		return "paused"
	}
	if (session.status === "creating") {
		return "starting"
	}
	if (session.status === "running") {
		if (session.activityState === "waiting_input") return "waiting_input"
		if (session.activityState === "waiting_approval") return "waiting_approval"
		return "running"
	}
	if (session.status === "done") {
		return "completed"
	}
	if (session.status === "error") {
		return "failed"
	}
	return "cancelled"
}

export function serializeBackgroundBindings(
	bindings: ReadonlyMap<string, BackgroundSessionBinding>,
	getSession: (sessionId: string) => AgentSession | undefined,
	now: () => number = Date.now,
): PersistedAgentManagerRecoveryState {
	return {
		backgroundBindings: Array.from(bindings.entries()).map(([sessionId, binding]) => ({
			sessionId,
			taskId: binding.taskId,
			request: binding.request,
			lastKnownState: mapSessionToBackgroundSubagentState(getSession(sessionId)),
			updatedAt: getSession(sessionId)?.lastEventAt ?? now(),
		})),
	}
}

export async function persistBackgroundBindingsToWorkspaceState(
	workspaceState: BackgroundBindingWorkspaceState,
	bindings: ReadonlyMap<string, BackgroundSessionBinding>,
	getSession: (sessionId: string) => AgentSession | undefined,
	now: () => number = Date.now,
): Promise<void> {
	await workspaceState.update(
		AGENT_MANAGER_RECOVERY_STATE_KEY,
		serializeBackgroundBindings(bindings, getSession, now),
	)
}

export function readPersistedBackgroundBindingsFromWorkspaceState(
	workspaceState: BackgroundBindingWorkspaceState,
): PersistedAgentManagerRecoveryState | undefined {
	return workspaceState.get<PersistedAgentManagerRecoveryState>(AGENT_MANAGER_RECOVERY_STATE_KEY)
}

export function planPersistedBackgroundBindingRestoration(
	persisted: PersistedAgentManagerRecoveryState | undefined,
	options: {
		getHistoryItem: (sessionId: string) => HistoryItem | undefined
		getExistingSession: (sessionId: string) => AgentSession | undefined
	},
): PlannedBackgroundBindingRestoration {
	const plans: RestoredBackgroundBindingPlan[] = []
	const terminalSessionIds: string[] = []

	if (!persisted?.backgroundBindings?.length) {
		return {
			plans,
			terminalSessionIds,
			removedTerminalBindings: false,
		}
	}

	for (const binding of persisted.backgroundBindings) {
		const normalizedRequest = normalizeSubagentLaunchRequest(binding.request)
		const resolvedTaskId = resolveSubagentLaunchTargetTaskId(normalizedRequest)
		const historyItem = options.getHistoryItem(binding.sessionId)
		const existingSession = options.getExistingSession(binding.sessionId)
		const isHistoryCompleted = historyItem?.lifecycleState === "completed"
		const isHistoryCancelled = historyItem?.lifecycleState === "cancelled"
		const isPaused = historyItem?.lifecycleState === "paused" || binding.lastKnownState === "paused"
		const isCompleted = binding.lastKnownState === "completed"
		const isCancelled = binding.lastKnownState === "cancelled"
		const isFailed = binding.lastKnownState === "failed"
		const isWaitingInput = binding.lastKnownState === "waiting_input"
		const isWaitingApproval = binding.lastKnownState === "waiting_approval"
		const isRunningLike =
			binding.lastKnownState === "running" ||
			binding.lastKnownState === "starting" ||
			isWaitingInput ||
			isWaitingApproval
		const shouldDiscardTerminalBinding =
			(isCompleted && isHistoryCompleted) || ((isCancelled || isFailed) && isHistoryCancelled)

		if (shouldDiscardTerminalBinding) {
			terminalSessionIds.push(binding.sessionId)
			continue
		}

		let restoredLifecycleStatus: AgentSession["lifecycleStatus"]
		let restoredActivityState: AgentSession["activityState"]
		let restoredRecoveryState: AgentSession["recoveryState"]
		let restoredPendingReaction: AgentSession["pendingReaction"]

		if (isCompleted) {
			restoredLifecycleStatus = "completed"
			restoredActivityState = "idle"
			restoredRecoveryState = undefined
			restoredPendingReaction = undefined
		} else if (isCancelled) {
			restoredLifecycleStatus = "cancelled"
			restoredActivityState = "idle"
			restoredRecoveryState = undefined
			restoredPendingReaction = undefined
		} else if (isFailed) {
			restoredLifecycleStatus = "failed"
			restoredActivityState = "idle"
			restoredRecoveryState = undefined
			restoredPendingReaction = undefined
		} else if (isPaused) {
			restoredLifecycleStatus = "paused"
			restoredActivityState = "paused"
			restoredRecoveryState = "recoverable"
			restoredPendingReaction = "resume"
		} else if (isRunningLike) {
			restoredLifecycleStatus = "recoverable"
			restoredActivityState = isWaitingInput ? "waiting_input" : isWaitingApproval ? "waiting_approval" : "active"
			restoredRecoveryState = "recoverable"
			restoredPendingReaction = "resume"
		} else {
			restoredLifecycleStatus = existingSession?.lifecycleStatus ?? "recoverable"
			restoredActivityState = existingSession?.activityState ?? "idle"
			restoredRecoveryState = existingSession?.recoveryState ?? "recoverable"
			restoredPendingReaction = existingSession?.pendingReaction ?? "resume"
		}

		plans.push({
			sessionId: binding.sessionId,
			binding: {
				request: normalizedRequest,
				taskId: resolvedTaskId,
			},
			historyItem,
			updatedAt: binding.updatedAt,
			restoredLifecycleStatus,
			restoredActivityState,
			restoredRecoveryState,
			restoredPendingReaction,
		})
	}

	return {
		plans,
		terminalSessionIds,
		removedTerminalBindings: terminalSessionIds.length > 0,
	}
}

export function listBackgroundSubagentBindings(
	bindings: ReadonlyMap<string, BackgroundSessionBinding>,
	getSession: (sessionId: string) => AgentSession | undefined,
	now: () => number = Date.now,
): ListedBackgroundSubagentBinding[] {
	return Array.from(bindings.entries()).map(([sessionId, binding]) => ({
		request: binding.request,
		taskId: binding.taskId,
		sessionId,
		status: mapSessionToBackgroundSubagentState(getSession(sessionId)) ?? "queued",
		updatedAt: getSession(sessionId)?.lastEventAt ?? now(),
	}))
}

export function buildRestoredBackgroundSessionCreateOptions(
	plan: RestoredBackgroundBindingPlan,
): CreateSessionOptions & { labelOverride: string } {
	return {
		labelOverride: `Background: ${plan.binding.request.mode}`,
		parallelMode: plan.binding.request.isolation === "worktree",
		mode: plan.binding.request.mode,
		sessionGroup: {
			groupId: plan.binding.request.rootTaskId || plan.binding.request.parentTaskId || plan.sessionId,
			rootSessionId: plan.binding.request.rootTaskId || plan.binding.taskId,
			label: `subagent:${plan.binding.request.parentTaskId}`,
		},
		taskId: plan.binding.taskId,
		rootTaskId: plan.binding.request.rootTaskId,
		parentTaskId: plan.binding.request.parentTaskId,
		lifecycleStatus: plan.restoredLifecycleStatus,
		activityState: plan.restoredActivityState,
		needsAttention: true,
		recoveryState: plan.restoredRecoveryState,
		pendingReaction: plan.restoredPendingReaction,
		lastStopReason: plan.historyItem?.lastStopReason,
		lastStopSummary: plan.historyItem?.lastStopSummary,
		restartHandoff: plan.historyItem?.resumeContextSummary ?? plan.historyItem?.lastStopSummary,
		lastEventAt: plan.updatedAt,
	}
}
