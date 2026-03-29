import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import { EventEmitter } from "node:events"
import * as path from "node:path"
import * as telemetry from "../telemetry"

const isWindows = process.platform === "win32"
const MOCK_CLI_PATH = isWindows ? "C:\\mock\\path\\to\\kilocode" : "/mock/path/to/kilocode"

// Mock the local telemetry module
vi.mock("../telemetry", () => ({
	getPlatformDiagnostics: vi.fn(() => ({ platform: "darwin", shell: "bash" })),
	captureAgentManagerOpened: vi.fn(),
	captureAgentManagerSessionStarted: vi.fn(),
	captureAgentManagerSessionCompleted: vi.fn(),
	captureAgentManagerSessionStopped: vi.fn(),
	captureAgentManagerSessionError: vi.fn(),
	captureAgentManagerLoginIssue: vi.fn(),
}))

// Mock CliPathResolver to return CliDiscoveryResult object
// Note: vi.mock is hoisted, so we inline the platform check instead of using MOCK_CLI_PATH
vi.mock("../CliPathResolver", () => ({
	findKilocodeCli: vi.fn().mockResolvedValue({
		cliPath: process.platform === "win32" ? "C:\\mock\\path\\to\\kilocode" : "/mock/path/to/kilocode",
		shellPath: undefined,
	}),
	findExecutable: vi.fn().mockResolvedValue(undefined),
}))

let AgentManagerProvider: typeof import("../AgentManagerProvider").AgentManagerProvider

