import * as vscode from "vscode"
import * as fs from "node:fs"
import * as path from "node:path"
import { t } from "i18next"
import { AgentRegistry } from "./AgentRegistry"
import { WorktreeManager, WorktreeError } from "./WorktreeManager"
import { SetupScriptService } from "./SetupScriptService"
import { SetupScriptRunner } from "./SetupScriptRunner"
import { AgentTaskRunner, AgentTasks } from "./AgentTaskRunner"
import { RuntimeProcessHandler, type RuntimeProcessHandlerCallbacks } from "./RuntimeProcessHandler"
import type { StreamEvent, KilocodePayload } from "./CliOutputParser"
import { extractRawText, tryParsePayloadJson } from "./askErrorParser"
import { RemoteSessionService } from "./RemoteSessionService"
import type { SessionData } from "./RemoteSessionService"
import { KilocodeEventProcessor } from "./KilocodeEventProcessor"
import { AgentManagerResumeOrchestrator } from "./AgentManagerResumeOrchestrator"
// kilocode_change start
import { AgentManagerSessionSpawnPlanner, type NormalizedAgentSpawnPlan } from "./AgentManagerSessionSpawnPlanner"
import { AgentManagerSpawnExecutor, type AgentManagerSpawnExecutionFailureReason } from "./AgentManagerSpawnExecutor"
import { createAgentManagerRuntimeComposition } from "./AgentManagerRuntimeComposition"
import { createAgentManagerBackgroundComposition } from "./AgentManagerBackgroundComposition"
import type { RemoteSession, AgentSession, SessionGroupEvent, SessionGroupMessage } from "./types"
import {
	persistBackgroundBindingsToWorkspaceState,
	planPersistedBackgroundBindingRestoration,
	readPersistedBackgroundBindingsFromWorkspaceState,
	type BackgroundSessionBinding,
} from "./BackgroundSubagentLifecycle"
import { BackgroundSubagentControl } from "./BackgroundSubagentControl"
import { BackgroundSubagentBindingCoordinator } from "./BackgroundSubagentBindingCoordinator"
import { BackgroundSubagentEventBridge } from "./BackgroundSubagentEventBridge"
import { AgentManagerCompletionFollowUp } from "./AgentManagerCompletionFollowUp"
import {
	AgentManagerQueuedLaunchScheduler,
	getQueuedSessionLaunchQueueKey,
	type QueuedSessionLaunch,
} from "./AgentManagerQueuedLaunchScheduler"
import { AgentManagerRelayOrchestrator } from "./AgentManagerRelayOrchestrator"
import { AgentManagerRuntimeEventRouter } from "./AgentManagerRuntimeEventRouter"
// kilocode_change end
import { getUri } from "../../webview/getUri"
import { getNonce } from "../../webview/getNonce"
import { getViteDevServerConfig } from "../../webview/getViteDevServerConfig"
import { getRemoteUrl } from "../../../services/code-index/managed/git-utils"
import { normalizeGitUrl } from "./normalizeGitUrl"
import type { ClineMessage } from "@roo-code/types"
import {
	getModelId,
	normalizeSubagentLaunchRequest,
	resolveSubagentLaunchTargetTaskId,
	type HistoryItem,
	type ProviderSettings,
	type SubagentLaunchRequest,
	type SubagentResultEvent,
	type SubagentStatusEvent,
} from "@roo-code/types"
import { Package } from "../../../shared/package"
import { DEFAULT_MODE_SLUG, DEFAULT_MODES } from "@roo-code/types"
import {
	captureAgentManagerOpened,
	captureAgentManagerSessionStarted,
	captureAgentManagerSessionStopped,
	captureAgentManagerLoginIssue,
	getPlatformDiagnostics,
} from "./telemetry"
import type { ClineProvider } from "../../webview/ClineProvider"
import { extractSessionConfigs, MAX_VERSION_COUNT } from "./multiVersionUtils"
import { SessionManager } from "../../../shared/kilocode/cli-sessions/core/SessionManager"
import { WorkspaceGitService } from "./WorkspaceGitService"
import { SessionTerminalManager } from "./SessionTerminalManager"
import { AgentManagerBridge } from "../../orchestration/bridge/AgentManagerBridge"
import { startSessionMessageSchema, type StartSessionMessage, type RootTaskMessage } from "./types"
import { openImage } from "../../../integrations/misc/image-handler"
import { getModelsFromCache } from "../../../api/providers/fetchers/modelCache"
import { isRouterName, type ModelRecord } from "../../../shared/api"

/**
 * Message format for sending responses to the agent runtime via IPC.
 * Used for user messages, approval responses, and other interactions.
 */
interface StdinAskResponseMessage {
	type: "askResponse"
	askResponse: "messageResponse" | "yesButtonClicked" | "noButtonClicked"
	text: string
	images?: string[]
}

// kilocode_change start
const DEFAULT_MAX_CONCURRENT_AGENT_SESSIONS = 4
const DEFAULT_MAX_CONCURRENT_PER_QUEUE_KEY = 1
// kilocode_change end

/**
 * AgentManagerProvider
 *
 * Manages the Agent Manager webview panel and orchestrates kilocode agents.
 * Each agent runs as a CLI process using `kilocode --auto --json`.
 */
export class AgentManagerProvider implements vscode.Disposable {
	public static readonly viewType = `${Package.name}.AgentManagerPanel`

