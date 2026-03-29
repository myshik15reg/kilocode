// kilocode_change - new file
import { AgentRegistry } from "./AgentRegistry"
import type { KilocodePayload } from "./CliOutputParser"
import { KilocodeEventProcessor } from "./KilocodeEventProcessor"
import { AgentManagerRuntimeCallbackCoordinator } from "./AgentManagerRuntimeCallbackCoordinator"
import {
	AgentManagerRuntimeEventRouter,
	type AgentManagerRuntimeEventRouterDeps,
} from "./AgentManagerRuntimeEventRouter"
import { AgentManagerSpawnExecutor } from "./AgentManagerSpawnExecutor"
import { RuntimeProcessHandler, type RuntimeProcessHandlerCallbacks } from "./RuntimeProcessHandler"
import type { SessionGroupEvent } from "./types"
import type { ClineMessage } from "@roo-code/types"

export interface AgentManagerRuntimeCompositionDependencies {
	registry: AgentRegistry
	log: (message: string) => void
	logSession: (sessionId: string, line: string) => void
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
	onRuntimeStateChanged: RuntimeProcessHandlerCallbacks["onStateChanged"]
	onStartSessionFailed: RuntimeProcessHandlerCallbacks["onStartSessionFailed"]
	onSessionCompleted: NonNullable<RuntimeProcessHandlerCallbacks["onSessionCompleted"]>
	showPaymentRequiredPrompt: (payload: KilocodePayload) => void
	handleSessionError: AgentManagerRuntimeEventRouterDeps["handleSessionError"]
	handleSessionComplete: AgentManagerRuntimeEventRouterDeps["handleSessionComplete"]
	handleSessionInterrupted: AgentManagerRuntimeEventRouterDeps["handleSessionInterrupted"]
	extensionPath?: string
	vscodeAppRoot?: string
}

export interface AgentManagerRuntimeComposition {
	processHandlerCallbacks: RuntimeProcessHandlerCallbacks
	processHandler: RuntimeProcessHandler
	eventProcessor: KilocodeEventProcessor
	runtimeEventRouter: AgentManagerRuntimeEventRouter
	spawnExecutor: AgentManagerSpawnExecutor
}

export function createAgentManagerRuntimeComposition(
	deps: AgentManagerRuntimeCompositionDependencies,
): AgentManagerRuntimeComposition {
	const runtimeCallbackCoordinator = new AgentManagerRuntimeCallbackCoordinator({
		log: deps.log,
		registry: deps.registry,
		sessionMessages: deps.sessionMessages,
		firstApiReqStarted: deps.firstApiReqStarted,
		processStartTimes: deps.processStartTimes,
		sendingMessageMap: deps.sendingMessageMap,
		lastPostedChatMessages: deps.lastPostedChatMessages,
		postMessage: deps.postMessage,
		postChatMessages: deps.postChatMessages,
		postStateToWebview: deps.postStateToWebview,
		publishGroupEvent: deps.publishGroupEvent,
		trackSessionStarted: deps.trackSessionStarted,
		renameBackgroundSessionBinding: deps.renameBackgroundSessionBinding,
		handleWorktreeSessionCreated: deps.handleWorktreeSessionCreated,
	})

	const processHandlerCallbacks: RuntimeProcessHandlerCallbacks = {
		onLog: (message) => deps.log(`[AgentManager] ${message}`),
		onSessionLog: deps.logSession,
		onStateChanged: deps.onRuntimeStateChanged,
		onStartSessionFailed: deps.onStartSessionFailed,
		onSessionCompleted: deps.onSessionCompleted,
		onPaymentRequiredPrompt: deps.showPaymentRequiredPrompt,
		...runtimeCallbackCoordinator.createCallbacks(),
	}

	const processHandler = new RuntimeProcessHandler(
		deps.registry,
		processHandlerCallbacks,
		deps.extensionPath,
		deps.vscodeAppRoot,
	)

	const eventProcessor = new KilocodeEventProcessor({
		processHandler,
		registry: deps.registry,
		sessionMessages: deps.sessionMessages,
		firstApiReqStarted: deps.firstApiReqStarted,
		log: deps.logSession,
		postChatMessages: (sessionId, messages) => deps.postChatMessages(sessionId, messages),
		postState: deps.postStateToWebview,
		postStateEvent: (sessionId, payload) =>
			deps.postMessage({ type: "agentManager.stateEvent", sessionId, ...payload }),
		onPaymentRequiredPrompt: deps.showPaymentRequiredPrompt,
	})

	const runtimeEventRouter = new AgentManagerRuntimeEventRouter({
		processStartTimes: deps.processStartTimes,
		registry: deps.registry,
		log: deps.log,
		logSession: deps.logSession,
		postStateToWebview: deps.postStateToWebview,
		handleKilocodeEvent: (sessionId, event) => eventProcessor.handle(sessionId, event),
		handleSessionError: deps.handleSessionError,
		handleSessionComplete: deps.handleSessionComplete,
		handleSessionInterrupted: deps.handleSessionInterrupted,
	})

	const spawnExecutor = new AgentManagerSpawnExecutor({
		processHandler,
		processStartTimes: deps.processStartTimes,
		forwardCliEvent: (sessionId, event) => runtimeEventRouter.handleEvent(sessionId, event),
		log: deps.log,
	})

	return {
		processHandlerCallbacks,
		processHandler,
		eventProcessor,
		runtimeEventRouter,
		spawnExecutor,
	}
}
