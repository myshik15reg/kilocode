// kilocode_change start
import type { KilocodePayload } from "./CliOutputParser"
import type { AgentSession, AgentStatus, SchedulerState, SessionGroup, SessionGroupEvent } from "./types"
import {
	captureAgentManagerSessionCompleted,
	captureAgentManagerSessionError,
	captureAgentManagerSessionStopped,
} from "./telemetry"

export type QueuePressureOutcome = "success" | "problematic"

export interface QueuedSessionLaunchLike {
	rootScopeKey: string
}

export interface StartSessionFailure {
	type?: "payment_required" | "api_req_failed" | "spawn_error" | "unknown"
	message: string
	payload?: KilocodePayload | { text?: string; content?: string }
	authError?: boolean
}

interface AgentManagerCompletionFollowUpDeps {
	queueKeyPressure: Map<string, number>
	maxConcurrentPerQueueKey: () => number
	getQueueKey: (options?: { sessionGroup?: SessionGroup; sessionId?: string }) => string
	updateSessionStatus: (sessionId: string, status: AgentStatus, exitCode?: number, error?: string) => void
	updateSession: (sessionId: string, patch: Partial<AgentSession>) => void
	log: (sessionId: string, line: string) => void
	publishSessionGroupEvent: (
		session: AgentSession | undefined,
		sessionId: string,
		eventType: SessionGroupEvent["eventType"],
		summary?: string,
	) => void
	postStateEvent: (sessionId: string, payload: { eventType: string; [key: string]: unknown }) => void
	fetchAndPostRemoteSessions: () => Promise<void>
	postStateToWebview: () => void
	drainQueuedSessionLaunches: () => Promise<void>
	postStartSessionFailed: () => void
	showPaymentRequiredPrompt: (payload?: KilocodePayload | { text?: string; content?: string }) => void
	handleStartSessionApiFailure: (error: { message?: string; authError?: boolean }) => void
	showAgentError: (error?: { type: "spawn_error" | "unknown"; message: string }) => void
}

export class AgentManagerCompletionFollowUp {
	constructor(private readonly deps: AgentManagerCompletionFollowUpDeps) {}

	public getEffectiveQueueKeyCap(queueKey: string): number {
		const pressure = this.deps.queueKeyPressure.get(queueKey) ?? 0
		const baseCap = this.deps.maxConcurrentPerQueueKey()

		if (pressure <= 0) {
			return baseCap
		}

		if (pressure >= Math.max(2, baseCap)) {
			return 0
		}

		return Math.max(1, baseCap - pressure)
	}

	public updateQueueKeyPressure(queueKey: string, outcome: QueuePressureOutcome): void {
		const current = this.deps.queueKeyPressure.get(queueKey) ?? 0
		if (outcome === "success") {
			if (current <= 1) {
				this.deps.queueKeyPressure.delete(queueKey)
				return
			}
			this.deps.queueKeyPressure.set(queueKey, current - 1)
			return
		}

		this.deps.queueKeyPressure.set(queueKey, current + 1)
	}

	public getSchedulerState(params: {
		sessions: AgentSession[]
		queuedSessionLaunches: QueuedSessionLaunchLike[]
		maxConcurrentSessionStarts: number
	}): SchedulerState {
		const activeSessions = params.sessions.filter(
			(session) => session.status === "creating" || session.status === "running",
		)
		const activeSessionLoad = activeSessions.length
		const queuedLaunchCount = params.queuedSessionLaunches.length
		const activeRootCount = new Set(
			activeSessions.map((session) => session.sessionGroup?.rootSessionId || session.sessionId),
		).size
		const queuedRootLaunchCount = new Set(params.queuedSessionLaunches.map((launch) => launch.rootScopeKey)).size
		return {
			maxConcurrentStarts: params.maxConcurrentSessionStarts,
			activeSessionLoad,
			queuedLaunchCount,
			activeRootCount,
			queuedRootLaunchCount,
			maxConcurrentPerQueueKey: this.deps.maxConcurrentPerQueueKey(),
			queueKeyPressure: Object.fromEntries(this.deps.queueKeyPressure.entries()),
			backpressure: queuedLaunchCount > 0 || activeSessionLoad >= params.maxConcurrentSessionStarts,
		}
	}

	public handleRuntimeStateChanged(): void {
		this.deps.postStateToWebview()
		this.requestQueueDrain()
	}