	private panel: vscode.WebviewPanel | undefined
	private disposables: vscode.Disposable[] = []
	private registry: AgentRegistry
	private remoteSessionService: RemoteSessionService
	private processHandler: RuntimeProcessHandler
	private eventProcessor: KilocodeEventProcessor
	private terminalManager: SessionTerminalManager
	private sessionMessages: Map<string, ClineMessage[]> = new Map()
	// Track first api_req_started per session to filter user-input echoes
	private firstApiReqStarted: Map<string, boolean> = new Map()
	// Track the current workspace's git URL for filtering sessions
	private currentGitUrl: string | undefined
	private lastAuthErrorMessage: string | undefined
	// Track process start times to filter out replayed history events
	private processStartTimes: Map<string, number> = new Map()
	// Track currently sending message per session (for one-at-a-time constraint)
	private sendingMessageMap: Map<string, string> = new Map()
	// Worktree manager for parallel mode sessions (lazy initialized)
	private worktreeManager: WorktreeManager | undefined
	// Setup script service for worktree initialization (lazy initialized)
	private setupScriptService: SetupScriptService | undefined
	// Cached available models from extension (fetched on panel open)
	private availableModels: { provider: string; currentModel: string; models: ModelRecord } | null = null
	// Flag to track if models are being fetched
	private fetchingModels: boolean = false
	// kilocode_change start
	private latestGroupEvents: Map<string, SessionGroupEvent> = new Map()
	private maxConcurrentSessionStarts = DEFAULT_MAX_CONCURRENT_AGENT_SESSIONS
	private maxConcurrentPerQueueKey = DEFAULT_MAX_CONCURRENT_PER_QUEUE_KEY
	private readonly queuedLaunchScheduler: AgentManagerQueuedLaunchScheduler
	private queueKeyPressure: Map<string, number> = new Map()
	private resumeSessionDataCache: Map<
		string,
		{
			uiMessages: ClineMessage[]
			apiConversationHistory: unknown[]
			metadata: { sessionId: string; title: string; createdAt: string; mode: string | null }
		}
	> = new Map() // kilocode_change
	private relayContentCache: Map<string, string> = new Map() // kilocode_change
	private lastPostedChatMessages: Map<string, string> = new Map() // kilocode_change
	private lastPostedStateSignature: string | undefined // kilocode_change
	private lastPostedRemoteSessionsSignature: string | undefined // kilocode_change
	private visibleRemoteSessionIds: Set<string> = new Set()
	private lastPostedAvailableModesSignature: string | undefined // kilocode_change
	private lastPostedAvailableModelsSignature: string | undefined // kilocode_change
	private lastPostedBranchesSignature: string | undefined // kilocode_change
	private autoRestartProblematicProcesses = false
	private problematicProcessRestartLimit = 1
	private parallelAgentsEnabled = false // kilocode_change
	private parallelAgentCount = 2 // kilocode_change
	private sessionAutoRestartOverrides: Map<string, boolean> = new Map()
	// kilocode_change start
	private readonly backgroundSubagentControl: BackgroundSubagentControl
	private readonly backgroundSubagentBindingCoordinator: BackgroundSubagentBindingCoordinator
	private readonly backgroundSubagentEventBridge: BackgroundSubagentEventBridge
	private readonly backgroundSessionBindings: Map<string, BackgroundSessionBinding>
	private readonly completionFollowUp: AgentManagerCompletionFollowUp
	private readonly relayOrchestrator: AgentManagerRelayOrchestrator
	private readonly resumeOrchestrator: AgentManagerResumeOrchestrator
	private readonly sessionSpawnPlanner: AgentManagerSessionSpawnPlanner
	private readonly spawnExecutor: AgentManagerSpawnExecutor
	private readonly runtimeEventRouter: AgentManagerRuntimeEventRouter
	private readonly processHandlerCallbacks: RuntimeProcessHandlerCallbacks // kilocode_change
	// kilocode_change end

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel,
		private readonly provider: ClineProvider,
	) {
		this.registry = new AgentRegistry()
		this.remoteSessionService = new RemoteSessionService({ outputChannel })
		this.terminalManager = new SessionTerminalManager(this.registry, this.outputChannel)
		// kilocode_change start
		this.queuedLaunchScheduler = new AgentManagerQueuedLaunchScheduler({
			hasSessionLaunchCapacity: () => this.hasSessionLaunchCapacity(),
			hasQueueKeyCapacity: (queueKey) => this.hasQueueKeyCapacity(queueKey),
			getActiveSessionLoad: () => this.getActiveSessionLoad(),
			getMaxConcurrentSessionStarts: () => this.maxConcurrentSessionStarts,
			startLaunch: (prompt, options) => this.performStartAgentSession(prompt, options),
			log: (message) => this.outputChannel.appendLine(message),
		})
		const backgroundComposition = createAgentManagerBackgroundComposition({
			getSession: (sessionId) => this.registry.getSession(sessionId),
			updateSession: (sessionId, patch) => this.registry.updateSession(sessionId, patch),
			updateSessionStatus: (sessionId, status, exitCode, error) =>
				this.registry.updateSessionStatus(sessionId, status, exitCode, error),
			persistBindings: () => this.persistBackgroundBindings(),
			hasStdin: (sessionId) => this.processHandler.hasStdin(sessionId),
			writeToStdin: async (sessionId, payload, label) => {
				await this.safeWriteToStdin(sessionId, payload, label)
				if (label === "cancel") {
					this.log(sessionId, "Cancel request sent via stdin")
				}
			},
			stopSession: (sessionId) => this.stopAgentSession(sessionId),
			resumeSession: (sessionId, prompt, sessionLabel) => this.resumeSession(sessionId, prompt, sessionLabel),
			getSessionHistoryItem: (sessionId) => this.getSessionHistoryItem(sessionId),
			updateTaskHistory: this.provider.updateTaskHistory?.bind(this.provider),
			summarizeCompletion: (sessionId) =>
				AgentManagerBridge.summarizeCompletion(this.sessionMessages.get(sessionId)),
			postStateToWebview: () => this.postStateToWebview(),
			log: (message) => this.outputChannel.appendLine(message),
			hasQueuedLaunches: () => this.queuedLaunchScheduler.hasQueuedLaunches(),
			hasBackgroundSubagentCapacity: (request) => this.hasBackgroundSubagentCapacity(request),
			createSession: (sessionId, prompt, startTime, options) =>
				this.registry.createSession(sessionId, prompt, startTime, options),
			postWebviewMessage: (message) => this.postMessage(message),
		})
		this.backgroundSubagentControl = backgroundComposition.backgroundSubagentControl
		this.backgroundSessionBindings = backgroundComposition.backgroundSessionBindings
		this.backgroundSubagentEventBridge = backgroundComposition.backgroundSubagentEventBridge
		this.backgroundSubagentBindingCoordinator = backgroundComposition.backgroundSubagentBindingCoordinator
		this.completionFollowUp = new AgentManagerCompletionFollowUp({
			queueKeyPressure: this.queueKeyPressure,
			maxConcurrentPerQueueKey: () => this.maxConcurrentPerQueueKey,
			getQueueKey: (options) => getQueuedSessionLaunchQueueKey(options),
			updateSessionStatus: (sessionId, status, exitCode, error) => {
				this.registry.updateSessionStatus(sessionId, status, exitCode, error)
			},
			updateSession: (sessionId, patch) => {
				this.registry.updateSession(sessionId, patch)
			},
			log: (sessionId, line) => this.log(sessionId, line),
			publishSessionGroupEvent: (session, sessionId, eventType, summary) =>
				this.publishSessionGroupEvent(session, sessionId, eventType, summary),
			postStateEvent: (sessionId, payload) =>
				this.postMessage({ type: "agentManager.stateEvent", sessionId, ...payload }),
			fetchAndPostRemoteSessions: () => this.fetchAndPostRemoteSessions(),
			postStateToWebview: () => this.postStateToWebview(),
			drainQueuedSessionLaunches: () => this.drainQueuedSessionLaunches(),
			postStartSessionFailed: () => this.postMessage({ type: "agentManager.startSessionFailed" }),
			showPaymentRequiredPrompt: (payload) => this.showPaymentRequiredPrompt(payload),
			handleStartSessionApiFailure: (error) => this.handleStartSessionApiFailure(error),
			showAgentError: (error) => this.showAgentError(error),
		})
		this.relayOrchestrator = new AgentManagerRelayOrchestrator({
			getQueueKey: (options) => this.getQueueKey(options),
			getQueuePressure: (queueKey) => this.queueKeyPressure.get(queueKey) ?? 0,
			getSchedulerState: () => this.getSchedulerState(),
			getSessionHistoryItem: (sessionId) => this.getSessionHistoryItem(sessionId),
			getResumeSessionApiConversationHistory: (sessionId) =>
				this.resumeSessionDataCache.get(sessionId)?.apiConversationHistory,
			buildProviderRecoveryPacket: async ({ historyItem, apiConversationHistory }) => {
				const buildRecoveryPacket = (this.provider as any).buildRecoveryPacket
				if (typeof buildRecoveryPacket !== "function") {
					return undefined
				}
				return buildRecoveryPacket.call(this.provider, { historyItem, apiConversationHistory })
			},
			getNow: () => Date.now(),
		})
		this.resumeOrchestrator = new AgentManagerResumeOrchestrator({
			hasRunningRuntime: (sessionId) => this.processHandler.hasStdin(sessionId),
			getCachedSessionData: (sessionId) => this.resumeSessionDataCache.get(sessionId) as SessionData | undefined,
			cacheSessionData: (sessionId, sessionData) => {
				this.resumeSessionDataCache.set(sessionId, sessionData)
			},
			fetchSessionDataForResume: (sessionId) => this.remoteSessionService.fetchSessionDataForResume(sessionId),
			createWorktree: (params) => this.getWorktreeManager().createWorktree(params),
			updateSessionParallelMode: (sessionId, info) => {
				this.registry.updateParallelModeInfo(sessionId, info)
			},
			isReusableWorktree: (worktreePath) =>
				fs.existsSync(worktreePath) && fs.existsSync(path.join(worktreePath, ".git")),
			log: (message) => this.outputChannel.appendLine(message),
		})
		this.sessionSpawnPlanner = new AgentManagerSessionSpawnPlanner({
			getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
			resolveGitUrl: async (workspaceFolder) => normalizeGitUrl(await getRemoteUrl(workspaceFolder)),
			rememberCurrentGitUrl: (gitUrl) => {
				if (!this.currentGitUrl) {
					this.currentGitUrl = gitUrl
					this.outputChannel.appendLine(`[AgentManager] Updated current git URL: ${gitUrl}`)
				}
			},
			prepareWorktreeForSession: (prompt, existingBranch) =>
				this.prepareWorktreeForSession(prompt, existingBranch),
			runSetupScriptForWorktree: (worktreePath) => this.runSetupScriptForWorktree(worktreePath),
			getApiConfigurationForCli: (helperProfile) => this.getApiConfigurationForCli(helperProfile),
			getCustomModes: () => this.provider.customModesManager.getCustomModes(),
			log: (message) => this.outputChannel.appendLine(message),
		})
		// kilocode_change end

		// Initialize currentGitUrl from workspace
		void this.initializeCurrentGitUrl()
		void this.refreshRestartPolicyState()
		void this.restorePersistedBackgroundBindings()

		// kilocode_change start
		const runtimeComposition = createAgentManagerRuntimeComposition({
			registry: this.registry,
			log: (message) => this.outputChannel.appendLine(message),
			logSession: (sessionId, line) => this.log(sessionId, line),
			sessionMessages: this.sessionMessages,
			firstApiReqStarted: this.firstApiReqStarted,
			processStartTimes: this.processStartTimes,
			sendingMessageMap: this.sendingMessageMap,
			lastPostedChatMessages: this.lastPostedChatMessages,
			postMessage: (message) => this.postMessage(message),
			postChatMessages: (sessionId, messages, options) => this.postChatMessages(sessionId, messages, options),
			postStateToWebview: () => this.postStateToWebview(),
			publishGroupEvent: (groupId, sessionId, eventType, summary) =>
				this.publishGroupEvent(groupId, sessionId, eventType, summary),
			trackSessionStarted: (sessionId, parallelModeEnabled) =>
				captureAgentManagerSessionStarted(sessionId, parallelModeEnabled),
			renameBackgroundSessionBinding: (oldId, newId) =>
				this.backgroundSubagentBindingCoordinator.handleSessionRenamed(oldId, newId),
			handleWorktreeSessionCreated: (sessionId, worktreePath) =>
				this.handleWorktreeSessionCreated(sessionId, worktreePath),
			onRuntimeStateChanged: () => this.completionFollowUp.handleRuntimeStateChanged(),
			onStartSessionFailed: (error) => this.completionFollowUp.handleStartSessionFailed(error),
			onSessionCompleted: (sessionId, exitCode) => {
				this.backgroundSubagentEventBridge.handleSessionCompleted(sessionId, exitCode)
				this.completionFollowUp.requestQueueDrain()
			},
			showPaymentRequiredPrompt: (payload) => this.showPaymentRequiredPrompt(payload),
			handleSessionError: ({ sessionId, session, event }) => {
				this.completionFollowUp.handleSessionError({
					sessionId,
					session,
					error: event.error,
					details: event.details,
				})
			},
			handleSessionComplete: ({ sessionId, session, event }) => {
				this.completionFollowUp.handleSessionComplete({
					sessionId,
					session,
					exitCode: event.exitCode,
				})
			},
			handleSessionInterrupted: ({ sessionId, session, event }) => {
				this.completionFollowUp.handleSessionInterrupted({
					sessionId,
					session,
					reason: event.reason,
				})
			},
			extensionPath: this.context.extensionUri.fsPath,
			vscodeAppRoot: vscode.env.appRoot,
		})
		this.processHandlerCallbacks = runtimeComposition.processHandlerCallbacks // kilocode_change
		this.processHandler = runtimeComposition.processHandler
		this.eventProcessor = runtimeComposition.eventProcessor
		this.runtimeEventRouter = runtimeComposition.runtimeEventRouter
		this.spawnExecutor = runtimeComposition.spawnExecutor
	}

	/**
	 * Build a message for RuntimeProcessHandler with base64 images directly.
	 * The agent-runtime extension expects base64 data URLs.
	 */
	private buildRuntimeMessage(content: string, images?: string[]): StdinAskResponseMessage {
		const message: StdinAskResponseMessage = {
			type: "askResponse",
			askResponse: "messageResponse",
			text: content,
		}

		if (images && images.length > 0) {
			// Pass base64 data URLs directly - the extension expects this format
			message.images = images
			this.outputChannel.appendLine(
				`[AgentManager] buildRuntimeMessage: attaching ${images.length} images, first image length: ${images[0]?.length || 0}`,
			)
		}

		return message
	}

	/**
	 * Open or focus the Agent Manager panel
	 */
	public async openPanel(): Promise<void> {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.One)
			return
		}

		this.panel = vscode.window.createWebviewPanel(
			AgentManagerProvider.viewType,
			"Agent Manager",
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [this.context.extensionUri],
			},
		)

		this.panel.iconPath = {
			light: vscode.Uri.joinPath(this.context.extensionUri, "assets", "icons", "kilo.png"),
			dark: vscode.Uri.joinPath(this.context.extensionUri, "assets", "icons", "kilo-dark.png"),
		}

		this.panel.webview.html =
			this.context.extensionMode === vscode.ExtensionMode.Development
				? await this.getHMRHtmlContent(this.panel.webview)
				: this.getHtmlContent(this.panel.webview)

		this.panel.webview.onDidReceiveMessage((message) => this.handleMessage(message), null, this.disposables)

		this.panel.onDidDispose(
			() => {
				this.handlePanelDisposed()
			},
			null,
			this.disposables,
		)

		this.outputChannel.appendLine("Agent Manager panel opened")

		// Track Agent Manager panel opened
		captureAgentManagerOpened()
	}

	/**
	 * Handle worktree session creation by writing the task ID to the worktree.
	 * This enables session recovery after extension restarts.
	 */
	private async handleWorktreeSessionCreated(sessionId: string, worktreePath: string): Promise<void> {
		try {
			const manager = this.getWorktreeManager()
			await manager.writeSessionId(worktreePath, sessionId)
			this.outputChannel.appendLine(`[AgentManager] Wrote session ID ${sessionId} to worktree ${worktreePath}`)
		} catch (error) {
			this.outputChannel.appendLine(
				`[AgentManager] Failed to write session ID to worktree: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	private handlePanelDisposed(): void {
		this.panel = undefined
		this.lastPostedStateSignature = undefined // kilocode_change
		this.lastPostedRemoteSessionsSignature = undefined // kilocode_change
		this.lastPostedAvailableModesSignature = undefined // kilocode_change
		this.lastPostedAvailableModelsSignature = undefined // kilocode_change
		this.lastPostedBranchesSignature = undefined // kilocode_change
		this.visibleRemoteSessionIds.clear()
	}

	private getVisibleLocalSessions(): AgentSession[] {
		return this.registry.getSessionsForGitUrl(this.currentGitUrl)
	}

	private isLocalSessionVisibleInCurrentScope(sessionId: string): boolean {
		return this.getVisibleLocalSessions().some((session) => session.sessionId === sessionId)
	}

	private isRemoteSessionVisibleInCurrentScope(sessionId: string): boolean {
		return this.visibleRemoteSessionIds.has(sessionId)
	}

	private authorizeLocalSessionAccess(sessionId: string, action: string): boolean {
		if (sessionId && this.isLocalSessionVisibleInCurrentScope(sessionId)) {
			return true
		}

		this.outputChannel.appendLine(`[AgentManager] Rejected ${action} for out-of-scope local session: ${sessionId}`)
		void vscode.window.showErrorMessage(`Cannot ${action} a session outside the current workspace scope.`)
		return false
	}

	private authorizeVisibleSessionAccess(sessionId: string, action: string): boolean {
		if (
			sessionId &&
			(this.isLocalSessionVisibleInCurrentScope(sessionId) ||
				this.isRemoteSessionVisibleInCurrentScope(sessionId))
		) {
			return true
		}

		this.outputChannel.appendLine(
			`[AgentManager] Rejected ${action} for out-of-scope visible session: ${sessionId}`,
		)
		void vscode.window.showErrorMessage(`Cannot ${action} a session outside the current workspace scope.`)
		return false
	}

	private authorizeGroupAccess(groupId: string, action: string): boolean {
		if (groupId && this.getVisibleLocalSessions().some((session) => session.sessionGroup?.groupId === groupId)) {
			return true
		}

		this.outputChannel.appendLine(`[AgentManager] Rejected ${action} for out-of-scope session group: ${groupId}`)
		void vscode.window.showErrorMessage(`Cannot ${action} a session group outside the current workspace scope.`)
		return false
	}

	private handleMessage(message: { type: string; [key: string]: unknown }): void {
		this.outputChannel.appendLine(`Agent Manager received message: ${JSON.stringify(message)}`)

		try {
			switch (message.type) {
				case "agentManager.webviewReady":
					this.postStateToWebview({ force: true }) // kilocode_change
					void this.refreshRestartPolicyState().then(() => this.postStateToWebview())
					void this.fetchAndPostRemoteSessions()
					void this.fetchAndPostAvailableModels()
					void this.fetchAndPostAvailableModes()
					break
				case "agentManager.refreshModels":
					void this.fetchAndPostAvailableModels(true)
					break
				case "agentManager.startSession":
					void this.handleStartSession(message)
					break
				case "agentManager.stopSession":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "stop")) {
						this.stopAgentSession(message.sessionId as string)
					}
					break
				case "agentManager.restartSession":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "restart")) {
						void this.restartSession(message.sessionId as string)
					}
					break
				case "agentManager.restartSessionCompact":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "restart")) {
						void this.restartSession(message.sessionId as string, { compact: true })
					}
					break
				case "agentManager.setSessionAutoRestart":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "change auto-restart for")) {
						this.setSessionAutoRestart(message.sessionId as string, Boolean(message.enabled))
					}
					break
				case "agentManager.restartSessionGroupCompact":
					if (this.authorizeGroupAccess(message.groupId as string, "restart")) {
						void this.restartSessionGroupCompact(message.groupId as string)
					}
					break
				case "agentManager.stopSessionGroup":
					if (this.authorizeGroupAccess(message.groupId as string, "stop")) {
						this.stopSessionGroup(message.groupId as string)
					}
					break
				case "agentManager.finishWorktreeSession":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "finish")) {
						void this.finishWorktreeSession(message.sessionId as string)
					}
					break
				case "agentManager.sendMessage":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "send a message to")) {
						void this.sendMessage(
							message.sessionId as string,
							message.content as string,
							message.sessionLabel as string | undefined,
							message.images as string[] | undefined,
						)
					}
					break
				case "agentManager.broadcastToGroup":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "broadcast from")) {
						void this.broadcastToSessionGroup(
							message.sessionId as string,
							message.content as string,
							Boolean(message.includeSender),
						)
					}
					break
				case "agentManager.broadcastToRootTask":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "broadcast from")) {
						void this.broadcastToRootTask(
							message.sessionId as string,
							message.content as string | undefined,
							Boolean(message.includeSender),
							message.compact !== false,
						)
					}
					break
				case "agentManager.messageQueued":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "queue a message for")) {
						void this.handleQueuedMessage(
							message.sessionId as string,
							message.messageId as string,
							message.content as string,
							message.sessionLabel as string | undefined,
							message.images as string[] | undefined,
						)
					}
					break
				case "agentManager.resumeSession":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "resume")) {
						void this.resumeSession(
							message.sessionId as string,
							message.content as string,
							message.sessionLabel as string | undefined,
							message.images as string[] | undefined,
						)
					}
					break
				case "agentManager.cancelSession":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "cancel")) {
						void this.cancelSession(message.sessionId as string)
					}
					break
				case "agentManager.respondToApproval":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "respond to approval for")) {
						void this.respondToApproval(
							message.sessionId as string,
							message.approved as boolean,
							message.text as string | undefined,
						)
					}
					break
				case "agentManager.removeSession":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "remove")) {
						this.removeSession(message.sessionId as string)
					}
					break
				case "agentManager.cancelPendingSession":
					this.cancelPendingSession()
					break
				case "agentManager.selectSession":
					if (
						message.sessionId === null ||
						this.authorizeLocalSessionAccess(message.sessionId as string, "select")
					) {
						this.selectSession(message.sessionId as string | null)
					}
					break
				case "agentManager.refreshRemoteSessions":
					void this.fetchAndPostRemoteSessions()
					break
				case "agentManager.listBranches":
					void this.handleListBranches()
					break
				case "agentManager.refreshSessionMessages":
					if (this.authorizeVisibleSessionAccess(message.sessionId as string, "refresh")) {
						void this.refreshSessionMessages(message.sessionId as string)
					}
					break
				case "agentManager.showTerminal":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "show terminal for")) {
						this.terminalManager.showTerminal(message.sessionId as string)
					}
					break
				case "agentManager.configureSetupScript":
					void this.configureSetupScript()
					break
				case "agentManager.sessionShare":
					if (!this.authorizeVisibleSessionAccess(message.sessionId as string, "share")) {
						break
					}
					SessionManager.init()
						?.shareSession(message.sessionId as string)
						.then((result) => {
							const shareUrl = `https://app.kilo.ai/share/${result.share_id}`

							void vscode.env.clipboard.writeText(shareUrl)
							vscode.window.showInformationMessage(
								t("common:info.session_share_link_copied_with_url", { url: shareUrl }),
							)
						})
						.catch((error) => {
							const errorMessage = error instanceof Error ? error.message : String(error)
							vscode.window.showErrorMessage(`Failed to share session: ${errorMessage}`)
						})
					break
				case "openImage":
					// Handle image click from ImageThumbnail component
					void openImage(message.text as string)
					break
				case "agentManager.setMode":
					if (this.authorizeLocalSessionAccess(message.sessionId as string, "change mode for")) {
						void this.setSessionMode(message.sessionId as string, message.mode as string)
					}
					break
			}
		} catch (error) {
			this.outputChannel.appendLine(`Error handling message: ${error}`)
		}
	}

	/**
	 * Handle start session message from webview.
	 * Supports multi-version mode: when versions > 1, spawns multiple sessions sequentially.
	 */
	private async handleStartSession(message: { [key: string]: unknown }): Promise<void> {
		// Reset auth warning dedupe for each start attempt so users see the login prompt
		// every time they try to start an agent and authentication fails.
		this.lastAuthErrorMessage = undefined

		// Validate message using zod schema for type safety
		const parseResult = startSessionMessageSchema.safeParse(message)
		if (!parseResult.success) {
			this.outputChannel.appendLine(`[AgentManager] Invalid startSession message: ${parseResult.error.message}`)
			this.postMessage({ type: "agentManager.startSessionFailed" })
			return
		}

		const validatedMessage: StartSessionMessage = parseResult.data
		const { prompt, parallelMode = false, existingBranch, model, mode, images } = validatedMessage

		// For agent-runtime, pass base64 images directly (not file paths)
		// The extension expects base64 data URLs in the format "data:image/png;base64,..."
		if (images && images.length > 0) {
			this.outputChannel.appendLine(`[AgentManager] Passing ${images.length} images (base64) to new session`)
		}

		// kilocode_change start
		const requestedVersions = validatedMessage.versions ?? this.parallelAgentCount ?? 1
		const desiredVersions = Math.min(Math.max(requestedVersions, 1), MAX_VERSION_COUNT)
		const configuredParallelLimit = Math.min(Math.max(this.parallelAgentCount ?? 1, 1), MAX_VERSION_COUNT)
		const availableParallelCapacity = Math.max(this.maxConcurrentSessionStarts - this.getActiveSessionLoad(), 0)
		let effectiveVersions = 1

		if (!this.parallelAgentsEnabled && desiredVersions > 1) {
			this.outputChannel.appendLine(
				"[AgentManager] Parallel agents disabled in settings, falling back to sequential execution",
			)
		} else if (this.parallelAgentsEnabled && desiredVersions > 1 && availableParallelCapacity < 2) {
			this.outputChannel.appendLine(
				"[AgentManager] No parallel agent capacity available, falling back to sequential execution",
			)
		} else if (this.parallelAgentsEnabled) {
			effectiveVersions = Math.min(
				desiredVersions,
				configuredParallelLimit,
				Math.max(availableParallelCapacity, 1),
			)
		}

		const rawLabels = validatedMessage.labels
		const labels = rawLabels?.length === effectiveVersions ? rawLabels : undefined

		const configs = extractSessionConfigs({
			prompt,
			versions: effectiveVersions,
			labels,
			parallelMode,
			existingBranch,
		})
		// kilocode_change end

		if (configs.length === 1) {
			const config = configs[0]
			await this.startAgentSession(config.prompt, {
				parallelMode: config.parallelMode,
				labelOverride: config.label,
				sessionId: config.sessionId,
				existingBranch: config.existingBranch,
				model,
				mode,
				images,
				sessionGroup: config.groupId
					? {
							groupId: config.groupId,
							rootSessionId: config.rootSessionId || config.groupId,
							label: config.groupLabel,
							sessionIndex: config.sessionIndex,
							sessionCount: config.sessionCount,
						}
					: undefined,
			})
			return
		}

		this.outputChannel.appendLine(`[AgentManager] Starting ${configs.length} versions in multi-version mode`)

		await Promise.all(
			configs.map(async (config, index) => {
				this.outputChannel.appendLine(
					`[AgentManager] Starting version ${index + 1}/${configs.length}: ${config.label}`,
				)
				await this.startAgentSession(config.prompt, {
					parallelMode: config.parallelMode,
					labelOverride: config.label,
					sessionId: config.sessionId,
					existingBranch: config.existingBranch,
					model,
					mode,
					images,
					sessionGroup: config.groupId
						? {
								groupId: config.groupId,
								rootSessionId: config.rootSessionId || config.groupId,
								label: config.groupLabel,
								sessionIndex: config.sessionIndex,
								sessionCount: config.sessionCount,
							}
						: undefined,
				})
			}),
		)

		this.outputChannel.appendLine(`[AgentManager] All ${configs.length} versions launched in parallel`)
	}

	// kilocode_change start
	private getActiveSessionLoad(): number {
		return this.registry
			.getSessions()
			.filter((session) => session.status === "creating" || session.status === "running").length
	}

	private hasSessionLaunchCapacity(): boolean {
		return this.getActiveSessionLoad() < this.maxConcurrentSessionStarts
	}

	// kilocode_change start
	private getQueueKey(options?: QueuedSessionLaunch["options"]): string {
		return getQueuedSessionLaunchQueueKey(options)
	}

	private getActiveSessionLoadForQueueKey(queueKey: string): number {
		return this.registry.getSessions().filter((session) => {
			if (session.status !== "creating" && session.status !== "running") {
				return false
			}

			const sessionQueueKey = session.sessionGroup?.groupId || session.sessionId || "root:default"
			return sessionQueueKey === queueKey
		}).length
	}

	private getEffectiveQueueKeyCap(queueKey: string): number {
		return this.completionFollowUp.getEffectiveQueueKeyCap(queueKey)
	}

	private updateQueueKeyPressure(queueKey: string, outcome: "success" | "problematic"): void {
		this.completionFollowUp.updateQueueKeyPressure(queueKey, outcome)
	}

	private hasQueueKeyCapacity(queueKey: string): boolean {
		return this.getActiveSessionLoadForQueueKey(queueKey) < this.getEffectiveQueueKeyCap(queueKey)
	}

	private getSchedulerState() {
		return this.completionFollowUp.getSchedulerState({
			sessions: this.registry.getSessions(),
			queuedSessionLaunches: [...this.queuedLaunchScheduler.queuedLaunches],
			maxConcurrentSessionStarts: this.maxConcurrentSessionStarts,
		})
	}
	// kilocode_change end

	private async drainQueuedSessionLaunches(): Promise<void> {
		await this.queuedLaunchScheduler.drainQueuedLaunches()
	}
	// kilocode_change end

	private async initializeCurrentGitUrl(): Promise<void> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
		if (!workspaceFolder) {
			return
		}

		try {
			const rawGitUrl = await getRemoteUrl(workspaceFolder)
			this.currentGitUrl = normalizeGitUrl(rawGitUrl)
			this.outputChannel.appendLine(`[AgentManager] Current git URL: ${this.currentGitUrl}`)
		} catch (error) {
			this.outputChannel.appendLine(
				`[AgentManager] Could not get git URL for workspace: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Get or create WorktreeManager for the current workspace
	 */
	private getWorktreeManager(): WorktreeManager {
		if (!this.worktreeManager) {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
			if (!workspaceFolder) {
				throw new Error("No workspace folder open")
			}
			this.worktreeManager = new WorktreeManager(workspaceFolder, this.outputChannel)
		}
		return this.worktreeManager
	}

	/**
	 * Get or create SetupScriptService for the current workspace
	 */
	private getSetupScriptService(): SetupScriptService {
		if (!this.setupScriptService) {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
			if (!workspaceFolder) {
				throw new Error("No workspace folder open")
			}
			this.setupScriptService = new SetupScriptService(workspaceFolder)
		}
		return this.setupScriptService
	}

	/**
	 * Run the setup script for a new worktree session.
	 * Non-blocking - script failures don't prevent session start.
	 */
	private async runSetupScriptForWorktree(worktreePath: string): Promise<void> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
		if (!workspaceFolder) {
			return
		}

		try {
			const setupScriptService = this.getSetupScriptService()
			const runner = new SetupScriptRunner(this.outputChannel, setupScriptService)

			await runner.runIfConfigured({
				worktreePath,
				repoPath: workspaceFolder,
			})
		} catch (error) {
			// Non-blocking - log error but don't fail session start
			const errorMsg = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`[AgentManager] Setup script error (non-blocking): ${errorMsg}`)
		}
	}

	/**
	 * Open the setup script configuration in VS Code editor.
	 * Creates a default template if no script exists.
	 */
	private async configureSetupScript(): Promise<void> {
		try {
			const setupScriptService = this.getSetupScriptService()
			await setupScriptService.openInEditor()
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`[AgentManager] Failed to open setup script: ${errorMsg}`)
			void vscode.window.showErrorMessage(`Failed to open setup script: ${errorMsg}`)
		}
	}

	/**
	 * Start a new agent session using the kilocode CLI
	 * @param prompt - The task prompt for the agent
	 */
	private async startAgentSession(
		prompt: string,
		options?: {
			parallelMode?: boolean
			labelOverride?: string
			sessionId?: string
			existingBranch?: string
			model?: string
			mode?: string // Mode slug (e.g., "code", "architect")
			helperProfile?: string
			images?: string[] // Image file paths to include with the initial prompt
			sessionGroup?: {
				groupId: string
				rootSessionId: string
				label?: string
				sessionIndex?: number
				sessionCount?: number
			}
		},
	): Promise<void> {
		if (!prompt) {
			this.outputChannel.appendLine("ERROR: prompt is empty")
			return
		}

		await this.queuedLaunchScheduler.startOrEnqueue(prompt, options)
	}

	// kilocode_change start
	private async performStartAgentSession(
		prompt: string,
		options?: {
			parallelMode?: boolean
			labelOverride?: string
			sessionId?: string
			existingBranch?: string
			model?: string
			mode?: string // Mode slug (e.g., "code", "architect")
			helperProfile?: string
			images?: string[] // Image file paths to include with the initial prompt
			sessionGroup?: {
				groupId: string
				rootSessionId: string
				label?: string
				sessionIndex?: number
				sessionCount?: number
			}
		},
	): Promise<void> {
		if (!prompt) {
			this.outputChannel.appendLine("ERROR: prompt is empty")
			return
		}

		const onSetupFailed = (reason?: "missing-workspace" | "setup-failed") => {
			this.handleStartSessionSpawnFailure(reason)
		}

		const plan = await this.sessionSpawnPlanner.planStartSession({
			prompt,
			options,
		})

		if (plan.kind === "failed") {
			onSetupFailed(plan.reason)
			return
		}

		if (plan.groupEvent) {
			this.publishGroupEvent(
				plan.groupEvent.groupId,
				plan.groupEvent.sessionId,
				"creating",
				plan.groupEvent.label,
			)
		}

		await this.spawnAgentWithCommonSetup(plan.spawnPlan, onSetupFailed)
	}
	// kilocode_change end

	private async getApiConfigurationForCli(helperProfile?: string): Promise<ProviderSettings | undefined> {
		if (helperProfile) {
			try {
				const { name: _, ...helperProfileSettings } = await this.provider.providerSettingsManager.getProfile({
					name: helperProfile,
				})
				const hasKilocodeToken = !!helperProfileSettings?.kilocodeToken
				const apiProvider = helperProfileSettings?.apiProvider || "none"
				this.outputChannel.appendLine(
					`[AgentManager] getApiConfigurationForCli: helperProfile=${helperProfile}, provider=${apiProvider}, hasKilocodeToken=${hasKilocodeToken}`,
				)
				return helperProfileSettings
			} catch (error) {
				this.outputChannel.appendLine(
					`[AgentManager] Helper profile '${helperProfile}' unavailable, falling back to active configuration: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		const { apiConfiguration } = await this.provider.getState()
		// Log API configuration details for debugging
		const hasKilocodeToken = !!apiConfiguration?.kilocodeToken
		const apiProvider = apiConfiguration?.apiProvider || "none"
		this.outputChannel.appendLine(
			`[AgentManager] getApiConfigurationForCli: provider=${apiProvider}, hasKilocodeToken=${hasKilocodeToken}`,
		)
		return apiConfiguration
	}

	/**
	 * Creates a worktree for parallel mode sessions.
	 * Returns worktree info on success, or undefined if creation failed (error already shown to user).
	 */
	private async prepareWorktreeForSession(
		prompt: string,
		existingBranch?: string,
	): Promise<{ branch: string; path: string; parentBranch: string } | undefined> {
		try {
			const manager = this.getWorktreeManager()
			const worktreeInfo = await manager.createWorktree({ prompt, existingBranch })
			this.outputChannel.appendLine(
				`[AgentManager] Created worktree: ${worktreeInfo.path} (branch: ${worktreeInfo.branch})`,
			)
			return worktreeInfo
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`[AgentManager] Failed to create worktree: ${errorMsg}`)
			void vscode.window.showErrorMessage(
				error instanceof WorktreeError
					? `Failed to create worktree: ${error.message}`
					: `Failed to start parallel mode: ${errorMsg}`,
			)
			return undefined
		}
	}

	// kilocode_change start
	private handleStartSessionSpawnFailure(reason?: AgentManagerSpawnExecutionFailureReason | "setup-failed"): void {
		if (reason === "missing-workspace") {
			void vscode.window.showErrorMessage("Please open a folder before starting an agent.")
		}
		this.postMessage({ type: "agentManager.startSessionFailed" })
	}

	private handleResumeSessionSpawnFailure(): void {
		this.postMessage({ type: "agentManager.startSessionFailed" })
	}

	/**
	 * Common helper to spawn an agent process with standard setup.
	 * Delegates normalized plan execution to the extracted runtime spawn seam.
	 * @returns true if process was spawned, false if setup failed
	 */
	private async spawnAgentWithCommonSetup(
		spawnPlan: NormalizedAgentSpawnPlan,
		onSetupFailed?: (reason?: AgentManagerSpawnExecutionFailureReason) => void,
	): Promise<boolean> {
		const result = await this.spawnExecutor.executeSpawnPlan(spawnPlan)
		if (result.kind === "failed") {
			onSetupFailed?.(result.reason)
			return false
		}

		return true
	}
	// kilocode_change end

	/**
	 * Handle a JSON event from the CLI stdout
	 */
	private handleCliEvent(sessionId: string, event: StreamEvent): void {
		this.runtimeEventRouter.handleEvent(sessionId, event)
	}

	// kilocode_change start
	private handleKilocodeEvent(sessionId: string, event: Extract<StreamEvent, { streamEventType: "kilocode" }>): void {
		this.eventProcessor.handle(sessionId, event)
	}
	// kilocode_change end

	/**
	 * Append a log line to a session
	 */
	private log(sessionId: string, line: string): void {
		this.registry.appendLog(sessionId, line)
	}

	private selectSession(sessionId: string | null): void {
		this.registry.selectedId = sessionId
		this.postStateToWebview()

		if (!sessionId) return

		this.terminalManager.showExistingTerminal(sessionId)

		// Check if we have cached messages to send immediately
		const cachedMessages = this.sessionMessages.get(sessionId)
		if (cachedMessages) {
			// Re-post cached messages to ensure webview has them
			this.postChatMessages(sessionId, cachedMessages, { force: true }) // kilocode_change
			return
		}

		// No cached messages - fetch from remote if no active process
		if (!this.processHandler.hasProcess(sessionId)) {
			void this.fetchRemoteSessionMessages(sessionId)
		}
	}

	private async fetchRemoteSessionMessages(sessionId: string): Promise<void> {
		try {
			const messages = await this.remoteSessionService.fetchSessionMessages(sessionId)
			if (!messages) return

			this.storeAndPostMessages(sessionId, messages)
		} catch (error) {
			this.outputChannel.appendLine(`[AgentManager] Failed to fetch remote session messages: ${error}`)
		}
	}

	private storeAndPostMessages(sessionId: string, messages: ClineMessage[]): void {
		this.outputChannel.appendLine(`[AgentManager] Fetched ${messages.length} messages for session: ${sessionId}`)

		this.sessionMessages.set(sessionId, messages)
		this.postChatMessages(sessionId, messages) // kilocode_change
	}

	private async refreshSessionMessages(sessionId: string): Promise<void> {
		this.sessionMessages.delete(sessionId)
		this.lastPostedChatMessages.delete(sessionId) // kilocode_change
		await this.fetchRemoteSessionMessages(sessionId)
	}

	/**
	 * Stop a running agent session
	 */
	private stopAgentSession(sessionId: string): void {
		const session = this.registry.getSession(sessionId)

		this.processHandler.stopProcess(sessionId)

		this.registry.updateSessionStatus(sessionId, "stopped", undefined, "Stopped by user")
		if (session?.sessionGroup?.groupId) {
			this.publishGroupEvent(session.sessionGroup.groupId, sessionId, "stopped", "Stopped by user")
		}
		this.log(sessionId, "Stopped by user")
		this.postStateToWebview()

		// Notify webview state machine of cancellation
		// This ensures the state machine transitions to stopped state
		this.postMessage({
			type: "agentManager.stateEvent",
			sessionId,
			eventType: "cancel_session",
		})

		this.firstApiReqStarted.delete(sessionId)
		this.processStartTimes.delete(sessionId)
		this.sendingMessageMap.delete(sessionId)

		// Track session stopped telemetry
		captureAgentManagerSessionStopped(sessionId, session?.parallelMode?.enabled ?? false)
	}

	/**
	 * Finish a worktree (parallel mode) session:
	 * 1. Stage all changes
	 * 2. Ask agent to generate commit message and commit
	 * 3. Fallback to programmatic commit if agent times out
	 *
	 * Note: The session remains interactive after finishing. The CLI process
	 * and worktree are kept alive so the user can continue working.
	 */
	private async finishWorktreeSession(sessionId: string): Promise<void> {
		const session = this.registry.getSession(sessionId)
		if (!session?.parallelMode?.enabled) {
			this.outputChannel.appendLine(
				`[AgentManager] Ignoring finishWorktreeSession for non-worktree session: ${sessionId}`,
			)
			return
		}

		if (session.status !== "running") {
			this.outputChannel.appendLine(
				`[AgentManager] Ignoring finishWorktreeSession for non-running session: ${sessionId} (status: ${session.status})`,
			)
			return
		}

		const worktreePath = session.parallelMode.worktreePath
		const branch = session.parallelMode.branch

		if (!worktreePath) {
			this.outputChannel.appendLine(`[AgentManager] No worktree path for session: ${sessionId}`)
			return
		}

		this.log(sessionId, "Finishing worktree session...")

		try {
			const manager = this.getWorktreeManager()

			// Stage all changes
			const hasChanges = await manager.stageAllChanges(worktreePath)

			if (hasChanges) {
				this.log(sessionId, "Asking agent to commit changes...")

				// Create task runner with sendMessage bound to this session
				const taskRunner = new AgentTaskRunner(this.outputChannel, async (sid, message) => {
					await this.sendMessageToStdin(sid, message)
				})

				// Ask agent to commit with a proper message
				const commitTask = AgentTasks.createCommitTask(worktreePath, "chore: parallel mode task completion")
				const result = await taskRunner.executeTask(sessionId, commitTask)

				if (result.completedByAgent) {
					this.log(sessionId, "Agent committed changes successfully")
					// Show completion message only on success
					this.showWorktreeCompletionMessage(branch)
				} else if (result.success) {
					this.log(sessionId, "Used fallback commit message")
					// Show completion message only on success
					this.showWorktreeCompletionMessage(branch)
				} else {
					this.log(sessionId, `Commit failed: ${result.error}`)
					// Don't show completion message on failure - show error instead
					vscode.window.showErrorMessage(`Failed to commit changes: ${result.error}`)
				}
			} else {
				this.log(sessionId, "No changes to commit")
				if (branch) {
					void vscode.window
						.showInformationMessage(
							`Parallel mode complete (no changes). Branch: ${branch}`,
							"Copy Branch Name",
						)
						.then((selection) => {
							if (selection === "Copy Branch Name") {
								void vscode.env.clipboard.writeText(branch)
							}
						})
				}
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`[AgentManager] Error finishing worktree session: ${errorMsg}`)
		}

		this.postStateToWebview()
	}

	/**
	 * Send a message to a session's stdin (for agent instructions)
	 */
	private async sendMessageToStdin(sessionId: string, content: string, images?: string[]): Promise<void> {
		// Use buildRuntimeMessage to send base64 images directly (not file paths)
		const message = this.buildRuntimeMessage(content, images)
		await this.processHandler.writeToStdin(sessionId, message)
	}

	/**
	 * Show completion message after finishing worktree session
	 */
	private showWorktreeCompletionMessage(branch?: string): void {
		if (!branch) return

		const message = `Parallel mode complete! Changes committed to: ${branch}`
		void vscode.window.showInformationMessage(message, "Copy Branch Name").then((selection) => {
			if (selection === "Copy Branch Name") {
				void vscode.env.clipboard.writeText(branch)
			}
		})
	}

	/**
	 * Send a follow-up message to a running agent session via stdin.
	 */
	public async sendMessage(
		sessionId: string,
		content: string,
		sessionLabel?: string,
		images?: string[],
	): Promise<void> {
		if (!this.processHandler.hasStdin(sessionId)) {
			// Session is not running - ignore the message
			this.outputChannel.appendLine(`[AgentManager] Session ${sessionId} not running, ignoring follow-up message`)
			return
		}

		// Use buildRuntimeMessage to send base64 images directly (not file paths)
		const message = this.buildRuntimeMessage(content, images)
		await this.safeWriteToStdin(sessionId, message, "message")
	}

	/**
	 * Set the mode for a running agent session via IPC.
	 * This sends a "mode" webview message to the agent process which calls handleModeSwitch().
	 */
	private async setSessionMode(sessionId: string, mode: string): Promise<void> {
		if (!this.processHandler.hasStdin(sessionId)) {
			this.outputChannel.appendLine(`[AgentManager] Session ${sessionId} not running, cannot set mode`)
			return
		}

		// Send as a webview message - the extension expects { type: "mode", text: mode }
		const message = { type: "mode", text: mode }
		try {
			await this.processHandler.writeToStdin(sessionId, message)
			this.outputChannel.appendLine(`[AgentManager] Set mode to ${mode} for session ${sessionId}`)
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error"
			this.outputChannel.appendLine(`[AgentManager] Failed to set mode for session ${sessionId}: ${errorMsg}`)
		}
	}

	/**
	 * Handle a queued message from the webview.
	 * Orchestrates validation, sending, and status notification.
	 */
	private async handleQueuedMessage(
		sessionId: string,
		messageId: string,
		content: string,
		_sessionLabel?: string,
		images?: string[],
	): Promise<void> {
		// Validate the session and message prerequisites
		const validationError = this.validateMessagePrerequisites(sessionId, messageId)
		if (validationError) return

		// Attempt to send the message
		await this.sendQueuedMessage(sessionId, messageId, content, images)
	}

	/**
	 * Validate that a message can be sent (session running, no other message sending).
	 * Returns error message if validation fails, undefined if valid.
	 */
	private validateMessagePrerequisites(sessionId: string, messageId: string): void | undefined {
		// Check if session is running
		if (!this.processHandler.hasStdin(sessionId)) {
			this.outputChannel.appendLine(`[AgentManager] Session ${sessionId} not running, message send failed`)
			this.notifyMessageStatus(sessionId, messageId, "failed", "Session is not running")
			return
		}

		// Check one-at-a-time constraint
		if (this.sendingMessageMap.has(sessionId)) {
			this.outputChannel.appendLine(
				`[AgentManager] Message ${messageId} queued - another message is currently sending`,
			)
			this.notifyMessageStatus(sessionId, messageId, "failed", "Another message is currently being sent")
			return
		}
	}

	/**
	 * Send a validated queued message to the agent.
	 * Handles marking as sending, actual send, and error handling.
	 */
	private async sendQueuedMessage(
		sessionId: string,
		messageId: string,
		content: string,
		images?: string[],
	): Promise<void> {
		// Mark as sending
		this.sendingMessageMap.set(sessionId, messageId)
		this.notifyMessageStatus(sessionId, messageId, "sending")

		try {
			// Use buildRuntimeMessage to send base64 images directly (not file paths)
			const message = this.buildRuntimeMessage(content, images)
			await this.safeWriteToStdin(sessionId, message, "message")
			this.log(sessionId, `Message ${messageId} sent successfully`)
			this.notifyMessageStatus(sessionId, messageId, "sent")
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error"
			this.outputChannel.appendLine(`[AgentManager] Failed to send message ${messageId}: ${errorMsg}`)
			this.notifyMessageStatus(sessionId, messageId, "failed", errorMsg)
		} finally {
			// Clear the sending flag
			this.sendingMessageMap.delete(sessionId)
		}
	}

	/**
	 * Notify the webview of message status changes.
	 */
	private notifyMessageStatus(
		sessionId: string,
		messageId: string,
		status: "sending" | "sent" | "failed",
		error?: string,
	): void {
		this.postMessage({
			type: "agentManager.messageStatus",
			sessionId,
			messageId,
			status,
			error,
		})
	}

	/**
	 * Resume a completed session by spawning a new agent-runtime process.
	 * The agent-runtime will load conversation history from server using sessionId.
	 * Supports both local sessions (in registry) and remote sessions (from server).
	 */
	private buildBroadcastSummary(
		prefix: string,
		successCount: number,
		totalCount: number,
		preferCompact: boolean,
	): string {
		const delivery = successCount < totalCount ? `${successCount}/${totalCount}` : `${successCount}`
		return `${prefix} ${delivery} agent(s)${preferCompact ? " ? compact" : ""}`
	}

	private async deliverBroadcast(params: { formattedMessage: string; targets: AgentSession[] }) {
		const results = await Promise.allSettled(
			params.targets.map((target) => this.sendMessageToStdin(target.sessionId, params.formattedMessage)),
		)
		const successCount = results.filter((result) => result.status === "fulfilled").length
		return {
			successCount,
			totalCount: params.targets.length,
		}
	}

	private getActiveBroadcastTargets(
		sessions: AgentSession[],
		senderSessionId: string,
		includeSender: boolean,
	): AgentSession[] {
		return sessions.filter((candidate) => {
			if (!includeSender && candidate.sessionId === senderSessionId) {
				return false
			}
			return candidate.status === "running" || candidate.status === "creating"
		})
	}

	private getSessionsForRootTask(rootTaskId: string): AgentSession[] {
		return this.registry
			.getSessions()
			.filter((candidate) => (candidate.rootTaskId ?? candidate.taskId) === rootTaskId)
	}

	private publishBroadcastSummary(params: {
		groupId: string
		sessionId: string
		prefix: string
		successCount: number
		totalCount: number
		preferCompact: boolean
	}): void {
		const summary = this.buildBroadcastSummary(
			params.prefix,
			params.successCount,
			params.totalCount,
			params.preferCompact,
		)
		this.publishGroupEvent(params.groupId, params.sessionId, "running", summary)
	}

	private postGroupMessage(message: SessionGroupMessage): void {
		const relay = this.relayOrchestrator.trimRelayContent(message.content)
		this.postMessage({
			type: "agentManager.groupMessage",
			messageId: message.messageId,
			groupId: message.groupId,
			sourceSessionId: message.sourceSessionId,
			sourceLabel: message.sourceLabel,
			content: relay.content,
			includeSender: message.includeSender,
			timestamp: message.timestamp,
		})
	}

	private postRootTaskMessage(message: RootTaskMessage): void {
		const relay = this.relayOrchestrator.trimRelayContent(message.content)
		this.postMessage({
			type: "agentManager.rootTaskMessage",
			messageId: message.messageId,
			rootTaskId: message.rootTaskId,
			sourceSessionId: message.sourceSessionId,
			sourceLabel: message.sourceLabel,
			content: relay.content,
			includeSender: message.includeSender,
			timestamp: message.timestamp,
		})
	}

	public async restartSession(sessionId: string, options?: { compact?: boolean }): Promise<void> {
		const session = this.registry.getSession(sessionId)
		if (!session) {
			return
		}

		const restartInstruction = await this.relayOrchestrator.buildRestartInstruction(session, options)

		if (session.status === "running" || session.status === "creating") {
			this.stopAgentSession(sessionId)
		}

		this.updateQueueKeyPressure(restartInstruction.queueKey, "success")
		this.updateQueueKeyPressure(restartInstruction.queueKey, "success")
		await this.resumeSession(sessionId, restartInstruction.prompt, session.label)
	}

	private getTaskHistoryItems(): HistoryItem[] {
		return typeof this.provider.getTaskHistory === "function" ? this.provider.getTaskHistory() : []
	}

	private getWorkspaceStateStore(): Pick<vscode.Memento, "get" | "update"> | undefined {
		const workspaceState = (this.context as vscode.ExtensionContext & { workspaceState?: vscode.Memento })
			.workspaceState
		if (
			!workspaceState ||
			typeof workspaceState.get !== "function" ||
			typeof workspaceState.update !== "function"
		) {
			return undefined
		}
		return workspaceState
	}

	private async persistBackgroundBindings(): Promise<void> {
		const workspaceState = this.getWorkspaceStateStore()
		if (!workspaceState) {
			return
		}
		await persistBackgroundBindingsToWorkspaceState(workspaceState, this.backgroundSessionBindings, (sessionId) =>
			this.registry.getSession(sessionId),
		)
	}

	private async restorePersistedBackgroundBindings(): Promise<void> {
		const workspaceState = this.getWorkspaceStateStore()
		if (!workspaceState) {
			return
		}
		const restoration = planPersistedBackgroundBindingRestoration(
			readPersistedBackgroundBindingsFromWorkspaceState(workspaceState),
			{
				getHistoryItem: (sessionId) => this.getSessionHistoryItem(sessionId),
				getExistingSession: (sessionId) => this.registry.getSession(sessionId),
			},
		)
		await this.backgroundSubagentBindingCoordinator.applyPlannedRestoration(restoration)
	}

	private getSessionHistoryItem(sessionId: string): HistoryItem | undefined {
		return this.getTaskHistoryItems().find((item) => item.id === sessionId)
	}

	private buildHistoryDerivedSessionFields(
		sessionId: string,
		historyItem:
			| {
					id?: string
					rootTaskId?: string
					parentTaskId?: string
					childIds?: string[]
					restartCount?: number
					sessionAutoRestartEnabled?: boolean
					lastStopReason?: string
					lastStopSummary?: string
					lifecycleState?: "running" | "paused" | "completed" | "cancelled"
					pauseReason?: string
					pausedAt?: number
					resumeContextSummary?: string
			  }
			| undefined,
	) {
		return {
			taskId: historyItem?.id ?? sessionId,
			rootTaskId: historyItem?.rootTaskId,
			parentTaskId: historyItem?.parentTaskId,
			childTaskIds: historyItem?.childIds,
			restartCount: historyItem?.restartCount,
			restartLimit: this.problematicProcessRestartLimit,
			autoRestartEnabled:
				this.sessionAutoRestartOverrides.get(sessionId) ??
				historyItem?.sessionAutoRestartEnabled ??
				this.autoRestartProblematicProcesses,
			lastStopReason: historyItem?.lastStopReason,
			lastStopSummary: historyItem?.lastStopSummary,
			restartHandoff:
				historyItem?.resumeContextSummary ??
				(historyItem?.lastStopSummary && historyItem?.lastStopReason
					? `Stop reason: ${historyItem.lastStopReason}. Previous summary: ${historyItem.lastStopSummary}`
					: historyItem?.lastStopSummary),
			lifecycleStatus:
				historyItem?.lifecycleState === "paused"
					? "paused"
					: historyItem?.lifecycleState === "completed"
						? "completed"
						: historyItem?.lifecycleState === "cancelled"
							? "cancelled"
							: undefined,
			activityState:
				historyItem?.lifecycleState === "paused"
					? "paused"
					: historyItem?.lifecycleState === "running"
						? "active"
						: undefined,
			needsAttention: historyItem?.lifecycleState === "paused" ? true : undefined,
			recoveryState: historyItem?.lifecycleState === "paused" ? "recoverable" : undefined,
			pendingReaction: historyItem?.lifecycleState === "paused" ? "resume" : undefined,
			lastEventAt: historyItem?.pausedAt,
		}
	}

	private setSessionAutoRestart(sessionId: string, enabled: boolean): void {
		this.sessionAutoRestartOverrides.set(sessionId, enabled)
		const historyItem = this.getSessionHistoryItem(sessionId)
		if (historyItem && typeof this.provider.updateTaskHistory === "function") {
			void this.provider.updateTaskHistory({
				...historyItem,
				id: sessionId,
				sessionAutoRestartEnabled: enabled,
			})
		}
		this.postStateToWebview()
	}

	// kilocode_change start
	public async resumeSession(
		sessionId: string,
		content: string,
		sessionLabel?: string,
		images?: string[],
	): Promise<void> {
		const plan = await this.resumeOrchestrator.planResumeSession({
			sessionId,
			content,
			sessionLabel,
			images,
			session: this.registry.getSession(sessionId),
		})

		if (plan.kind === "send-message") {
			await this.sendMessage(sessionId, content, undefined, images)
			return
		}

		if (plan.kind === "queued") {
			return
		}

		const spawnPlan = await this.sessionSpawnPlanner.buildNormalizedSpawnPlan({
			prompt: plan.prompt,
			options: plan.spawnOptions,
		})
		if (!spawnPlan) {
			this.handleResumeSessionSpawnFailure()
			return
		}

		await this.spawnAgentWithCommonSetup(spawnPlan, () => this.handleResumeSessionSpawnFailure())
	}
	// kilocode_change end

	/**
	 * Cancel/abort a running agent session via stdin.
	 * Falls back to SIGTERM if stdin write fails.
	 * Does nothing if the session is not running.
	 */
	public async cancelSession(sessionId: string): Promise<void> {
		await this.backgroundSubagentControl.cancelSession(sessionId)
	}

	public async pauseSession(sessionId: string): Promise<void> {
		await this.backgroundSubagentControl.pauseSession(sessionId)
	}

	public async resumeBackgroundSubagent(sessionId: string): Promise<void> {
		await this.backgroundSubagentControl.resumeBackgroundSubagent(sessionId)
	}

	public async releaseBackgroundSubagentBinding(sessionId: string): Promise<void> {
		await this.backgroundSubagentControl.releaseSession(sessionId)
	}

	/**
	 * Respond to an approval prompt (yes/no button click).
	 * Optionally includes additional text context.
	 */
	public async respondToApproval(sessionId: string, approved: boolean, text?: string): Promise<void> {
		if (!this.processHandler.hasStdin(sessionId)) {
			throw new Error(`Session ${sessionId} not found or not running`)
		}

		const message: { type: string; askResponse: string; text?: string } = {
			type: "askResponse",
			askResponse: approved ? "yesButtonClicked" : "noButtonClicked",
		}

		if (text) {
			message.text = text
		}

		await this.safeWriteToStdin(sessionId, message, approved ? "approval-yes" : "approval-no")
		this.log(sessionId, `Approval response sent: ${approved ? "approved" : "rejected"}`)
	}

	// kilocode_change start

	private async broadcastToRootTask(
		sessionId: string,
		content: string | undefined,
		includeSender: boolean,
		compact: boolean = true,
	): Promise<void> {
		const session = this.registry.getSession(sessionId)
		const rootTaskId = session?.rootTaskId ?? session?.taskId
		if (!session || !rootTaskId) {
			return
		}

		const relay = await this.relayOrchestrator.composeRootRelayMessage(session, {
			content,
			includeSender,
			compact,
		})
		if (!relay.message || !relay.formattedMessage) {
			return
		}

		const targets = this.getActiveBroadcastTargets(
			this.getSessionsForRootTask(rootTaskId),
			sessionId,
			includeSender,
		)
		const { successCount, totalCount } = await this.deliverBroadcast({
			formattedMessage: relay.formattedMessage,
			targets,
		})
		this.postRootTaskMessage(relay.message)
		this.publishBroadcastSummary({
			groupId: session.sessionGroup?.groupId ?? session.sessionId,
			sessionId,
			prefix: "Root broadcast delivered to",
			successCount,
			totalCount,
			preferCompact: relay.preferCompact,
		})
	}

	private async broadcastToSessionGroup(
		sessionId: string,
		content: string | undefined,
		includeSender: boolean,
	): Promise<void> {
		const session = this.registry.getSession(sessionId)
		const groupId = session?.sessionGroup?.groupId
		if (!session || !groupId) {
			return
		}

		const relay = await this.relayOrchestrator.composeGroupRelayMessage(session, {
			content,
			includeSender,
		})
		if (!relay.message || !relay.formattedMessage) {
			return
		}

		const targets = this.getActiveBroadcastTargets(this.getSessionsForGroup(groupId), sessionId, includeSender)
		const { successCount, totalCount } = await this.deliverBroadcast({
			formattedMessage: relay.formattedMessage,
			targets,
		})
		this.postGroupMessage(relay.message)
		this.publishBroadcastSummary({
			groupId,
			sessionId,
			prefix: "Broadcast delivered to",
			successCount,
			totalCount,
			preferCompact: relay.preferCompact,
		})
	}
	// kilocode_change end

	private async safeWriteToStdin(sessionId: string, payload: object, label: string): Promise<void> {
		try {
			await this.processHandler.writeToStdin(sessionId, payload)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`[AgentManager] Failed to send ${label} via stdin: ${errorMessage}`)
			void vscode.window.showErrorMessage(`Failed to send ${label} to agent: ${errorMessage}`)
			throw error
		}
	}

	/**
	 * Cancel a pending session that is stuck in "Creating session..." state
	 */
	private cancelPendingSession(): void {
		this.processHandler.cancelPendingSession()
	}

	/**
	 * Remove a session completely
	 */
	private removeSession(sessionId: string): void {
		// Stop process if running
		this.processHandler.stopProcess(sessionId)

		// Clean up messages
		this.sessionMessages.delete(sessionId)
		this.lastPostedChatMessages.delete(sessionId) // kilocode_change

		this.registry.removeSession(sessionId)
		this.postStateToWebview()

		this.firstApiReqStarted.delete(sessionId)
		this.processStartTimes.delete(sessionId)
		this.sendingMessageMap.delete(sessionId)
	}

	// kilocode_change start
	private getSessionsForGroup(groupId: string): AgentSession[] {
		return this.registry.getSessions().filter((session) => session.sessionGroup?.groupId === groupId)
	}
	private getDescendantGroupIds(groupId: string): string[] {
		const sessions = this.registry.getSessions()
		const childrenByParent = new Map<string, string[]>()
		for (const session of sessions) {
			const childGroupId = session.sessionGroup?.groupId
			const parentGroupId = session.sessionGroup?.parentGroupId
			if (!childGroupId || !parentGroupId) {
				continue
			}
			const existingChildren = childrenByParent.get(parentGroupId) ?? []
			if (!existingChildren.includes(childGroupId)) {
				existingChildren.push(childGroupId)
			}
			childrenByParent.set(parentGroupId, existingChildren)
		}

		const descendantIds: string[] = []
		const queue = [...(childrenByParent.get(groupId) ?? [])]
		while (queue.length > 0) {
			const currentGroupId = queue.shift()
			if (!currentGroupId) {
				continue
			}
			descendantIds.push(currentGroupId)
			queue.push(...(childrenByParent.get(currentGroupId) ?? []))
		}

		return descendantIds
	}
	private getSubtreeGroupIds(groupId: string): string[] {
		return [groupId, ...this.getDescendantGroupIds(groupId)]
	}
	private publishSessionGroupEvent(
		session: AgentSession | undefined,
		sessionId: string,
		eventType: SessionGroupEvent["eventType"],
		summary?: string,
	): void {
		const groupId = session?.sessionGroup?.groupId
		if (!groupId) {
			return
		}
		this.publishGroupEvent(groupId, sessionId, eventType, summary)
	}
	private publishGroupEvent(
		groupId: string,
		sessionId: string,
		eventType: SessionGroupEvent["eventType"],
		summary?: string,
	): void {
		const event: SessionGroupEvent = {
			groupId,
			sessionId,
			eventType,
			summary,
			timestamp: Date.now(),
		}
		this.latestGroupEvents.set(groupId, event)
		this.postMessage({
			type: "agentManager.groupEvent",
			groupId: event.groupId,
			sessionId: event.sessionId,
			eventType: event.eventType,
			summary: event.summary,
			timestamp: event.timestamp,
		})
	}
	private stopSessionGroup(groupId: string): void {
		const targetGroupIds = this.getSubtreeGroupIds(groupId)
		for (const targetGroupId of targetGroupIds) {
			for (const session of this.getSessionsForGroup(targetGroupId)) {
				if (session.status === "running" || session.status === "creating") {
					this.stopAgentSession(session.sessionId)
				}
			}
		}

		this.queuedLaunchScheduler.removeQueuedLaunches((launch) => {
			const launchGroupId = launch.options?.sessionGroup?.groupId
			if (!launchGroupId || !targetGroupIds.includes(launchGroupId)) {
				return false
			}

			this.publishGroupEvent(
				launchGroupId,
				launch.options?.sessionId || launch.options?.sessionGroup?.rootSessionId || launchGroupId,
				"stopped",
				"Stopped before launch",
			)
			return true
		})
	}

	private async restartSessionGroupCompact(groupId: string): Promise<void> {
		for (const targetGroupId of this.getSubtreeGroupIds(groupId)) {
			for (const session of this.getSessionsForGroup(targetGroupId)) {
				if (session.status === "error" || session.status === "stopped") {
					await this.restartSession(session.sessionId, { compact: true })
				}
			}
		}
	}
	// kilocode_change end
	private async refreshRestartPolicyState(): Promise<void> {
		try {
			const state = await this.provider.getState()
			this.autoRestartProblematicProcesses = state.autoRestartProblematicProcesses ?? false
			this.problematicProcessRestartLimit = state.problematicProcessRestartLimit ?? 1
			this.parallelAgentsEnabled = state.parallelAgentsEnabled ?? false // kilocode_change
			this.parallelAgentCount = Math.min(Math.max(state.parallelAgentCount ?? 2, 1), MAX_VERSION_COUNT) // kilocode_change
		} catch (error) {
			this.outputChannel.appendLine(
				`[AgentManager] Failed to refresh restart policy state: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	private getFilteredState() {
		const baseState = this.registry.getStateForGitUrl(this.currentGitUrl)
		const historyByTaskId = new Map(this.getTaskHistoryItems().map((item) => [item.id, item]))

		return {
			...baseState,
			sessions: baseState.sessions.map((session) => {
				const historyItem = historyByTaskId.get(session.taskId ?? session.sessionId)
				return {
					...session,
					...this.buildHistoryDerivedSessionFields(session.sessionId, historyItem),
				}
			}),
			scheduler: this.getSchedulerState(),
		}
	}

	// kilocode_change start
	private postStateToWebview(options?: { force?: boolean }): void {
		const state = this.getFilteredState()
		const signature = JSON.stringify(state)
		if (!options?.force && this.lastPostedStateSignature === signature) {
			return
		}

		this.lastPostedStateSignature = signature
		this.postMessage({
			type: "agentManager.state",
			state,
		})
	}
	// kilocode_change end

	// kilocode_change start
	private postRemoteSessionsToWebview(
		sessions: RemoteSession[],
		availability: { available: boolean; reason?: string } = { available: true },
		options?: { force?: boolean },
	): void {
		this.visibleRemoteSessionIds = new Set(sessions.map((session) => session.session_id))
		const signature = JSON.stringify({ sessions, availability })
		if (!options?.force && this.lastPostedRemoteSessionsSignature === signature) {
			return
		}

		this.lastPostedRemoteSessionsSignature = signature
		this.postMessage({
			type: "agentManager.remoteSessions",
			sessions,
			availability,
		})
	}

	private postAvailableModesToWebview(
		modes: Array<{
			slug: string
			name: string
			description?: string
			iconName?: string
			source?: "global" | "project" | "organization" | undefined
		}>,
		currentMode: string,
		options?: { force?: boolean },
	): void {
		const payload = { modes, currentMode }
		const signature = JSON.stringify(payload)
		if (!options?.force && this.lastPostedAvailableModesSignature === signature) {
			return
		}

		this.lastPostedAvailableModesSignature = signature
		this.postMessage({
			type: "agentManager.availableModes",
			...payload,
		})
	}
	// kilocode_change end

	private async fetchAndPostRemoteSessions(): Promise<void> {
		try {
			const remoteSessionResult = await this.remoteSessionService.fetchRemoteSessions()

			// Filter remote sessions by git_url (only if git_url is available from API)
			const filteredSessions = this.filterRemoteSessionsByGitUrl(remoteSessionResult.sessions)

			this.postRemoteSessionsToWebview(filteredSessions, {
				available: remoteSessionResult.available,
				...(remoteSessionResult.reason ? { reason: remoteSessionResult.reason } : {}),
			}) // kilocode_change
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error)
			this.outputChannel.appendLine(`[AgentManager] Failed to fetch remote sessions: ${reason}`)
			this.postRemoteSessionsToWebview([], { available: false, reason })
		}
	}

	/**
	 * Get available models from the extension's cache and post to webview.
	 * Models are already fetched by the main extension - we just read from the shared cache.
	 * @param forceRefresh - If true, clears local cache (extension cache is still used)
	 */
	private async fetchAndPostAvailableModels(forceRefresh: boolean = false): Promise<void> {
		// Skip if we already have cached models and not forcing refresh
		if (this.availableModels && !forceRefresh) {
			this.postModelsToWebview(this.availableModels)
			return
		}

		// Skip if already fetching
		if (this.fetchingModels) {
			return
		}

		this.fetchingModels = true

		try {
			// Get API configuration from the extension
			const state = await this.provider.getState()
			const { apiConfiguration } = state

			// Determine the provider - default to "kilocode" if not set
			const providerName = apiConfiguration.apiProvider || "kilocode"

			// Check if this provider supports model fetching via router
			if (!isRouterName(providerName)) {
				this.outputChannel.appendLine(
					`[AgentManager] Provider "${providerName}" does not support dynamic model fetching`,
				)
				this.postMessage({
					type: "agentManager.modelsLoadFailed",
					error: `Provider "${providerName}" does not support dynamic model fetching`,
				})
				return
			}

			this.outputChannel.appendLine(`[AgentManager] Getting models for provider "${providerName}" from cache...`)

			// Get models from the extension's shared cache (already fetched by main extension)
			const models = getModelsFromCache(providerName)

			if (!models || Object.keys(models).length === 0) {
				this.outputChannel.appendLine(
					`[AgentManager] No models in cache for "${providerName}" - extension may still be loading`,
				)
				this.postMessage({
					type: "agentManager.modelsLoadFailed",
					error: "Models not yet loaded. Please wait for the extension to finish loading.",
				})
				return
			}

			// Get the current model ID from configuration
			const currentModel = getModelId(apiConfiguration) || ""

			// Store the cached result
			this.availableModels = {
				provider: providerName,
				currentModel,
				models,
			}

			const modelCount = Object.keys(models).length
			this.outputChannel.appendLine(`[AgentManager] Got ${modelCount} models for provider "${providerName}"`)

			this.postModelsToWebview(this.availableModels)
		} catch (error) {
			this.outputChannel.appendLine(
				`[AgentManager] Error getting models: ${error instanceof Error ? error.message : String(error)}`,
			)
			this.postMessage({
				type: "agentManager.modelsLoadFailed",
				error: error instanceof Error ? error.message : "Failed to get models",
			})
		} finally {
			this.fetchingModels = false
		}
	}

	/**
	 * Fetch available modes from ClineProvider and post to webview
	 */
	private async fetchAndPostAvailableModes(): Promise<void> {
		try {
			// Get full mode data directly from customModesManager and DEFAULT_MODES
			// This provides description, iconName, and source which getModes() doesn't include
			const customModes = await this.provider.customModesManager.getCustomModes()
			const allModes = [...DEFAULT_MODES, ...customModes]
			const currentMode = await this.provider.getMode()
			this.outputChannel.appendLine(
				`[AgentManager] Fetched ${allModes.length} available modes, current: ${currentMode}`,
			)

			this.postAvailableModesToWebview(
				allModes.map((mode) => ({
					slug: mode.slug,
					name: mode.name,
					description: mode.description,
					iconName: mode.iconName,
					source: mode.source as "global" | "project" | "organization" | undefined,
				})),
				currentMode,
			) // kilocode_change
		} catch (error) {
			this.outputChannel.appendLine(
				`[AgentManager] Error fetching modes: ${error instanceof Error ? error.message : String(error)}`,
			)
			// Send empty modes array on error
			this.postAvailableModesToWebview([], DEFAULT_MODE_SLUG) // kilocode_change
		}
	}

	/**
	 * Post models to the webview in the expected format.
	 */
	private postModelsToWebview(cached: { provider: string; currentModel: string; models: ModelRecord }): void {
		// Transform ModelRecord to array format expected by webview
		const modelsArray = Object.entries(cached.models).map(([id, info]) => ({
			id,
			displayName: info.displayName || null,
			contextWindow: info.contextWindow ?? 0,
			supportsImages: info.supportsImages,
			inputPrice: info.inputPrice,
			outputPrice: info.outputPrice,
		}))

		this.postAvailableModelsToWebview({
			provider: cached.provider,
			currentModel: cached.currentModel,
			models: modelsArray,
		}) // kilocode_change
	}

	// kilocode_change start
	private postAvailableModelsToWebview(
		payload: {
			provider: string
			currentModel: string
			models: Array<{
				id: string
				displayName: string | null
				contextWindow: number
				supportsImages: boolean | undefined
				inputPrice: number | undefined
				outputPrice: number | undefined
			}>
		},
		options?: { force?: boolean },
	): void {
		const signature = JSON.stringify(payload)
		if (!options?.force && this.lastPostedAvailableModelsSignature === signature) {
			return
		}

		this.lastPostedAvailableModelsSignature = signature
		this.postMessage({
			type: "agentManager.availableModels",
			...payload,
		})
	}

	private postBranchesToWebview(
		payload: { branches: string[]; currentBranch: string | undefined },
		options?: { force?: boolean },
	): void {
		const signature = JSON.stringify(payload)
		if (!options?.force && this.lastPostedBranchesSignature === signature) {
			return
		}

		this.lastPostedBranchesSignature = signature
		this.postMessage({
			type: "agentManager.branches",
			...payload,
		})
	}
	// kilocode_change end

	private async handleListBranches(): Promise<void> {
		try {
			const gitService = new WorkspaceGitService()
			const { branches, currentBranch } = await gitService.getBranchInfo()
			this.postBranchesToWebview({ branches, currentBranch }) // kilocode_change
		} catch (error) {
			this.outputChannel.appendLine(
				`[AgentManager] Failed to list branches: ${error instanceof Error ? error.message : String(error)}`,
			)
			this.postBranchesToWebview({ branches: [], currentBranch: undefined }) // kilocode_change
		}
	}

	private filterRemoteSessionsByGitUrl(sessions: RemoteSession[]): RemoteSession[] {
		if (!this.currentGitUrl) {
			return sessions.filter((s) => !s.git_url)
		}
		return sessions.filter((s) => s.git_url === this.currentGitUrl)
	}

	// kilocode_change start
	private postChatMessages(sessionId: string, messages: ClineMessage[], options?: { force?: boolean }): void {
		const signature = JSON.stringify(messages)
		if (!options?.force && this.lastPostedChatMessages.get(sessionId) === signature) {
			return
		}

		this.lastPostedChatMessages.set(sessionId, signature)
		this.postMessage({ type: "agentManager.chatMessages", sessionId, messages })
	}
	// kilocode_change end

	private postMessage(message: unknown): void {
		// Log outgoing message to webview
		const msg = message as { type?: string; sessionId?: string; messages?: ClineMessage[] }
		if (msg.type === "agentManager.chatMessages") {
			const lastMsgs = msg.messages?.slice(-2).map((m) => {
				const msgType = `${m.type}:${m.say || m.ask || "?"}`
				const text = m.text?.slice(0, 30) || "(no text)"
				return `${msgType} "${text}"`
			})
			this.outputChannel.appendLine(
				`[Webview<] ${msg.type} sessionId=${msg.sessionId} (${msg.messages?.length || 0} messages)` +
					(lastMsgs?.length ? `\n  last: ${lastMsgs.join(", ")}` : ""),
			)
		} else if (msg.type === "agentManager.stateEvent") {
			const eventType = (msg as { eventType?: string }).eventType || "?"
			this.outputChannel.appendLine(`[Webview<] ${msg.type} sessionId=${msg.sessionId} eventType=${eventType}`)
		} else {
			this.outputChannel.appendLine(`[Webview<] ${msg.type || "unknown"}`)
		}
		this.panel?.webview.postMessage(message)
	}

	// HMR support for development mode - same approach as ClineProvider (see src/core/webview/ClineProvider.ts)
	private async getHMRHtmlContent(webview: vscode.Webview): Promise<string> {
		const viteConfig = await getViteDevServerConfig(webview)

		if (!viteConfig) {
			vscode.window.showErrorMessage(
				"Vite dev server is not running. Please run 'pnpm dev' in webview-ui directory or use 'pnpm build'.",
			)
			return this.getHtmlContent(webview)
		}

		const { localServerUrl, csp, reactRefreshScript } = viteConfig

		// Include both shared base styles (index.css with codicons) and agent-manager specific styles
		const baseStylesUri = getUri(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"])
		const stylesUri = getUri(webview, this.context.extensionUri, [
			"webview-ui",
			"build",
			"assets",
			"agent-manager.css",
		])

		const scriptUri = `http://${localServerUrl}/src/kilocode/agent-manager/index.tsx`

		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
					<meta http-equiv="Content-Security-Policy" content="${csp.join("; ")}">
					<link rel="stylesheet" type="text/css" href="${baseStylesUri}">
					<link rel="stylesheet" type="text/css" href="${stylesUri}">
					<title>Agent Manager</title>
				</head>
				<body>
					<div id="root"></div>
					${reactRefreshScript}
					<script type="module" src="${scriptUri}"></script>
				</body>
			</html>
		`
	}

	private getHtmlContent(webview: vscode.Webview): string {
		// Get URIs for the React build assets
		const scriptUri = getUri(webview, this.context.extensionUri, [
			"webview-ui",
			"build",
			"assets",
			"agent-manager.js",
		])
		// Include both shared base styles (index.css) and agent-manager specific styles
		const baseStylesUri = getUri(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"])
		const stylesUri = getUri(webview, this.context.extensionUri, [
			"webview-ui",
			"build",
			"assets",
			"agent-manager.css",
		])

		const nonce = getNonce()

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src ${webview.cspSource} 'nonce-${nonce}';">
	<title>Agent Manager</title>
	<link rel="stylesheet" type="text/css" href="${baseStylesUri}">
	<link rel="stylesheet" type="text/css" href="${stylesUri}">
</head>
<body>
	<div id="root"></div>
	<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`
	}

	public hasRunningSessions(): boolean {
		return this.registry.hasRunningSessions()
	}

	public hasBackgroundSubagentCapacity(request: SubagentLaunchRequest): boolean {
		const normalizedRequest = normalizeSubagentLaunchRequest(request)
		const queueKey =
			normalizedRequest.rootTaskId ||
			normalizedRequest.parentTaskId ||
			resolveSubagentLaunchTargetTaskId(normalizedRequest) ||
			"root:default"
		return this.hasSessionLaunchCapacity() && this.hasQueueKeyCapacity(queueKey)
	}

	// kilocode_change start
	private get queuedSessionLaunches(): QueuedSessionLaunch[] {
		return [...this.queuedLaunchScheduler.queuedLaunches]
	}

	private set queuedSessionLaunches(launches: QueuedSessionLaunch[]) {
		this.queuedLaunchScheduler.replaceQueuedLaunches(launches)
	}

	private dequeueNextSessionLaunch(): QueuedSessionLaunch | undefined {
		return this.queuedLaunchScheduler.dequeueNextLaunch()
	}
	// kilocode_change end

	public onBackgroundSubagentStatus(listener: (event: SubagentStatusEvent) => void): () => void {
		return this.backgroundSubagentEventBridge.onStatus(listener)
	}

	public onBackgroundSubagentResult(listener: (event: SubagentResultEvent) => void): () => void {
		return this.backgroundSubagentEventBridge.onResult(listener)
	}

	public async startBackgroundSubagent(
		request: SubagentLaunchRequest,
	): Promise<{ taskId: string; sessionId: string; status: "queued" | "running" }> {
		// kilocode_change start
		const launch = await this.backgroundSubagentBindingCoordinator.prepareLaunch(request)

		await this.startAgentSession(launch.prompt, launch.startOptions)

		this.backgroundSubagentEventBridge.announceLaunch(launch.sessionId, launch.queued)

		return {
			taskId: launch.taskId,
			sessionId: launch.sessionId,
			status: launch.queued ? "queued" : "running",
		}
		// kilocode_change end
	}

	public listBackgroundSubagentBindings(): Array<{
		request: SubagentLaunchRequest
		taskId: string
		sessionId: string
		status: SubagentStatusEvent["state"]
		updatedAt: number
	}> {
		return this.backgroundSubagentControl.listBindings()
	}

	public getRunningSessionCount(): number {
		return this.registry.getRunningSessionCount()
	}

	private stopAllAgents(): void {
		this.processHandler.stopAllProcesses()
		this.queuedLaunchScheduler.clearQueuedLaunches()

		// Update all running sessions to stopped
		for (const session of this.registry.getSessions()) {
			if (session.status === "running") {
				this.registry.updateSessionStatus(session.sessionId, "stopped", undefined, "Stopped by user")
			}
		}

		this.firstApiReqStarted.clear()
	}

	public dispose(): void {
		this.stopAllAgents()
		this.processHandler.dispose()
		this.terminalManager.dispose()
		this.sessionMessages.clear()
		this.lastPostedChatMessages.clear() // kilocode_change
		this.lastPostedStateSignature = undefined // kilocode_change
		this.lastPostedRemoteSessionsSignature = undefined // kilocode_change
		this.lastPostedAvailableModesSignature = undefined // kilocode_change
		this.lastPostedAvailableModelsSignature = undefined // kilocode_change
		this.lastPostedBranchesSignature = undefined // kilocode_change
		this.firstApiReqStarted.clear()

		this.panel?.dispose()
		this.disposables.forEach((d) => d.dispose())
	}

	private showPaymentRequiredPrompt(payload?: KilocodePayload | { text?: string; content?: string }): void {
		const { title, message, buyCreditsUrl, rawText } = this.parsePaymentRequiredPayload(payload)

		captureAgentManagerLoginIssue({
			issueType: "payment_required",
		})

		const actionLabel = buyCreditsUrl ? "Open billing" : undefined
		const actions = actionLabel ? [actionLabel] : []

		this.outputChannel.appendLine(`[AgentManager] Payment required: ${message}`)

		void vscode.window.showWarningMessage(`${title}: ${message}`, ...actions).then((selection) => {
			if (selection === actionLabel && buyCreditsUrl) {
				void vscode.env.openExternal(vscode.Uri.parse(buyCreditsUrl))
			}
		})
	}

	private handleStartSessionApiFailure(error: { message?: string; authError?: boolean }): void {
		captureAgentManagerLoginIssue({
			issueType: error.authError ? "auth_error" : "api_error",
			httpStatusCode: error.authError ? 401 : undefined,
		})

		const message = error.message || t("kilocode:agentManager.errors.sessionFailed")
		if (error.authError && message && message === this.lastAuthErrorMessage) {
			return
		}

		void vscode.window.showWarningMessage(message)
		if (error.authError) {
			this.lastAuthErrorMessage = message
		}
	}

	private parsePaymentRequiredPayload(payload?: KilocodePayload | { text?: string; content?: string }): {
		title: string
		message: string
		buyCreditsUrl?: string
		rawText?: string
	} {
		const fallbackTitle = t("kilocode:lowCreditWarning.title")
		const fallbackMessage = t("kilocode:lowCreditWarning.message")

		const rawText = payload ? extractRawText(payload) : undefined
		const parsed = rawText ? tryParsePayloadJson(rawText) : undefined

		const title =
			parsed?.title || (typeof fallbackTitle === "string" ? fallbackTitle : undefined) || "Payment required"
		const message =
			parsed?.message ||
			rawText ||
			(typeof fallbackMessage === "string" ? fallbackMessage : undefined) ||
			"Paid model requires credits or billing setup."

		return { title, message, buyCreditsUrl: parsed?.buyCreditsUrl, rawText }
	}

	private showAgentError(error?: { type: "spawn_error" | "unknown"; message: string }): void {
		const { platform, shell } = getPlatformDiagnostics()

		// Capture telemetry for spawn errors
		if (error?.type === "spawn_error") {
			captureAgentManagerLoginIssue({
				issueType: "cli_spawn_error", // Keep telemetry key for backwards compatibility
				platform,
				shell,
				errorMessage: error.message,
			})
		}

		// Show error message to user
		const errorMessage = error?.message
			? t("kilocode:agentManager.errors.sessionFailedWithMessage", { message: error.message })
			: t("kilocode:agentManager.errors.sessionFailed")
		const actionLabel = t("kilocode:agentManager.actions.getHelp")
		vscode.window.showErrorMessage(errorMessage, actionLabel).then((selection) => {
			if (selection === actionLabel) {
				void vscode.env.openExternal(vscode.Uri.parse("https://kilo.ai/docs"))
			}
		})
	}

	/**
	 * Check if the given directory is inside a git worktree (not the main repo).
	 * In a worktree, .git is a file containing "gitdir: /path/to/main/.git/worktrees/..."
	 * In the main repo, .git is a directory.
	 */
	private isInsideWorktree(workspacePath: string): boolean {
		try {
			const gitPath = path.join(workspacePath, ".git")
			const stat = fs.statSync(gitPath)
			// If .git is a file (not a directory), we're in a worktree
			return stat.isFile()
		} catch {
			// .git doesn't exist or can't be accessed
			return false
		}
	}
}
