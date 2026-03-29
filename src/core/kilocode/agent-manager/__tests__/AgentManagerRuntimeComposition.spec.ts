// kilocode_change - new file
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AgentRegistry } from "../AgentRegistry"
import { createAgentManagerRuntimeComposition } from "../AgentManagerRuntimeComposition"
import type { KilocodePayload, StreamEvent } from "../CliOutputParser"
import type { RuntimeProcessHandlerCallbacks } from "../RuntimeProcessHandler"

const mocked = vi.hoisted(() => {
	const coordinatedCallbacks = {
		onPendingSessionChanged: vi.fn(),
		onChatMessages: vi.fn(),
		onSessionCreated: vi.fn(),
		onSessionRenamed: vi.fn(),
		onModeChanged: vi.fn(),
		onWorktreeSessionCreated: vi.fn(),
	}

	return {
		coordinatorCtor: vi.fn(),
		createCallbacks: vi.fn(() => coordinatedCallbacks),
		coordinatedCallbacks,
		processHandlerInstance: {
			spawnProcess: vi.fn(),
			stopProcess: vi.fn(),
		},
		processHandlerCtor: vi.fn(),
		eventProcessorInstance: {
			handle: vi.fn(),
		},
		eventProcessorCtor: vi.fn(),
		runtimeEventRouterInstance: {
			handleEvent: vi.fn(),
		},
		runtimeEventRouterCtor: vi.fn(),
		spawnExecutorInstance: {
			executeSpawnPlan: vi.fn(),
		},
		spawnExecutorCtor: vi.fn(),
	}
})

vi.mock("../AgentManagerRuntimeCallbackCoordinator", () => ({
	AgentManagerRuntimeCallbackCoordinator: vi.fn().mockImplementation((deps) => {
		mocked.coordinatorCtor(deps)
		return {
			createCallbacks: mocked.createCallbacks,
		}
	}),
}))

vi.mock("../RuntimeProcessHandler", () => ({
	RuntimeProcessHandler: vi.fn().mockImplementation((...args) => {
		mocked.processHandlerCtor(...args)
		return mocked.processHandlerInstance
	}),
}))

vi.mock("../KilocodeEventProcessor", () => ({
	KilocodeEventProcessor: vi.fn().mockImplementation((deps) => {
		mocked.eventProcessorCtor(deps)
		return mocked.eventProcessorInstance
	}),
}))

vi.mock("../AgentManagerRuntimeEventRouter", () => ({
	AgentManagerRuntimeEventRouter: vi.fn().mockImplementation((deps) => {
		mocked.runtimeEventRouterCtor(deps)
		return mocked.runtimeEventRouterInstance
	}),
}))

vi.mock("../AgentManagerSpawnExecutor", () => ({
	AgentManagerSpawnExecutor: vi.fn().mockImplementation((deps) => {
		mocked.spawnExecutorCtor(deps)
		return mocked.spawnExecutorInstance
	}),
}))

function createDeps() {
	return {
		registry: new AgentRegistry(),
		log: vi.fn<(message: string) => void>(),
		logSession: vi.fn<(sessionId: string, line: string) => void>(),
		sessionMessages: new Map(),
		firstApiReqStarted: new Map(),
		processStartTimes: new Map(),
		sendingMessageMap: new Map(),
		lastPostedChatMessages: new Map(),
		postMessage: vi.fn<(message: unknown) => void>(),
		postChatMessages: vi.fn<(sessionId: string, messages: unknown[], options?: { force?: boolean }) => void>(),
		postStateToWebview: vi.fn<() => void>(),
		publishGroupEvent: vi.fn(),
		trackSessionStarted: vi.fn(),
		renameBackgroundSessionBinding: vi.fn(),
		handleWorktreeSessionCreated: vi.fn(),
		onRuntimeStateChanged: vi.fn(),
		onStartSessionFailed: vi.fn(),
		onSessionCompleted: vi.fn(),
		showPaymentRequiredPrompt: vi.fn(),
		handleSessionError: vi.fn(),
		handleSessionComplete: vi.fn(),
		handleSessionInterrupted: vi.fn(),
		extensionPath: "/mock/extension",
		vscodeAppRoot: "/mock/vscode",
	}
}

