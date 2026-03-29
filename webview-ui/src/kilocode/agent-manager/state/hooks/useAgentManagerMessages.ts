import { useEffect, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import type { ClineMessage } from "@roo-code/types"
import { updateSessionMessagesAtom } from "../atoms/messages"
import { updateSessionTodosAtom } from "../atoms/todos"
import { updateBranchesAtom } from "../atoms/branches"
import { updateModelsConfigAtom, modelsLoadFailedAtom, type AvailableModel } from "../atoms/models"
import { updateAvailableModesAtom, type AvailableMode } from "../atoms/modes"
import { extractTodosFromMessages } from "./extractTodosFromMessages"
import {
	upsertSessionAtom,
	removeSessionAtom,
	selectedSessionIdAtom,
	startSessionFailedCounterAtom,
	sessionOrderAtom,
	remoteSessionsAtom,
	pendingSessionAtom,
	isRefreshingRemoteSessionsAtom,
	updateSessionModeAtom,
	updateSessionGroupEventAtom,
	updateSessionGroupMessageAtom,
	updateRootTaskMessageAtom,
	schedulerStateAtom,
	type AgentSession,
	type RemoteSession,
	type PendingSession,
	type SchedulerState,
} from "../atoms/sessions"
import { sendSessionEventAtom, cleanupSessionMachineAtom } from "../atoms/stateMachine"
import type { SessionEvent } from "../sessionStateMachine"

interface AgentManagerState {
	sessions: AgentSession[]
	selectedId: string | null
	scheduler?: SchedulerState
}

interface ChatMessagesMessage {
	type: "agentManager.chatMessages"
	sessionId: string
	messages: ClineMessage[]
}

interface StateMessage {
	type: "agentManager.state"
	state: AgentManagerState
}

interface StartSessionFailedMessage {
	type: "agentManager.startSessionFailed"
}

interface RemoteSessionsMessage {
	type: "agentManager.remoteSessions"
	sessions: RemoteSession[]
}

interface PendingSessionMessage {
	type: "agentManager.pendingSession"
	pendingSession: PendingSession | null
}

interface StateEventMessage {
	type: "agentManager.stateEvent"
	sessionId: string
	eventType: string
	partial?: boolean
}

interface GroupMessageMessage {
	type: "agentManager.groupMessage"
	messageId: string
	groupId: string
	sourceSessionId: string
	sourceLabel?: string
	content: string
	includeSender?: boolean
	timestamp: number
}

interface GroupEventMessage {
	type: "agentManager.groupEvent"
	groupId: string
	sessionId: string
	eventType: "creating" | "running" | "completed" | "stopped" | "error"
	summary?: string
	timestamp: number
}

interface RootTaskMessageMessage {
	type: "agentManager.rootTaskMessage"
	messageId: string
	rootTaskId: string
	sourceSessionId: string
	sourceLabel?: string
	content: string
	includeSender?: boolean
	timestamp: number
}

interface BranchesMessage {
	type: "agentManager.branches"
	branches: string[]
	currentBranch?: string
}

interface AvailableModelsMessage {
	type: "agentManager.availableModels"
	provider: string
	currentModel: string
	models: AvailableModel[]
}

interface ModelsLoadFailedMessage {
	type: "agentManager.modelsLoadFailed"
	error?: string
}

interface AvailableModesMessage {
	type: "agentManager.availableModes"
	modes: AvailableMode[]
}

interface ModeChangedMessage {
	type: "agentManager.modeChanged"
	sessionId: string
	mode: string
	previousMode?: string
}

type ExtensionMessage =
	| ChatMessagesMessage
	| StateMessage
	| StartSessionFailedMessage
	| RemoteSessionsMessage
	| PendingSessionMessage
	| StateEventMessage
	| GroupEventMessage
	| GroupMessageMessage
	| RootTaskMessageMessage
	| BranchesMessage
	| AvailableModelsMessage
	| ModelsLoadFailedMessage
	| AvailableModesMessage
	| ModeChangedMessage
	| { type: string; [key: string]: unknown }

function mapToStateMachineEvent(eventType: string, partial?: boolean): SessionEvent | null {
	switch (eventType) {
		case "api_req_started":
			return { type: "api_req_started" }
		case "ask_followup":
			return { type: "ask_followup", partial: partial ?? false }
		case "ask_tool":
			return { type: "ask_tool", partial: partial ?? false }
		case "ask_command":
			return { type: "ask_command", partial: partial ?? false }
		case "ask_browser_action_launch":
			return { type: "ask_browser_action_launch", partial: partial ?? false }
		case "ask_use_mcp_server":
			return { type: "ask_use_mcp_server", partial: partial ?? false }
		case "ask_completion_result":
			return { type: "ask_completion_result" }
		case "ask_resume_task":
			return { type: "ask_resume_task" }
		case "ask_api_req_failed":
			return { type: "ask_api_req_failed" }
		case "ask_mistake_limit_reached":
			return { type: "ask_mistake_limit_reached" }
		case "ask_invalid_model":
			return { type: "ask_invalid_model" }
		case "ask_payment_required_prompt":
			return { type: "ask_payment_required_prompt" }
		case "cancel_session":
			return { type: "cancel_session" }
		default:
			return null
	}
}

export function useAgentManagerMessages() {
	const updateSessionMessages = useSetAtom(updateSessionMessagesAtom)
	const updateSessionTodos = useSetAtom(updateSessionTodosAtom)
	const updateBranches = useSetAtom(updateBranchesAtom)
	const updateModelsConfig = useSetAtom(updateModelsConfigAtom)
	const handleModelsLoadFailed = useSetAtom(modelsLoadFailedAtom)
	const updateAvailableModes = useSetAtom(updateAvailableModesAtom)
	const upsertSession = useSetAtom(upsertSessionAtom)
	const removeSession = useSetAtom(removeSessionAtom)
	const setSelectedSessionId = useSetAtom(selectedSessionIdAtom)
	const setStartSessionFailedCounter = useSetAtom(startSessionFailedCounterAtom)
	const setRemoteSessions = useSetAtom(remoteSessionsAtom)
	const setPendingSession = useSetAtom(pendingSessionAtom)
	const setSchedulerState = useSetAtom(schedulerStateAtom)
	const setIsRefreshingRemoteSessions = useSetAtom(isRefreshingRemoteSessionsAtom)
	const sendSessionEvent = useSetAtom(sendSessionEventAtom)
	const cleanupSessionMachine = useSetAtom(cleanupSessionMachineAtom)
	const updateSessionMode = useSetAtom(updateSessionModeAtom)
	const updateSessionGroupEvent = useSetAtom(updateSessionGroupEventAtom)
	const updateSessionGroupMessage = useSetAtom(updateSessionGroupMessageAtom)
	const updateRootTaskMessage = useSetAtom(updateRootTaskMessageAtom)
	const sessionOrder = useAtomValue(sessionOrderAtom)
	const hasInitializedSelection = useRef(false)
	const knownSessionsRef = useRef(new Set<string>())
	const recoverableSessionsRef = useRef(new Set<string>())

	useEffect(() => {
		function handleMessage(event: MessageEvent<ExtensionMessage>) {
			const message = event.data

			switch (message.type) {
				case "agentManager.chatMessages": {
					const { sessionId, messages } = message as ChatMessagesMessage
					updateSessionMessages({ sessionId, messages })
					const todos = extractTodosFromMessages(messages)
					updateSessionTodos({ sessionId, todos })
					break
				}

				case "agentManager.state": {
					const { state } = message as StateMessage
					setSchedulerState(state.scheduler ?? null)
					for (const session of state.sessions) {
						const isNewSession = !knownSessionsRef.current.has(session.sessionId)
						// kilocode_change start
						const isDone = session.status === "done"
						const isRecoverable =
							!isDone &&
							(session.lifecycleStatus === "paused" ||
								session.lifecycleStatus === "recoverable" ||
								session.recoveryState === "recoverable")
						// kilocode_change end
						const isRunningLike = session.status === "creating" || session.status === "running"
						upsertSession(session)
						if (isNewSession) {
							knownSessionsRef.current.add(session.sessionId)
							if (isRunningLike && !isRecoverable) {
								sendSessionEvent({ sessionId: session.sessionId, event: { type: "start_session" } })
								sendSessionEvent({
									sessionId: session.sessionId,
									event: { type: "session_created", sessionId: session.sessionId },
								})
								if (session.status === "running") {
									sendSessionEvent({
										sessionId: session.sessionId,
										event: { type: "api_req_started" },
									})
								}
							} else if (isRecoverable) {
								sendSessionEvent({ sessionId: session.sessionId, event: { type: "start_session" } })
								sendSessionEvent({
									sessionId: session.sessionId,
									event: { type: "session_created", sessionId: session.sessionId },
								})
								sendSessionEvent({ sessionId: session.sessionId, event: { type: "api_req_started" } })
								sendSessionEvent({ sessionId: session.sessionId, event: { type: "ask_resume_task" } })
								recoverableSessionsRef.current.add(session.sessionId)
							}
						} else if (isRecoverable && !recoverableSessionsRef.current.has(session.sessionId)) {
							sendSessionEvent({
								sessionId: session.sessionId,
								event: { type: "session_created", sessionId: session.sessionId },
							})
							sendSessionEvent({ sessionId: session.sessionId, event: { type: "api_req_started" } })
							sendSessionEvent({ sessionId: session.sessionId, event: { type: "ask_resume_task" } })
							recoverableSessionsRef.current.add(session.sessionId)
							// kilocode_change start
						} else if (
							!isRecoverable &&
							isRunningLike &&
							recoverableSessionsRef.current.has(session.sessionId)
						) {
							sendSessionEvent({ sessionId: session.sessionId, event: { type: "api_req_started" } })
							recoverableSessionsRef.current.delete(session.sessionId)
							// kilocode_change end
						} else if (!isRecoverable) {
							recoverableSessionsRef.current.delete(session.sessionId)
						}
					}
					const extensionSessionIds = new Set(state.sessions.map((s) => s.sessionId))
					for (const sessionId of sessionOrder) {
						if (!extensionSessionIds.has(sessionId)) {
							removeSession(sessionId)
							cleanupSessionMachine(sessionId)
							knownSessionsRef.current.delete(sessionId)
							recoverableSessionsRef.current.delete(sessionId)
						}
					}
					if (!hasInitializedSelection.current && state.selectedId !== undefined) {
						setSelectedSessionId(state.selectedId)
						hasInitializedSelection.current = true
					}
					break
				}

				case "agentManager.startSessionFailed": {
					setStartSessionFailedCounter((c) => c + 1)
					setPendingSession(null)
					break
				}

				case "agentManager.remoteSessions": {
					const { sessions } = message as RemoteSessionsMessage
					setRemoteSessions(sessions)
					setIsRefreshingRemoteSessions(false)
					break
				}

				case "agentManager.pendingSession": {
					const { pendingSession } = message as PendingSessionMessage
					setPendingSession(pendingSession)
					break
				}

				case "agentManager.stateEvent": {
					const { sessionId, eventType, partial } = message as StateEventMessage
					const stateEvent = mapToStateMachineEvent(eventType, partial)
					if (stateEvent) {
						sendSessionEvent({ sessionId, event: stateEvent })
					}
					break
				}

				case "agentManager.groupEvent": {
					updateSessionGroupEvent(message as GroupEventMessage)
					break
				}

				case "agentManager.groupMessage": {
					updateSessionGroupMessage(message as GroupMessageMessage)
					break
				}

				case "agentManager.rootTaskMessage": {
					updateRootTaskMessage(message as RootTaskMessageMessage)
					break
				}

				case "agentManager.branches": {
					const { branches, currentBranch } = message as BranchesMessage
					updateBranches({ branches, currentBranch })
					break
				}

				case "agentManager.availableModels": {
					const { provider, currentModel, models } = message as AvailableModelsMessage
					updateModelsConfig({ provider, currentModel, models })
					break
				}

				case "agentManager.modelsLoadFailed": {
					const { error } = message as ModelsLoadFailedMessage
					handleModelsLoadFailed(error)
					break
				}

				case "agentManager.availableModes": {
					const { modes } = message as AvailableModesMessage
					updateAvailableModes(modes)
					break
				}

				case "agentManager.modeChanged": {
					const { sessionId, mode } = message as ModeChangedMessage
					updateSessionMode({ sessionId, mode })
					break
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [
		updateSessionMessages,
		updateSessionTodos,
		updateBranches,
		updateModelsConfig,
		handleModelsLoadFailed,
		updateAvailableModes,
		upsertSession,
		removeSession,
		setSelectedSessionId,
		setStartSessionFailedCounter,
		setRemoteSessions,
		setPendingSession,
		setSchedulerState,
		setIsRefreshingRemoteSessions,
		sendSessionEvent,
		cleanupSessionMachine,
		updateSessionMode,
		updateSessionGroupEvent,
		updateSessionGroupMessage,
		updateRootTaskMessage,
		sessionOrder,
	])
}
