// kilocode_change - new file
import { AgentRegistry } from "./AgentRegistry"
import { renameMapKey } from "./mapUtils"
import type { RuntimeProcessHandlerCallbacks } from "./RuntimeProcessHandler"
import type { SessionGroupEvent } from "./types"
import type { ClineMessage } from "@roo-code/types"

export interface AgentManagerRuntimeCallbackCoordinatorDependencies {
	log: (message: string) => void
	registry: AgentRegistry
	sessionMessages: Map<string, ClineMessage[]>
	firstApiReqStarted: Map<string, boolean>
	processStartTimes: Map<string, number>
	sendingMessageMap: Map<string, string>
	lastPostedChatMessages: Map<string, string>
	postMessage: (message: unknown) => void
	postChatMessages: (sessionId: string, messages: ClineMessage[], options?: { force?: boolean }) => void
	postStateToWebview: () => void
	publishGroupEvent: (
		groupId: string,
		sessionId: string,
		eventType: SessionGroupEvent["eventType"],
		summary?: string,
	) => void
	trackSessionStarted: (sessionId: string, parallelModeEnabled: boolean) => void
	renameBackgroundSessionBinding: (oldId: string, newId: string) => void
	handleWorktreeSessionCreated: (sessionId: string, worktreePath: string) => Promise<void> | void
}

type RuntimePendingSession = Parameters<RuntimeProcessHandlerCallbacks["onPendingSessionChanged"]>[0]

type CoordinatedRuntimeCallbacks = Pick<
	RuntimeProcessHandlerCallbacks,
	| "onPendingSessionChanged"
	| "onChatMessages"
	| "onSessionCreated"
	| "onSessionRenamed"
	| "onModeChanged"
	| "onWorktreeSessionCreated"
>

export class AgentManagerRuntimeCallbackCoordinator {
	constructor(private readonly deps: AgentManagerRuntimeCallbackCoordinatorDependencies) {}

	public createCallbacks(): CoordinatedRuntimeCallbacks {
		return {
			onPendingSessionChanged: (pendingSession) => this.handlePendingSessionChanged(pendingSession),
			onChatMessages: (sessionId, messages) => this.handleChatMessages(sessionId, messages),
			onSessionCreated: (sawApiReqStarted, resumeInfo) => this.handleSessionCreated(sawApiReqStarted, resumeInfo),
			onSessionRenamed: (oldId, newId) => this.handleSessionRenamed(oldId, newId),
			onModeChanged: (sessionId, mode, previousMode) => this.handleModeChanged(sessionId, mode, previousMode),
			onWorktreeSessionCreated: (sessionId, worktreePath) => {
				void this.deps.handleWorktreeSessionCreated(sessionId, worktreePath)
			},
		}
	}

	private handlePendingSessionChanged(pendingSession: RuntimePendingSession): void {
		this.deps.postMessage({ type: "agentManager.pendingSession", pendingSession })
	}

	private handleChatMessages(sessionId: string, messages: ClineMessage[]): void {
		const existingMessages = this.deps.sessionMessages.get(sessionId) || []
		const existingByTs = new Map(existingMessages.map((message) => [message.ts, message]))

		for (const message of messages) {
			existingByTs.set(message.ts, message)
		}

		const mergedMessages = Array.from(existingByTs.values()).sort((a, b) => a.ts - b.ts)
		this.deps.sessionMessages.set(sessionId, mergedMessages)
		this.deps.postChatMessages(sessionId, mergedMessages)
	}

	private handleSessionCreated(sawApiReqStarted: boolean, resumeInfo?: { prompt: string; images?: string[] }): void {
		const sessions = this.deps.registry.getSessions()
		if (sessions.length === 0) {
			return
		}

		const latestSession = sessions[0]
		const existingMessages = this.deps.sessionMessages.get(latestSession.sessionId) || []
		const isResumedSession = existingMessages.length > 0

		this.deps.log(
			`[AgentManager] onSessionCreated: sessionId=${latestSession.sessionId}, existingMessages=${existingMessages.length}, isResumed=${isResumedSession}, hasResumeInfo=${!!resumeInfo}`,
		)

		const updatedMessages = isResumedSession ? [...existingMessages] : []
		this.deps.sessionMessages.set(latestSession.sessionId, updatedMessages)
		this.deps.postChatMessages(latestSession.sessionId, updatedMessages, { force: true })

		if (sawApiReqStarted || isResumedSession) {
			this.deps.firstApiReqStarted.set(latestSession.sessionId, true)
		}

		this.deps.trackSessionStarted(latestSession.sessionId, latestSession.parallelMode?.enabled ?? false)
		if (latestSession.sessionGroup?.groupId) {
			this.deps.publishGroupEvent(
				latestSession.sessionGroup.groupId,
				latestSession.sessionId,
				"running",
				latestSession.label,
			)
		}
	}

	private handleModeChanged(sessionId: string, mode: string, previousMode: string): void {
		this.deps.log(`[AgentManager] Mode changed for session ${sessionId}: ${previousMode} -> ${mode}`)
		this.deps.registry.updateSessionMode(sessionId, mode)
		this.deps.postMessage({
			type: "agentManager.modeChanged",
			sessionId,
			mode,
			previousMode,
		})
		this.deps.postStateToWebview()
	}

	private handleSessionRenamed(oldId: string, newId: string): void {
		this.deps.log(`[AgentManager] Renaming session: ${oldId} -> ${newId}`)

		renameMapKey(this.deps.sessionMessages, oldId, newId)
		renameMapKey(this.deps.firstApiReqStarted, oldId, newId)
		renameMapKey(this.deps.processStartTimes, oldId, newId)
		renameMapKey(this.deps.sendingMessageMap, oldId, newId)
		this.deps.lastPostedChatMessages.delete(oldId)
		this.deps.lastPostedChatMessages.delete(newId)

		const messages = this.deps.sessionMessages.get(newId)
		if (messages) {
			this.deps.postChatMessages(newId, messages, { force: true })
		}

		this.deps.renameBackgroundSessionBinding(oldId, newId)
	}
}
