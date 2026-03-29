// kilocode_change - new file
import { AgentRegistry } from "./AgentRegistry"
import type {
	CompleteStreamEvent,
	ErrorStreamEvent,
	InterruptedStreamEvent,
	KilocodeStreamEvent,
	StreamEvent,
	WelcomeStreamEvent,
} from "./CliOutputParser"
import {
	buildParallelModeWorktreePath,
	isParallelModeCompletionMessage,
	parseParallelModeBranch,
	parseParallelModeCompletionBranch,
	parseParallelModeWorktreePath,
} from "./parallelModeParser"
import type { AgentSession } from "./types"

export interface AgentManagerRuntimeEventRouterDeps {
	processStartTimes: Map<string, number>
	registry: AgentRegistry
	log: (message: string) => void
	logSession: (sessionId: string, line: string) => void
	postStateToWebview: () => void
	handleKilocodeEvent: (sessionId: string, event: KilocodeStreamEvent) => void
	handleSessionError: (params: {
		sessionId: string
		session: AgentSession | undefined
		event: ErrorStreamEvent
	}) => void
	handleSessionComplete: (params: {
		sessionId: string
		session: AgentSession | undefined
		event: CompleteStreamEvent
	}) => void
	handleSessionInterrupted: (params: {
		sessionId: string
		session: AgentSession | undefined
		event: InterruptedStreamEvent
	}) => void
}

export class AgentManagerRuntimeEventRouter {
	constructor(private readonly deps: AgentManagerRuntimeEventRouterDeps) {}

	public handleEvent(sessionId: string, event: StreamEvent): void {
		switch (event.streamEventType) {
			case "kilocode": {
				if (this.isReplayedKilocodeEvent(sessionId, event)) {
					return
				}
				this.deps.handleKilocodeEvent(sessionId, event)
				return
			}
			case "status":
				this.handleStatusEvent(sessionId, event.message)
				this.deps.logSession(sessionId, event.message)
				return
			case "output":
				this.handleOutputEvent(sessionId, event.content)
				this.deps.logSession(sessionId, `[${event.source}] ${event.content}`)
				return
			case "welcome":
				this.handleWelcomeEvent(sessionId, event)
				return
			case "error":
				this.deps.handleSessionError({
					sessionId,
					session: this.deps.registry.getSession(sessionId),
					event,
				})
				return
			case "complete":
				this.deps.handleSessionComplete({
					sessionId,
					session: this.deps.registry.getSession(sessionId),
					event,
				})
				return
			case "interrupted":
				this.deps.handleSessionInterrupted({
					sessionId,
					session: this.deps.registry.getSession(sessionId),
					event,
				})
				return
			case "session_created":
				return
			default:
				return
		}
	}

	private isReplayedKilocodeEvent(sessionId: string, event: KilocodeStreamEvent): boolean {
		const processStartTime = this.deps.processStartTimes.get(sessionId) ?? 0
		const eventTimestamp = event.payload?.timestamp

		if (eventTimestamp && eventTimestamp > 1000 && eventTimestamp < processStartTime) {
			this.deps.log(
				`[AgentManager] Filtering replayed event: ${event.payload?.say || event.payload?.ask || "unknown"} (ts=${eventTimestamp} < start=${processStartTime})`,
			)
			return true
		}

		return false
	}

	private handleStatusEvent(sessionId: string, message: string): void {
		let updated = false

		const branch = parseParallelModeBranch(message)
		if (branch) {
			if (this.deps.registry.updateParallelModeInfo(sessionId, { branch })) {
				updated = true
			}
		}

		const worktreePath = parseParallelModeWorktreePath(message)
		if (worktreePath) {
			if (this.deps.registry.updateParallelModeInfo(sessionId, { worktreePath })) {
				updated = true
			}
		}

		if (updated) {
			this.deps.postStateToWebview()
		}
	}

	private handleOutputEvent(sessionId: string, content: string): void {
		if (!isParallelModeCompletionMessage(content)) {
			return
		}

		let updated = false
		const branch = parseParallelModeCompletionBranch(content)
		if (branch) {
			if (this.deps.registry.updateParallelModeInfo(sessionId, { branch })) {
				updated = true
			}
		}

		if (this.deps.registry.updateParallelModeInfo(sessionId, { completionMessage: content })) {
			updated = true
		}

		if (updated) {
			this.deps.postStateToWebview()
		}
	}

	private handleWelcomeEvent(sessionId: string, event: WelcomeStreamEvent): void {
		let updated = false
		const session = this.deps.registry.getSession(sessionId)
		const existingWorktreePath = session?.parallelMode?.worktreePath

		if (event.worktreeBranch) {
			this.deps.log(`[AgentManager] Session ${sessionId} worktree branch: ${event.worktreeBranch}`)
			if (this.deps.registry.updateParallelModeInfo(sessionId, { branch: event.worktreeBranch })) {
				updated = true
			}
		}

		if (event.worktreePath) {
			this.deps.log(`[AgentManager] Session ${sessionId} worktree path: ${event.worktreePath}`)
			if (this.deps.registry.updateParallelModeInfo(sessionId, { worktreePath: event.worktreePath })) {
				updated = true
			}
		}

		if (!event.worktreePath && event.worktreeBranch && !existingWorktreePath) {
			const derivedWorktreePath = buildParallelModeWorktreePath(event.worktreeBranch)
			this.deps.log(`[AgentManager] Session ${sessionId} derived worktree path: ${derivedWorktreePath}`)
			if (this.deps.registry.updateParallelModeInfo(sessionId, { worktreePath: derivedWorktreePath })) {
				updated = true
			}
		}

		if (updated) {
			this.deps.postStateToWebview()
		}
	}
}
