// kilocode_change - new file
import { type CreateSessionOptions } from "./AgentRegistry"
import { BackgroundSubagentBindingCoordinator } from "./BackgroundSubagentBindingCoordinator"
import { BackgroundSubagentControl, type BackgroundSubagentControlDependencies } from "./BackgroundSubagentControl"
import {
	BackgroundSubagentEventBridge,
	type BackgroundSubagentEventBridgeDependencies,
} from "./BackgroundSubagentEventBridge"
import type { BackgroundSessionBinding } from "./BackgroundSubagentLifecycle"
import type { AgentSession, AgentStatus } from "./types"
import type { SubagentLaunchRequest } from "@roo-code/types"

export interface AgentManagerBackgroundCompositionDependencies extends BackgroundSubagentControlDependencies {
	hasQueuedLaunches: () => boolean
	hasBackgroundSubagentCapacity: (request: SubagentLaunchRequest) => boolean
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
	postWebviewMessage: BackgroundSubagentEventBridgeDependencies["postWebviewMessage"]
}

export interface AgentManagerBackgroundComposition {
	backgroundSubagentControl: BackgroundSubagentControl
	backgroundSessionBindings: Map<string, BackgroundSessionBinding>
	backgroundSubagentEventBridge: BackgroundSubagentEventBridge
	backgroundSubagentBindingCoordinator: BackgroundSubagentBindingCoordinator
}

export function createAgentManagerBackgroundComposition(
	deps: AgentManagerBackgroundCompositionDependencies,
): AgentManagerBackgroundComposition {
	const backgroundSubagentControl = new BackgroundSubagentControl({
		getSession: deps.getSession,
		updateSession: deps.updateSession,
		updateSessionStatus: deps.updateSessionStatus,
		persistBindings: deps.persistBindings,
		hasStdin: deps.hasStdin,
		writeToStdin: deps.writeToStdin,
		stopSession: deps.stopSession,
		resumeSession: deps.resumeSession,
		getSessionHistoryItem: deps.getSessionHistoryItem,
		updateTaskHistory: deps.updateTaskHistory,
		summarizeCompletion: deps.summarizeCompletion,
		postStateToWebview: deps.postStateToWebview,
		log: deps.log,
		now: deps.now,
	})
	const backgroundSessionBindings = backgroundSubagentControl.bindings

	const backgroundSubagentEventBridge = new BackgroundSubagentEventBridge({
		onStatus: (listener) => backgroundSubagentControl.onStatus(listener),
		onResult: (listener) => backgroundSubagentControl.onResult(listener),
		announceLaunch: (sessionId, queued) => backgroundSubagentControl.announceLaunch(sessionId, queued),
		handleSessionCompleted: (sessionId, exitCode) =>
			backgroundSubagentControl.handleSessionCompleted(sessionId, exitCode),
		postWebviewMessage: deps.postWebviewMessage,
	})

	const backgroundSubagentBindingCoordinator = new BackgroundSubagentBindingCoordinator({
		backgroundSessionBindings,
		bindSession: (sessionId, binding) => backgroundSubagentControl.bindSession(sessionId, binding),
		renameBinding: (oldId, newId) => backgroundSubagentControl.renameBinding(oldId, newId),
		hasQueuedLaunches: deps.hasQueuedLaunches,
		hasBackgroundSubagentCapacity: deps.hasBackgroundSubagentCapacity,
		getSession: deps.getSession,
		createSession: deps.createSession,
		updateSessionStatus: deps.updateSessionStatus,
		updateSession: deps.updateSession,
		persistBindings: deps.persistBindings,
	})

	return {
		backgroundSubagentControl,
		backgroundSessionBindings,
		backgroundSubagentEventBridge,
		backgroundSubagentBindingCoordinator,
	}
}
