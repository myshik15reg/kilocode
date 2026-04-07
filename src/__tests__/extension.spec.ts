// npx vitest run __tests__/extension.spec.ts

import type * as vscode from "vscode"
import type { AuthState } from "@roo-code/types"

vi.mock("vscode", () => ({
	window: {
		createOutputChannel: vi.fn().mockReturnValue({
			appendLine: vi.fn(),
		}),
		registerWebviewViewProvider: vi.fn(),
		registerUriHandler: vi.fn(),
		tabGroups: {
			onDidChangeTabs: vi.fn(),
		},
		onDidChangeActiveTextEditor: vi.fn(),
		onDidChangeTextEditorSelection: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		createTextEditorDecorationType: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		onDidOpenTerminal: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		terminals: [],
		activeTextEditor: null,
	},
	workspace: {
		registerTextDocumentContentProvider: vi.fn(),
		getConfiguration: vi.fn().mockReturnValue({
			get: vi.fn().mockReturnValue([]),
		}),
		createFileSystemWatcher: vi.fn().mockReturnValue({
			onDidCreate: vi.fn(),
			onDidChange: vi.fn(),
			onDidDelete: vi.fn(),
			dispose: vi.fn(),
		}),
		onDidChangeWorkspaceFolders: vi.fn(),
		onDidChangeConfiguration: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		onDidChangeTextDocument: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		onDidOpenTextDocument: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		onDidCloseTextDocument: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
	},
	languages: {
		registerCodeActionsProvider: vi.fn(),
	},
	commands: {
		executeCommand: vi.fn(),
		registerCommand: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
	},
	env: {
		language: "en",
		appName: "Visual Studio Code",
	},
	ExtensionMode: {
		Production: 1,
	},
	ThemeColor: vi.fn((color: any) => ({ id: color })),
	OverviewRulerLane: {
		Right: 1,
	},
	Range: vi.fn().mockImplementation((start, end) => ({
		start,
		end,
		isEmpty: vi.fn().mockReturnValue(false),
		isSingleLine: vi.fn().mockReturnValue(true),
	})),
	Uri: {
		joinPath: vi.fn().mockImplementation((...paths) => ({
			toString: () => paths.join("/"),
			path: paths.join("/"),
		})),
		parse: vi.fn().mockImplementation((uri) => ({
			toString: () => uri,
			path: uri,
		})),
		file: vi.fn().mockImplementation((path) => ({
			toString: () => `file://${path}`,
			path,
		})),
	},
	CodeActionKind: {
		QuickFix: { value: "quickfix" },
	},
	EventEmitter: vi.fn().mockImplementation(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
}))

vi.mock("@dotenvx/dotenvx", () => ({
	config: vi.fn(),
}))

vi.mock("../utils/networkProxy", () => ({
	initializeNetworkProxy: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../integrations/claude-code/oauth", () => ({
	claudeCodeOAuthManager: {
		initialize: vi.fn(),
	},
}))

vi.mock("../integrations/openai-codex/oauth", () => ({
	openAiCodexOAuthManager: {
		initialize: vi.fn(),
	},
}))

const mockBridgeOrchestratorDisconnect = vi.fn().mockResolvedValue(undefined)

const mockCloudServiceInstance = {
	off: vi.fn(),
	on: vi.fn(),
	getUserInfo: vi.fn().mockReturnValue(null),
	isTaskSyncEnabled: vi.fn().mockReturnValue(false),
	authService: {
		getSessionToken: vi.fn().mockReturnValue("test-session-token"),
	},
}

vi.mock("@roo-code/cloud", () => ({
	CloudService: {
		createInstance: vi.fn(),
		hasInstance: vi.fn().mockReturnValue(true),
		get instance() {
			return mockCloudServiceInstance
		},
	},
	BridgeOrchestrator: {
		getInstance: vi.fn().mockReturnValue({
			disconnect: mockBridgeOrchestratorDisconnect,
		}),
		disconnect: mockBridgeOrchestratorDisconnect,
	},
	getRooCodeApiUrl: vi.fn().mockReturnValue("https://app.roocode.com"),
}))

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		createInstance: vi.fn().mockReturnValue({
			register: vi.fn(),
			setProvider: vi.fn(),
			shutdown: vi.fn(),
		}),
		get instance() {
			return {
				register: vi.fn(),
				setProvider: vi.fn(),
				shutdown: vi.fn(),
			}
		},
	},
	PostHogTelemetryClient: vi.fn(),
}))