	public handleStartSessionFailed(error?: StartSessionFailure): void {
		this.deps.postStartSessionFailed()
		if (error?.type === "payment_required") {
			this.deps.showPaymentRequiredPrompt(error.payload ?? { text: error.message })
			this.requestQueueDrain()
			return
		}
		if (error?.type === "api_req_failed") {
			this.deps.handleStartSessionApiFailure(error)
			this.requestQueueDrain()
			return
		}
		const agentError =
			error?.type === "spawn_error" || error?.type === "unknown"
				? { type: error.type, message: error.message }
				: undefined
		this.deps.showAgentError(agentError)
		this.requestQueueDrain()
	}

	public requestQueueDrain(): void {
		void this.deps.drainQueuedSessionLaunches()
	}

	public handleSessionError(params: {
		sessionId: string
		session: AgentSession | undefined
		error: string
		details?: unknown
	}): void {
		this.deps.updateSessionStatus(params.sessionId, "error", undefined, params.error)
		this.deps.updateSession(params.sessionId, {
			lifecycleStatus: "failed",
			activityState: "idle",
			needsAttention: true,
			recoveryState: "handoff_available",
			pendingReaction: "restart",
			lastEventAt: Date.now(),
		})
		this.updateSessionQueuePressure(params.session, "problematic")
		this.deps.publishSessionGroupEvent(params.session, params.sessionId, "error", params.error)
		this.deps.log(params.sessionId, `Error: ${params.error}`)
		if (params.details) {
			this.deps.log(params.sessionId, `Details: ${JSON.stringify(params.details)}`)
		}
		captureAgentManagerSessionError(params.sessionId, params.session?.parallelMode?.enabled ?? false, params.error)
	}

	public handleSessionComplete(params: {
		sessionId: string
		session: AgentSession | undefined
		exitCode?: number
	}): void {
		const isProcessSuccess = params.exitCode === 0 || params.exitCode === undefined
		const terminalStatus =
			isProcessSuccess && params.session?.lifecycleStatus === "abstained"
				? "abstained"
				: isProcessSuccess
					? "completed"
					: "failed"
		this.deps.updateSessionStatus(params.sessionId, isProcessSuccess ? "done" : "error", params.exitCode)
		this.deps.updateSession(params.sessionId, {
			lifecycleStatus: terminalStatus,
			activityState: "idle",
			needsAttention: terminalStatus === "failed",
			recoveryState: terminalStatus === "failed" ? "handoff_available" : undefined,
			pendingReaction: terminalStatus === "failed" ? "restart" : undefined,
			lastEventAt: Date.now(),
		})
		this.updateSessionQueuePressure(params.session, terminalStatus === "failed" ? "problematic" : "success")
		const failureSummary = `Exit code ${params.exitCode}`
		const statusSummary =
			terminalStatus === "abstained"
				? "Agent abstained"
				: terminalStatus === "completed"
					? "Agent completed"
					: `Agent failed with exit code ${params.exitCode}`
		this.deps.log(params.sessionId, statusSummary)
		this.deps.publishSessionGroupEvent(
			params.session,
			params.sessionId,
			terminalStatus === "failed" ? "error" : "completed",
			terminalStatus === "failed" ? failureSummary : statusSummary,
		)
		void this.deps.fetchAndPostRemoteSessions()
		if (terminalStatus === "completed" || terminalStatus === "abstained") {
			this.deps.postStateEvent(params.sessionId, { eventType: "ask_completion_result" })
			if (terminalStatus === "completed") {
				captureAgentManagerSessionCompleted(params.sessionId, params.session?.parallelMode?.enabled ?? false)
			}
			return
		}
		captureAgentManagerSessionError(
			params.sessionId,
			params.session?.parallelMode?.enabled ?? false,
			failureSummary,
		)
	}

	public handleSessionInterrupted(params: {
		sessionId: string
		session: AgentSession | undefined
		reason?: string
	}): void {
		this.deps.updateSessionStatus(params.sessionId, "stopped", undefined, params.reason)
		this.deps.updateSession(params.sessionId, {
			lifecycleStatus: "paused",
			activityState: "paused",
			needsAttention: true,
			recoveryState: "recoverable",
			pendingReaction: "resume",
			lastEventAt: Date.now(),
		})
		this.updateSessionQueuePressure(params.session, "problematic")
		this.deps.publishSessionGroupEvent(params.session, params.sessionId, "stopped", params.reason)
		this.deps.log(params.sessionId, params.reason || "Execution interrupted")
		captureAgentManagerSessionStopped(params.sessionId, params.session?.parallelMode?.enabled ?? false)
	}

	private updateSessionQueuePressure(session: AgentSession | undefined, outcome: QueuePressureOutcome): void {
		if (!session) {
			return
		}
		this.updateQueueKeyPressure(
			this.deps.getQueueKey({ sessionGroup: session.sessionGroup, sessionId: session.sessionId }),
			outcome,
		)
	}
}
// kilocode_change end
