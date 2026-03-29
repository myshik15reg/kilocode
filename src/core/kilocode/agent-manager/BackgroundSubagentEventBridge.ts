// kilocode_change - new file
import type { SubagentResultEvent, SubagentStatusEvent } from "@roo-code/types"

export interface BackgroundSubagentCompletionOutcome {
	isSuccess: boolean
	terminalStatus: "completed" | "cancelled" | "failed"
}

export interface BackgroundSubagentEventBridgeDependencies {
	onStatus: (listener: (event: SubagentStatusEvent) => void) => () => void
	onResult: (listener: (event: SubagentResultEvent) => void) => () => void
	announceLaunch: (sessionId: string, queued: boolean) => void
	handleSessionCompleted: (sessionId: string, exitCode: number) => BackgroundSubagentCompletionOutcome
	postWebviewMessage: (message: {
		type: "agentManager.stateEvent"
		sessionId: string
		eventType: "ask_completion_result"
	}) => void
}

export class BackgroundSubagentEventBridge {
	constructor(private readonly deps: BackgroundSubagentEventBridgeDependencies) {}

	public onStatus(listener: (event: SubagentStatusEvent) => void): () => void {
		return this.deps.onStatus(listener)
	}

	public onResult(listener: (event: SubagentResultEvent) => void): () => void {
		return this.deps.onResult(listener)
	}

	public announceLaunch(sessionId: string, queued: boolean): void {
		this.deps.announceLaunch(sessionId, queued)
	}

	public handleSessionCompleted(sessionId: string, exitCode: number | null): BackgroundSubagentCompletionOutcome {
		const outcome = this.deps.handleSessionCompleted(sessionId, exitCode ?? 1)
		if (outcome.isSuccess) {
			this.postSuccessfulCompletionStateEvent(sessionId)
		}
		return outcome
	}

	private postSuccessfulCompletionStateEvent(sessionId: string): void {
		this.deps.postWebviewMessage({
			type: "agentManager.stateEvent",
			sessionId,
			eventType: "ask_completion_result",
		})
	}
}