vi.mock("../utils/outputChannelLogger", () => ({
	createOutputChannelLogger: vi.fn().mockReturnValue(vi.fn()),
	createDualLogger: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock("../shared/package", () => ({
	Package: {
		name: "test-extension",
		outputChannel: "Test Output",
		version: "1.0.0",
	},
}))

vi.mock("../shared/language", () => ({
	formatLanguage: vi.fn().mockReturnValue("en"),
}))

vi.mock("../core/config/ContextProxy", () => ({
	ContextProxy: {
		getInstance: vi.fn().mockResolvedValue({
			getValue: vi.fn(),
			setValue: vi.fn(),
			getValues: vi.fn().mockReturnValue({
				ghostServiceSettings: {
					enabled: true,
				},
			}),
			getProviderSettings: vi.fn().mockReturnValue({}),
		}),
		get instance() {
			return {
				getValue: vi.fn(),
				setValue: vi.fn(),
				getValues: vi.fn().mockReturnValue({
					ghostServiceSettings: {
						enabled: true,
					},
				}),
				getProviderSettings: vi.fn().mockReturnValue({}),
			}
		},
	},
}))

vi.mock("../integrations/editor/DiffViewProvider", () => ({
	DIFF_VIEW_URI_SCHEME: "test-diff-scheme",
}))

vi.mock("../integrations/terminal/TerminalRegistry", () => ({
	TerminalRegistry: {
		initialize: vi.fn(),
		cleanup: vi.fn(),
	},
}))

vi.mock("../services/mcp/McpServerManager", () => ({
	McpServerManager: {
		cleanup: vi.fn().mockResolvedValue(undefined),
		getInstance: vi.fn().mockResolvedValue(null),
		unregisterProvider: vi.fn(),
	},
}))

vi.mock("../services/code-index/manager", () => ({
	CodeIndexManager: {
		getInstance: vi.fn().mockReturnValue(null),
		disposeAll: vi.fn().mockResolvedValue(undefined),
	},
}))

vi.mock("../services/neo4j/connection-manager", () => ({
	Neo4jConnectionManager: {
		getInstance: vi.fn().mockReturnValue({
			disconnect: vi.fn().mockResolvedValue(undefined),
		}),
	},
}))

vi.mock("../services/mdm/MdmService", () => ({
	MdmService: {
		createInstance: vi.fn().mockResolvedValue(null),
	},
}))

vi.mock("../services/settings-sync/SettingsSyncService", () => ({
	SettingsSyncService: {
		initialize: vi.fn().mockResolvedValue(undefined),
		updateSyncRegistration: vi.fn().mockResolvedValue(undefined),
	},
}))

vi.mock("../shared/kilocode/cli-sessions/extension/session-manager-utils", () => ({
	kilo_initializeSessionManager: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../services/code-index/managed/ManagedIndexer", () => ({
	ManagedIndexer: vi.fn().mockImplementation(() => ({
		start: vi.fn().mockResolvedValue(undefined),
		dispose: vi.fn(),
	})),
}))

vi.mock("../utils/autoLaunchingTask", () => ({
	checkAndRunAutoLaunchingTask: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../core/kilocode/wrapper", () => ({
	getKiloCodeWrapperProperties: vi.fn().mockReturnValue({
		kiloCodeWrapped: false,
		kiloCodeWrapperCode: "vscode",
	}),
}))

vi.mock("../utils/migrateSettings", () => ({
	migrateSettings: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../utils/autoImportSettings", () => ({
	autoImportSettings: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../utils/fowardingLogger", () => ({
	registerMainThreadForwardingLogger: vi.fn(),
}))

vi.mock("../utils/anthropicApiKeyWarning", () => ({
	checkAnthropicApiKeyConflict: vi.fn(),
}))

vi.mock("../services/alfa-code/WorkflowAssetsInstaller", () => ({
	ensureWorkflowAiAssetsInstalled: vi.fn().mockResolvedValue({ didInstall: false }),
}))

vi.mock("../services/alfa-code/MemoryBankService", () => ({
	ensureMemoryBankInitialized: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../core/context/instructions/workflows", () => ({
	refreshWorkflowToggles: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../services/roo-config", () => ({
	getGlobalRooDirectory: vi.fn().mockReturnValue("/test/global-kilo"),
}))

vi.mock("../core/kilocode/webview/webviewMessageHandlerUtils", () => ({
	fetchKilocodeNotificationsOnStartup: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../extension/api", () => ({
	API: vi.fn().mockImplementation(() => ({})),
}))

vi.mock("../activate", () => ({
	handleUri: vi.fn(),
	registerCommands: vi.fn(),
	registerCodeActions: vi.fn(),
	registerTerminalActions: vi.fn(),
	CodeActionProvider: vi.fn().mockImplementation(() => ({
		providedCodeActionKinds: [],
	})),
}))

vi.mock("../i18n", () => ({
	initializeI18n: vi.fn(),
	t: vi.fn().mockImplementation((key, options = {}) => {
		return `mocked-translation-${key}`
	}),
}))

vi.mock("../services/ghost/GhostServiceManager", () => ({
	GhostServiceManager: {
		initialize: vi.fn().mockReturnValue({
			load: vi.fn(),
		}),
		getInstance: vi.fn().mockReturnValue(null),
		instance: null,
	},
}))

vi.mock("../services/ghost", () => ({
	registerGhostProvider: vi.fn(),
}))

vi.mock("../services/commit-message", () => ({
	registerCommitMessageProvider: vi.fn(),
}))

vi.mock("../services/terminal-welcome", () => ({
	registerWelcomeService: vi.fn(),
}))

vi.mock("../services/terminal-welcome/TerminalWelcomeService", () => ({
	TerminalWelcomeService: {
		register: vi.fn(),
	},
}))

const mockClineProviderInstance = {
	resolveWebviewView: vi.fn(),
	postMessageToWebview: vi.fn(),
	postStateToWebview: vi.fn(),
	postRulesDataToWebview: vi.fn().mockResolvedValue(undefined),
	postSkillsDataToWebview: vi.fn().mockResolvedValue(undefined),
	getState: vi.fn().mockResolvedValue({ apiConfiguration: {} }),
	getSkillsManager: vi.fn().mockReturnValue({
		discoverSkills: vi.fn().mockResolvedValue(undefined),
	}),
	remoteControlEnabled: vi.fn().mockResolvedValue(undefined),
	initializeCloudProfileSyncWhenReady: vi.fn().mockResolvedValue(undefined),
	providerSettingsManager: {
		listConfig: vi.fn().mockResolvedValue([]),
		getProfile: vi.fn().mockResolvedValue({}),
	},
	customModesManager: {
		getCustomModesFilePath: vi.fn().mockResolvedValue("/test/custom_modes.yaml"),
		getCustomModes: vi.fn().mockResolvedValue([]),
	},
	log: vi.fn(),
	contextProxy: { getGlobalState: vi.fn() },
	upsertProviderProfile: vi.fn().mockResolvedValue(undefined),
}

// Mock ClineProvider
vi.mock("../core/webview/ClineProvider", () => ({
	ClineProvider: Object.assign(
		vi.fn().mockImplementation(() => mockClineProviderInstance),
		{
			getVisibleInstance: vi.fn().mockReturnValue(mockClineProviderInstance),
			sideBarId: "roo-cline-sidebar",
		},
	),
}))

// Mock modelCache to prevent network requests during module loading
const mockRefreshModels = vi.fn().mockResolvedValue({})
vi.mock("../api/providers/fetchers/modelCache", () => ({
	flushModels: vi.fn(),
	getModels: vi.fn().mockResolvedValue([]),
	initializeModelCacheRefresh: vi.fn(),
	refreshModels: mockRefreshModels,
}))

describe("extension.ts", () => {
	let mockContext: vscode.ExtensionContext
	let authStateChangedHandler:
		| ((data: { state: AuthState; previousState: AuthState }) => void | Promise<void>)
		| undefined

	const waitForAuthStateChangedHandler = async () => {
		const timeoutMs = 10000
		const start = Date.now()
		while (!authStateChangedHandler) {
			if (Date.now() - start > timeoutMs) {
				throw new Error("authStateChangedHandler was not registered")
			}
			await new Promise((resolve) => setTimeout(resolve, 10))
		}
	}

	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		mockBridgeOrchestratorDisconnect.mockClear()

		mockContext = {
			extensionPath: "/test/path",
			extensionUri: { fsPath: "/test/path" },
			globalState: {
				get: vi.fn().mockImplementation((key: string) => (key === "firstInstallCompleted" ? true : undefined)),
				update: vi.fn(),
			},
			subscriptions: [],
		} as unknown as vscode.ExtensionContext

		authStateChangedHandler = undefined
		mockClineProviderInstance.remoteControlEnabled.mockClear()
		mockClineProviderInstance.initializeCloudProfileSyncWhenReady.mockClear()
		mockClineProviderInstance.postStateToWebview.mockClear()
		mockClineProviderInstance.getState.mockResolvedValue({ apiConfiguration: {} })
		vi.mocked(mockClineProviderInstance.providerSettingsManager.listConfig).mockResolvedValue([])
		vi.mocked(mockClineProviderInstance.providerSettingsManager.getProfile).mockResolvedValue({})
	})

	test("activate forces local degraded mode when cloud bootstrap fails", async () => {
		const { CloudService } = await import("@roo-code/cloud")
		const vscodeModule = await import("vscode")

		vi.mocked(CloudService.createInstance).mockRejectedValue(new Error("cloud unavailable"))

		const { activate } = await import("../extension")
		void activate(mockContext).catch(() => {})

		const timeoutMs = 20000
		const start = Date.now()
		while (!mockClineProviderInstance.remoteControlEnabled.mock.calls.length) {
			if (Date.now() - start > timeoutMs) {
				throw new Error("remoteControlEnabled(false) was not called after cloud bootstrap failure")
			}
			await new Promise((resolve) => setTimeout(resolve, 20))
		}

		expect(vscodeModule.window.registerWebviewViewProvider).toHaveBeenCalled()
		expect(mockClineProviderInstance.remoteControlEnabled).toHaveBeenCalledWith(false)
		expect(mockClineProviderInstance.initializeCloudProfileSyncWhenReady).not.toHaveBeenCalled()
	})
	test("authStateChangedHandler calls BridgeOrchestrator.disconnect when logged-out event fires", async () => {
		const { CloudService } = await import("@roo-code/cloud")

		// Capture the auth state changed handler.
		vi.mocked(CloudService.createInstance).mockImplementation(async (_context, _logger, handlers) => {
			if (handlers?.["auth-state-changed"]) {
				authStateChangedHandler = handlers["auth-state-changed"]
			}

			return {
				off: vi.fn(),
				on: vi.fn(),
				telemetryClient: null,
				hasActiveSession: vi.fn().mockReturnValue(false),
				authService: null,
			} as any
		})

		// Activate the extension.
		const { activate } = await import("../extension")
		void activate(mockContext).catch(() => {})

		await waitForAuthStateChangedHandler()

		// Verify handler was registered.
		expect(authStateChangedHandler).toBeDefined()

		// Trigger logout.
		await authStateChangedHandler!({
			state: "logged-out" as AuthState,
			previousState: "logged-in" as AuthState,
		})

		// Verify provider.remoteControlEnabled(false) was called
		expect(mockClineProviderInstance.remoteControlEnabled).toHaveBeenCalledWith(false)
	}, 60000)

	test("authStateChangedHandler does not call BridgeOrchestrator.disconnect for other states", async () => {
		const { CloudService } = await import("@roo-code/cloud")

		// Capture the auth state changed handler.
		vi.mocked(CloudService.createInstance).mockImplementation(async (_context, _logger, handlers) => {
			if (handlers?.["auth-state-changed"]) {
				authStateChangedHandler = handlers["auth-state-changed"]
			}

			return {
				off: vi.fn(),
				on: vi.fn(),
				telemetryClient: null,
				hasActiveSession: vi.fn().mockReturnValue(false),
				authService: null,
			} as any
		})

		// Activate the extension.
		const { activate } = await import("../extension")
		void activate(mockContext).catch(() => {})

		await waitForAuthStateChangedHandler()

		// Trigger login.
		await authStateChangedHandler!({
			state: "logged-in" as AuthState,
			previousState: "logged-out" as AuthState,
		})

		// Verify provider.remoteControlEnabled was not called for non-logout states.
		expect(mockClineProviderInstance.remoteControlEnabled).not.toHaveBeenCalled()
	}, 60000)

	// kilocode_change: skip Roo models
	describe.skip("Roo model cache refresh on auth state change (ROO-202)", () => {
		beforeEach(() => {
			vi.resetModules()
			mockRefreshModels.mockClear()
		})

		test("refreshModels is called with session token when auth state changes to active-session", async () => {
			const mockAuthService = {
				getSessionToken: vi.fn().mockReturnValue("test-session-token"),
			}

			const { CloudService } = await import("@roo-code/cloud")

			vi.mocked(CloudService.createInstance).mockImplementation(async (_context, _logger, handlers) => {
				if (handlers?.["auth-state-changed"]) {
					authStateChangedHandler = handlers["auth-state-changed"]
				}
				return {
					off: vi.fn(),
					on: vi.fn(),
					telemetryClient: null,
					authService: mockAuthService,
					hasActiveSession: vi.fn().mockReturnValue(false),
				} as any
			})

			vi.mocked(CloudService.hasInstance).mockReturnValue(true)

			// Activate the extension
			const { activate } = await import("../extension")
			await activate(mockContext)

			// Clear any calls during activation
			mockRefreshModels.mockClear()

			// Trigger active-session state
			await authStateChangedHandler!({
				state: "active-session" as AuthState,
				previousState: "logged-out" as AuthState,
			})

			// Verify refreshModels was called with correct parameters including session token
			expect(mockRefreshModels).toHaveBeenCalledWith({
				provider: "roo",
				baseUrl: expect.any(String),
				apiKey: "test-session-token",
			})
		})

		test("flushModels is called when auth state changes to logged-out", async () => {
			const { flushModels } = await import("../api/providers/fetchers/modelCache")
			const { CloudService } = await import("@roo-code/cloud")

			vi.mocked(CloudService.createInstance).mockImplementation(async (_context, _logger, handlers) => {
				if (handlers?.["auth-state-changed"]) {
					authStateChangedHandler = handlers["auth-state-changed"]
				}
				return {
					off: vi.fn(),
					on: vi.fn(),
					telemetryClient: null,
					authService: null,
					hasActiveSession: vi.fn().mockReturnValue(false),
				} as any
			})

			vi.mocked(CloudService.hasInstance).mockReturnValue(true)

			// Activate the extension
			const { activate } = await import("../extension")
			await activate(mockContext)

			// Trigger logged-out state
			await authStateChangedHandler!({
				state: "logged-out" as AuthState,
				previousState: "active-session" as AuthState,
			})

			// Verify flushModels was called to clear the cache on logout
			expect(flushModels).toHaveBeenCalledWith({ provider: "roo" }, false)
		})
	})
})
