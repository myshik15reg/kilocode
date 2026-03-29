// kilocode_change - new file
import type { CreateSessionOptions } from "./AgentRegistry"
import {
	buildRestoredBackgroundSessionCreateOptions,
	prepareBackgroundSubagentLaunch,
	type BackgroundSessionBinding,
	type PlannedBackgroundBindingRestoration,
	type RestoredBackgroundBindingPlan,
} from "./BackgroundSubagentLifecycle"
import type { AgentSession, AgentStatus } from "./types"
import type { SubagentLaunchRequest } from "@roo-code/types"

export interface PreparedBackgroundSubagentStart {
	taskId: string
	sessionId: string
	prompt: string
	queued: boolean
	startOptions: {
		parallelMode: boolean
		labelOverride: string
		sessionId: string
		mode: string
		helperProfile?: string
		sessionGroup: {
			groupId: string
			rootSessionId: string
			label: string
		}
	}
}

export interface BackgroundSubagentBindingCoordinatorDependencies {
	backgroundSessionBindings: Map<string, BackgroundSessionBinding>
	bindSession: (sessionId: string, binding: BackgroundSessionBinding) => Promise<void>
	renameBinding: (oldId: string, newId: string) => void
	hasQueuedLaunches: () => boolean
	hasBackgroundSubagentCapacity: (request: SubagentLaunchRequest) => boolean
	getSession: (sessionId: string) => AgentSession | undefined
	createSession: (
		sessionId: string,
		prompt: string,
		startTime: number,
		options: CreateSessionOptions & { labelOverride: string },
	) => AgentSession
	updateSessionStatus: (
		sessionId: string,
		status: AgentStatus,
		exitCode?: number,
		error?: string,
	) => AgentSession | undefined
	updateSession: (sessionId: string, patch: Partial<AgentSession>) => AgentSession | undefined
	persistBindings: () => Promise<void>
}

export class BackgroundSubagentBindingCoordinator {
	constructor(private readonly deps: BackgroundSubagentBindingCoordinatorDependencies) {}

	public async prepareLaunch(request: SubagentLaunchRequest): Promise<PreparedBackgroundSubagentStart> {
		const launch = prepareBackgroundSubagentLaunch(request)

		await this.deps.bindSession(launch.sessionId, {
			request: launch.normalizedRequest,
			taskId: launch.sessionId,
		})

		const queued =
			this.deps.hasQueuedLaunches() || !this.deps.hasBackgroundSubagentCapacity(launch.normalizedRequest)

		return {
			taskId: launch.sessionId,
			sessionId: launch.sessionId,
			prompt: launch.prompt,
			queued,
			startOptions: {
				parallelMode: launch.normalizedRequest.isolation === "worktree",
				labelOverride: `Background: ${launch.normalizedRequest.mode}`,
				sessionId: launch.sessionId,
				mode: launch.normalizedRequest.mode,
				helperProfile: launch.normalizedRequest.helperProfile,
				sessionGroup: {
					groupId: launch.queueKey,
					rootSessionId: launch.normalizedRequest.rootTaskId,
					label: `subagent:${launch.normalizedRequest.parentTaskId}`,
				},
			},
		}
	}

	public async applyPlannedRestoration(restoration: PlannedBackgroundBindingRestoration): Promise<void> {
		if (!restoration.plans.length && !restoration.removedTerminalBindings) {
			return
		}

		for (const sessionId of restoration.terminalSessionIds) {
			this.deps.backgroundSessionBindings.delete(sessionId)
		}

		for (const plan of restoration.plans) {
			this.applyRestorationPlan(plan)
		}

		if (restoration.removedTerminalBindings) {
			await this.deps.persistBindings()
		}
	}

	public handleSessionRenamed(oldId: string, newId: string): void {
		this.deps.renameBinding(oldId, newId)
	}

	private applyRestorationPlan(plan: RestoredBackgroundBindingPlan): void {
		this.deps.backgroundSessionBindings.set(plan.sessionId, plan.binding)

		const session = this.deps.getSession(plan.sessionId)
		if (!session) {
			this.deps.createSession(
				plan.sessionId,
				plan.binding.request.handoff.summary,
				plan.historyItem?.ts ?? plan.updatedAt,
				buildRestoredBackgroundSessionCreateOptions(plan),
			)
		}

		this.deps.updateSessionStatus(
			plan.sessionId,
			"stopped",
			undefined,
			plan.historyItem?.pauseReason ?? plan.historyItem?.lastStopReason,
		)

		const restoredSession = this.deps.getSession(plan.sessionId)
		this.deps.updateSession(plan.sessionId, {
			taskId: plan.binding.taskId,
			rootTaskId: plan.binding.request.rootTaskId,
			parentTaskId: plan.binding.request.parentTaskId,
			lifecycleStatus: plan.restoredLifecycleStatus,
			activityState: plan.restoredActivityState,
			needsAttention: true,
			recoveryState: plan.restoredRecoveryState,
			pendingReaction: plan.restoredPendingReaction,
			lastStopReason: plan.historyItem?.lastStopReason ?? restoredSession?.lastStopReason,
			lastStopSummary: plan.historyItem?.lastStopSummary ?? restoredSession?.lastStopSummary,
			restartHandoff:
				plan.historyItem?.resumeContextSummary ??
				plan.historyItem?.lastStopSummary ??
				restoredSession?.restartHandoff,
			lastEventAt: plan.updatedAt,
		})
	}
}