describe("AgentManagerProvider CLI spawning", () => {
	let provider!: InstanceType<typeof AgentManagerProvider>
	const mockContext = {
		extensionUri: { fsPath: "/mock/extension/path" },
		extensionPath: "",
		extensionMode: 1 /* Development */,
	} as any
	const mockOutputChannel = { appendLine: vi.fn() } as any
	let mockWindow: {
		showErrorMessage: Mock
		showWarningMessage: Mock
		ViewColumn: { One: number }
		onDidCloseTerminal: Mock
		createTerminal: Mock
	}

	beforeEach(async () => {
		vi.resetModules()

		const mockWorkspaceFolder = { uri: { fsPath: "/tmp/workspace" } }
		const mockProvider = {
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "kilocode" },
				autoRestartProblematicProcesses: true,
				problematicProcessRestartLimit: 3,
				parallelAgentsEnabled: false,
				parallelAgentCount: 2,
			}),
			getTaskHistory: vi.fn().mockReturnValue([]),
			updateTaskHistory: vi.fn().mockResolvedValue([]),
		}

		mockWindow = {
			showErrorMessage: vi.fn().mockResolvedValue(undefined),
			showWarningMessage: vi.fn().mockResolvedValue(undefined),
			ViewColumn: { One: 1 },
			onDidCloseTerminal: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn(), dispose: vi.fn() }),
		}

		vi.doMock("vscode", () => ({
			workspace: { workspaceFolders: [mockWorkspaceFolder] },
			window: mockWindow,
			env: { openExternal: vi.fn() },
			Uri: { parse: vi.fn(), joinPath: vi.fn() },
			ViewColumn: { One: 1 },
			ExtensionMode: { Development: 1, Production: 2, Test: 3 },
		}))

		// Mock CliInstaller so getLocalCliPath returns our mock path
		vi.doMock("../CliInstaller", () => ({
			getLocalCliPath: () => MOCK_CLI_PATH,
			canInstallCli: () => false,
		}))

		// Mock fileExistsAtPath to return true only for MOCK_CLI_PATH
		// This ensures findKilocodeCli finds the CLI via local path check (works on all platforms)
		vi.doMock("../../../../utils/fs", () => ({
			fileExistsAtPath: vi.fn().mockImplementation((p: string) => Promise.resolve(p === MOCK_CLI_PATH)),
		}))

		// Mock getRemoteUrl for gitUrl support
		vi.doMock("../../../../services/code-index/managed/git-utils", () => ({
			getRemoteUrl: vi.fn().mockResolvedValue(undefined),
		}))

		// Mock WorktreeManager for parallel mode tests
		vi.doMock("../WorktreeManager", () => ({
			WorktreeManager: vi.fn().mockImplementation(() => ({
				createWorktree: vi.fn().mockResolvedValue({
					branch: "test-branch-123",
					path: "/tmp/workspace/.kilocode/worktrees/test-branch-123",
					parentBranch: "main",
				}),
				commitChanges: vi.fn().mockResolvedValue({ success: true }),
				removeWorktree: vi.fn().mockResolvedValue(undefined),
				discoverWorktrees: vi.fn().mockResolvedValue([]),
				ensureGitExclude: vi.fn().mockResolvedValue(undefined),
			})),
			WorktreeError: class WorktreeError extends Error {
				constructor(
					public code: string,
					message: string,
				) {
					super(message)
				}
			},
		}))

		class TestProc extends EventEmitter {
			stdout = new EventEmitter()
			stderr = new EventEmitter()
			kill = vi.fn()
			pid = 1234
			exitCode: number | null = null // Process hasn't exited yet
			// IPC send method for forked processes - calls callback immediately with no error
			send = vi.fn().mockImplementation((msg: unknown, callback?: (err: Error | null) => void) => {
				if (callback) callback(null)
				return true
			})
		}

		const spawnMock = vi.fn(() => new TestProc())
		const forkMock = vi.fn(() => new TestProc())
		const execSyncMock = vi.fn(() => MOCK_CLI_PATH)

		vi.doMock("node:child_process", () => ({
			spawn: spawnMock,
			fork: forkMock,
			execSync: execSyncMock,
		}))

		const module = await import("../AgentManagerProvider")
		AgentManagerProvider = module.AgentManagerProvider
		provider = new AgentManagerProvider(mockContext, mockOutputChannel, mockProvider as any)
	}, 60_000)

	afterEach(() => {
		provider?.dispose()
	})

	// kilocode_change start
	it("skips duplicate chat payload posts until forced", () => {
		;(provider as any).postMessage = vi.fn()
		const messages = [{ ts: 1, type: "say", say: "text", text: "hello", partial: false }]

		;(provider as any).postChatMessages("session-dup", messages)
		;(provider as any).postChatMessages("session-dup", messages)
		;(provider as any).postChatMessages("session-dup", messages, { force: true })

		expect((provider as any).postMessage).toHaveBeenCalledTimes(2)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				type: "agentManager.chatMessages",
				sessionId: "session-dup",
				messages,
			}),
		)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "agentManager.chatMessages",
				sessionId: "session-dup",
				messages,
			}),
		)
	})
	// kilocode_change end

	it("falls back to sequential execution when parallel agents are disabled", async () => {
		const startAgentSession = vi.fn().mockResolvedValue(undefined)
		;(provider as any).startAgentSession = startAgentSession
		;(provider as any).parallelAgentsEnabled = false
		;(provider as any).parallelAgentCount = 4

		await (provider as any).handleStartSession({
			type: "agentManager.startSession",
			prompt: "Implement feature",
			versions: 3,
		})

		expect(startAgentSession).toHaveBeenCalledTimes(1)
	})

	it("launches configured parallel agents when enabled", async () => {
		const startAgentSession = vi.fn().mockResolvedValue(undefined)
		;(provider as any).startAgentSession = startAgentSession
		;(provider as any).parallelAgentsEnabled = true
		;(provider as any).parallelAgentCount = 3
		;(provider as any).maxConcurrentSessionStarts = 4
		;(provider as any).registry.getSessions = vi.fn().mockReturnValue([])

		await (provider as any).handleStartSession({ type: "agentManager.startSession", prompt: "Implement feature" })

		expect(startAgentSession).toHaveBeenCalledTimes(3)
	})

	it("falls back to sequential execution when no parallel capacity is available", async () => {
		const startAgentSession = vi.fn().mockResolvedValue(undefined)
		;(provider as any).startAgentSession = startAgentSession
		;(provider as any).parallelAgentsEnabled = true
		;(provider as any).parallelAgentCount = 4
		;(provider as any).maxConcurrentSessionStarts = 1
		;(provider as any).registry.getSessions = vi.fn().mockReturnValue([{ status: "running" }])

		await (provider as any).handleStartSession({
			type: "agentManager.startSession",
			prompt: "Implement feature",
			versions: 4,
		})

		expect(startAgentSession).toHaveBeenCalledTimes(1)
	})

	// kilocode_change start
	it("skips duplicate state payload posts until forced", () => {
		;(provider as any).postMessage = vi.fn()
		;(provider as any).getFilteredState = vi
			.fn()
			.mockReturnValue({ sessions: [{ sessionId: "s1", status: "running" }] })
		;(provider as any).postStateToWebview()
		;(provider as any).postStateToWebview()
		;(provider as any).postStateToWebview({ force: true })

		expect((provider as any).postMessage).toHaveBeenCalledTimes(2)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				type: "agentManager.state",
				state: { sessions: [{ sessionId: "s1", status: "running" }] },
			}),
		)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "agentManager.state",
				state: { sessions: [{ sessionId: "s1", status: "running" }] },
			}),
		)
	})
	// kilocode_change end

	// kilocode_change start
	it("skips duplicate remote sessions posts until forced", () => {
		;(provider as any).postMessage = vi.fn()
		const sessions = [{ id: "remote-1", title: "Task", created_at: "2026-01-01", git_url: undefined }]

		;(provider as any).postRemoteSessionsToWebview(sessions)
		;(provider as any).postRemoteSessionsToWebview(sessions)
		;(provider as any).postRemoteSessionsToWebview(sessions, { force: true })

		expect((provider as any).postMessage).toHaveBeenCalledTimes(2)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ type: "agentManager.remoteSessions", sessions }),
		)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ type: "agentManager.remoteSessions", sessions }),
		)
	})

	it("skips duplicate available modes posts until forced", () => {
		;(provider as any).postMessage = vi.fn()
		const modes = [{ slug: "code", name: "Code", description: "Default", iconName: "zap", source: "global" }]

		;(provider as any).postAvailableModesToWebview(modes, "code")
		;(provider as any).postAvailableModesToWebview(modes, "code")
		;(provider as any).postAvailableModesToWebview(modes, "code", { force: true })

		expect((provider as any).postMessage).toHaveBeenCalledTimes(2)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ type: "agentManager.availableModes", modes, currentMode: "code" }),
		)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ type: "agentManager.availableModes", modes, currentMode: "code" }),
		)
	})

	it("skips duplicate available models posts until forced", () => {
		;(provider as any).postMessage = vi.fn()
		const payload = {
			provider: "kilocode",
			currentModel: "gpt-test",
			models: [
				{
					id: "gpt-test",
					displayName: "GPT Test",
					contextWindow: 128000,
					supportsImages: true,
					inputPrice: 1,
					outputPrice: 2,
				},
			],
		}

		;(provider as any).postAvailableModelsToWebview(payload)
		;(provider as any).postAvailableModelsToWebview(payload)
		;(provider as any).postAvailableModelsToWebview(payload, { force: true })

		expect((provider as any).postMessage).toHaveBeenCalledTimes(2)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ type: "agentManager.availableModels", ...payload }),
		)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ type: "agentManager.availableModels", ...payload }),
		)
	})

	it("skips duplicate branches posts until forced", () => {
		;(provider as any).postMessage = vi.fn()
		const payload = { branches: ["main", "feature/x"], currentBranch: "main" }

		;(provider as any).postBranchesToWebview(payload)
		;(provider as any).postBranchesToWebview(payload)
		;(provider as any).postBranchesToWebview(payload, { force: true })

		expect((provider as any).postMessage).toHaveBeenCalledTimes(2)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ type: "agentManager.branches", ...payload }),
		)
		expect((provider as any).postMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ type: "agentManager.branches", ...payload }),
		)
	})
	// kilocode_change end

	it("forks agent-runtime process for session", async () => {
		await (provider as any).startAgentSession('echo "$(whoami)"')

		// RuntimeProcessHandler uses fork instead of spawn
		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		expect(forkMock).toHaveBeenCalledTimes(1)
		const [entryPath, _args, options] = forkMock.mock.calls[0] as unknown as [
			string,
			string[],
			Record<string, unknown>,
		]
		// Entry path should be the agent-runtime process entry point
		expect(entryPath).toBeDefined()
		// Options should include IPC stdio configuration
		expect(options?.stdio).toContain("ipc")
	})

	it("creates a creating session before ready is received", async () => {
		await (provider as any).startAgentSession("test pending")

		const sessions = (provider as any).registry.getSessions()
		expect(sessions).toHaveLength(1)
		expect(sessions[0].prompt).toBe("test pending")
		expect(sessions[0].status).toBe("creating")
	})

	it("transitions a creating session to running when ready event is received", async () => {
		await (provider as any).startAgentSession("test session created")
		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }

		proc.emit("message", { type: "ready" })

		const sessions = (provider as any).registry.getSessions()
		expect(sessions).toHaveLength(1)
		expect(sessions[0].sessionId).toMatch(/^agent_/)
		expect(sessions[0].status).toBe("running")
	})

	it("starts multi-version sessions in parallel without waiting for ready", async () => {
		;(provider as any).parallelAgentsEnabled = true
		;(provider as any).parallelAgentCount = 3
		;(provider as any).maxConcurrentSessionStarts = 4
		;(provider as any).getActiveSessionLoad = vi.fn().mockReturnValue(0)

		await (provider as any).handleStartSession({
			type: "agentManager.startSession",
			prompt: "parallel versions",
			versions: 3,
		})

		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		expect(forkMock).toHaveBeenCalledTimes(3)

		const sessions = (provider as any).registry.getSessions()
		expect(sessions).toHaveLength(3)
		expect(sessions.every((session: any) => session.status === "creating")).toBe(true)
	})

	it("queues launches when concurrency limit is reached", async () => {
		;(provider as any).maxConcurrentSessionStarts = 1

		await (provider as any).startAgentSession("first")
		await (provider as any).startAgentSession("second")

		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		expect(forkMock).toHaveBeenCalledTimes(1)
		expect((provider as any).queuedSessionLaunches).toHaveLength(1)
		expect((provider as any).queuedSessionLaunches[0].prompt).toBe("second")
	})

	it("dequeues a waiting launch after capacity is freed", async () => {
		;(provider as any).maxConcurrentSessionStarts = 1

		await (provider as any).startAgentSession("first")
		await (provider as any).startAgentSession("second")

		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		const firstSessionId = (provider as any).registry.getSessions()[0].sessionId
		;(provider as any).registry.updateSessionStatus(firstSessionId, "done")

		await (provider as any).drainQueuedSessionLaunches()

		expect(forkMock).toHaveBeenCalledTimes(2)
		expect((provider as any).queuedSessionLaunches).toHaveLength(0)
	})

	it("fairly alternates queued launches across groups when draining", async () => {
		;(provider as any).queuedSessionLaunches = [
			{
				prompt: "g1-first",
				queueKey: "group-1",
				rootScopeKey: "g1-root",
				options: { sessionGroup: { groupId: "group-1", rootSessionId: "g1-root" } },
			},
			{
				prompt: "g1-second",
				queueKey: "group-1",
				rootScopeKey: "g1-root",
				options: { sessionGroup: { groupId: "group-1", rootSessionId: "g1-root" } },
			},
			{
				prompt: "g2-first",
				queueKey: "group-2",
				rootScopeKey: "g2-root",
				options: { sessionGroup: { groupId: "group-2", rootSessionId: "g2-root" } },
			},
		]

		const first = (provider as any).dequeueNextSessionLaunch()
		const second = (provider as any).dequeueNextSessionLaunch()
		const third = (provider as any).dequeueNextSessionLaunch()

		expect(first?.prompt).toBe("g1-first")
		expect(second?.prompt).toBe("g2-first")
		expect(third?.prompt).toBe("g1-second")
	})

	it("prioritizes a different root scope before returning to the same root subtree", () => {
		;(provider as any).queuedSessionLaunches = [
			{
				prompt: "root-a-parent",
				queueKey: "group-a-parent",
				rootScopeKey: "root-a",
				options: { sessionGroup: { groupId: "group-a-parent", rootSessionId: "root-a" } },
			},
			{
				prompt: "root-a-child",
				queueKey: "group-a-child",
				rootScopeKey: "root-a",
				options: {
					sessionGroup: {
						groupId: "group-a-child",
						rootSessionId: "root-a",
						parentGroupId: "group-a-parent",
					},
				},
			},
			{
				prompt: "root-b-parent",
				queueKey: "group-b-parent",
				rootScopeKey: "root-b",
				options: { sessionGroup: { groupId: "group-b-parent", rootSessionId: "root-b" } },
			},
		]

		const first = (provider as any).dequeueNextSessionLaunch()
		const second = (provider as any).dequeueNextSessionLaunch()
		const third = (provider as any).dequeueNextSessionLaunch()

		expect(first?.prompt).toBe("root-a-parent")
		expect(second?.prompt).toBe("root-b-parent")
		expect(third?.prompt).toBe("root-a-child")
	})

	it("skips a queued group that already reached its per-group cap", () => {
		const registry = (provider as any).registry
		registry.createSession("active-g1", "prompt", Date.now(), {
			sessionGroup: { groupId: "group-1", rootSessionId: "g1-root" },
		})
		registry.updateSessionStatus("active-g1", "running")
		;(provider as any).queuedSessionLaunches = [
			{
				prompt: "g1-queued",
				queueKey: "group-1",
				rootScopeKey: "g1-root",
				options: { sessionGroup: { groupId: "group-1", rootSessionId: "g1-root" } },
			},
			{
				prompt: "g2-queued",
				queueKey: "group-2",
				rootScopeKey: "g2-root",
				options: { sessionGroup: { groupId: "group-2", rootSessionId: "g2-root" } },
			},
		]

		const next = (provider as any).dequeueNextSessionLaunch()

		expect(next?.prompt).toBe("g2-queued")
		expect((provider as any).queuedSessionLaunches).toHaveLength(1)
		expect((provider as any).queuedSessionLaunches[0].prompt).toBe("g1-queued")
	})

	it("treats repeatedly problematic groups as temporarily saturated", () => {
		;(provider as any).updateQueueKeyPressure("group-1", "problematic")
		;(provider as any).updateQueueKeyPressure("group-1", "problematic")
		;(provider as any).queuedSessionLaunches = [
			{
				prompt: "g1-queued",
				queueKey: "group-1",
				rootScopeKey: "g1-root",
				options: { sessionGroup: { groupId: "group-1", rootSessionId: "g1-root" } },
			},
			{
				prompt: "g2-queued",
				queueKey: "group-2",
				rootScopeKey: "g2-root",
				options: { sessionGroup: { groupId: "group-2", rootSessionId: "g2-root" } },
			},
		]

		const next = (provider as any).dequeueNextSessionLaunch()

		expect(next?.prompt).toBe("g2-queued")
	})

	it("reduces pressure for a group after success", () => {
		;(provider as any).updateQueueKeyPressure("group-1", "problematic")
		;(provider as any).updateQueueKeyPressure("group-1", "problematic")
		;(provider as any).updateQueueKeyPressure("group-1", "success")
		;(provider as any).updateQueueKeyPressure("group-1", "success")

		expect((provider as any).queueKeyPressure.has("group-1")).toBe(false)
		expect((provider as any).getEffectiveQueueKeyCap("group-1")).toBe(1)
	})

	it("enriches filtered state with restart policy metadata", async () => {
		const registry = (provider as any).registry
		registry.createSession("session-restart", "Recover parser")
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "session-restart",
				restartCount: 2,
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch repeated the same broken patch.",
			},
		])

		await (provider as any).refreshRestartPolicyState()
		const state = (provider as any).getFilteredState()
		expect(state.sessions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sessionId: "session-restart",
					taskId: "session-restart",
					restartCount: 2,
					restartLimit: 3,
					autoRestartEnabled: true,
					lastStopReason: "loop_detected",
					lastStopSummary: "Branch repeated the same broken patch.",
					restartHandoff:
						"Stop reason: loop_detected. Previous summary: Branch repeated the same broken patch.",
				}),
			]),
		)
	})

	// kilocode_change start
	it("enriches filtered state with task tree linkage metadata", async () => {
		const registry = (provider as any).registry
		registry.createSession("child-task", "Implement child branch")
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "child-task",
				rootTaskId: "root-task",
				parentTaskId: "parent-task",
				childIds: ["grandchild-task"],
				number: 2,
				ts: 1,
				task: "Implement child branch",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])

		const state = (provider as any).getFilteredState()
		expect(state.sessions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sessionId: "child-task",
					taskId: "child-task",
					rootTaskId: "root-task",
					parentTaskId: "parent-task",
					childTaskIds: ["grandchild-task"],
				}),
			]),
		)
	})
	// kilocode_change end

	it("applies per-session auto-restart override in filtered state", async () => {
		const registry = (provider as any).registry
		registry.createSession("session-restart-override", "Recover parser")

		await (provider as any).refreshRestartPolicyState()
		;(provider as any).setSessionAutoRestart("session-restart-override", false)

		const state = (provider as any).getFilteredState()
		expect(state.sessions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sessionId: "session-restart-override",
					autoRestartEnabled: false,
				}),
			]),
		)
	})

	it("persists per-session auto-restart override into task history", async () => {
		const registry = (provider as any).registry
		registry.createSession("session-restart-persist", "Recover parser")
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "session-restart-persist",
				number: 1,
				ts: 1,
				task: "Recover parser",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])
		;(provider as any).setSessionAutoRestart("session-restart-persist", false)

		expect((provider as any).provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "session-restart-persist",
				sessionAutoRestartEnabled: false,
			}),
		)
	})

	it("prefers persisted session override from task history when no live override exists", async () => {
		const registry = (provider as any).registry
		registry.createSession("session-restart-history", "Recover parser")
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "session-restart-history",
				number: 1,
				ts: 1,
				task: "Recover parser",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				sessionAutoRestartEnabled: false,
			},
		])

		await (provider as any).refreshRestartPolicyState()
		const state = (provider as any).getFilteredState()
		expect(state.sessions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sessionId: "session-restart-history",
					autoRestartEnabled: false,
				}),
			]),
		)
	})

	it("shows existing terminal when selecting a session", () => {
		const sessionId = "session-terminal"
		const registry = (provider as any).registry
		registry.createSession(sessionId, "prompt")
		;(provider as any).sessionMessages.set(sessionId, [])

		const showExistingTerminal = vi.spyOn((provider as any).terminalManager, "showExistingTerminal")

		;(provider as any).selectSession(sessionId)

		expect(showExistingTerminal).toHaveBeenCalledWith(sessionId)
	})

	it("adds metadata text for tool requests and skips non chat events", async () => {
		const registry = (provider as any).registry
		const sessionId = "test-session-meta"
		registry.createSession(sessionId, "meta")
		;(provider as any).sessionMessages.set(sessionId, [])

		// Non-chat event should be logged but not added
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: { event: "session_created" },
		})
		expect((provider as any).sessionMessages.get(sessionId)).toEqual([])

		// Tool ask with metadata should produce text
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				timestamp: 1,
				type: "ask",
				ask: "tool",
				metadata: { tool: "codebaseSearch", query: "main" },
			},
		})

		const messages = (provider as any).sessionMessages.get(sessionId)
		expect(messages).toHaveLength(1)
		expect(messages?.[0].text).toBe("Tool: codebaseSearch (main)")
	})

	it("adds fallback text for checkpoint_saved", async () => {
		const registry = (provider as any).registry
		const sessionId = "test-session-checkpoint"
		registry.createSession(sessionId, "checkpoint")
		;(provider as any).sessionMessages.set(sessionId, [])
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				timestamp: 2,
				type: "say",
				say: "checkpoint_saved",
				checkpoint: { to: "abc123" },
			},
		})

		const messages = (provider as any).sessionMessages.get(sessionId)
		expect(messages).toHaveLength(1)
		expect(messages?.[0].text).toBe("")
		expect(messages?.[0].checkpoint).toEqual({ to: "abc123" })
	})

	it("dedupes repeated events with same ts/type/say/ask", async () => {
		const registry = (provider as any).registry
		const sessionId = "test-session-dedupe"
		registry.createSession(sessionId, "dedupe")
		;(provider as any).sessionMessages.set(sessionId, [])

		// Enable text handling
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: { type: "say", say: "api_req_started" },
		})

		const payload = {
			timestamp: 10,
			type: "say",
			say: "text",
			content: "hello",
		}

		;(provider as any).handleKilocodeEvent(sessionId, { streamEventType: "kilocode", payload })
		;(provider as any).handleKilocodeEvent(sessionId, { streamEventType: "kilocode", payload })

		const messages = (provider as any).sessionMessages.get(sessionId)
		expect(messages).toHaveLength(1)
		expect(messages?.[0].text).toBe("hello")
	})

	it("skips user echo before api_req_started", async () => {
		const registry = (provider as any).registry
		const sessionId = "test-session-echo"
		registry.createSession(sessionId, "echo")
		;(provider as any).sessionMessages.set(sessionId, [])

		// say:text before api_req_started -> skipped
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				type: "say",
				say: "text",
				content: "user prompt",
			},
		})

		// api_req_started toggles echo filter
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				type: "say",
				say: "api_req_started",
			},
		})

		// Now allow text
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				type: "say",
				say: "text",
				content: "assistant reply",
			},
		})

		const messages = (provider as any).sessionMessages.get(sessionId)
		expect(messages).toHaveLength(1)
		expect(messages?.[0].text).toBe("assistant reply")
	})

	it("drops empty partial messages and allows final to overwrite partial", async () => {
		const registry = (provider as any).registry
		const sessionId = "test-session-partial"
		registry.createSession(sessionId, "partial")
		;(provider as any).sessionMessages.set(sessionId, [])

		// Enable text handling
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: { type: "say", say: "api_req_started" },
		})

		// Empty partial is skipped
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				type: "say",
				say: "text",
				partial: true,
			},
		})

		// Partial with content
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				type: "say",
				say: "text",
				partial: true,
				content: "partial",
				timestamp: 999,
			},
		})

		// Final overwrites partial
		;(provider as any).handleKilocodeEvent(sessionId, {
			streamEventType: "kilocode",
			payload: {
				type: "say",
				say: "text",
				partial: false,
				content: "final",
				timestamp: 999,
			},
		})

		const messages = (provider as any).sessionMessages.get(sessionId)
		expect(messages).toHaveLength(1)
		expect(messages?.[0].text).toBe("final")
		expect(messages?.[0].partial).toBe(false)
	})

	it("dedupes auth start failures and reuses reminder text", async () => {
		const vscode = await import("vscode")
		const warningSpy = vscode.window.showWarningMessage as unknown as Mock

		const message = "Authentication failed: API request failed."
		;(provider as any).handleStartSessionApiFailure({ message, authError: true })
		;(provider as any).handleStartSessionApiFailure({ message, authError: true })

		expect(warningSpy).toHaveBeenCalledTimes(1)
		expect(warningSpy.mock.calls[0][0]).toContain(message)
	})

	it("shows auth popup again on a new start attempt", async () => {
		const vscode = await import("vscode")
		const warningSpy = vscode.window.showWarningMessage as unknown as Mock

		// Avoid the full CLI spawn flow; we only want to exercise per-attempt dedupe reset.
		;(provider as any).startAgentSession = vi.fn().mockResolvedValue(undefined)

		const message = "Authentication failed: Provider error: 401 No cookie auth credentials found"

		;(provider as any).handleStartSessionApiFailure({ message, authError: true })
		;(provider as any).handleStartSessionApiFailure({ message, authError: true })
		expect(warningSpy).toHaveBeenCalledTimes(1)

		// New attempt should reset dedupe state
		await (provider as any).handleStartSession({ prompt: "hi", parallelMode: false })
		;(provider as any).handleStartSessionApiFailure({ message, authError: true })
		expect(warningSpy).toHaveBeenCalledTimes(2)
	})

	it("builds payment required message with parsed title and link", async () => {
		const vscode = await import("vscode")
		const warningSpy = vscode.window.showWarningMessage as unknown as Mock
		const payload = {
			text: JSON.stringify({
				title: "Low credit",
				message: "Balance too low",
				buyCreditsUrl: "https://kilo.ai/billing",
			}),
		}

		;(provider as any).showPaymentRequiredPrompt(payload)

		expect(warningSpy).toHaveBeenCalledWith(
			expect.stringContaining("Low credit: Balance too low"),
			expect.stringContaining("Open billing"),
		)
	})

	describe("parsePaymentRequiredPayload", () => {
		it("parses valid JSON payload with all fields", () => {
			const payload = {
				text: JSON.stringify({
					title: "Payment Required",
					message: "Please add credits",
					buyCreditsUrl: "https://kilo.ai/billing",
				}),
			}
			const result = (provider as any).parsePaymentRequiredPayload(payload)
			expect(result.title).toBe("Payment Required")
			expect(result.message).toBe("Please add credits")
			expect(result.buyCreditsUrl).toBe("https://kilo.ai/billing")
		})

		it("uses fallback title when not provided in JSON", () => {
			const payload = {
				text: JSON.stringify({ message: "Please add credits" }),
			}
			const result = (provider as any).parsePaymentRequiredPayload(payload)
			expect(result.title).toBeTruthy()
			expect(result.message).toBe("Please add credits")
		})

		it("uses raw text as message when JSON has no message field", () => {
			const payload = { text: "Raw error text" }
			const result = (provider as any).parsePaymentRequiredPayload(payload)
			expect(result.message).toBe("Raw error text")
		})

		it("uses content field when text is not present", () => {
			const payload = { content: "Content field message" }
			const result = (provider as any).parsePaymentRequiredPayload(payload)
			expect(result.message).toBe("Content field message")
		})

		it("returns fallback values when payload is undefined", () => {
			const result = (provider as any).parsePaymentRequiredPayload(undefined)
			expect(result.title).toBeTruthy()
			expect(result.message).toBeTruthy()
			expect(result.buyCreditsUrl).toBeUndefined()
		})

		it("handles malformed JSON gracefully", () => {
			const payload = { text: "not valid json {" }
			const result = (provider as any).parsePaymentRequiredPayload(payload)
			expect(result.message).toBe("not valid json {")
		})
	})

	it("stops all active sessions in a group", () => {
		const registry = (provider as any).registry
		registry.createSession("s1", "prompt 1", Date.now(), { sessionGroup: { groupId: "g1", rootSessionId: "s1" } })
		registry.createSession("s2", "prompt 2", Date.now(), { sessionGroup: { groupId: "g1", rootSessionId: "s1" } })
		registry.updateSessionStatus("s1", "running")
		registry.updateSessionStatus("s2", "running")
		const stopSpy = vi.spyOn((provider as any).processHandler, "stopProcess")
		;(provider as any).stopSessionGroup("g1")
		expect(stopSpy).toHaveBeenCalledWith("s1")
		expect(stopSpy).toHaveBeenCalledWith("s2")
		expect(registry.getSession("s1")?.status).toBe("stopped")
		expect(registry.getSession("s2")?.status).toBe("stopped")
	})

	// kilocode_change start
	it("removes queued launches for a stopped group and preserves unrelated queue entries", () => {
		;(provider as any).queuedSessionLaunches = [
			{
				prompt: "group queued",
				queueKey: "g1",
				rootScopeKey: "root-g1",
				options: { sessionId: "queued-g1", sessionGroup: { groupId: "g1", rootSessionId: "root-g1" } },
			},
			{
				prompt: "other queued",
				queueKey: "g2",
				rootScopeKey: "root-g2",
				options: { sessionId: "queued-g2", sessionGroup: { groupId: "g2", rootSessionId: "root-g2" } },
			},
		]

		const publishSpy = vi.spyOn(provider as any, "publishGroupEvent")

		;(provider as any).stopSessionGroup("g1")

		expect((provider as any).queuedSessionLaunches).toEqual([
			expect.objectContaining({
				prompt: "other queued",
				queueKey: "g2",
			}),
		])
		expect(publishSpy).toHaveBeenCalledWith("g1", "queued-g1", "stopped", "Stopped before launch")
	})

	it("stops active sessions across a nested group subtree", () => {
		const registry = (provider as any).registry
		registry.createSession("parent-1", "parent prompt", Date.now(), {
			sessionGroup: { groupId: "g-parent", rootSessionId: "parent-1" },
		})
		registry.createSession("child-1", "child prompt", Date.now(), {
			sessionGroup: { groupId: "g-child", rootSessionId: "parent-1", parentGroupId: "g-parent" },
		})
		registry.createSession("grandchild-1", "grandchild prompt", Date.now(), {
			sessionGroup: { groupId: "g-grandchild", rootSessionId: "parent-1", parentGroupId: "g-child" },
		})
		registry.updateSessionStatus("parent-1", "running")
		registry.updateSessionStatus("child-1", "running")
		registry.updateSessionStatus("grandchild-1", "running")

		const stopSpy = vi.spyOn((provider as any).processHandler, "stopProcess")
		;(provider as any).stopSessionGroup("g-parent")

		expect(stopSpy).toHaveBeenCalledWith("parent-1")
		expect(stopSpy).toHaveBeenCalledWith("child-1")
		expect(stopSpy).toHaveBeenCalledWith("grandchild-1")
		expect(registry.getSession("parent-1")?.status).toBe("stopped")
		expect(registry.getSession("child-1")?.status).toBe("stopped")
		expect(registry.getSession("grandchild-1")?.status).toBe("stopped")
	})
	// kilocode_change end

	describe("dispose behavior", () => {
		it("keeps running agents alive when panel is closed", async () => {
			await (provider as any).startAgentSession("background session")

			const forkMock = (await import("node:child_process")).fork as unknown as Mock
			const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter; kill: Mock }
			proc.emit("message", { type: "ready" })

			const processHandler = (provider as any).processHandler
			expect(processHandler.activeSessions.size).toBe(1)
			;(provider as any).handlePanelDisposed()

			expect(proc.kill).not.toHaveBeenCalled()
			expect(processHandler.activeSessions.size).toBe(1)
			expect((provider as any).panel).toBeUndefined()
		})

		it("kills pending process on dispose", async () => {
			await (provider as any).startAgentSession("pending session")

			const forkMock = (await import("node:child_process")).fork as unknown as Mock
			const proc = forkMock.mock.results[0].value

			const processHandler = (provider as any).processHandler
			expect(processHandler.pendingProcesses.size).toBe(1)

			provider.dispose()

			expect(proc.kill).toHaveBeenCalledWith("SIGTERM")
			expect(processHandler.pendingProcesses.size).toBe(0)
		})

		it("kills all running processes on dispose", async () => {
			// Start two sessions and simulate session_created for both
			await (provider as any).startAgentSession("session 1")
			const forkMock = (await import("node:child_process")).fork as unknown as Mock
			const proc1 = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter; kill: Mock }
			// Emit IPC ready message followed by session_created
			proc1.emit("message", { type: "ready" })
			proc1.emit("message", { type: "session_created", sessionId: "session-1" })

			await (provider as any).startAgentSession("session 2")
			const proc2 = forkMock.mock.results[1].value as EventEmitter & { stdout: EventEmitter; kill: Mock }
			proc2.emit("message", { type: "ready" })
			proc2.emit("message", { type: "session_created", sessionId: "session-2" })

			const processHandler = (provider as any).processHandler
			expect(processHandler.activeSessions.size).toBe(2)

			provider.dispose()

			expect(proc1.kill).toHaveBeenCalledWith("SIGTERM")
			expect(proc2.kill).toHaveBeenCalledWith("SIGTERM")
			expect(processHandler.activeSessions.size).toBe(0)
		})

		it("clears all timeouts on dispose", async () => {
			await (provider as any).startAgentSession("session with timeout")
			const forkMock = (await import("node:child_process")).fork as unknown as Mock
			const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }
			proc.emit("message", { type: "ready" })
			proc.emit("message", { type: "session_created", sessionId: "session-1" })

			const processHandler = (provider as any).processHandler
			expect(processHandler.activeSessions.size).toBe(1)

			provider.dispose()

			// All active sessions (including their timeouts) should be cleared
			expect(processHandler.activeSessions.size).toBe(0)
		})
	})

	describe("hasRunningSessions", () => {
		it("returns false when no sessions exist", () => {
			expect((provider as any).hasRunningSessions()).toBe(false)
		})

		it("returns true when a session is running", async () => {
			await (provider as any).startAgentSession("running")
			const forkMock = (await import("node:child_process")).fork as unknown as Mock
			const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }
			proc.emit("message", { type: "ready" })
			proc.emit("message", { type: "session_created", sessionId: "session-1" })

			expect((provider as any).hasRunningSessions()).toBe(true)
		})

		it("returns count of running sessions", async () => {
			await (provider as any).startAgentSession("running 1")
			const forkMock = (await import("node:child_process")).fork as unknown as Mock
			const proc1 = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }
			proc1.emit("message", { type: "ready" })
			proc1.emit("message", { type: "session_created", sessionId: "session-1" })

			await (provider as any).startAgentSession("running 2")
			const proc2 = forkMock.mock.results[1].value as EventEmitter & { stdout: EventEmitter }
			proc2.emit("message", { type: "ready" })
			proc2.emit("message", { type: "session_created", sessionId: "session-2" })

			expect((provider as any).getRunningSessionCount()).toBe(2)
		})
	})
	it("restarts a problematic session and relaxes queue pressure", async () => {
		const registry = (provider as any).registry
		registry.createSession("restart-1", "repair task", Date.now(), {
			labelOverride: "Repair task",
			sessionGroup: {
				groupId: "group-r",
				rootSessionId: "restart-1",
				label: "Repair task",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		registry.updateSessionStatus("restart-1", "error", 1, "failed")
		;(provider as any).queueKeyPressure.set("group-r", 2)
		;(provider as any).resumeSession = vi.fn().mockResolvedValue(undefined)

		await (provider as any).restartSession("restart-1")

		expect((provider as any).resumeSession).toHaveBeenCalledWith(
			"restart-1",
			expect.stringContaining("Restart branch from latest valid state"),
			"Repair task",
		)
		expect((provider as any).queueKeyPressure.get("group-r") ?? 0).toBe(0)
	})

	it("uses compact recovery prompt when requested", async () => {
		const registry = (provider as any).registry
		registry.createSession("restart-compact", "repair task", Date.now(), {
			labelOverride: "Repair task",
		})
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "restart-compact",
				restartCount: 1,
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch repeated the same broken patch.",
			},
		])
		;(provider as any).resumeSession = vi.fn().mockResolvedValue(undefined)

		await (provider as any).restartSession("restart-compact", { compact: true })

		expect((provider as any).resumeSession).toHaveBeenCalledWith(
			"restart-compact",
			expect.stringContaining("compact recovery mode"),
			"Repair task",
		)
		expect((provider as any).resumeSession).toHaveBeenCalledWith(
			"restart-compact",
			expect.stringContaining("Previous stop reason: loop_detected."),
			"Repair task",
		)
	})

	it("reuses provider recovery packet for compact session restart", async () => {
		const registry = (provider as any).registry
		registry.createSession("restart-packet", "repair task", Date.now(), {
			labelOverride: "Repair task",
		})
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "restart-packet",
				restartCount: 2,
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch repeated the same broken patch.",
			},
		])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Cached branch summary",
			handoff:
				"Restart branch from latest valid state in compact recovery mode. Previous stop reason: loop_detected. Previous summary: Cached branch summary Use a short handoff, avoid replaying the whole branch, and continue with the minimal required context.",
			recoveryMode: "standard",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		;(provider as any).resumeSession = vi.fn().mockResolvedValue(undefined)

		await (provider as any).restartSession("restart-packet", { compact: true })

		expect((provider as any).provider.buildRecoveryPacket).toHaveBeenCalledWith(
			expect.objectContaining({
				historyItem: expect.objectContaining({
					id: "restart-packet",
					lastStopReason: "loop_detected",
				}),
			}),
		)
		expect((provider as any).resumeSession).toHaveBeenCalledWith(
			"restart-packet",
			expect.stringContaining("Cached branch summary"),
			"Repair task",
		)
	})

	it("restarts all problematic sessions in a group with compact recovery mode", async () => {
		const registry = (provider as any).registry
		registry.createSession("group-error-1", "repair task", Date.now(), {
			labelOverride: "Repair task A",
			sessionGroup: {
				groupId: "group-compact",
				rootSessionId: "group-error-1",
				label: "Repair swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		registry.createSession("group-error-2", "repair task", Date.now(), {
			labelOverride: "Repair task B",
			sessionGroup: {
				groupId: "group-compact",
				rootSessionId: "group-error-1",
				label: "Repair swarm",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})
		registry.updateSessionStatus("group-error-1", "error", 1, "failed")
		registry.updateSessionStatus("group-error-2", "stopped", 1, "stopped")
		;(provider as any).restartSession = vi.fn().mockResolvedValue(undefined)

		await (provider as any).restartSessionGroupCompact("group-compact")

		expect((provider as any).restartSession).toHaveBeenCalledTimes(2)
		expect((provider as any).restartSession).toHaveBeenCalledWith("group-error-1", { compact: true })
		expect((provider as any).restartSession).toHaveBeenCalledWith("group-error-2", { compact: true })
	})

	it("reuses cached relay content across repeated root broadcasts", async () => {
		const registry = (provider as any).registry
		registry.createSession("root-cache-source", "Planner", Date.now(), {
			labelOverride: "Planner",
		})
		registry.createSession("root-cache-target", "Worker", Date.now(), {
			labelOverride: "Worker",
		})
		registry.updateSessionStatus("root-cache-source", "error", 1, "failed")
		registry.updateSessionStatus("root-cache-target", "running")
		const sourceSession = registry.getSession("root-cache-source")
		const targetSession = registry.getSession("root-cache-target")
		if (!sourceSession || !targetSession) {
			throw new Error("Missing root cache sessions")
		}
		sourceSession.taskId = "root-cache-task"
		sourceSession.rootTaskId = "root-cache-task"
		targetSession.taskId = "root-cache-child"
		targetSession.rootTaskId = "root-cache-task"
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "root-cache-source",
				restartCount: 2,
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch repeated the same broken patch.",
			},
		])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Return only delta summary",
			handoff: "<restart_handoff> Return only delta summary </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		;(provider as any).sendMessageToStdin = vi.fn().mockResolvedValue(undefined)
		;(provider as any).postMessage = vi.fn()
		;(provider as any).publishGroupEvent = vi.fn()

		await (provider as any).broadcastToRootTask("root-cache-source", undefined, false, true)
		await (provider as any).broadcastToRootTask("root-cache-source", undefined, false, true)

		expect((provider as any).provider.buildRecoveryPacket).toHaveBeenCalledTimes(1)
	})

	it("reuses cached relay content across repeated group broadcasts", async () => {
		const registry = (provider as any).registry
		registry.createSession("group-cache-source", "prompt 1", Date.now(), {
			label: "Leader",
			sessionGroup: { groupId: "g-cache", rootSessionId: "group-cache-source" },
		})
		registry.createSession("group-cache-target", "prompt 2", Date.now(), {
			label: "Worker A",
			sessionGroup: { groupId: "g-cache", rootSessionId: "group-cache-source" },
		})
		registry.updateSessionStatus("group-cache-source", "error", 1, "failed")
		registry.updateSessionStatus("group-cache-target", "running")
		;(provider as any).queueKeyPressure.set("g-cache", 2)
		;(provider as any).provider.getTaskHistory = vi
			.fn()
			.mockReturnValue([
				{
					id: "group-cache-source",
					restartCount: 2,
					lastStopReason: "loop_detected",
					lastStopSummary: "Verbose stop summary.",
				},
			])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Pressure compact summary",
			handoff: "<restart_handoff> Verbose full handoff </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		;(provider as any).sendMessageToStdin = vi.fn().mockResolvedValue(undefined)
		;(provider as any).postMessage = vi.fn()
		;(provider as any).publishGroupEvent = vi.fn()

		await (provider as any).broadcastToSessionGroup(
			"group-cache-source",
			"Branch handoff from Leader: Verbose full handoff",
			false,
		)
		await (provider as any).broadcastToSessionGroup(
			"group-cache-source",
			"Branch handoff from Leader: Verbose full handoff",
			false,
		)

		expect((provider as any).provider.buildRecoveryPacket).toHaveBeenCalledTimes(1)
	})

	it("broadcasts compact recovery handoff to sibling root-task sessions", async () => {
		const registry = (provider as any).registry
		registry.createSession("root-broadcast-source", "Planner", Date.now(), {
			labelOverride: "Planner",
		})
		registry.createSession("root-broadcast-target", "Worker", Date.now(), {
			labelOverride: "Worker",
		})
		registry.updateSessionStatus("root-broadcast-source", "error", 1, "failed")
		registry.updateSessionStatus("root-broadcast-target", "running")
		const sourceSession = registry.getSession("root-broadcast-source")
		const targetSession = registry.getSession("root-broadcast-target")
		if (!sourceSession || !targetSession) {
			throw new Error("Missing root broadcast sessions")
		}
		sourceSession.taskId = "root-task-1"
		sourceSession.rootTaskId = "root-task-1"
		targetSession.taskId = "child-task-2"
		targetSession.rootTaskId = "root-task-1"
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "root-broadcast-source",
				restartCount: 2,
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch repeated the same broken patch.",
			},
		])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Return only delta summary",
			handoff: "<restart_handoff> Return only delta summary </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		;(provider as any).sendMessageToStdin = vi.fn().mockResolvedValue(undefined)
		;(provider as any).postMessage = vi.fn()
		;(provider as any).publishGroupEvent = vi.fn()

		await (provider as any).broadcastToRootTask("root-broadcast-source", undefined, false, true)

		expect((provider as any).provider.buildRecoveryPacket).toHaveBeenCalled()
		expect((provider as any).sendMessageToStdin).toHaveBeenCalledWith(
			"root-broadcast-target",
			expect.stringContaining("<root_handoff>"),
		)
		expect((provider as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.rootTaskMessage",
				rootTaskId: "root-task-1",
				content: expect.stringContaining("Return only delta summary"),
			}),
		)
	})

	it("auto-compacts root broadcast under scheduler pressure even when full handoff is requested", async () => {
		const registry = (provider as any).registry
		registry.createSession("root-broadcast-pressure", "Planner", Date.now(), {
			labelOverride: "Planner",
			sessionGroup: {
				groupId: "group-pressure-root",
				rootSessionId: "root-broadcast-pressure",
				label: "Pressure root",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		registry.createSession("root-broadcast-pressure-target", "Worker", Date.now(), {
			labelOverride: "Worker",
		})
		registry.updateSessionStatus("root-broadcast-pressure", "error", 1, "failed")
		registry.updateSessionStatus("root-broadcast-pressure-target", "running")
		const sourceSession = registry.getSession("root-broadcast-pressure")
		const targetSession = registry.getSession("root-broadcast-pressure-target")
		if (!sourceSession || !targetSession) {
			throw new Error("Missing pressure root broadcast sessions")
		}
		sourceSession.taskId = "root-task-pressure"
		sourceSession.rootTaskId = "root-task-pressure"
		targetSession.taskId = "child-task-pressure"
		targetSession.rootTaskId = "root-task-pressure"
		;(provider as any).queueKeyPressure.set("group-pressure-root", 2)
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "root-broadcast-pressure",
				restartCount: 2,
				lastStopReason: "loop_detected",
				lastStopSummary: "Verbose stop summary.",
			},
		])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Pressure compact summary",
			handoff: "<restart_handoff> Verbose full handoff </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		;(provider as any).sendMessageToStdin = vi.fn().mockResolvedValue(undefined)
		;(provider as any).postMessage = vi.fn()
		;(provider as any).publishGroupEvent = vi.fn()

		await (provider as any).broadcastToRootTask(
			"root-broadcast-pressure",
			"Branch handoff from Planner: Verbose full handoff",
			false,
			false,
		)

		expect((provider as any).sendMessageToStdin).toHaveBeenCalledWith(
			"root-broadcast-pressure-target",
			expect.stringContaining("Pressure compact summary"),
		)
		expect((provider as any).publishGroupEvent).toHaveBeenCalledWith(
			"group-pressure-root",
			"root-broadcast-pressure",
			"running",
			expect.stringContaining("compact"),
		)
	})

	// kilocode_change start
	it("preserves custom root relay content when it is not a recovery handoff", async () => {
		const registry = (provider as any).registry
		registry.createSession("root-custom-source", "Planner", Date.now(), {
			labelOverride: "Planner",
		})
		registry.createSession("root-custom-target", "Worker", Date.now(), {
			labelOverride: "Worker",
		})
		registry.updateSessionStatus("root-custom-source", "running")
		registry.updateSessionStatus("root-custom-target", "running")
		const sourceSession = registry.getSession("root-custom-source")
		const targetSession = registry.getSession("root-custom-target")
		if (!sourceSession || !targetSession) {
			throw new Error("Missing custom root broadcast sessions")
		}
		sourceSession.taskId = "root-task-custom"
		sourceSession.rootTaskId = "root-task-custom"
		targetSession.taskId = "child-task-custom"
		targetSession.rootTaskId = "root-task-custom"
		;(provider as any).provider.buildRecoveryPacket = vi.fn()

		const sendSpy = vi.spyOn(provider as any, "sendMessageToStdin").mockResolvedValue(undefined)
		const postSpy = vi.spyOn(provider as any, "postMessage")

		await (provider as any).broadcastToRootTask(
			"root-custom-source",
			"Coordinate on parser branch only",
			false,
			true,
		)

		expect((provider as any).provider.buildRecoveryPacket).not.toHaveBeenCalled()
		expect(sendSpy).toHaveBeenCalledWith(
			"root-custom-target",
			expect.stringContaining("Coordinate on parser branch only"),
		)
		expect(postSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.rootTaskMessage",
				rootTaskId: "root-task-custom",
				content: "Coordinate on parser branch only",
			}),
		)
	})
	// kilocode_change end

	it("broadcasts compact recovery handoff to sibling root-task sessions", async () => {
		const registry = (provider as any).registry
		registry.createSession("root-broadcast-source", "Planner", Date.now(), {
			labelOverride: "Planner",
		})
		registry.createSession("root-broadcast-target", "Worker", Date.now(), {
			labelOverride: "Worker",
		})
		registry.updateSessionStatus("root-broadcast-source", "error", 1, "failed")
		registry.updateSessionStatus("root-broadcast-target", "running")
		const sourceSession = registry.getSession("root-broadcast-source")
		const targetSession = registry.getSession("root-broadcast-target")
		if (!sourceSession || !targetSession) {
			throw new Error("Missing root broadcast sessions")
		}
		sourceSession.taskId = "root-task-1"
		sourceSession.rootTaskId = "root-task-1"
		targetSession.taskId = "child-task-2"
		targetSession.rootTaskId = "root-task-1"
		;(provider as any).provider.getTaskHistory.mockReturnValue([
			{
				id: "root-broadcast-source",
				restartCount: 2,
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch repeated the same broken patch.",
			},
		])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Return only delta summary",
			handoff: "<restart_handoff> Return only delta summary </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})
		;(provider as any).sendMessageToStdin = vi.fn().mockResolvedValue(undefined)
		;(provider as any).postMessage = vi.fn()
		;(provider as any).publishGroupEvent = vi.fn()

		await (provider as any).broadcastToRootTask("root-broadcast-source", undefined, false, true)

		expect((provider as any).provider.buildRecoveryPacket).toHaveBeenCalled()
		expect((provider as any).sendMessageToStdin).toHaveBeenCalledWith(
			"root-broadcast-target",
			expect.stringContaining("<root_handoff>"),
		)
		expect((provider as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.rootTaskMessage",
				rootTaskId: "root-task-1",
				content: expect.stringContaining("Return only delta summary"),
			}),
		)
	})

	// kilocode_change start
	it("restarts problematic sessions across a nested group subtree in compact mode", async () => {
		const registry = (provider as any).registry
		registry.createSession("parent-running", "parent task", Date.now(), {
			labelOverride: "Parent task",
			sessionGroup: {
				groupId: "group-parent-compact",
				rootSessionId: "parent-running",
				label: "Parent swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		registry.createSession("child-error", "child task", Date.now(), {
			labelOverride: "Child task",
			sessionGroup: {
				groupId: "group-child-compact",
				rootSessionId: "parent-running",
				parentGroupId: "group-parent-compact",
				label: "Child swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		registry.createSession("grandchild-stopped", "grandchild task", Date.now(), {
			labelOverride: "Grandchild task",
			sessionGroup: {
				groupId: "group-grandchild-compact",
				rootSessionId: "parent-running",
				parentGroupId: "group-child-compact",
				label: "Grandchild swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		registry.updateSessionStatus("parent-running", "running")
		registry.updateSessionStatus("child-error", "error", 1, "failed")
		registry.updateSessionStatus("grandchild-stopped", "stopped", 1, "stopped")
		;(provider as any).restartSession = vi.fn().mockResolvedValue(undefined)

		await (provider as any).restartSessionGroupCompact("group-parent-compact")

		expect((provider as any).restartSession).toHaveBeenCalledTimes(2)
		expect((provider as any).restartSession).not.toHaveBeenCalledWith("parent-running", { compact: true })
		expect((provider as any).restartSession).toHaveBeenCalledWith("child-error", { compact: true })
		expect((provider as any).restartSession).toHaveBeenCalledWith("grandchild-stopped", { compact: true })
	})
	// kilocode_change end
})

describe("AgentManagerProvider gitUrl filtering", () => {
	let provider: InstanceType<typeof AgentManagerProvider>
	const mockContext = {
		extensionUri: { fsPath: "/mock/extension/path" },
		extensionPath: "",
		extensionMode: 1 /* Development */,
	} as any
	const mockOutputChannel = { appendLine: vi.fn() } as any
	let mockGetRemoteUrl: Mock

	beforeEach(async () => {
		vi.resetModules()

		const mockWorkspaceFolder = { uri: { fsPath: "/tmp/workspace" } }
		const mockWindow = {
			showErrorMessage: () => undefined,
			ViewColumn: { One: 1 },
			onDidCloseTerminal: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn(), dispose: vi.fn() }),
		}
		const mockProvider = {
			getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "kilocode" } }),
		}

		vi.doMock("vscode", () => ({
			workspace: { workspaceFolders: [mockWorkspaceFolder] },
			window: mockWindow,
			env: { openExternal: vi.fn() },
			Uri: { parse: vi.fn(), joinPath: vi.fn() },
			ViewColumn: { One: 1 },
			ExtensionMode: { Development: 1, Production: 2, Test: 3 },
		}))

		// Mock CliInstaller so getLocalCliPath returns our mock path
		vi.doMock("../CliInstaller", () => ({
			getLocalCliPath: () => MOCK_CLI_PATH,
			canInstallCli: () => false,
		}))

		vi.doMock("../../../../utils/fs", () => ({
			fileExistsAtPath: vi.fn().mockImplementation((p: string) => Promise.resolve(p === MOCK_CLI_PATH)),
		}))

		mockGetRemoteUrl = vi.fn().mockResolvedValue("https://github.com/org/repo.git")
		vi.doMock("../../../../services/code-index/managed/git-utils", () => ({
			getRemoteUrl: mockGetRemoteUrl,
		}))

		class TestProc extends EventEmitter {
			stdout = new EventEmitter()
			stderr = new EventEmitter()
			kill = vi.fn()
			pid = 1234
			exitCode: number | null = null
			send = vi.fn().mockImplementation((msg: unknown, callback?: (err: Error | null) => void) => {
				if (callback) callback(null)
				return true
			})
		}

		const spawnMock = vi.fn(() => new TestProc())
		const forkMock = vi.fn(() => new TestProc())
		const execSyncMock = vi.fn(() => MOCK_CLI_PATH)

		vi.doMock("node:child_process", () => ({
			spawn: spawnMock,
			fork: forkMock,
			execSync: execSyncMock,
		}))

		const module = await import("../AgentManagerProvider")
		AgentManagerProvider = module.AgentManagerProvider
		provider = new AgentManagerProvider(mockContext, mockOutputChannel, mockProvider as any)
	})

	afterEach(() => {
		provider.dispose()
	})

	it("captures gitUrl from workspace when starting a session", async () => {
		await (provider as any).startAgentSession("test prompt")

		expect(mockGetRemoteUrl).toHaveBeenCalledWith("/tmp/workspace")
	})

	it("passes gitUrl to process handler when starting session", async () => {
		const spawnProcessSpy = vi.spyOn((provider as any).processHandler, "spawnProcess")

		await (provider as any).startAgentSession("test prompt")

		expect(spawnProcessSpy).toHaveBeenCalledWith(
			expect.any(String),
			"/tmp/workspace",
			"test prompt",
			expect.objectContaining({ gitUrl: "https://github.com/org/repo.git" }),
			expect.any(Function),
		)
	})

	it("handles git URL retrieval errors gracefully", async () => {
		mockGetRemoteUrl.mockRejectedValue(new Error("No remote configured"))
		const spawnProcessSpy = vi.spyOn((provider as any).processHandler, "spawnProcess")

		await (provider as any).startAgentSession("test prompt")

		// Should still spawn process without gitUrl
		expect(spawnProcessSpy).toHaveBeenCalledWith(
			expect.any(String),
			"/tmp/workspace",
			"test prompt",
			expect.objectContaining({ gitUrl: undefined }),
			expect.any(Function),
		)
	})

	it("stores gitUrl on created session", async () => {
		await (provider as any).startAgentSession("test prompt")
		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }

		// Emit IPC ready message followed by session_created
		proc.emit("message", { type: "ready" })
		proc.emit("message", { type: "session_created", sessionId: "session-1" })

		const sessions = (provider as any).registry.getSessions()
		expect(sessions[0].gitUrl).toBe("https://github.com/org/repo.git")
	})

	it("sets currentGitUrl on provider initialization", async () => {
		// The provider should have set the current git URL
		expect((provider as any).currentGitUrl).toBe("https://github.com/org/repo.git")
	})

	it("filters sessions by currentGitUrl when broadcasting state", async () => {
		// Create sessions with different gitUrls
		const registry = (provider as any).registry
		registry.createSession("session-1", "prompt 1", undefined, {
			gitUrl: "https://github.com/org/repo.git",
		})
		registry.createSession("session-2", "prompt 2", undefined, {
			gitUrl: "https://github.com/org/other-repo.git",
		})
		registry.createSession("session-3", "prompt 3", undefined, {
			gitUrl: "https://github.com/org/repo.git",
		})

		// Get state (which should be filtered)
		const state = (provider as any).getFilteredState()

		// Should only include sessions matching currentGitUrl
		expect(state.sessions).toHaveLength(2)
		expect(state.sessions.map((s: any) => s.sessionId)).toContain("session-1")
		expect(state.sessions.map((s: any) => s.sessionId)).toContain("session-3")
		expect(state.sessions.map((s: any) => s.sessionId)).not.toContain("session-2")
	})

	it("excludes sessions without gitUrl when filtering by gitUrl", async () => {
		const registry = (provider as any).registry
		registry.createSession("session-1", "prompt 1", undefined, {
			gitUrl: "https://github.com/org/repo.git",
		})
		registry.createSession("session-2", "prompt 2") // no gitUrl
		registry.createSession("session-3", "prompt 3", undefined, {
			gitUrl: "https://github.com/org/other-repo.git",
		})

		const state = (provider as any).getFilteredState()

		// Should only include session-1 (matches exactly)
		expect(state.sessions).toHaveLength(1)
		expect(state.sessions[0].sessionId).toBe("session-1")
	})

	it("shows only sessions without gitUrl when currentGitUrl is not set", async () => {
		;(provider as any).currentGitUrl = undefined

		const registry = (provider as any).registry
		registry.createSession("session-1", "prompt 1", undefined, {
			gitUrl: "https://github.com/org/repo1.git",
		})
		registry.createSession("session-2", "prompt 2") // no gitUrl

		const state = (provider as any).getFilteredState()

		expect(state.sessions).toHaveLength(1)
		expect(state.sessions[0].sessionId).toBe("session-2")
	})

	it("updates currentGitUrl when starting a session if not already set (race condition fix)", async () => {
		// Simulate the race condition: currentGitUrl is undefined because initializeCurrentGitUrl hasn't completed
		;(provider as any).currentGitUrl = undefined

		// Start a session - this should update currentGitUrl
		await (provider as any).startAgentSession("test prompt")

		// currentGitUrl should now be set from the session's gitUrl
		expect((provider as any).currentGitUrl).toBe("https://github.com/org/repo.git")
	})

	it("does not overwrite currentGitUrl if already set", async () => {
		// Set a different currentGitUrl
		;(provider as any).currentGitUrl = "https://github.com/org/other-repo.git"

		// Start a session
		await (provider as any).startAgentSession("test prompt")

		// currentGitUrl should NOT be overwritten
		expect((provider as any).currentGitUrl).toBe("https://github.com/org/other-repo.git")
	})

	describe("filterRemoteSessionsByGitUrl", () => {
		it("returns only sessions with matching git_url when currentGitUrl is set", () => {
			const remoteSessions = [
				{ session_id: "1", git_url: "https://github.com/org/repo.git" },
				{ session_id: "2", git_url: "https://github.com/org/other.git" },
				{ session_id: "3", git_url: "https://github.com/org/repo.git" },
			] as any[]

			const filtered = (provider as any).filterRemoteSessionsByGitUrl(remoteSessions)

			expect(filtered).toHaveLength(2)
			expect(filtered.map((s: any) => s.session_id)).toEqual(["1", "3"])
		})

		it("excludes sessions without git_url when currentGitUrl is set", () => {
			const remoteSessions = [
				{ session_id: "1", git_url: "https://github.com/org/repo.git" },
				{ session_id: "2", git_url: undefined },
				{ session_id: "3" }, // no git_url property
			] as any[]

			const filtered = (provider as any).filterRemoteSessionsByGitUrl(remoteSessions)

			expect(filtered).toHaveLength(1)
			expect(filtered[0].session_id).toBe("1")
		})

		it("returns only sessions without git_url when currentGitUrl is undefined", () => {
			;(provider as any).currentGitUrl = undefined

			const remoteSessions = [
				{ session_id: "1", git_url: "https://github.com/org/repo.git" },
				{ session_id: "2", git_url: undefined },
				{ session_id: "3" }, // no git_url property
			] as any[]

			const filtered = (provider as any).filterRemoteSessionsByGitUrl(remoteSessions)

			expect(filtered).toHaveLength(2)
			expect(filtered.map((s: any) => s.session_id)).toEqual(["2", "3"])
		})

		it("excludes sessions with git_url when currentGitUrl is undefined", () => {
			;(provider as any).currentGitUrl = undefined

			const remoteSessions = [
				{ session_id: "1", git_url: "https://github.com/org/repo.git" },
				{ session_id: "2", git_url: "https://github.com/org/other.git" },
			] as any[]

			const filtered = (provider as any).filterRemoteSessionsByGitUrl(remoteSessions)

			expect(filtered).toHaveLength(0)
		})
	})
})