describe("createAgentManagerRuntimeComposition", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("assembles the runtime object graph with shared instances and callback delegation intact", () => {
		const deps = createDeps()
		const payload = { ask: "payment_required_prompt", type: "ask" } as KilocodePayload
		const streamEvent = {
			streamEventType: "status",
			message: "Runtime ready",
			timestamp: new Date().toISOString(),
		} as StreamEvent
		const kilocodeEvent = {
			streamEventType: "kilocode",
			payload: { type: "say", say: "text", content: "hello" },
		} as StreamEvent

		const composition = createAgentManagerRuntimeComposition(deps)
		const processHandlerCallbacks = composition.processHandlerCallbacks as RuntimeProcessHandlerCallbacks

		expect(mocked.coordinatorCtor).toHaveBeenCalledWith(
			expect.objectContaining({
				registry: deps.registry,
				sessionMessages: deps.sessionMessages,
				firstApiReqStarted: deps.firstApiReqStarted,
				processStartTimes: deps.processStartTimes,
				sendingMessageMap: deps.sendingMessageMap,
				lastPostedChatMessages: deps.lastPostedChatMessages,
			}),
		)
		expect(mocked.processHandlerCtor).toHaveBeenCalledWith(
			deps.registry,
			processHandlerCallbacks,
			"/mock/extension",
			"/mock/vscode",
		)
		expect(mocked.eventProcessorCtor).toHaveBeenCalledWith(
			expect.objectContaining({
				processHandler: mocked.processHandlerInstance,
				registry: deps.registry,
				sessionMessages: deps.sessionMessages,
				firstApiReqStarted: deps.firstApiReqStarted,
			}),
		)
		expect(mocked.runtimeEventRouterCtor).toHaveBeenCalledWith(
			expect.objectContaining({
				processStartTimes: deps.processStartTimes,
				registry: deps.registry,
			}),
		)
		expect(mocked.spawnExecutorCtor).toHaveBeenCalledWith(
			expect.objectContaining({
				processHandler: mocked.processHandlerInstance,
				processStartTimes: deps.processStartTimes,
			}),
		)
		expect(composition.processHandler).toBe(mocked.processHandlerInstance)
		expect(composition.eventProcessor).toBe(mocked.eventProcessorInstance)
		expect(composition.runtimeEventRouter).toBe(mocked.runtimeEventRouterInstance)
		expect(composition.spawnExecutor).toBe(mocked.spawnExecutorInstance)

		processHandlerCallbacks.onLog("hello")
		processHandlerCallbacks.onSessionLog("session-1", "line")
		processHandlerCallbacks.onStateChanged()
		processHandlerCallbacks.onStartSessionFailed({ type: "unknown", message: "boom" })
		processHandlerCallbacks.onSessionCompleted?.("session-1", 0)
		processHandlerCallbacks.onPaymentRequiredPrompt?.(payload)

		expect(deps.log).toHaveBeenCalledWith("[AgentManager] hello")
		expect(deps.logSession).toHaveBeenCalledWith("session-1", "line")
		expect(deps.onRuntimeStateChanged).toHaveBeenCalledTimes(1)
		expect(deps.onStartSessionFailed).toHaveBeenCalledWith({ type: "unknown", message: "boom" })
		expect(deps.onSessionCompleted).toHaveBeenCalledWith("session-1", 0)
		expect(deps.showPaymentRequiredPrompt).toHaveBeenCalledWith(payload)
		expect(processHandlerCallbacks.onPendingSessionChanged).toBe(
			mocked.coordinatedCallbacks.onPendingSessionChanged,
		)
		expect(processHandlerCallbacks.onChatMessages).toBe(mocked.coordinatedCallbacks.onChatMessages)
		expect(processHandlerCallbacks.onSessionCreated).toBe(mocked.coordinatedCallbacks.onSessionCreated)
		expect(processHandlerCallbacks.onSessionRenamed).toBe(mocked.coordinatedCallbacks.onSessionRenamed)
		expect(processHandlerCallbacks.onModeChanged).toBe(mocked.coordinatedCallbacks.onModeChanged)
		expect(processHandlerCallbacks.onWorktreeSessionCreated).toBe(
			mocked.coordinatedCallbacks.onWorktreeSessionCreated,
		)

		const eventProcessorDeps = mocked.eventProcessorCtor.mock.calls[0][0]
		eventProcessorDeps.postChatMessages("session-1", [])
		eventProcessorDeps.postState()
		eventProcessorDeps.postStateEvent("session-1", { eventType: "api_req_started" })
		eventProcessorDeps.onPaymentRequiredPrompt(payload)
		expect(deps.postChatMessages).toHaveBeenCalledWith("session-1", [])
		expect(deps.postStateToWebview).toHaveBeenCalledTimes(1)
		expect(deps.postMessage).toHaveBeenCalledWith({
			type: "agentManager.stateEvent",
			sessionId: "session-1",
			eventType: "api_req_started",
		})
		expect(deps.showPaymentRequiredPrompt).toHaveBeenCalledTimes(2)

		const routerDeps = mocked.runtimeEventRouterCtor.mock.calls[0][0]
		routerDeps.handleKilocodeEvent("session-1", kilocodeEvent)
		expect(mocked.eventProcessorInstance.handle).toHaveBeenCalledWith("session-1", kilocodeEvent)
		expect(routerDeps.handleSessionError).toBe(deps.handleSessionError)
		expect(routerDeps.handleSessionComplete).toBe(deps.handleSessionComplete)
		expect(routerDeps.handleSessionInterrupted).toBe(deps.handleSessionInterrupted)

		const spawnExecutorDeps = mocked.spawnExecutorCtor.mock.calls[0][0]
		spawnExecutorDeps.forwardCliEvent("session-1", streamEvent)
		expect(mocked.runtimeEventRouterInstance.handleEvent).toHaveBeenCalledWith("session-1", streamEvent)
	})
})