describe("AgentManagerProvider telemetry", () => {
	let provider: InstanceType<typeof AgentManagerProvider>
	const mockContext = {
		extensionUri: { fsPath: "/mock/extension/path" },
		extensionPath: "",
		extensionMode: 1 /* Development */,
	} as any
	const mockOutputChannel = { appendLine: vi.fn() } as any

	beforeEach(async () => {
		vi.resetModules()
		vi.clearAllMocks()

		const mockWorkspaceFolder = { uri: { fsPath: "/tmp/workspace" } }
		const mockWindow = {
			showErrorMessage: () => undefined,
			ViewColumn: { One: 1 },
			onDidCloseTerminal: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn(), dispose: vi.fn() }),
		}
		const mockProvider = {
			getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "kilocode" } }),
		}

		vi.doMock("vscode", () => ({
			workspace: { workspaceFolders: [mockWorkspaceFolder] },
			window: mockWindow,
			env: { openExternal: vi.fn() },
			Uri: { parse: vi.fn(), joinPath: vi.fn() },
			ViewColumn: { One: 1 },
			ExtensionMode: { Development: 1, Production: 2, Test: 3 },
		}))

		// Mock CliInstaller so getLocalCliPath returns our mock path
		vi.doMock("../CliInstaller", () => ({
			getLocalCliPath: () => MOCK_CLI_PATH,
			canInstallCli: () => false,
		}))

		vi.doMock("../../../../utils/fs", () => ({
			fileExistsAtPath: vi.fn().mockImplementation((p: string) => Promise.resolve(p === MOCK_CLI_PATH)),
		}))

		vi.doMock("../../../../services/code-index/managed/git-utils", () => ({
			getRemoteUrl: vi.fn().mockResolvedValue(undefined),
		}))

		class TestProc extends EventEmitter {
			stdout = new EventEmitter()
			stderr = new EventEmitter()
			kill = vi.fn()
			pid = 1234
			exitCode: number | null = null
			send = vi.fn().mockImplementation((msg: unknown, callback?: (err: Error | null) => void) => {
				if (callback) callback(null)
				return true
			})
		}

		const spawnMock = vi.fn(() => new TestProc())
		const forkMock = vi.fn(() => new TestProc())
		const execSyncMock = vi.fn(() => MOCK_CLI_PATH)

		vi.doMock("node:child_process", () => ({
			spawn: spawnMock,
			fork: forkMock,
			execSync: execSyncMock,
		}))

		const module = await import("../AgentManagerProvider")
		AgentManagerProvider = module.AgentManagerProvider
		provider = new AgentManagerProvider(mockContext, mockOutputChannel, mockProvider as any)
	})

	afterEach(() => {
		provider.dispose()
	})

	it("tracks session started telemetry when session_created event is received", async () => {
		await (provider as any).startAgentSession("test telemetry")
		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }

		// Emit IPC ready message - session is created on ready, not on session_created
		proc.emit("message", { type: "ready" })

		expect(telemetry.captureAgentManagerSessionStarted).toHaveBeenCalledWith(
			expect.any(String), // RuntimeProcessHandler generates session ID
			false, // useWorktree = false (no parallel mode)
		)
	})

	it("tracks session started with worktree flag for parallel mode sessions", async () => {
		await (provider as any).startAgentSession("test parallel", { parallelMode: true })
		const forkMock = (await import("node:child_process")).fork as unknown as Mock
		const proc = forkMock.mock.results[0].value as EventEmitter & { stdout: EventEmitter }

		// Emit IPC ready message - session is created on ready
		proc.emit("message", { type: "ready" })

		expect(telemetry.captureAgentManagerSessionStarted).toHaveBeenCalledWith(
			expect.any(String), // RuntimeProcessHandler generates session ID
			true, // useWorktree = true (parallel mode enabled)
		)
	})

	it("tracks session completed telemetry when complete event is received", async () => {
		// Create a session directly in the registry
		const registry = (provider as any).registry
		const sessionId = "session-complete-1"
		registry.createSession(sessionId, "test complete")
		;(provider as any).sessionMessages.set(sessionId, [])
		;(provider as any).postMessage = vi.fn()
		;(provider as any).fetchAndPostRemoteSessions = vi.fn().mockResolvedValue(undefined)

		// Handle complete event
		;(provider as any).handleCliEvent(sessionId, {
			streamEventType: "complete",
			exitCode: 0,
		})

		expect(telemetry.captureAgentManagerSessionCompleted).toHaveBeenCalledWith(
			sessionId,
			false, // useWorktree = false
		)
		expect((provider as any).fetchAndPostRemoteSessions).toHaveBeenCalledTimes(1)
		expect((provider as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.stateEvent",
				sessionId,
				eventType: "ask_completion_result",
			}),
		)
	})

	it("tracks session stopped telemetry when user stops a session", async () => {
		// Create a session directly in the registry
		const registry = (provider as any).registry
		const sessionId = "session-stop-1"
		registry.createSession(sessionId, "test stop")
		registry.updateSessionStatus(sessionId, "running")

		// Stop the session
		;(provider as any).stopAgentSession(sessionId)

		expect(telemetry.captureAgentManagerSessionStopped).toHaveBeenCalledWith(
			sessionId,
			false, // useWorktree = false
		)
	})

	it("tracks session stopped telemetry when interrupted event is received", async () => {
		const registry = (provider as any).registry
		const sessionId = "session-interrupted-1"
		registry.createSession(sessionId, "test interrupted")
		;(provider as any).sessionMessages.set(sessionId, [])

		// Handle interrupted event
		;(provider as any).handleCliEvent(sessionId, {
			streamEventType: "interrupted",
			reason: "User cancelled",
		})

		expect(telemetry.captureAgentManagerSessionStopped).toHaveBeenCalledWith(
			sessionId,
			false, // useWorktree = false
		)
	})

	it("syncs task-layer paused status into filtered session lifecycle fields", async () => {
		const registry = (provider as any).registry
		registry.createSession("child-1", "paused task")
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-1",
				rootTaskId: "root-1",
				parentTaskId: "parent-1",
				number: 1,
				ts: Date.now(),
				task: "paused task",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "paused",
				pauseReason: "waiting for resume",
				pausedAt: 123,
				resumeContextSummary: "Continue from previous checkpoint",
			},
		])

		const state = (provider as any).getFilteredState()
		expect(state.sessions[0]).toMatchObject({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			lifecycleStatus: "paused",
			activityState: "paused",
			needsAttention: true,
			recoveryState: "recoverable",
			pendingReaction: "resume",
			restartHandoff: "Continue from previous checkpoint",
		})
	})

	it("tracks session error telemetry when error event is received", async () => {
		const registry = (provider as any).registry
		const sessionId = "session-error-1"
		registry.createSession(sessionId, "test error")
		;(provider as any).sessionMessages.set(sessionId, [])

		// Handle error event
		;(provider as any).handleCliEvent(sessionId, {
			streamEventType: "error",
			error: "Something went wrong",
		})

		expect(telemetry.captureAgentManagerSessionError).toHaveBeenCalledWith(
			sessionId,
			false, // useWorktree = false
			"Something went wrong",
		)
	})

	it("tracks worktree flag correctly for parallel mode sessions in completion", async () => {
		const registry = (provider as any).registry
		const sessionId = "session-parallel-complete-1"
		registry.createSession(sessionId, "test parallel complete", undefined, { parallelMode: true })
		;(provider as any).sessionMessages.set(sessionId, [])

		// Handle complete event
		;(provider as any).handleCliEvent(sessionId, {
			streamEventType: "complete",
			exitCode: 0,
		})

		expect(telemetry.captureAgentManagerSessionCompleted).toHaveBeenCalledWith(
			sessionId,
			true, // useWorktree = true (parallel mode)
		)
	})

	describe("Regression Tests - finishWorktreeSession validation (P0)", () => {
		it("should not attempt to finish non-running worktree sessions", async () => {
			const registry = (provider as any).registry
			const sessionId = "session-done-1"
			registry.createSession(sessionId, "test done session", undefined, { parallelMode: true })
			registry.updateSessionStatus(sessionId, "done")

			const processHandler = (provider as any).processHandler
			vi.spyOn(processHandler, "terminateProcess")

			// Call finishWorktreeSession on a done session
			;(provider as any).finishWorktreeSession(sessionId)

			// Should NOT call terminateProcess - session is not running
			expect(processHandler.terminateProcess).not.toHaveBeenCalled()
		})

		it("should keep session interactive after finishing running worktree sessions", async () => {
			const registry = (provider as any).registry
			const sessionId = "session-running-1"
			registry.createSession(sessionId, "test running session", undefined, { parallelMode: true })
			registry.updateSessionStatus(sessionId, "running")
			;(provider as any).sessionMessages.set(sessionId, [])

			const processHandler = (provider as any).processHandler
			vi.spyOn(processHandler, "terminateProcess")

			// Call finishWorktreeSession on a running session
			;(provider as any).finishWorktreeSession(sessionId)

			// Should NOT call terminateProcess - session should remain interactive
			expect(processHandler.terminateProcess).not.toHaveBeenCalled()
		})
	})

	describe("BUG: finishWorktreeSession completion message behavior", () => {
		it("should NOT show completion popup when commit fails", async () => {
			// This test reproduces the bug where the completion popup is shown
			// even when the commit fails
			vi.resetModules()

			const mockWorkspaceFolder = { uri: { fsPath: "/tmp/workspace" } }
			const mockProvider = {
				getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "kilocode" } }),
			}

			const mockShowInformationMessage = vi.fn().mockResolvedValue(undefined)
			const mockShowErrorMessage = vi.fn().mockResolvedValue(undefined)

			const mockWindow = {
				showErrorMessage: mockShowErrorMessage,
				showWarningMessage: vi.fn().mockResolvedValue(undefined),
				showInformationMessage: mockShowInformationMessage,
				ViewColumn: { One: 1 },
				onDidCloseTerminal: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn(), dispose: vi.fn() }),
			}

			vi.doMock("vscode", () => ({
				workspace: { workspaceFolders: [mockWorkspaceFolder] },
				window: mockWindow,
				env: { openExternal: vi.fn(), clipboard: { writeText: vi.fn() } },
				Uri: { parse: vi.fn(), joinPath: vi.fn() },
				ViewColumn: { One: 1 },
				ExtensionMode: { Development: 1, Production: 2, Test: 3 },
			}))

			vi.doMock("../CliInstaller", () => ({
				getLocalCliPath: () => MOCK_CLI_PATH,
			}))

			vi.doMock("../../../../utils/fs", () => ({
				fileExistsAtPath: vi.fn().mockImplementation((p: string) => Promise.resolve(p === MOCK_CLI_PATH)),
			}))

			vi.doMock("../../../../services/code-index/managed/git-utils", () => ({
				getRemoteUrl: vi.fn().mockResolvedValue(undefined),
			}))

			vi.doMock("../WorktreeManager", () => ({
				WorktreeManager: vi.fn().mockImplementation(() => ({
					createWorktree: vi.fn().mockResolvedValue({
						branch: "test-branch-123",
						path: "/tmp/workspace/.kilocode/worktrees/test-branch-123",
						parentBranch: "main",
					}),
					commitChanges: vi.fn().mockResolvedValue({ success: true }),
					removeWorktree: vi.fn().mockResolvedValue(undefined),
					discoverWorktrees: vi.fn().mockResolvedValue([]),
					ensureGitExclude: vi.fn().mockResolvedValue(undefined),
					stageAllChanges: vi.fn().mockResolvedValue(true), // Has changes to commit
				})),
				WorktreeError: class WorktreeError extends Error {
					constructor(
						public code: string,
						message: string,
					) {
						super(message)
					}
				},
			}))

			class TestProc extends EventEmitter {
				stdout = new EventEmitter()
				stderr = new EventEmitter()
				stdin = { write: vi.fn() }
				kill = vi.fn()
				pid = 1234
			}

			const spawnMock = vi.fn(() => new TestProc())
			const execSyncMock = vi.fn(() => MOCK_CLI_PATH)

			vi.doMock("node:child_process", () => ({
				spawn: spawnMock,
				execSync: execSyncMock,
			}))

			// Mock AgentTaskRunner to simulate a FAILED commit
			vi.doMock("../AgentTaskRunner", () => ({
				AgentTaskRunner: vi.fn().mockImplementation(() => ({
					executeTask: vi.fn().mockResolvedValue({
						success: false,
						completedByAgent: false,
						error: "Session not found in activeSessions",
					}),
				})),
				AgentTasks: {
					createCommitTask: vi.fn().mockReturnValue({
						name: "commit-changes",
						instruction: "test instruction",
						timeoutMs: 60_000,
						checkComplete: vi.fn().mockResolvedValue(false),
						fallback: vi.fn().mockResolvedValue(undefined),
					}),
				},
			}))

			// Import the module with mocks applied
			const module = await import("../AgentManagerProvider")
			const TestAgentManagerProvider = module.AgentManagerProvider
			const mockContext = { extensionUri: {}, extensionPath: "", extensionMode: 1 } as any
			const mockOutputChannel = { appendLine: vi.fn() } as any
			const testProvider = new TestAgentManagerProvider(mockContext, mockOutputChannel, mockProvider as any)

			try {
				const registry = (testProvider as any).registry
				const sessionId = "session-fail-commit"
				const worktreePath = "/tmp/worktree-path"
				const branch = "new-1768857996469"

				// Create a running worktree session
				registry.createSession(sessionId, "test worktree session", undefined, { parallelMode: true })
				registry.updateSessionStatus(sessionId, "running")
				registry.updateParallelModeInfo(sessionId, { branch, worktreePath })
				;(testProvider as any).sessionMessages.set(sessionId, [])

				// Call finishWorktreeSession
				await (testProvider as any).finishWorktreeSession(sessionId)

				// BUG: The completion popup should NOT be shown when commit fails
				// Currently this test FAILS because showInformationMessage IS called
				// even when the commit fails
				const completionCalls = mockShowInformationMessage.mock.calls.filter((call: any[]) =>
					call[0]?.includes("Parallel mode complete"),
				)
				expect(completionCalls.length).toBe(0)

				// Instead, an error message should be shown
				// (This assertion will fail until the bug is fixed)
				expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining("Failed to commit changes"))
			} finally {
				testProvider.dispose()
			}
		})

		it("should show completion popup when commit succeeds", async () => {
			vi.resetModules()

			const mockWorkspaceFolder = { uri: { fsPath: "/tmp/workspace" } }
			const mockProvider = {
				getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "kilocode" } }),
			}

			const mockShowInformationMessage = vi.fn().mockResolvedValue(undefined)
			const mockShowErrorMessage = vi.fn().mockResolvedValue(undefined)

			const mockWindow = {
				showErrorMessage: mockShowErrorMessage,
				showWarningMessage: vi.fn().mockResolvedValue(undefined),
				showInformationMessage: mockShowInformationMessage,
				ViewColumn: { One: 1 },
				onDidCloseTerminal: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn(), dispose: vi.fn() }),
			}

			vi.doMock("vscode", () => ({
				workspace: { workspaceFolders: [mockWorkspaceFolder] },
				window: mockWindow,
				env: { openExternal: vi.fn(), clipboard: { writeText: vi.fn() } },
				Uri: { parse: vi.fn(), joinPath: vi.fn() },
				ViewColumn: { One: 1 },
				ExtensionMode: { Development: 1, Production: 2, Test: 3 },
			}))

			vi.doMock("../CliInstaller", () => ({
				getLocalCliPath: () => MOCK_CLI_PATH,
			}))

			vi.doMock("../../../../utils/fs", () => ({
				fileExistsAtPath: vi.fn().mockImplementation((p: string) => Promise.resolve(p === MOCK_CLI_PATH)),
			}))

			vi.doMock("../../../../services/code-index/managed/git-utils", () => ({
				getRemoteUrl: vi.fn().mockResolvedValue(undefined),
			}))

			vi.doMock("../WorktreeManager", () => ({
				WorktreeManager: vi.fn().mockImplementation(() => ({
					createWorktree: vi.fn().mockResolvedValue({
						branch: "test-branch-123",
						path: "/tmp/workspace/.kilocode/worktrees/test-branch-123",
						parentBranch: "main",
					}),
					commitChanges: vi.fn().mockResolvedValue({ success: true }),
					removeWorktree: vi.fn().mockResolvedValue(undefined),
					discoverWorktrees: vi.fn().mockResolvedValue([]),
					ensureGitExclude: vi.fn().mockResolvedValue(undefined),
					stageAllChanges: vi.fn().mockResolvedValue(true), // Has changes to commit
				})),
				WorktreeError: class WorktreeError extends Error {
					constructor(
						public code: string,
						message: string,
					) {
						super(message)
					}
				},
			}))

			class TestProc extends EventEmitter {
				stdout = new EventEmitter()
				stderr = new EventEmitter()
				stdin = { write: vi.fn() }
				kill = vi.fn()
				pid = 1234
			}

			const spawnMock = vi.fn(() => new TestProc())
			const execSyncMock = vi.fn(() => MOCK_CLI_PATH)

			vi.doMock("node:child_process", () => ({
				spawn: spawnMock,
				execSync: execSyncMock,
			}))

			// Mock AgentTaskRunner to simulate a SUCCESSFUL commit
			vi.doMock("../AgentTaskRunner", () => ({
				AgentTaskRunner: vi.fn().mockImplementation(() => ({
					executeTask: vi.fn().mockResolvedValue({
						success: true,
						completedByAgent: true,
					}),
				})),
				AgentTasks: {
					createCommitTask: vi.fn().mockReturnValue({
						name: "commit-changes",
						instruction: "test instruction",
						timeoutMs: 60_000,
						checkComplete: vi.fn().mockResolvedValue(true),
						fallback: vi.fn().mockResolvedValue(undefined),
					}),
				},
			}))

			// Import the module with mocks applied
			const module = await import("../AgentManagerProvider")
			const TestAgentManagerProvider = module.AgentManagerProvider
			const mockContext = { extensionUri: {}, extensionPath: "", extensionMode: 1 } as any
			const mockOutputChannel = { appendLine: vi.fn() } as any
			const testProvider = new TestAgentManagerProvider(mockContext, mockOutputChannel, mockProvider as any)

			try {
				const registry = (testProvider as any).registry
				const sessionId = "session-success-commit"
				const worktreePath = "/tmp/worktree-path"
				const branch = "new-success-branch"

				// Create a running worktree session
				registry.createSession(sessionId, "test worktree session", undefined, { parallelMode: true })
				registry.updateSessionStatus(sessionId, "running")
				registry.updateParallelModeInfo(sessionId, { branch, worktreePath })
				;(testProvider as any).sessionMessages.set(sessionId, [])

				// Call finishWorktreeSession
				await (testProvider as any).finishWorktreeSession(sessionId)

				// The completion popup SHOULD be shown when commit succeeds
				const completionCalls = mockShowInformationMessage.mock.calls.filter((call: any[]) =>
					call[0]?.includes("Parallel mode complete"),
				)
				expect(completionCalls.length).toBe(1)

				// No error message should be shown
				expect(mockShowErrorMessage).not.toHaveBeenCalled()
			} finally {
				testProvider.dispose()
			}
		})

		it("should show no-changes completion message when there are no changes", async () => {
			vi.resetModules()

			const mockWorkspaceFolder = { uri: { fsPath: "/tmp/workspace" } }
			const mockProvider = {
				getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "kilocode" } }),
			}

			const mockShowInformationMessage = vi.fn().mockResolvedValue(undefined)
			const mockShowErrorMessage = vi.fn().mockResolvedValue(undefined)

			const mockWindow = {
				showErrorMessage: mockShowErrorMessage,
				showWarningMessage: vi.fn().mockResolvedValue(undefined),
				showInformationMessage: mockShowInformationMessage,
				ViewColumn: { One: 1 },
				onDidCloseTerminal: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				createTerminal: vi.fn().mockReturnValue({ show: vi.fn(), sendText: vi.fn(), dispose: vi.fn() }),
			}

			vi.doMock("vscode", () => ({
				workspace: { workspaceFolders: [mockWorkspaceFolder] },
				window: mockWindow,
				env: { openExternal: vi.fn(), clipboard: { writeText: vi.fn() } },
				Uri: { parse: vi.fn(), joinPath: vi.fn() },
				ViewColumn: { One: 1 },
				ExtensionMode: { Development: 1, Production: 2, Test: 3 },
			}))

			vi.doMock("../CliInstaller", () => ({
				getLocalCliPath: () => MOCK_CLI_PATH,
			}))

			vi.doMock("../../../../utils/fs", () => ({
				fileExistsAtPath: vi.fn().mockImplementation((p: string) => Promise.resolve(p === MOCK_CLI_PATH)),
			}))

			vi.doMock("../../../../services/code-index/managed/git-utils", () => ({
				getRemoteUrl: vi.fn().mockResolvedValue(undefined),
			}))

			vi.doMock("../WorktreeManager", () => ({
				WorktreeManager: vi.fn().mockImplementation(() => ({
					createWorktree: vi.fn().mockResolvedValue({
						branch: "test-branch-123",
						path: "/tmp/workspace/.kilocode/worktrees/test-branch-123",
						parentBranch: "main",
					}),
					commitChanges: vi.fn().mockResolvedValue({ success: true }),
					removeWorktree: vi.fn().mockResolvedValue(undefined),
					discoverWorktrees: vi.fn().mockResolvedValue([]),
					ensureGitExclude: vi.fn().mockResolvedValue(undefined),
					stageAllChanges: vi.fn().mockResolvedValue(false), // No changes to commit
				})),
				WorktreeError: class WorktreeError extends Error {
					constructor(
						public code: string,
						message: string,
					) {
						super(message)
					}
				},
			}))

			class TestProc extends EventEmitter {
				stdout = new EventEmitter()
				stderr = new EventEmitter()
				stdin = { write: vi.fn() }
				kill = vi.fn()
				pid = 1234
			}

			const spawnMock = vi.fn(() => new TestProc())
			const execSyncMock = vi.fn(() => MOCK_CLI_PATH)

			vi.doMock("node:child_process", () => ({
				spawn: spawnMock,
				execSync: execSyncMock,
			}))

			vi.doMock("../AgentTaskRunner", () => ({
				AgentTaskRunner: vi.fn().mockImplementation(() => ({
					executeTask: vi.fn().mockResolvedValue({
						success: true,
						completedByAgent: true,
					}),
				})),
				AgentTasks: {
					createCommitTask: vi.fn().mockReturnValue({
						name: "commit-changes",
						instruction: "test instruction",
						timeoutMs: 60_000,
						checkComplete: vi.fn().mockResolvedValue(true),
						fallback: vi.fn().mockResolvedValue(undefined),
					}),
				},
			}))

			const module = await import("../AgentManagerProvider")
			const TestAgentManagerProvider = module.AgentManagerProvider
			const mockContext = { extensionUri: {}, extensionPath: "", extensionMode: 1 } as any
			const mockOutputChannel = { appendLine: vi.fn() } as any
			const testProvider = new TestAgentManagerProvider(mockContext, mockOutputChannel, mockProvider as any)

			try {
				const registry = (testProvider as any).registry
				const sessionId = "session-no-changes"
				const worktreePath = "/tmp/worktree-path"
				const branch = "new-no-changes-branch"

				registry.createSession(sessionId, "test worktree session", undefined, { parallelMode: true })
				registry.updateSessionStatus(sessionId, "running")
				registry.updateParallelModeInfo(sessionId, { branch, worktreePath })
				;(testProvider as any).sessionMessages.set(sessionId, [])

				await (testProvider as any).finishWorktreeSession(sessionId)

				const completionCalls = mockShowInformationMessage.mock.calls.filter((call: any[]) =>
					call[0]?.includes("Parallel mode complete (no changes)"),
				)
				expect(completionCalls.length).toBe(1)
				expect(mockShowErrorMessage).not.toHaveBeenCalled()
			} finally {
				testProvider.dispose()
			}
		})
	})

	it("broadcasts typed group relay with sender metadata to sibling sessions", async () => {
		const registry = (provider as any).registry
		registry.createSession("s1", "prompt 1", Date.now(), {
			label: "Leader",
			sessionGroup: { groupId: "g1", rootSessionId: "s1", label: "Swarm" },
		})
		registry.createSession("s2", "prompt 2", Date.now(), {
			label: "Worker A",
			sessionGroup: { groupId: "g1", rootSessionId: "s1", label: "Swarm" },
		})
		registry.updateSessionStatus("s1", "running")
		registry.updateSessionStatus("s2", "running")

		const sendSpy = vi.spyOn(provider as any, "sendMessageToStdin").mockResolvedValue(undefined)
		const postSpy = vi.spyOn(provider as any, "postMessage")

		await (provider as any).broadcastToSessionGroup("s1", "Coordinate on failing branch", false)

		expect(sendSpy).toHaveBeenCalledTimes(1)
		expect(sendSpy).toHaveBeenCalledWith("s2", expect.stringContaining("<group_handoff>"))
		expect(sendSpy).toHaveBeenCalledWith("s2", expect.stringContaining("source_label: prompt 1"))
		expect(postSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.groupMessage",
				groupId: "g1",
				sourceSessionId: "s1",
				sourceLabel: "prompt 1",
				content: "Coordinate on failing branch",
			}),
		)
	})

	it("can include sender when broadcasting to group", async () => {
		const registry = (provider as any).registry
		registry.createSession("s1", "prompt 1", Date.now(), {
			label: "Leader",
			sessionGroup: { groupId: "g2", rootSessionId: "s1" },
		})
		registry.createSession("s2", "prompt 2", Date.now(), {
			label: "Worker",
			sessionGroup: { groupId: "g2", rootSessionId: "s1" },
		})
		registry.updateSessionStatus("s1", "running")
		registry.updateSessionStatus("s2", "running")

		const sendSpy = vi.spyOn(provider as any, "sendMessageToStdin").mockResolvedValue(undefined)

		await (provider as any).broadcastToSessionGroup("s1", "Broadcast to all", true)

		expect(sendSpy).toHaveBeenCalledTimes(2)
		expect(sendSpy).toHaveBeenCalledWith("s1", expect.any(String))
		expect(sendSpy).toHaveBeenCalledWith("s2", expect.any(String))
	})

	it("continues broadcast when one sibling relay fails", async () => {
		const registry = (provider as any).registry
		registry.createSession("s1", "prompt 1", Date.now(), {
			label: "Leader",
			sessionGroup: { groupId: "g3", rootSessionId: "s1" },
		})
		registry.createSession("s2", "prompt 2", Date.now(), {
			label: "Worker A",
			sessionGroup: { groupId: "g3", rootSessionId: "s1" },
		})
		registry.createSession("s3", "prompt 3", Date.now(), {
			label: "Worker B",
			sessionGroup: { groupId: "g3", rootSessionId: "s1" },
		})
		registry.updateSessionStatus("s1", "running")
		registry.updateSessionStatus("s2", "running")
		registry.updateSessionStatus("s3", "running")

		const sendSpy = vi
			.spyOn(provider as any, "sendMessageToStdin")
			.mockImplementation(async (...args: unknown[]) => {
				const sessionId = args[0] as string
				if (sessionId === "s2") {
					throw new Error("relay failed")
				}
			})
		const publishSpy = vi.spyOn(provider as any, "publishGroupEvent")

		await (provider as any).broadcastToSessionGroup("s1", "Keep going", false)

		expect(sendSpy).toHaveBeenCalledTimes(2)
		expect(publishSpy).toHaveBeenCalledWith("g3", "s1", "running", "Broadcast delivered to 1/2 agent(s)")
	})

	it("auto-compacts group recovery relay under scheduler pressure", async () => {
		const registry = (provider as any).registry
		registry.createSession("group-pressure-source", "prompt 1", Date.now(), {
			label: "Leader",
			sessionGroup: { groupId: "g-pressure", rootSessionId: "group-pressure-source" },
		})
		registry.createSession("group-pressure-target", "prompt 2", Date.now(), {
			label: "Worker A",
			sessionGroup: { groupId: "g-pressure", rootSessionId: "group-pressure-source" },
		})
		registry.updateSessionStatus("group-pressure-source", "error", 1, "failed")
		registry.updateSessionStatus("group-pressure-target", "running")
		;(provider as any).queueKeyPressure.set("g-pressure", 2)
		;(provider as any).provider.getTaskHistory = vi
			.fn()
			.mockReturnValue([
				{
					id: "group-pressure-source",
					restartCount: 2,
					lastStopReason: "loop_detected",
					lastStopSummary: "Verbose stop summary.",
				},
			])
		;(provider as any).provider.buildRecoveryPacket = vi.fn().mockResolvedValue({
			summary: "Pressure compact summary",
			handoff: "<restart_handoff> Verbose full handoff </restart_handoff>",
			recoveryMode: "pressure",
			stopReason: "loop_detected",
			restartAttempt: 3,
		})

		const sendSpy = vi.spyOn(provider as any, "sendMessageToStdin").mockResolvedValue(undefined)
		const postSpy = vi.spyOn(provider as any, "postMessage")
		const publishSpy = vi.spyOn(provider as any, "publishGroupEvent")

		await (provider as any).broadcastToSessionGroup(
			"group-pressure-source",
			"Branch handoff from Leader: Verbose full handoff",
			false,
		)

		expect((provider as any).provider.buildRecoveryPacket).toHaveBeenCalled()
		expect(sendSpy).toHaveBeenCalledWith(
			"group-pressure-target",
			expect.stringContaining("Pressure compact summary"),
		)
		expect(sendSpy).toHaveBeenCalledWith("group-pressure-target", expect.stringContaining("compact: yes"))
		expect(postSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.groupMessage",
				groupId: "g-pressure",
				content: expect.stringContaining("Pressure compact summary"),
			}),
		)
		expect(publishSpy).toHaveBeenCalledWith(
			"g-pressure",
			"group-pressure-source",
			"running",
			expect.stringContaining("compact"),
		)
	})

	it("preserves custom group relay content when it is not a recovery handoff", async () => {
		const registry = (provider as any).registry
		registry.createSession("group-custom-source", "prompt 1", Date.now(), {
			label: "Leader",
			sessionGroup: { groupId: "g-custom", rootSessionId: "group-custom-source" },
		})
		registry.createSession("group-custom-target", "prompt 2", Date.now(), {
			label: "Worker A",
			sessionGroup: { groupId: "g-custom", rootSessionId: "group-custom-source" },
		})
		registry.updateSessionStatus("group-custom-source", "running")
		registry.updateSessionStatus("group-custom-target", "running")
		;(provider as any).queueKeyPressure.set("g-custom", 2)
		;(provider as any).provider.buildRecoveryPacket = vi.fn()

		const sendSpy = vi.spyOn(provider as any, "sendMessageToStdin").mockResolvedValue(undefined)

		await (provider as any).broadcastToSessionGroup(
			"group-custom-source",
			"Coordinate on parser branch only",
			false,
		)

		expect((provider as any).provider.buildRecoveryPacket).not.toHaveBeenCalled()
		expect(sendSpy).toHaveBeenCalledWith(
			"group-custom-target",
			expect.stringContaining("Coordinate on parser branch only"),
		)
	})
})
