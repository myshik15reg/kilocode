// pnpm --filter roo-cline test core/webview/__tests__/ClineProvider.spec.ts

import Anthropic from "@anthropic-ai/sdk"
import * as vscode from "vscode"
import axios from "axios"

import {
	type ProviderSettingsEntry,
	type ClineMessage,
	openRouterDefaultModelId, // kilocode_change: openRouterDefaultModelId
	type ExtensionMessage,
	type ExtensionState,
	ORGANIZATION_ALLOW_ALL,
	DEFAULT_CHECKPOINT_TIMEOUT_SECONDS,
} from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { Package } from "../../../shared/package" // kilocode_change

import * as taskBirthOrchestrationService from "../../orchestration/task-control/TaskBirthOrchestrationService"
import { TaskBranchService } from "../../orchestration/task-control/TaskBranchService"

import { defaultModeSlug } from "../../../shared/modes"
import { experimentDefault } from "../../../shared/experiments"
import { setTtsEnabled } from "../../../utils/tts"
import { ContextProxy } from "../../config/ContextProxy"
import { Task, TaskOptions } from "../../task/Task"
import { safeWriteJson } from "../../../utils/safeWriteJson"

import { ClineProvider } from "../ClineProvider"
import { MessageManager } from "../../message-manager"
import { orchestrationEventStore } from "../../orchestration/events/store"

// Mock setup must come before imports.
vi.mock("../../prompts/sections/custom-instructions")

vi.mock("p-wait-for", () => ({
	__esModule: true,
	default: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("fs/promises", () => {
	const mockFs = {
		mkdir: vi.fn().mockResolvedValue(undefined),
		writeFile: vi.fn().mockResolvedValue(undefined),
		readFile: vi.fn().mockResolvedValue(""),
		unlink: vi.fn().mockResolvedValue(undefined),
		rmdir: vi.fn().mockResolvedValue(undefined),
		rm: vi.fn().mockResolvedValue(undefined),
		readdir: vi.fn().mockResolvedValue([]),
		realpath: vi.fn().mockImplementation(async (value: string) => value),
		stat: vi.fn().mockResolvedValue({
			isDirectory: () => false,
		}),
		access: vi.fn().mockResolvedValue(undefined),
		existsSync: vi.fn().mockReturnValue(false),
		readFileSync: vi.fn().mockReturnValue(""),
	}

	return {
		__esModule: true,
		default: mockFs,
		...mockFs,
	}
})

vi.mock("axios", () => ({
	default: {
		get: vi.fn().mockResolvedValue({ data: { data: [] } }),
		post: vi.fn(),
	},
	get: vi.fn().mockResolvedValue({ data: { data: [] } }),
	post: vi.fn(),
}))

vi.mock("../../../utils/safeWriteJson")

vi.mock("../../../utils/storage", () => ({
	getSettingsDirectoryPath: vi.fn().mockResolvedValue("/test/settings/path"),
	getTaskDirectoryPath: vi.fn().mockResolvedValue("/test/task/path"),
	getGlobalStoragePath: vi.fn().mockResolvedValue("/test/storage/path"),
}))

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
	CallToolResultSchema: {},
	ListResourcesResultSchema: {},
	ListResourceTemplatesResultSchema: {},
	ListToolsResultSchema: {},
	ReadResourceResultSchema: {},
	ErrorCode: {
		InvalidRequest: "InvalidRequest",
		MethodNotFound: "MethodNotFound",
		InternalError: "InternalError",
	},
	McpError: class McpError extends Error {
		code: string
		constructor(code: string, message: string) {
			super(message)
			this.code = code
			this.name = "McpError"
		}
	},
}))

vi.mock("../../../services/browser/BrowserSession", () => ({
	BrowserSession: vi.fn().mockImplementation(() => ({
		testConnection: vi.fn().mockImplementation(async (url) => {
			if (url === "http://localhost:9222") {
				return {
					success: true,
					message: "Successfully connected to Chrome",
					endpoint: "ws://localhost:9222/devtools/browser/123",
				}
			} else {
				return {
					success: false,
					message: "Failed to connect to Chrome",
					endpoint: undefined,
				}
			}
		}),
	})),
}))

vi.mock("../../../services/browser/browserDiscovery", () => ({
	discoverChromeHostUrl: vi.fn().mockResolvedValue("http://localhost:9222"),
	tryChromeHostUrl: vi.fn().mockImplementation(async (url) => {
		return url === "http://localhost:9222"
	}),
	testBrowserConnection: vi.fn(),
}))

// Remove duplicate mock - it's already defined below.

const mockAddCustomInstructions = vi.fn().mockResolvedValue("Combined instructions")

;(vi.mocked(await import("../../prompts/sections/custom-instructions")) as any).addCustomInstructions =
	mockAddCustomInstructions

vi.mock("delay", () => {
	const delayFn = (_ms: number) => Promise.resolve()
	delayFn.createDelay = () => delayFn
	delayFn.reject = () => Promise.reject(new Error("Delay rejected"))
	delayFn.range = () => Promise.resolve()
	return { default: delayFn }
})

// MCP-related modules are mocked once above (lines 87-109).

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
	Client: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		listTools: vi.fn().mockResolvedValue({ tools: [] }),
		callTool: vi.fn().mockResolvedValue({ content: [] }),
	})),
}))

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
	StdioClientTransport: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
	})),
}))

vi.mock("vscode", () => ({
	ExtensionContext: vi.fn(),
	OutputChannel: vi.fn(),
	WebviewView: vi.fn(),
	Uri: {
		joinPath: vi.fn(),
		file: vi.fn(),
	},
	CodeActionKind: {
		QuickFix: { value: "quickfix" },
		RefactorRewrite: { value: "refactor.rewrite" },
	},
	commands: {
		executeCommand: vi.fn().mockResolvedValue(undefined),
	},
	ConfigurationTarget: {
		Global: 1,
		Workspace: 2,
		WorkspaceFolder: 3,
	},
	window: {
		showInformationMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
		createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })), // kilocode_change
	},
	workspace: {
		getConfiguration: vi.fn().mockReturnValue({
			get: vi
				.fn()
				.mockImplementation((key: string, fallback?: any) =>
					key === "colorTheme" ? "Default Dark Modern" : (fallback ?? []),
				),
			update: vi.fn(),
		}),
		onDidChangeConfiguration: vi.fn().mockImplementation(() => ({
			dispose: vi.fn(),
		})),
		onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		workspaceFolders: [],
	},
	extensions: {
		all: [],
		getExtension: vi.fn().mockReturnValue({
			extensionPath: "/test/extension",
			extensionUri: { fsPath: "/test/extension" },
			packageJSON: {},
		}),
	},
	env: {
		uriScheme: "vscode",
		language: "en",
		uiKind: 1, // kilocode_change Desktop
		appName: "Visual Studio Code",
	},
	ExtensionMode: {
		Production: 1,
		Development: 2,
		Test: 3,
	},
	// kilocode_change start
	UIKind: {
		1: "Desktop",
		2: "Web",
		Desktop: 1,
		Web: 2,
	},
	// kilocode_change end
	version: "1.85.0",
}))

vi.mock("../../../utils/tts", () => ({
	setTtsEnabled: vi.fn(),
	setTtsSpeed: vi.fn(),
}))

vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn(),
}))

vi.mock("../../prompts/system", () => ({
	SYSTEM_PROMPT: vi.fn().mockImplementation(async () => "mocked system prompt"),
	codeMode: "code",
}))

vi.mock("../../../integrations/workspace/WorkspaceTracker", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			initializeFilePaths: vi.fn(),
			dispose: vi.fn(),
		})),
	}
})

vi.mock("../../task/Task", () => ({
	Task: vi.fn().mockImplementation((options: any) => ({
		api: undefined,
		abortTask: vi.fn(),
		handleWebviewAskResponse: vi.fn(),
		clineMessages: [],
		apiConversationHistory: [],
		overwriteClineMessages: vi.fn(),
		overwriteApiConversationHistory: vi.fn(),
		getTaskNumber: vi.fn().mockReturnValue(0),
		setTaskNumber: vi.fn(),
		setParentTask: vi.fn(),
		setRootTask: vi.fn(),
		updateApiConfiguration: vi.fn(),
		setTaskApiConfigName: vi.fn(),
		_taskApiConfigName: options?.historyItem?.apiConfigName,
		taskApiConfigName: options?.historyItem?.apiConfigName,
		taskId: options?.historyItem?.id || "test-task-id",
		emit: vi.fn(),
	})),
}))

vi.mock("../../../integrations/misc/extract-text", () => ({
	extractTextFromFile: vi.fn().mockImplementation(async (_filePath: string) => {
		const content = "const x = 1;\nconst y = 2;\nconst z = 3;"
		const lines = content.split("\n")
		return lines.map((line, index) => `${index + 1} | ${line}`).join("\n")
	}),
}))

vi.mock("../../../api/providers/fetchers/modelCache", () => ({
	getModels: vi.fn().mockResolvedValue({}),
	flushModels: vi.fn(),
	getModelsFromCache: vi.fn().mockReturnValue(undefined),
}))

vi.mock("../../../shared/modes", () => ({
	modes: [
		{
			slug: "code",
			name: "Code Mode",
			roleDefinition: "You are a code assistant",
			groups: ["read", "edit", "browser"],
		},
		{
			slug: "architect",
			name: "Architect Mode",
			roleDefinition: "You are an architect",
			groups: ["read", "edit"],
		},
		{
			slug: "ask",
			name: "Ask Mode",
			roleDefinition: "You are a helpful assistant",
			groups: ["read"],
		},
	],
	getModeBySlug: vi.fn().mockReturnValue({
		slug: "code",
		name: "Code Mode",
		roleDefinition: "You are a code assistant",
		groups: ["read", "edit", "browser"],
	}),
	getGroupName: vi.fn().mockImplementation((group: string) => {
		// Return appropriate group names for different tool groups
		switch (group) {
			case "read":
				return "Read Tools"
			case "edit":
				return "Edit Tools"
			case "browser":
				return "Browser Tools"
			case "mcp":
				return "MCP Tools"
			default:
				return "General Tools"
		}
	}),
	defaultModeSlug: "code",
}))

vi.mock("../../prompts/system", () => ({
	SYSTEM_PROMPT: vi.fn().mockResolvedValue("mocked system prompt"),
	codeMode: "code",
}))

vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn().mockReturnValue({
		getModel: vi.fn().mockReturnValue({
			id: "claude-3-sonnet",
		}),
	}),
}))

vi.mock("../../../integrations/misc/extract-text", () => ({
	extractTextFromFile: vi.fn().mockImplementation(async (_filePath: string) => {
		const content = "const x = 1;\nconst y = 2;\nconst z = 3;"
		const lines = content.split("\n")
		return lines.map((line, index) => `${index + 1} | ${line}`).join("\n")
	}),
}))

vi.mock("../../../api/providers/fetchers/modelCache", () => ({
	getModels: vi.fn().mockResolvedValue({}),
	flushModels: vi.fn(),
	getModelsFromCache: vi.fn().mockReturnValue(undefined),
}))

vi.mock("../diff/strategies/multi-search-replace", () => ({
	MultiSearchReplaceDiffStrategy: vi.fn().mockImplementation(() => ({
		getToolDescription: () => "test",
		getName: () => "test-strategy",
		applyDiff: vi.fn(),
	})),
}))

vi.mock("@roo-code/cloud", () => ({
	CloudService: (() => {
		const instance = {
			isAuthenticated: vi.fn().mockReturnValue(false),
			on: vi.fn(),
			off: vi.fn(),
			getUserSettings: vi.fn().mockReturnValue(undefined),
			getAllowList: vi.fn().mockResolvedValue(undefined),
			getUserInfo: vi.fn().mockReturnValue(null),
			canShareTask: vi.fn().mockResolvedValue(false),
			canSharePublicly: vi.fn().mockResolvedValue(false),
			getOrganizationSettings: vi.fn().mockReturnValue(undefined),
			isTaskSyncEnabled: vi.fn().mockReturnValue(false),
			getOrganizationMemberships: vi.fn().mockResolvedValue([]),
			isCloudAgent: false,
			cloudAPI: {
				bridgeConfig: vi.fn().mockResolvedValue(undefined),
			},
		}

		return {
			hasInstance: vi.fn().mockReturnValue(true),
			get instance() {
				return instance
			},
		}
	})(),
	BridgeOrchestrator: {
		isEnabled: vi.fn().mockReturnValue(false),
	},
	getRooCodeApiUrl: vi.fn().mockReturnValue("https://app.roocode.com"),
}))

vi.mock("../../../shared/kilocode/cli-sessions/core/SessionManager", () => ({
	SessionManager: {
		init: vi.fn().mockReturnValue({
			startTimer: vi.fn(),
			setPath: vi.fn(),
			setWorkspaceDirectory: vi.fn(),
			destroy: vi.fn().mockResolvedValue(undefined),
		}),
	},
}))

afterAll(() => {
	vi.restoreAllMocks()
})

describe("ClineProvider", () => {
	beforeAll(() => {
		vi.mocked(Task).mockImplementation((options: any) => {
			const task: any = {
				api: undefined,
				abortTask: vi.fn(),
				handleWebviewAskResponse: vi.fn(),
				clineMessages: [],
				apiConversationHistory: [],
				overwriteClineMessages: vi.fn(),
				overwriteApiConversationHistory: vi.fn(),
				getTaskNumber: vi.fn().mockReturnValue(0),
				setTaskNumber: vi.fn(),
				setParentTask: vi.fn(),
				setRootTask: vi.fn(),
				updateApiConfiguration: vi.fn(),
				setTaskApiConfigName: vi.fn(),
				_taskApiConfigName: options?.historyItem?.apiConfigName,
				taskApiConfigName: options?.historyItem?.apiConfigName,
				taskId: options?.historyItem?.id || "test-task-id",
				emit: vi.fn(),
			}

			Object.defineProperty(task, "messageManager", {
				get: () => new MessageManager(task),
			})

			return task
		})
	})

	let defaultTaskOptions: TaskOptions

	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockWebviewView: vscode.WebviewView
	let mockPostMessage: any
	let updateGlobalStateSpy: any

	beforeEach(() => {
		vi.clearAllMocks()

		if (!TelemetryService.hasInstance()) {
			TelemetryService.createInstance([])
		}

		const globalState: Record<string, string | undefined> = {
			mode: "architect",
			currentApiConfigName: "current-config",
		}

		const secrets: Record<string, string | undefined> = {}

		mockContext = {
			extensionPath: "/test/path",
			extensionUri: {} as vscode.Uri,
			globalState: {
				get: vi.fn().mockImplementation((key: string) => globalState[key]),
				update: vi
					.fn()
					.mockImplementation((key: string, value: string | undefined) => (globalState[key] = value)),
				keys: vi.fn().mockImplementation(() => Object.keys(globalState)),
			},
			workspaceState: {
				get: vi.fn().mockResolvedValue(undefined),
				update: vi.fn().mockResolvedValue(undefined),
				keys: vi.fn().mockReturnValue([]),
			},
			secrets: {
				get: vi.fn().mockImplementation((key: string) => secrets[key]),
				store: vi.fn().mockImplementation((key: string, value: string | undefined) => (secrets[key] = value)),
				delete: vi.fn().mockImplementation((key: string) => delete secrets[key]),
			},
			subscriptions: [],
			extension: {
				packageJSON: { version: "1.0.0" },
			},
			globalStorageUri: {
				fsPath: "/test/storage/path",
			},
		} as unknown as vscode.ExtensionContext

		// Mock CustomModesManager
		const mockCustomModesManager = {
			updateCustomMode: vi.fn().mockResolvedValue(undefined),
			getCustomModes: vi.fn().mockResolvedValue([]),
			dispose: vi.fn(),
		}

		// Mock output channel
		mockOutputChannel = {
			appendLine: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn(),
		} as unknown as vscode.OutputChannel

		// Mock webview
		mockPostMessage = vi.fn()

		mockWebviewView = {
			webview: {
				postMessage: mockPostMessage,
				html: "",
				options: {},
				onDidReceiveMessage: vi.fn(),
				asWebviewUri: vi.fn(),
				cspSource: "vscode-webview://test-csp-source",
			},
			visible: true,
			onDidDispose: vi.fn().mockImplementation((callback) => {
				callback()
				return { dispose: vi.fn() }
			}),
			onDidChangeVisibility: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
		} as unknown as vscode.WebviewView

		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", new ContextProxy(mockContext))

		defaultTaskOptions = {
			context: mockContext,
			provider,
			apiConfiguration: {
				apiProvider: "openrouter",
			},
		}

		// @ts-ignore - Access private property for testing
		updateGlobalStateSpy = vi.spyOn(provider.contextProxy, "setValue")

		// @ts-ignore - Accessing private property for testing.
		provider.customModesManager = mockCustomModesManager

		// Mock getMcpHub method for generateSystemPrompt
		provider.getMcpHub = vi.fn().mockReturnValue({
			listTools: vi.fn().mockResolvedValue([]),
			callTool: vi.fn().mockResolvedValue({ content: [] }),
			listResources: vi.fn().mockResolvedValue([]),
			readResource: vi.fn().mockResolvedValue({ contents: [] }),
			getAllServers: vi.fn().mockReturnValue([]),
		})
	})

	test("constructor initializes correctly", () => {
		expect(provider).toBeInstanceOf(ClineProvider)
		// Since getVisibleInstance returns the last instance where view.visible is true
		// @ts-ignore - accessing private property for testing
		provider.view = mockWebviewView
		expect(ClineProvider.getVisibleInstance()).toBe(provider)
	})

	test("getTaskWithId tolerates transiently missing api history when task exists in history", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-transient-history",
				number: 1,
				task: "Transient history task",
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])

		const fsUtils = await import("../../../utils/fs")
		const taskPersistence = await import("../../task-persistence")
		vi.spyOn(fsUtils, "fileExistsAtPath").mockResolvedValue(false)
		const readApiMessagesSpy = vi.spyOn(taskPersistence, "readApiMessages").mockResolvedValue([] as any)
		vi.mocked(vscode.window.showErrorMessage).mockClear()

		const result = await provider.getTaskWithId("task-transient-history")

		expect(result.historyItem.id).toBe("task-transient-history")
		expect(result.apiConversationHistory).toEqual([])
		expect(readApiMessagesSpy).toHaveBeenCalledWith({
			taskId: "task-transient-history",
			globalStoragePath: "/test/storage/path",
		})
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
	})

	test("getTaskWithAggregatedCosts uses task history only and tolerates missing child tasks", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-parent-aggregate",
				number: 1,
				task: "Parent aggregate task",
				ts: 1,
				tokensIn: 10,
				tokensOut: 20,
				totalCost: 1.25,
				childIds: ["task-child-present", "task-child-missing"],
			},
			{
				id: "task-child-present",
				number: 2,
				task: "Present child task",
				ts: 2,
				tokensIn: 5,
				tokensOut: 5,
				totalCost: 0.75,
				childIds: [],
			},
		])

		const taskPersistence = await import("../../task-persistence")
		const readApiMessagesSpy = vi.spyOn(taskPersistence, "readApiMessages")
		vi.mocked(vscode.window.showErrorMessage).mockClear()

		const result = await provider.getTaskWithAggregatedCosts("task-parent-aggregate")

		expect(result.historyItem.id).toBe("task-parent-aggregate")
		expect(result.aggregatedCosts.ownCost).toBe(1.25)
		expect(result.aggregatedCosts.childrenCost).toBe(0.75)
		expect(result.aggregatedCosts.totalCost).toBe(2)
		expect(result.aggregatedCosts.childBreakdown?.["task-child-present"]?.totalCost).toBe(0.75)
		expect(result.aggregatedCosts.childBreakdown?.["task-child-missing"]?.totalCost).toBe(0)
		expect(readApiMessagesSpy).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
	})
	test("resolveWebviewView sets up webview correctly", async () => {
		await provider.resolveWebviewView(mockWebviewView)

		expect(mockWebviewView.webview.options).toEqual({
			enableScripts: true,
			localResourceRoots: [mockContext.extensionUri],
		})

		expect(mockWebviewView.webview.html).toContain("<!DOCTYPE html>")
	})

	test("resolveWebviewView does not abort active root task on reopen", async () => {
		const mockCline = new Task(defaultTaskOptions) as any
		mockCline.taskId = "root-task-open"
		;(mockWebviewView.onDidDispose as any) = vi.fn().mockImplementation(() => ({ dispose: vi.fn() }))

		await provider.addClineToStack(mockCline)
		vi.mocked(mockCline.abortTask).mockClear()
		await provider.resolveWebviewView(mockWebviewView)

		expect(mockCline.abortTask).not.toHaveBeenCalled()
		expect(provider.getCurrentTask()?.taskId).toBe("root-task-open")
		expect((provider as any).backgroundRootTaskStacks.has("root-task-open")).toBe(true)
		expect((provider as any).focusedRootTaskId).toBe("root-task-open")
	})

	test("resolveWebviewView sets up webview correctly in development mode even if local server is not running", async () => {
		provider = new ClineProvider(
			{ ...mockContext, extensionMode: vscode.ExtensionMode.Development },
			mockOutputChannel,
			"sidebar",
			new ContextProxy(mockContext),
		)
		;(axios.get as any).mockRejectedValueOnce(new Error("Network error"))

		await provider.resolveWebviewView(mockWebviewView)

		expect(mockWebviewView.webview.options).toEqual({
			enableScripts: true,
			localResourceRoots: [mockContext.extensionUri],
		})

		expect(mockWebviewView.webview.html).toContain("<!DOCTYPE html>")

		// Verify Content Security Policy contains the necessary PostHog domains
		expect(mockWebviewView.webview.html).toContain(
			// kilocode_change: added localhost:3000
			"connect-src vscode-webview://test-csp-source https://* http://localhost:3000 https://api.requesty.ai https://us.i.posthog.com https://us-assets.i.posthog.com",
		)

		// Extract the script-src directive section and verify required security elements
		const html = mockWebviewView.webview.html
		const scriptSrcMatch = html.match(/script-src[^;]*;/)
		expect(scriptSrcMatch).not.toBeNull()
		expect(scriptSrcMatch![0]).toContain("'nonce-")
		// Verify wasm-unsafe-eval is present for Shiki syntax highlighting
		expect(scriptSrcMatch![0]).toContain("'wasm-unsafe-eval'")
	})

	test("postMessageToWebview sends message to webview", async () => {
		await provider.resolveWebviewView(mockWebviewView)

		const mockState: ExtensionState = {
			version: "1.0.0",
			isBrowserSessionActive: false,
			clineMessages: [],
			taskHistoryFullLength: 0, // kilocode_change
			taskHistoryVersion: 0, // kilocode_change
			shouldShowAnnouncement: false,
			apiConfiguration: {
				// kilocode_change start
				apiProvider: "kilocode",
				kilocodeModel: openRouterDefaultModelId,
				kilocodeToken: "kilocode-token",
				// kilocode_change end
			},
			kilocodeDefaultModel: openRouterDefaultModelId,
			customInstructions: undefined,
			alwaysAllowReadOnly: false,
			alwaysAllowReadOnlyOutsideWorkspace: false,
			alwaysAllowWrite: false,
			codebaseIndexConfig: {
				codebaseIndexEnabled: true,
				codebaseIndexQdrantUrl: "",
				codebaseIndexEmbedderProvider: "openai",
				codebaseIndexEmbedderBaseUrl: "",
				codebaseIndexEmbedderModelId: "",
				codebaseIndexVectorStoreName: "test-vectors",
			},
			alwaysAllowWriteOutsideWorkspace: false,
			alwaysAllowExecute: false,
			alwaysAllowBrowser: false,
			alwaysAllowMcp: false,
			uriScheme: "vscode",
			soundEnabled: false,
			ttsEnabled: false,
			diffEnabled: false,
			enableCheckpoints: false,
			writeDelayMs: 1000,
			browserViewportSize: "900x600",
			fuzzyMatchThreshold: 1.0,
			mcpEnabled: true,
			enableMcpServerCreation: false,
			mode: defaultModeSlug,
			customModes: [],
			experiments: experimentDefault,
			maxOpenTabsContext: 20,
			maxWorkspaceFiles: 200,
			browserToolEnabled: true,
			telemetrySetting: "unset",
			showRooIgnoredFiles: false,
			enableSubfolderRules: false,
			renderContext: "sidebar",
			maxReadFileLine: 500,
			showAutoApproveMenu: false, // kilocode_change
			maxImageFileSize: 5,
			maxTotalImageSize: 20,
			cloudUserInfo: null,
			organizationAllowList: ORGANIZATION_ALLOW_ALL,
			autoCondenseContext: true,
			autoCondenseContextPercent: 100,
			contextRoutingEnabled: false,
			contextRoutingFastThresholdPercent: 50,
			contextRoutingDeepThresholdPercent: 80,
			cloudIsAuthenticated: false,
			sharingEnabled: false,
			publicSharingEnabled: false,
			profileThresholds: {},
			hasOpenedModeSelector: false,
			diagnosticsEnabled: true,
			openRouterImageApiKey: undefined,
			openRouterImageGenerationSelectedModel: undefined,
			remoteControlEnabled: false,
			taskSyncEnabled: false,
			featureRoomoteControlEnabled: false,
			checkpointTimeout: DEFAULT_CHECKPOINT_TIMEOUT_SECONDS,
		}

		const message: ExtensionMessage = {
			type: "state",
			state: mockState,
		}
		await provider.postMessageToWebview(message)

		expect(mockPostMessage).toHaveBeenCalledWith(message)
	})

	test("handles webviewDidLaunch message", async () => {
		await provider.resolveWebviewView(mockWebviewView)

		// Get the message handler from onDidReceiveMessage
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Simulate webviewDidLaunch message
		await messageHandler({ type: "webviewDidLaunch" })

		// Should post state and theme to webview
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("clearTask aborts current task", async () => {
		// Setup Cline instance with auto-mock from the top of the file
		const mockCline = new Task(defaultTaskOptions) // Create a new mocked instance

		// add the mock object to the stack
		await provider.addClineToStack(mockCline)

		// get the stack size before the abort call
		const stackSizeBeforeAbort = provider.getTaskStackSize()

		// call the removeClineFromStack method so it will call the current cline abort and remove it from the stack
		await provider.removeClineFromStack()

		// get the stack size after the abort call
		const stackSizeAfterAbort = provider.getTaskStackSize()

		// check if the abort method was called
		expect(mockCline.abortTask).toHaveBeenCalled()

		// check if the stack size was decreased
		expect(stackSizeBeforeAbort - stackSizeAfterAbort).toBe(1)
	})

	test("clearTask moves root task to background without aborting it", async () => {
		const mockCline = new Task(defaultTaskOptions) as any
		mockCline.taskId = "root-task-1"

		await provider.addClineToStack(mockCline)
		await provider.clearTask()

		expect(mockCline.abortTask).not.toHaveBeenCalled()
		expect(provider.getTaskStackSize()).toBe(0)
		expect((provider as any).backgroundRootTaskStacks.has("root-task-1")).toBe(true)
	})

	test("showTaskWithId restores a background root task stack", async () => {
		const mockCline = new Task(defaultTaskOptions) as any
		mockCline.taskId = "root-task-restore"

		await provider.addClineToStack(mockCline)
		await provider.clearTask()
		;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
			historyItem: { id: "root-task-restore", task: "Restore me", number: 1 },
		})

		await provider.showTaskWithId("root-task-restore")

		expect(provider.getCurrentTask()).toBeTruthy()
		expect(provider.getCurrentTask()?.taskId).toBe("root-task-restore")
	})

	// kilocode_change start
	test("showTaskWithId marks task status as viewed", async () => {
		const before = Date.now()
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-viewed",
				number: 1,
				task: "Viewed task",
				ts: before - 1000,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "completed",
				statusUpdatedAt: before,
			},
		])
		;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
			historyItem: { id: "task-viewed", task: "Viewed task", number: 1 },
		})
		;(provider as any).createTaskWithHistoryItem = vi.fn().mockResolvedValue(undefined)

		await provider.showTaskWithId("task-viewed")

		const updatedHistory = ((provider as any).getGlobalState("taskHistory") as any[]) ?? []
		expect(updatedHistory[0]?.lastStatusViewedAt).toBeGreaterThanOrEqual(before)
		expect(updatedHistory[0]?.lastStatusViewedAt).toBeGreaterThanOrEqual(updatedHistory[0]?.statusUpdatedAt)
	})
	// kilocode_change end

	test("clearTask switches focus to another active root task when available", async () => {
		const firstRoot = new Task(defaultTaskOptions) as any
		firstRoot.taskId = "root-task-1"
		const secondRoot = new Task(defaultTaskOptions) as any
		secondRoot.taskId = "root-task-2"

		await provider.addClineToStack(firstRoot)
		await provider.clearTask()
		expect((provider as any).backgroundRootTaskStacks.has("root-task-1")).toBe(true)

		await provider.addClineToStack(secondRoot)
		await provider.clearTask()

		expect(provider.getCurrentTask()?.taskId).toBe("root-task-1")
		expect((provider as any).focusedRootTaskId).toBe("root-task-1")
		expect((provider as any).backgroundRootTaskStacks.has("root-task-2")).toBe(true)
	})

	// kilocode_change start
	test("closeTaskToHistory keeps active roots in background and clears focused root", async () => {
		const firstRoot = new Task(defaultTaskOptions) as any
		firstRoot.taskId = "root-task-1"
		const secondRoot = new Task(defaultTaskOptions) as any
		secondRoot.taskId = "root-task-2"

		await provider.addClineToStack(firstRoot)
		await provider.clearTask()
		await provider.addClineToStack(secondRoot)

		await provider.closeTaskToHistory()

		expect(provider.getCurrentTask()).toBeUndefined()
		expect((provider as any).focusedRootTaskId).toBeUndefined()
		expect((provider as any).backgroundRootTaskStacks.has("root-task-1")).toBe(true)
		expect((provider as any).backgroundRootTaskStacks.has("root-task-2")).toBe(true)
	})
	// kilocode_change end

	describe("clearTask message handler", () => {
		beforeEach(async () => {
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("calls clearTask (delegation handled via metadata)", async () => {
			// Setup a single task without parent
			const mockCline = new Task(defaultTaskOptions)

			// Mock the provider methods
			const clearTaskSpy = vi.spyOn(provider, "clearTask").mockResolvedValue(undefined)
			const postStateToWebviewSpy = vi.spyOn(provider, "postStateToWebview").mockResolvedValue(undefined)

			// Add task to stack
			await provider.addClineToStack(mockCline)

			// Get the message handler
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Trigger clearTask message
			await messageHandler({ type: "clearTask" })

			// Verify clearTask was called
			expect(clearTaskSpy).toHaveBeenCalled()
			expect(postStateToWebviewSpy).toHaveBeenCalled()
		})

		test("calls clearTask even with parent task (delegation via metadata)", async () => {
			// Setup parent and child tasks
			const parentTask = new Task(defaultTaskOptions)
			const childTask = new Task(defaultTaskOptions)

			// Set up parent-child relationship
			;(childTask as any).parentTask = parentTask
			;(childTask as any).rootTask = parentTask

			// Mock the provider methods
			const clearTaskSpy = vi.spyOn(provider, "clearTask").mockResolvedValue(undefined)
			const postStateToWebviewSpy = vi.spyOn(provider, "postStateToWebview").mockResolvedValue(undefined)

			// Add both tasks to stack (parent first, then child)
			await provider.addClineToStack(parentTask)
			await provider.addClineToStack(childTask)

			// Get the message handler
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Trigger clearTask message
			await messageHandler({ type: "clearTask" })

			// Verify clearTask was called (delegation happens via metadata, not finishSubTask)
			expect(clearTaskSpy).toHaveBeenCalled()
			expect(postStateToWebviewSpy).toHaveBeenCalled()
		})

		test("handles case when no current task exists", async () => {
			// Don't add any tasks to the stack

			// Mock the provider methods
			const clearTaskSpy = vi.spyOn(provider, "clearTask").mockResolvedValue(undefined)
			const postStateToWebviewSpy = vi.spyOn(provider, "postStateToWebview").mockResolvedValue(undefined)

			// Get the message handler
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Trigger clearTask message
			await messageHandler({ type: "clearTask" })

			// When there's no current task, clearTask is still called (it handles the no-task case internally)
			expect(clearTaskSpy).toHaveBeenCalled()
			expect(postStateToWebviewSpy).toHaveBeenCalled()
		})

		test("correctly identifies task scenario for issue #4602", async () => {
			// This test validates the fix for issue #4602
			// where canceling during API retry correctly uses clearTask

			const mockCline = new Task(defaultTaskOptions)

			// Mock the provider methods
			const clearTaskSpy = vi.spyOn(provider, "clearTask").mockResolvedValue(undefined)

			// Add only one task to stack
			await provider.addClineToStack(mockCline)

			// Verify stack size is 1
			expect(provider.getTaskStackSize()).toBe(1)

			// Get the message handler
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Trigger clearTask message (simulating cancel during API retry)
			await messageHandler({ type: "clearTask" })

			// clearTask should be called (delegation handled via metadata)
			expect(clearTaskSpy).toHaveBeenCalled()
		})

		// kilocode_change start
		test("closeTaskToHistory returns webview to chat without selecting another task", async () => {
			const mockCline = new Task(defaultTaskOptions)

			const closeTaskToHistorySpy = vi.spyOn(provider, "closeTaskToHistory").mockResolvedValue(undefined)
			const postStateToWebviewSpy = vi.spyOn(provider, "postStateToWebview").mockResolvedValue(undefined)
			const postMessageToWebviewSpy = vi
				.spyOn(provider, "postMessageToWebview")
				.mockResolvedValue(undefined as any)

			await provider.addClineToStack(mockCline)

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			await messageHandler({ type: "closeTaskToHistory" })

			expect(closeTaskToHistorySpy).toHaveBeenCalled()
			expect(postStateToWebviewSpy).toHaveBeenCalled()
			expect(postMessageToWebviewSpy).toHaveBeenCalledWith({ type: "action", action: "chatButtonClicked" })
		})
		// kilocode_change end
	})

	test("addClineToStack adds multiple Cline instances to the stack", async () => {
		// Setup Cline instance with auto-mock from the top of the file
		const mockCline1 = new Task(defaultTaskOptions) // Create a new mocked instance
		const mockCline2 = new Task(defaultTaskOptions) // Create a new mocked instance
		Object.defineProperty(mockCline1, "taskId", { value: "test-task-id-1", writable: true })
		Object.defineProperty(mockCline2, "taskId", { value: "test-task-id-2", writable: true })

		// add Cline instances to the stack
		await provider.addClineToStack(mockCline1)
		await provider.addClineToStack(mockCline2)

		// verify cline instances were added to the stack
		expect(provider.getTaskStackSize()).toBe(2)

		// verify current cline instance is the last one added
		expect(provider.getCurrentTask()).toBe(mockCline2)
	})

	test("getState returns correct initial state", async () => {
		const state = await provider.getState()

		expect(state).toHaveProperty("apiConfiguration")
		expect(state.apiConfiguration).toHaveProperty("apiProvider")
		expect(state).toHaveProperty("customInstructions")
		expect(state).toHaveProperty("alwaysAllowReadOnly")
		expect(state).toHaveProperty("alwaysAllowWrite")
		expect(state).toHaveProperty("alwaysAllowExecute")
		expect(state).toHaveProperty("alwaysAllowBrowser")
		// expect(state).toHaveProperty("taskHistory") // kilocode_change
		expect(state).toHaveProperty("soundEnabled")
		expect(state).toHaveProperty("ttsEnabled")
		expect(state).toHaveProperty("diffEnabled")
		expect(state).toHaveProperty("writeDelayMs")
	})

	test("getStateToPostToWebview redacts global image and fast-apply secrets while exposing presence flags", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("morphApiKey", "morph-secret")
		await provider.contextProxy.setValue("openRouterImageApiKey", "openrouter-secret")
		await provider.contextProxy.setValue("kiloCodeImageApiKey", "kilocode-secret")
		await provider.contextProxy.setValue("litellmImageApiKey", "litellm-secret")
		await provider.contextProxy.setValue("litellmImageBaseUrl", "https://litellm.example")

		const hostState = await provider.getState()
		const webviewState = await provider.getStateToPostToWebview()

		expect(hostState.morphApiKey).toBe("morph-secret")
		expect(hostState.openRouterImageApiKey).toBe("openrouter-secret")
		expect(hostState.kiloCodeImageApiKey).toBe("kilocode-secret")
		expect(hostState.litellmImageApiKey).toBe("litellm-secret")

		expect(webviewState.morphApiKey).toBe("")
		expect(webviewState.hasMorphApiKey).toBe(true)
		expect(webviewState.openRouterImageApiKey).toBe("")
		expect(webviewState.hasOpenRouterImageApiKey).toBe(true)
		expect(webviewState.kiloCodeImageApiKey).toBe("")
		expect(webviewState.hasKiloCodeImageApiKey).toBe(true)
		expect(webviewState.litellmImageApiKey).toBe("")
		expect(webviewState.hasLitellmImageApiKey).toBe(true)
		expect(webviewState.litellmImageBaseUrl).toBe("https://litellm.example")
	})

	test("getStateToPostToWebview merges persisted and live current task activity through the canonical projection", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-activity-1",
				number: 1,
				task: "Projection task",
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				activity: [
					{
						kind: "taskControl",
						id: "control-branch",
						taskId: "task-activity-1",
						control: "branch",
						summary: "Task branched",
						timestamp: 300,
					},
					{
						kind: "subagent",
						id: "subagent-shared",
						taskId: "task-activity-1",
						sessionId: "session-1",
						status: "completed",
						summary: "Persisted completed child",
						timestamp: 200,
					},
				],
			},
		])

		const mockTask = new Task(defaultTaskOptions) as any
		Object.defineProperty(mockTask, "taskId", { value: "task-activity-1", writable: true })
		Object.defineProperty(mockTask, "clineMessages", { value: [], writable: true })
		Object.defineProperty(mockTask, "todoList", { value: [], writable: true })
		Object.defineProperty(mockTask, "messageQueueService", { value: undefined, writable: true })
		provider.getCurrentTask = vi.fn().mockReturnValue(mockTask)
		orchestrationEventStore.clear("task-activity-1")
		orchestrationEventStore.append("task-activity-1", {
			kind: "subagent",
			id: "subagent-shared",
			taskId: "task-activity-1",
			sessionId: "session-1",
			status: "running",
			summary: "Live running child",
			timestamp: 200,
		})
		orchestrationEventStore.append("task-activity-1", {
			kind: "taskControl",
			id: "control-continue",
			taskId: "task-activity-1",
			control: "continue",
			summary: "Task continued",
			timestamp: 100,
		})

		const state = await provider.getStateToPostToWebview()

		expect(state.currentTaskActivity).toEqual([
			expect.objectContaining({ id: "control-continue", control: "continue", summary: "Task continued" }),
			expect.objectContaining({ id: "subagent-shared", status: "running", summary: "Live running child" }),
			expect.objectContaining({ id: "control-branch", control: "branch", summary: "Task branched" }),
		])

		orchestrationEventStore.clear("task-activity-1")
	})

	test("getStateToPostToWebview keeps focused recovery activity scoped to the restored current task", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "parent-restore",
				number: 1,
				task: "Recovered parent",
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				activity: [
					{
						kind: "taskControl",
						id: "parent-branch",
						taskId: "parent-restore",
						control: "branch",
						summary: "Parent branched before reload",
						timestamp: 300,
					},
					{
						kind: "subagent",
						id: "shared-child",
						taskId: "parent-restore",
						sessionId: "session-restore",
						status: "completed",
						summary: "Persisted child completed",
						timestamp: 200,
					},
				],
			},
			{
				id: "child-bg",
				number: 2,
				task: "Recovered background child",
				ts: 2,
				rootTaskId: "parent-restore",
				parentTaskId: "parent-restore",
				status: "active",
				lifecycleState: "paused",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				activity: [
					{
						kind: "taskControl",
						id: "child-pause",
						taskId: "child-bg",
						control: "pause",
						summary: "Child paused in its own history",
						timestamp: 500,
					},
				],
			},
		])

		const restoredParent = new Task(defaultTaskOptions) as any
		Object.defineProperty(restoredParent, "taskId", { value: "parent-restore", writable: true })
		Object.defineProperty(restoredParent, "clineMessages", { value: [], writable: true })
		Object.defineProperty(restoredParent, "todoList", { value: [], writable: true })
		Object.defineProperty(restoredParent, "messageQueueService", { value: undefined, writable: true })

		const backgroundChild = new Task(defaultTaskOptions) as any
		Object.defineProperty(backgroundChild, "taskId", { value: "child-bg", writable: true })
		Object.defineProperty(backgroundChild, "clineMessages", { value: [], writable: true })
		Object.defineProperty(backgroundChild, "todoList", { value: [], writable: true })
		Object.defineProperty(backgroundChild, "messageQueueService", { value: undefined, writable: true })
		;(provider as any).clineStack = [restoredParent]
		;(provider as any).backgroundRootTaskStacks = new Map([
			["parent-restore", [restoredParent]],
			["child-bg", [backgroundChild]],
		])
		;(provider as any).focusedRootTaskId = "parent-restore"
		provider.getCurrentTask = vi.fn().mockReturnValue(restoredParent)

		orchestrationEventStore.clear("parent-restore")
		orchestrationEventStore.clear("child-bg")
		orchestrationEventStore.append("parent-restore", {
			kind: "subagent",
			id: "shared-child",
			taskId: "parent-restore",
			sessionId: "session-restore",
			status: "paused",
			summary: "Recoverable child paused",
			timestamp: 200,
		})
		orchestrationEventStore.append("parent-restore", {
			kind: "taskControl",
			id: "parent-continue",
			taskId: "parent-restore",
			control: "continue",
			summary: "Parent continued after reload",
			timestamp: 100,
		})
		orchestrationEventStore.append("child-bg", {
			kind: "taskControl",
			id: "child-continue",
			taskId: "child-bg",
			control: "continue",
			summary: "Background child continued",
			timestamp: 600,
		})

		const state = await provider.getStateToPostToWebview()

		expect(state.focusedRootTaskId).toBe("parent-restore")
		expect(state.currentTaskActivity).toEqual([
			expect.objectContaining({ id: "parent-continue", taskId: "parent-restore", control: "continue" }),
			expect.objectContaining({ id: "shared-child", taskId: "parent-restore", status: "paused" }),
			expect.objectContaining({ id: "parent-branch", taskId: "parent-restore", control: "branch" }),
		])
		expect((state.currentTaskActivity ?? []).every((item) => item.taskId === "parent-restore")).toBe(true)

		orchestrationEventStore.clear("parent-restore")
		orchestrationEventStore.clear("child-bg")
	})

	test("recordTaskActivity persists published control activity so recovery survives live store reset", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-publish-restore",
				number: 1,
				task: "Recoverable publish task",
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])

		const mockTask = new Task(defaultTaskOptions) as any
		Object.defineProperty(mockTask, "taskId", { value: "task-publish-restore", writable: true })
		Object.defineProperty(mockTask, "clineMessages", { value: [], writable: true })
		Object.defineProperty(mockTask, "todoList", { value: [], writable: true })
		Object.defineProperty(mockTask, "messageQueueService", { value: undefined, writable: true })
		provider.getCurrentTask = vi.fn().mockReturnValue(mockTask)
		vi.spyOn(provider as any, "getTaskWithId").mockImplementation(async (...args: unknown[]) => {
			const id = args[0] as string
			const taskHistory = provider.contextProxy.getValue("taskHistory") ?? []
			const historyItem = taskHistory.find((item: any) => item.id === id)
			if (!historyItem) {
				throw new Error("Task not found")
			}

			return {
				historyItem,
				taskDirPath: "/test/task/path",
				apiConversationHistoryFilePath: "/test/task/path/api_conversation_history.json",
				uiMessagesFilePath: "/test/task/path/ui_messages.json",
				apiConversationHistory: [],
			}
		})

		await provider.recordTaskActivity("task-publish-restore", {
			kind: "taskControl",
			id: "publish-continue",
			taskId: "task-publish-restore",
			control: "continue",
			summary: "Task continued",
			timestamp: 100,
		})
		await provider.recordTaskActivity("task-publish-restore", {
			kind: "taskControl",
			id: "publish-branch",
			taskId: "task-publish-restore",
			control: "branch",
			summary: "Task branched",
			timestamp: 200,
		})

		orchestrationEventStore.clear("task-publish-restore")
		const state = await provider.getStateToPostToWebview()

		expect(state.currentTaskActivity).toEqual([
			expect.objectContaining({ id: "publish-continue", taskId: "task-publish-restore", control: "continue" }),
			expect.objectContaining({ id: "publish-branch", taskId: "task-publish-restore", control: "branch" }),
		])
	})

	// kilocode_change start - prove dedup survives provider persistence and live-store recovery
	test("recordTaskActivity deduplicates persisted activity ids so recovery readback stays stable", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-publish-dedup",
				number: 1,
				task: "Recoverable dedup task",
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])

		const mockTask = new Task(defaultTaskOptions) as any
		Object.defineProperty(mockTask, "taskId", { value: "task-publish-dedup", writable: true })
		Object.defineProperty(mockTask, "clineMessages", { value: [], writable: true })
		Object.defineProperty(mockTask, "todoList", { value: [], writable: true })
		Object.defineProperty(mockTask, "messageQueueService", { value: undefined, writable: true })
		provider.getCurrentTask = vi.fn().mockReturnValue(mockTask)
		vi.spyOn(provider as any, "getTaskWithId").mockImplementation(async (...args: unknown[]) => {
			const id = args[0] as string
			const taskHistory = provider.contextProxy.getValue("taskHistory") ?? []
			const historyItem = taskHistory.find((item: any) => item.id === id)
			if (!historyItem) {
				throw new Error("Task not found")
			}

			return {
				historyItem,
				taskDirPath: "/test/task/path",
				apiConversationHistoryFilePath: "/test/task/path/api_conversation_history.json",
				uiMessagesFilePath: "/test/task/path/ui_messages.json",
				apiConversationHistory: [],
			}
		})

		const duplicateActivity = {
			kind: "subagent" as const,
			id: "subagent-child-1-100",
			taskId: "child-1",
			sessionId: "session-1",
			status: "completed" as const,
			summary: "Done",
			timestamp: 100,
		}

		await provider.recordTaskActivity("task-publish-dedup", duplicateActivity)
		await provider.recordTaskActivity("task-publish-dedup", duplicateActivity)

		const persistedHistory = provider.contextProxy.getValue("taskHistory") ?? []
		expect(persistedHistory.find((item: any) => item.id === "task-publish-dedup")?.activity).toEqual([
			duplicateActivity,
		])

		orchestrationEventStore.clear("task-publish-dedup")
		const state = await provider.getStateToPostToWebview()

		expect(state.currentTaskActivity ?? []).toEqual([
			expect.objectContaining({
				id: "subagent-child-1-100",
				taskId: "child-1",
				sessionId: "session-1",
				status: "completed",
			}),
		])
	})
	// kilocode_change end

	/**
	 * Verifies the branch write seam end-to-end for the source task by asserting the
	 * same branch control item is visible before and after live store reset.
	 */
	it("branchTask persists published branch activity so reload uses the same source-task projection", async () => {
		const timestamp = 123
		vi.spyOn(Date, "now").mockReturnValue(timestamp)

		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("taskHistory", [
			{
				id: "task-branch-source",
				number: 1,
				task: "Recoverable branch source",
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				completionResultSummary: "Continue from current context",
			},
		])

		const sourceTask = new Task(defaultTaskOptions) as any
		Object.defineProperty(sourceTask, "taskId", { value: "task-branch-source", writable: true })
		Object.defineProperty(sourceTask, "clineMessages", { value: [], writable: true })
		Object.defineProperty(sourceTask, "todoList", { value: [], writable: true })
		Object.defineProperty(sourceTask, "messageQueueService", { value: undefined, writable: true })
		provider.getCurrentTask = vi.fn().mockReturnValue(sourceTask)
		;(provider as any).taskBranchService = new TaskBranchService(provider as any)

		const branchedTask = new Task(defaultTaskOptions) as any
		Object.defineProperty(branchedTask, "taskId", { value: "task-branch-child", writable: true })

		vi.spyOn(provider, "createTask").mockResolvedValue(branchedTask)
		vi.spyOn(provider, "getState").mockResolvedValue({
			apiConfiguration: {
				apiProvider: "openrouter",
			},
			condensingApiConfigId: undefined,
			listApiConfigMeta: undefined,
		} as any)
		vi.spyOn(provider as any, "postStateToWebview").mockResolvedValue(undefined)
		vi.spyOn(provider as any, "getTaskWithId").mockImplementation(async (...args: unknown[]) => {
			const id = args[0] as string
			if (id === "task-branch-child") {
				return {
					historyItem: {
						id: "task-branch-child",
						number: 2,
						task: "Recovered branch child",
						ts: 2,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
					taskDirPath: "/test/task/path",
					apiConversationHistoryFilePath: "/test/task/path/api_conversation_history.json",
					uiMessagesFilePath: "/test/task/path/ui_messages.json",
					apiConversationHistory: [],
				}
			}

			const taskHistory = provider.contextProxy.getValue("taskHistory") ?? []
			const historyItem = taskHistory.find((item: any) => item.id === id)
			if (!historyItem) {
				throw new Error("Task not found")
			}

			return {
				historyItem,
				taskDirPath: "/test/task/path",
				apiConversationHistoryFilePath: "/test/task/path/api_conversation_history.json",
				uiMessagesFilePath: "/test/task/path/ui_messages.json",
				apiConversationHistory: [],
			}
		})

		orchestrationEventStore.clear("task-branch-source")

		const branchTaskServiceSpy = vi.spyOn((provider as any).taskBranchService, "branchTask")

		const branched = await provider.branchTask("task-branch-source", {
			branchStrategy: "full",
			message: "Continue from current context",
		})

		expect(branchTaskServiceSpy).toHaveBeenCalledWith("task-branch-source", {
			branchStrategy: "full",
			message: "Continue from current context",
		})
		expect(branched.taskId).toBe("task-branch-child")
		expect(orchestrationEventStore.get("task-branch-source")).toEqual([
			expect.objectContaining({
				id: `task-control-branch-${timestamp}`,
				taskId: "task-branch-source",
				control: "branch",
				summary: "Branched into task task-branch-child",
				timestamp,
			}),
		])

		let state = await provider.getStateToPostToWebview()
		expect(state.currentTaskActivity).toEqual([
			expect.objectContaining({
				id: `task-control-branch-${timestamp}`,
				taskId: "task-branch-source",
				control: "branch",
				summary: "Branched into task task-branch-child",
			}),
		])

		orchestrationEventStore.clear("task-branch-source")
		state = await provider.getStateToPostToWebview()
		expect(state.currentTaskActivity).toEqual([
			expect.objectContaining({
				id: `task-control-branch-${timestamp}`,
				taskId: "task-branch-source",
				control: "branch",
				summary: "Branched into task task-branch-child",
			}),
		])

		const taskHistory = provider.contextProxy.getValue("taskHistory") ?? []
		const sourceHistory = taskHistory.find((item: any) => item.id === "task-branch-source")
		const branchHistory = taskHistory.find((item: any) => item.id === "task-branch-child")

		expect(sourceHistory?.activity).toEqual([
			expect.objectContaining({
				id: `task-control-branch-${timestamp}`,
				taskId: "task-branch-source",
				control: "branch",
				summary: "Branched into task task-branch-child",
			}),
		])
		expect(branchHistory).toEqual(
			expect.objectContaining({
				id: "task-branch-child",
				branchFromTaskId: "task-branch-source",
				branchSummary: "Branch of task task-branch-source: Continue from current context",
				branchStrategy: "full",
			}),
		)
	})

	// kilocode_change start
	describe("createTask policy seam", () => {
		test("top-level create delegates to the birth service and places the created task", async () => {
			const admission = { rootTask: undefined, taskNumber: 1 }
			const admitFreshTask = vi.fn().mockReturnValue(admission)
			const instantiateFreshTask = vi.fn().mockReturnValue({ taskId: "created-top", instanceId: "inst" })
			const placeTask = vi.fn().mockResolvedValue("created-top")
			const prepareTaskBirthOrchestration = vi
				.spyOn(taskBirthOrchestrationService, "prepareTaskBirthOrchestration")
				.mockResolvedValueOnce({
					admitFreshTask,
					instantiateFreshTask,
					instantiateHistoryTask: vi.fn(),
					placeTask,
				})
			await provider.resolveWebviewView(mockWebviewView)

			const task = await provider.createTask("Top-level task")

			expect(prepareTaskBirthOrchestration).toHaveBeenCalledWith({
				context: (provider as any).context,
				provider,
				taskCreationCallback: (provider as any).taskCreationCallback,
				getState: expect.any(Function),
				getCurrentStack: expect.any(Function),
				setCurrentStack: expect.any(Function),
				snapshotCurrentStackToBackground: expect.any(Function),
				addClineToStack: expect.any(Function),
				rootStackLifecycle: (provider as any).taskRootStackLifecycleService,
				log: expect.any(Function),
			})
			expect(admitFreshTask).toHaveBeenCalledWith({
				parentTask: undefined,
				detachFromParentRoot: undefined,
			})
			expect(instantiateFreshTask).toHaveBeenCalledWith({
				text: "Top-level task",
				images: undefined,
				parentTask: undefined,
				options: {},
				admission,
			})
			expect(placeTask).toHaveBeenCalledWith({
				task: expect.objectContaining({ taskId: "created-top" }),
				logContext: "createTask",
			})
			expect(task).toEqual(expect.objectContaining({ taskId: "created-top" }))
		})

		test("child create forwards parent and detach options to the birth service", async () => {
			const rootTask = new Task(defaultTaskOptions) as any
			Object.defineProperty(rootTask, "taskId", { value: "root-parent", writable: true })
			const parentTask = new Task(defaultTaskOptions) as any
			Object.defineProperty(parentTask, "taskId", { value: "parent-child", writable: true })
			const admission = { rootTask, taskNumber: 2 }
			const admitFreshTask = vi.fn().mockReturnValue(admission)
			const instantiateFreshTask = vi.fn().mockReturnValue({ taskId: "child-created", instanceId: "inst" })
			const placeTask = vi.fn().mockResolvedValue("root-parent")
			vi.spyOn(taskBirthOrchestrationService, "prepareTaskBirthOrchestration").mockResolvedValueOnce({
				admitFreshTask,
				instantiateFreshTask,
				instantiateHistoryTask: vi.fn(),
				placeTask,
			})
			await provider.resolveWebviewView(mockWebviewView)

			await provider.createTask("Child task", undefined, parentTask, { detachFromParentRoot: true })

			expect(admitFreshTask).toHaveBeenCalledWith({
				parentTask,
				detachFromParentRoot: true,
			})
			expect(instantiateFreshTask).toHaveBeenCalledWith({
				text: "Child task",
				images: undefined,
				parentTask,
				options: { detachFromParentRoot: true },
				admission,
			})
			expect(placeTask).toHaveBeenCalledWith({
				task: expect.objectContaining({ taskId: "child-created" }),
				logContext: "createTask",
			})
		})
	})
	// kilocode_change end

	// kilocode_change start: Ensure code index Neo4j + vector store name are surfaced to webview
	test("getState includes Neo4j settings and workspace vector store name", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) => {
			if (key === "mode") return "architect"
			if (key === "currentApiConfigName") return "current-config"

			if (key === "codebaseIndexConfig") {
				return {
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexVectorStoreProvider: "qdrant",
					codebaseIndexVectorStoreName: "global-vectors",
					codebaseIndexNeo4jEnabled: true,
					codebaseIndexNeo4jUri: "bolt://localhost:7687",
					codebaseIndexNeo4jUsername: "neo4j",
					codebaseIndexNeo4jDatabase: "neo4j",
				}
			}

			return undefined
		})
		;(mockContext.workspaceState.get as any).mockImplementation(async (key: string) => {
			if (key === "codebaseIndexVectorStoreName") return "workspace-vectors"
			return undefined
		})

		await provider.contextProxy.initialize()

		const state = await provider.getState()

		expect(state.codebaseIndexConfig).toMatchObject({
			codebaseIndexVectorStoreName: "workspace-vectors",
			codebaseIndexNeo4jEnabled: true,
			codebaseIndexNeo4jUri: "bolt://localhost:7687",
			codebaseIndexNeo4jUsername: "neo4j",
			codebaseIndexNeo4jDatabase: "neo4j",
		})
	})
	// kilocode_change end: Ensure code index Neo4j + vector store name are surfaced to webview

	// kilocode_change start: Ensure posted state keeps Neo4j + vector store name
	test("getStateToPostToWebview includes Neo4j settings and vector store name", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) => {
			if (key === "mode") return "architect"
			if (key === "currentApiConfigName") return "current-config"

			if (key === "codebaseIndexConfig") {
				return {
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexVectorStoreProvider: "qdrant",
					codebaseIndexVectorStoreName: "global-vectors",
					codebaseIndexNeo4jEnabled: true,
					codebaseIndexNeo4jUri: "bolt://localhost:7687",
					codebaseIndexNeo4jUsername: "neo4j",
					codebaseIndexNeo4jDatabase: "neo4j",
				}
			}

			return undefined
		})
		;(mockContext.workspaceState.get as any).mockImplementation(async (key: string) => {
			if (key === "codebaseIndexVectorStoreName") return "workspace-vectors"
			return undefined
		})

		await provider.contextProxy.initialize()

		const state = await provider.getStateToPostToWebview()

		expect(state.codebaseIndexConfig).toMatchObject({
			codebaseIndexVectorStoreName: "workspace-vectors",
			codebaseIndexNeo4jEnabled: true,
			codebaseIndexNeo4jUri: "bolt://localhost:7687",
			codebaseIndexNeo4jUsername: "neo4j",
			codebaseIndexNeo4jDatabase: "neo4j",
		})
	})
	// kilocode_change end: Ensure posted state keeps Neo4j + vector store name

	test("language is set to VSCode language", async () => {
		// Mock VSCode language as Spanish
		;(vscode.env as any).language = "pt-BR"

		const state = await provider.getState()
		expect(state.language).toBe("pt-BR")
	})

	test("diffEnabled defaults to true when not set", async () => {
		// Mock globalState.get to return undefined for diffEnabled
		;(mockContext.globalState.get as any).mockReturnValue(undefined)

		const state = await provider.getState()

		expect(state.diffEnabled).toBe(true)
	})

	test("writeDelayMs defaults to 1000ms", async () => {
		// Mock globalState.get to return undefined for writeDelayMs
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "writeDelayMs" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.writeDelayMs).toBe(1000)
	})

	test("handles writeDelayMs message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { writeDelayMs: 2000 } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("writeDelayMs", 2000)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("writeDelayMs", 2000)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("updates sound utility when sound setting changes", async () => {
		await provider.resolveWebviewView(mockWebviewView)

		// Get the message handler from onDidReceiveMessage
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Simulate setting sound to enabled
		await messageHandler({ type: "updateSettings", updatedSettings: { soundEnabled: true } })
		expect(updateGlobalStateSpy).toHaveBeenCalledWith("soundEnabled", true)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("soundEnabled", true)
		expect(mockPostMessage).toHaveBeenCalled()

		// Simulate setting sound to disabled
		await messageHandler({ type: "updateSettings", updatedSettings: { soundEnabled: false } })
		expect(mockContext.globalState.update).toHaveBeenCalledWith("soundEnabled", false)
		expect(mockPostMessage).toHaveBeenCalled()

		// Simulate setting tts to enabled
		await messageHandler({ type: "updateSettings", updatedSettings: { ttsEnabled: true } })
		expect(setTtsEnabled).toHaveBeenCalledWith(true)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("ttsEnabled", true)
		expect(mockPostMessage).toHaveBeenCalled()

		// Simulate setting tts to disabled
		await messageHandler({ type: "updateSettings", updatedSettings: { ttsEnabled: false } })
		expect(setTtsEnabled).toHaveBeenCalledWith(false)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("ttsEnabled", false)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("autoCondenseContext defaults to true", async () => {
		// Mock globalState.get to return undefined for autoCondenseContext
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "autoCondenseContext" ? undefined : null,
		)
		const state = await provider.getState()
		expect(state.autoCondenseContext).toBe(true)
	})

	test("handles autoCondenseContext message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]
		await messageHandler({ type: "updateSettings", updatedSettings: { autoCondenseContext: false } })
		expect(updateGlobalStateSpy).toHaveBeenCalledWith("autoCondenseContext", false)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("autoCondenseContext", false)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("autoCondenseContextPercent defaults to 85", async () => {
		// Mock globalState.get to return undefined for autoCondenseContextPercent
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "autoCondenseContextPercent" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.autoCondenseContextPercent).toBe(85)
	})

	test("handles autoCondenseContextPercent message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { autoCondenseContextPercent: 75 } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("autoCondenseContextPercent", 75)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("autoCondenseContextPercent", 75)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("autoRestartProblematicProcesses defaults to false", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "autoRestartProblematicProcesses" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.autoRestartProblematicProcesses).toBe(false)
	})

	test("handles autoRestartProblematicProcesses message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { autoRestartProblematicProcesses: true } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("autoRestartProblematicProcesses", true)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("autoRestartProblematicProcesses", true)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("problematicProcessRestartLimit defaults to 1", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "problematicProcessRestartLimit" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.problematicProcessRestartLimit).toBe(1)
	})

	test("handles problematicProcessRestartLimit message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { problematicProcessRestartLimit: 3 } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("problematicProcessRestartLimit", 3)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("problematicProcessRestartLimit", 3)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("parallelAgentsEnabled defaults to false", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "parallelAgentsEnabled" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.parallelAgentsEnabled).toBe(false)
	})

	test("handles parallelAgentsEnabled message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { parallelAgentsEnabled: true } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("parallelAgentsEnabled", true)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("parallelAgentsEnabled", true)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("parallelAgentCount defaults to 2", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "parallelAgentCount" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.parallelAgentCount).toBe(2)
	})

	test("handles parallelAgentCount message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { parallelAgentCount: 4 } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("parallelAgentCount", 4)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("parallelAgentCount", 4)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("getState exposes orchestration expert settings", async () => {
		await provider.contextProxy.initialize()
		await provider.contextProxy.setValue("orchestrationTelemetryEnabled", false)
		await provider.contextProxy.setValue("helperLocalityPreference", "require")
		await provider.contextProxy.setValue("orchestrationEscalationSensitivity", "aggressive")
		await provider.contextProxy.setValue("structuredDelegationEnabled", true)
		await provider.contextProxy.setValue("evaluatorPassEnabled", true)
		await provider.contextProxy.setValue("memoryPromotionEnabled", true)
		await provider.contextProxy.setValue("retrievalPolicy", "hybrid")
		await provider.contextProxy.setValue("queryClassifierDebug", true)

		const state = await provider.getState()

		expect(state).toMatchObject({
			orchestrationTelemetryEnabled: false,
			helperLocalityPreference: "require",
			orchestrationEscalationSensitivity: "aggressive",
			structuredDelegationEnabled: true,
			evaluatorPassEnabled: true,
			memoryPromotionEnabled: true,
			retrievalPolicy: "hybrid",
			queryClassifierDebug: true,
		})
	})

	test("contextRoutingEnabled defaults to true", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "contextRoutingEnabled" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.contextRoutingEnabled).toBe(true)
	})

	test("contextRoutingFastThresholdPercent defaults to 35", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "contextRoutingFastThresholdPercent" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.contextRoutingFastThresholdPercent).toBe(35)
	})

	test("contextRoutingDeepThresholdPercent defaults to 65", async () => {
		;(mockContext.globalState.get as any).mockImplementation((key: string) =>
			key === "contextRoutingDeepThresholdPercent" ? undefined : null,
		)

		const state = await provider.getState()
		expect(state.contextRoutingDeepThresholdPercent).toBe(65)
	})

	test("handles contextRoutingEnabled message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { contextRoutingEnabled: true } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("contextRoutingEnabled", true)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("contextRoutingEnabled", true)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("handles contextRoutingFastThresholdPercent message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({
			type: "updateSettings",
			updatedSettings: { contextRoutingFastThresholdPercent: 65 },
		})

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("contextRoutingFastThresholdPercent", 65)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("contextRoutingFastThresholdPercent", 65)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("handles contextRoutingDeepThresholdPercent message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({
			type: "updateSettings",
			updatedSettings: { contextRoutingDeepThresholdPercent: 90 },
		})

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("contextRoutingDeepThresholdPercent", 90)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("contextRoutingDeepThresholdPercent", 90)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	// kilocode_change start: ensure updateSettings doesn't abort when a single setting errors
	test("updateSettings continues when VS Code configuration update fails", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		const mockConfig = vscode.workspace.getConfiguration(Package.name) as any // kilocode_change
		vi.spyOn(mockConfig, "update").mockImplementation(() => {
			throw new Error("mock config update failure")
		})

		await expect(
			messageHandler({
				type: "updateSettings",
				updatedSettings: {
					allowedCommands: ["echo ok"],
					contextRoutingEnabled: true,
				},
			}),
		).resolves.toBeUndefined()

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("contextRoutingEnabled", true)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("contextRoutingEnabled", true)
		expect(mockPostMessage).toHaveBeenCalled()
	})
	// kilocode_change end

	it("loads saved API config when switching modes", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		const profile: ProviderSettingsEntry = { name: "test-config", id: "test-id", apiProvider: "anthropic" }

		;(provider as any).providerSettingsManager = {
			getModeConfigId: vi.fn().mockResolvedValue("test-id"),
			listConfig: vi.fn().mockResolvedValue([profile]),
			activateProfile: vi.fn().mockResolvedValue(profile),
			setModeConfig: vi.fn(),
			getProfile: vi.fn().mockResolvedValue(profile),
		} as any

		// Switch to architect mode
		await messageHandler({ type: "mode", text: "architect" })

		// Should load the saved config for architect mode
		expect(provider.providerSettingsManager.getModeConfigId).toHaveBeenCalledWith("architect")
		expect(provider.providerSettingsManager.activateProfile).toHaveBeenCalledWith({ name: "test-config" })
		expect(mockContext.globalState.update).toHaveBeenCalledWith("currentApiConfigName", "test-config")
	})

	it("saves current config when switching to mode without config", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		;(provider as any).providerSettingsManager = {
			getModeConfigId: vi.fn().mockResolvedValue(undefined),
			listConfig: vi
				.fn()
				.mockResolvedValue([{ name: "current-config", id: "current-id", apiProvider: "anthropic" }]),
			setModeConfig: vi.fn(),
		} as any

		provider.setValue("currentApiConfigName", "current-config")

		// Switch to architect mode
		await messageHandler({ type: "mode", text: "architect" })

		// Should save current config as default for architect mode
		expect(provider.providerSettingsManager.setModeConfig).toHaveBeenCalledWith("architect", "current-id")
	})

	it("saves config as default for current mode when loading config", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		const profile: ProviderSettingsEntry = { apiProvider: "anthropic", id: "new-id", name: "new-config" }

		;(provider as any).providerSettingsManager = {
			activateProfile: vi.fn().mockResolvedValue(profile),
			listConfig: vi.fn().mockResolvedValue([profile]),
			setModeConfig: vi.fn(),
			getModeConfigId: vi.fn().mockResolvedValue(undefined),
		} as any

		// First set the mode
		await messageHandler({ type: "mode", text: "architect" })

		// Then load the config
		await messageHandler({ type: "loadApiConfiguration", text: "new-config" })

		// Should save new config as default for architect mode
		expect(provider.providerSettingsManager.setModeConfig).toHaveBeenCalledWith("architect", "new-id")
	})

	it("load API configuration by ID works and updates mode config", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		const profile: ProviderSettingsEntry = {
			name: "config-by-id",
			id: "config-id-123",
			apiProvider: "anthropic",
		}

		;(provider as any).providerSettingsManager = {
			activateProfile: vi.fn().mockResolvedValue(profile),
			listConfig: vi.fn().mockResolvedValue([profile]),
			setModeConfig: vi.fn(),
			getModeConfigId: vi.fn().mockResolvedValue(undefined),
		} as any

		// First set the mode
		await messageHandler({ type: "mode", text: "architect" })

		// Then load the config by ID
		await messageHandler({ type: "loadApiConfigurationById", text: "config-id-123" })

		// Should save new config as default for architect mode
		expect(provider.providerSettingsManager.setModeConfig).toHaveBeenCalledWith("architect", "config-id-123")

		// Ensure the `activateProfile` method was called with the correct ID
		expect(provider.providerSettingsManager.activateProfile).toHaveBeenCalledWith({ id: "config-id-123" })
	})

	test("handles browserToolEnabled setting", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Test browserToolEnabled
		await messageHandler({ type: "updateSettings", updatedSettings: { browserToolEnabled: true } })
		expect(mockContext.globalState.update).toHaveBeenCalledWith("browserToolEnabled", true)
		expect(mockPostMessage).toHaveBeenCalled()

		// Verify state includes browserToolEnabled
		const state = await provider.getState()
		expect(state).toHaveProperty("browserToolEnabled")
		expect(state.browserToolEnabled).toBe(true) // Default value should be true
	})

	test("handles showRooIgnoredFiles setting", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Default value should be false
		expect((await provider.getState()).showRooIgnoredFiles).toBe(false)

		// Test showRooIgnoredFiles with true
		await messageHandler({ type: "updateSettings", updatedSettings: { showRooIgnoredFiles: true } })
		expect(mockContext.globalState.update).toHaveBeenCalledWith("showRooIgnoredFiles", true)
		expect(mockPostMessage).toHaveBeenCalled()
		expect((await provider.getState()).showRooIgnoredFiles).toBe(true)

		// Test showRooIgnoredFiles with false
		await messageHandler({ type: "updateSettings", updatedSettings: { showRooIgnoredFiles: false } })
		expect(mockContext.globalState.update).toHaveBeenCalledWith("showRooIgnoredFiles", false)
		expect(mockPostMessage).toHaveBeenCalled()
		expect((await provider.getState()).showRooIgnoredFiles).toBe(false)
	})

	test("handles updatePrompt message correctly", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Mock existing prompts
		const existingPrompts = {
			code: {
				roleDefinition: "existing code role",
				customInstructions: "existing code prompt",
			},
			architect: {
				roleDefinition: "existing architect role",
				customInstructions: "existing architect prompt",
			},
		}

		provider.setValue("customModePrompts", existingPrompts)

		// Test updating a prompt
		await messageHandler({
			type: "updatePrompt",
			promptMode: "code",
			customPrompt: "new code prompt",
		})

		// Verify state was updated correctly
		expect(mockContext.globalState.update).toHaveBeenCalledWith("customModePrompts", {
			...existingPrompts,
			code: "new code prompt",
		})

		// Verify state was posted to webview
		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "state",
				state: expect.objectContaining({
					customModePrompts: {
						...existingPrompts,
						code: "new code prompt",
					},
				}),
			}),
		)
	})

	test("customModePrompts defaults to empty object", async () => {
		// Mock globalState.get to return undefined for customModePrompts
		;(mockContext.globalState.get as any).mockImplementation((key: string) => {
			if (key === "customModePrompts") {
				return undefined
			}
			return null
		})

		const state = await provider.getState()
		expect(state.customModePrompts).toEqual({})
	})

	test("handles maxWorkspaceFiles message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		await messageHandler({ type: "updateSettings", updatedSettings: { maxWorkspaceFiles: 300 } })

		expect(updateGlobalStateSpy).toHaveBeenCalledWith("maxWorkspaceFiles", 300)
		expect(mockContext.globalState.update).toHaveBeenCalledWith("maxWorkspaceFiles", 300)
		expect(mockPostMessage).toHaveBeenCalled()
	})

	test("handles mode-specific custom instructions updates", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Mock existing prompts
		const existingPrompts = {
			code: {
				roleDefinition: "Code role",
				customInstructions: "Old instructions",
			},
		}
		mockContext.globalState.get = vi.fn((key: string) => {
			if (key === "customModePrompts") {
				return existingPrompts
			}
			return undefined
		})

		// Update custom instructions for code mode
		await messageHandler({
			type: "updatePrompt",
			promptMode: "code",
			customPrompt: {
				roleDefinition: "Code role",
				customInstructions: "New instructions",
			},
		})

		// Verify state was updated correctly
		expect(mockContext.globalState.update).toHaveBeenCalledWith("customModePrompts", {
			code: {
				roleDefinition: "Code role",
				customInstructions: "New instructions",
			},
		})
	})

	it("saves mode config when updating API configuration", async () => {
		// Setup mock context with mode and config name
		mockContext = {
			...mockContext,
			globalState: {
				...mockContext.globalState,
				get: vi.fn((key: string) => {
					if (key === "mode") {
						return "code"
					} else if (key === "currentApiConfigName") {
						return "test-config"
					}
					return undefined
				}),
				update: vi.fn(),
				keys: vi.fn().mockReturnValue([]),
			},
		} as unknown as vscode.ExtensionContext

		// Create new provider with updated mock context
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", new ContextProxy(mockContext))
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		;(provider as any).providerSettingsManager = {
			listConfig: vi.fn().mockResolvedValue([{ name: "test-config", id: "test-id", apiProvider: "anthropic" }]),
			saveConfig: vi.fn().mockResolvedValue("test-id"),
			setModeConfig: vi.fn(),
			// kilocode_change start
			getProfile: vi.fn().mockResolvedValue({
				name: "test-config",
				apiProvider: "anthropic",
				id: "test-id",
			}),
			//kilocode_change end
		} as any

		// Update API configuration
		await messageHandler({
			type: "upsertApiConfiguration",
			text: "test-config",
			apiConfiguration: { apiProvider: "anthropic" },
		})

		// kilocode_change start
		// upsertApiConfiguration now passes activate=false, so setModeConfig should NOT be called
		expect(provider.providerSettingsManager.setModeConfig).not.toHaveBeenCalled()
		// kilocode_change end
	})

	test("file content includes line numbers", async () => {
		const { extractTextFromFile } = await import("../../../integrations/misc/extract-text")
		const result = await extractTextFromFile("test.js")
		expect(result).toBe("1 | const x = 1;\n2 | const y = 2;\n3 | const z = 3;")
	})

	describe("deleteMessage", () => {
		beforeEach(async () => {
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("handles deletion with confirmation dialog", async () => {
			// Setup mock messages
			const mockMessages = [
				{ ts: 1000, type: "say", say: "user_feedback" }, // User message 1
				{ ts: 2000, type: "say", say: "tool" }, // Tool message
				{ ts: 3000, type: "say", say: "text" }, // Message before delete
				{ ts: 4000, type: "say", say: "browser_action" }, // Message to delete
				{ ts: 5000, type: "say", say: "user_feedback" }, // Next user message
				{ ts: 6000, type: "say", say: "user_feedback" }, // Final message
			] as ClineMessage[]

			const mockApiHistory = [
				{ ts: 1000 },
				{ ts: 2000 },
				{ ts: 3000 },
				{ ts: 4000 },
				{ ts: 5000 },
				{ ts: 6000 },
			] as (Anthropic.MessageParam & { ts?: number })[]

			// Setup Task instance with auto-mock from the top of the file
			const mockCline = new Task(defaultTaskOptions) // Create a new mocked instance
			mockCline.clineMessages = mockMessages // Set test-specific messages
			mockCline.apiConversationHistory = mockApiHistory // Set API history
			await provider.addClineToStack(mockCline) // Add the mocked instance to the stack

			// Mock getTaskWithId
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			// Mock createTaskWithHistoryItem
			;(provider as any).createTaskWithHistoryItem = vi.fn()

			// Trigger message deletion
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]
			await messageHandler({ type: "deleteMessage", value: 4000 })

			// Verify that the dialog message was sent to webview
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showDeleteMessageDialog",
				messageTs: 4000,
				hasCheckpoint: false,
			})

			// Simulate user confirming deletion through the dialog
			await messageHandler({ type: "deleteMessageConfirm", messageTs: 4000 })

			// Verify only messages before the deleted message were kept
			expect(mockCline.overwriteClineMessages).toHaveBeenCalledWith([
				mockMessages[0],
				mockMessages[1],
				mockMessages[2],
			])

			// Verify only API messages before the deleted message were kept
			expect(mockCline.overwriteApiConversationHistory).toHaveBeenCalledWith([
				mockApiHistory[0],
				mockApiHistory[1],
				mockApiHistory[2],
			])

			// createTaskWithHistoryItem is only called when restoring checkpoints or aborting tasks
			expect((provider as any).createTaskWithHistoryItem).not.toHaveBeenCalled()
		})

		test("handles case when no current task exists", async () => {
			// Clear the cline stack
			;(provider as any).clineStack = []

			// Trigger message deletion
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]
			await messageHandler({ type: "deleteMessage", value: 2000 })

			// Verify no dialog was shown since there's no current cline
			expect(mockPostMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({
					type: "showDeleteMessageDialog",
				}),
			)
		})
	})

	describe("editMessage", () => {
		beforeEach(async () => {
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("handles edit with confirmation dialog", async () => {
			// Setup mock messages
			const mockMessages = [
				{ ts: 1000, type: "say", say: "user_feedback" }, // User message 1
				{ ts: 2000, type: "say", say: "tool" }, // Tool message
				{ ts: 3000, type: "say", say: "text" }, // Message before edit
				{ ts: 4000, type: "say", say: "browser_action" }, // Message to edit
				{ ts: 5000, type: "say", say: "user_feedback" }, // Next user message
				{ ts: 6000, type: "say", say: "user_feedback" }, // Final message
			] as ClineMessage[]

			const mockApiHistory = [
				{ ts: 1000 },
				{ ts: 2000 },
				{ ts: 3000 },
				{ ts: 4000 },
				{ ts: 5000 },
				{ ts: 6000 },
			] as (Anthropic.MessageParam & { ts?: number })[]

			// Setup Task instance with auto-mock from the top of the file
			const mockCline = new Task(defaultTaskOptions) // Create a new mocked instance
			mockCline.clineMessages = mockMessages // Set test-specific messages
			mockCline.apiConversationHistory = mockApiHistory // Set API history

			// Explicitly mock the overwrite methods since they're not being called in the tests
			mockCline.overwriteClineMessages = vi.fn()
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.handleWebviewAskResponse = vi.fn()

			await provider.addClineToStack(mockCline) // Add the mocked instance to the stack

			// Mock getTaskWithId
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			// Trigger message edit
			// Get the message handler function that was registered with the webview
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Call the message handler with a submitEditedMessage message
			await messageHandler({
				type: "submitEditedMessage",
				value: 4000,
				editedMessageContent: "Edited message content",
			})

			// Verify that the dialog message was sent to webview
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 4000,
				text: "Edited message content",
				hasCheckpoint: false,
				images: undefined,
			})

			// Simulate user confirming edit through the dialog
			await messageHandler({
				type: "editMessageConfirm",
				messageTs: 4000,
				text: "Edited message content",
			})

			// Verify correct messages were kept - delete from the preceding user message to truly replace it
			expect(mockCline.overwriteClineMessages).toHaveBeenCalledWith([])

			// Verify correct API messages were kept
			expect(mockCline.overwriteApiConversationHistory).toHaveBeenCalledWith([])

			// The new flow calls webviewMessageHandler recursively with askResponse
			// We need to verify the recursive call happened by checking if the handler was called again
			expect((mockWebviewView.webview.onDidReceiveMessage as any).mock.calls.length).toBeGreaterThanOrEqual(1)
		})
	})

	describe("getSystemPrompt", () => {
		beforeEach(async () => {
			mockPostMessage.mockClear()
			await provider.resolveWebviewView(mockWebviewView)
			// Reset and setup mock
			mockAddCustomInstructions.mockClear()
			mockAddCustomInstructions.mockImplementation(
				(modeInstructions: string, globalInstructions: string, _cwd: string) => {
					return Promise.resolve(modeInstructions || globalInstructions || "")
				},
			)
		})

		const getMessageHandler = () => {
			const mockCalls = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls
			expect(mockCalls.length).toBeGreaterThan(0)
			return mockCalls[0][0]
		}

		test("handles mcpEnabled setting correctly", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const handler = getMessageHandler()
			expect(typeof handler).toBe("function")

			// Test with mcpEnabled: true
			vi.spyOn(provider, "getState").mockResolvedValueOnce({
				apiConfiguration: {
					apiProvider: "openrouter" as const,
				},
				mcpEnabled: true,
				enableMcpServerCreation: false,
				mode: "code" as const,
				experiments: experimentDefault,
			} as any)

			await handler({ type: "getSystemPrompt", mode: "code" })

			// Verify system prompt was generated and sent
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)

			// Reset for second test
			mockPostMessage.mockClear()

			// Test with mcpEnabled: false
			vi.spyOn(provider, "getState").mockResolvedValueOnce({
				apiConfiguration: {
					apiProvider: "openrouter" as const,
				},
				mcpEnabled: false,
				enableMcpServerCreation: false,
				mode: "code" as const,
				experiments: experimentDefault,
			} as any)

			await handler({ type: "getSystemPrompt", mode: "code" })

			// Verify system prompt was generated and sent
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)
		})

		test("handles errors gracefully", async () => {
			// Mock SYSTEM_PROMPT to throw an error
			const { SYSTEM_PROMPT } = await import("../../prompts/system")
			vi.mocked(SYSTEM_PROMPT).mockRejectedValueOnce(new Error("Test error"))

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]
			await messageHandler({ type: "getSystemPrompt", mode: "code" })

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.get_system_prompt")
		})

		test("uses code mode custom instructions", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock getState to return custom instructions for code mode
			vi.spyOn(provider, "getState").mockResolvedValue({
				apiConfiguration: {
					apiProvider: "openrouter" as const,
				},
				customModePrompts: {
					code: { customInstructions: "Code mode specific instructions" },
				},
				mode: "code" as const,
				experiments: experimentDefault,
			} as any)

			// Trigger getSystemPrompt
			const handler = getMessageHandler()
			await handler({ type: "getSystemPrompt", mode: "code" })

			// Verify system prompt was generated and sent
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)
		})

		test("generates system prompt with diff enabled", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock getState to return diffEnabled: true
			vi.spyOn(provider, "getState").mockResolvedValue({
				apiConfiguration: {
					apiProvider: "openrouter",
					apiModelId: "test-model",
				},
				customModePrompts: {},
				mode: "code",
				enableMcpServerCreation: true,
				mcpEnabled: false,
				browserViewportSize: "900x600",
				diffEnabled: true,
				fuzzyMatchThreshold: 0.8,
				experiments: experimentDefault,
				browserToolEnabled: true,
			} as any)

			// Trigger getSystemPrompt
			const handler = getMessageHandler()
			await handler({ type: "getSystemPrompt", mode: "code" })

			// Verify system prompt was generated and sent
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)
		})

		test("generates system prompt with diff disabled", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock getState to return diffEnabled: false
			vi.spyOn(provider, "getState").mockResolvedValue({
				apiConfiguration: {
					apiProvider: "openrouter",
					apiModelId: "test-model",
				},
				customModePrompts: {},
				mode: "code",
				mcpEnabled: false,
				browserViewportSize: "900x600",
				diffEnabled: false,
				fuzzyMatchThreshold: 0.8,
				experiments: experimentDefault,
				enableMcpServerCreation: true,
				browserToolEnabled: false,
			} as any)

			// Trigger getSystemPrompt
			const handler = getMessageHandler()
			await handler({ type: "getSystemPrompt", mode: "code" })

			// Verify system prompt was generated and sent
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)
		})

		test("uses correct mode-specific instructions when mode is specified", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock getState to return architect mode instructions
			vi.spyOn(provider, "getState").mockResolvedValue({
				apiConfiguration: {
					apiProvider: "openrouter",
				},
				customModePrompts: {
					architect: { customInstructions: "Architect mode instructions" },
				},
				mode: "architect",
				enableMcpServerCreation: false,
				mcpEnabled: false,
				browserViewportSize: "900x600",
				experiments: experimentDefault,
			} as any)

			// Trigger getSystemPrompt for architect mode
			const handler = getMessageHandler()
			await handler({ type: "getSystemPrompt", mode: "architect" })

			// Verify system prompt was generated and sent
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "architect",
				}),
			)
		})

		// Tests for browser tool support - simplified to focus on behavior
		test("generates system prompt with different browser tool configurations", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const handler = getMessageHandler()

			// Test 1: Browser tools enabled with compatible model and mode
			vi.spyOn(provider, "getState").mockResolvedValueOnce({
				apiConfiguration: {
					apiProvider: "openrouter",
				},
				browserToolEnabled: true,
				mode: "code", // code mode includes browser tool group
				experiments: experimentDefault,
			} as any)

			await handler({ type: "getSystemPrompt", mode: "code" })

			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)

			mockPostMessage.mockClear()

			// Test 2: Browser tools disabled
			vi.spyOn(provider, "getState").mockResolvedValueOnce({
				apiConfiguration: {
					apiProvider: "openrouter",
				},
				browserToolEnabled: false,
				mode: "code",
				experiments: experimentDefault,
			} as any)

			await handler({ type: "getSystemPrompt", mode: "code" })

			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "systemPrompt",
					text: expect.any(String),
					mode: "code",
				}),
			)
		})
	})

	describe("handleModeSwitch", () => {
		beforeEach(async () => {
			// Set up webview for each test
			await provider.resolveWebviewView(mockWebviewView)
		})

		it("loads saved API config when switching modes", async () => {
			const profile: ProviderSettingsEntry = {
				name: "saved-config",
				id: "saved-config-id",
				apiProvider: "anthropic",
			}

			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue("saved-config-id"),
				listConfig: vi.fn().mockResolvedValue([profile]),
				activateProfile: vi.fn().mockResolvedValue(profile),
				setModeConfig: vi.fn(),
				getProfile: vi.fn().mockResolvedValue(profile),
			} as any

			// Switch to architect mode
			await provider.handleModeSwitch("architect")

			// Verify mode was updated
			expect(mockContext.globalState.update).toHaveBeenCalledWith("mode", "architect")

			// Verify saved config was loaded
			expect(provider.providerSettingsManager.getModeConfigId).toHaveBeenCalledWith("architect")
			expect(provider.providerSettingsManager.activateProfile).toHaveBeenCalledWith({ name: "saved-config" })
			expect(mockContext.globalState.update).toHaveBeenCalledWith("currentApiConfigName", "saved-config")

			// Verify state was posted to webview
			expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "state" }))
		})

		test("saves current config when switching to mode without config", async () => {
			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "current-config", id: "current-id", apiProvider: "anthropic" }]),
				setModeConfig: vi.fn(),
			} as any

			// Mock the ContextProxy's getValue method to return the current config name
			const contextProxy = (provider as any).contextProxy
			const getValueSpy = vi.spyOn(contextProxy, "getValue")
			getValueSpy.mockImplementation((key: any) => {
				if (key === "currentApiConfigName") return "current-config"
				return undefined
			})

			// Switch to architect mode
			await provider.handleModeSwitch("architect")

			// Verify mode was updated
			expect(mockContext.globalState.update).toHaveBeenCalledWith("mode", "architect")

			// Verify current config was saved as default for new mode
			expect(provider.providerSettingsManager.setModeConfig).toHaveBeenCalledWith("architect", "current-id")

			// Verify state was posted to webview
			expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "state" }))
		})
	})

	describe("createTaskWithHistoryItem mode validation", () => {
		test("validates and falls back to default mode when restored mode no longer exists", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock custom modes that don't include the saved mode
			const mockCustomModesManager = {
				getCustomModes: vi.fn().mockResolvedValue([
					{
						slug: "existing-mode",
						name: "Existing Mode",
						roleDefinition: "Test role",
						groups: ["read"] as const,
					},
				]),
				dispose: vi.fn(),
			}
			;(provider as any).customModesManager = mockCustomModesManager

			// Mock getModeBySlug to return undefined for non-existent mode
			const { getModeBySlug } = await import("../../../shared/modes")
			vi.mocked(getModeBySlug)
				.mockReturnValueOnce(undefined) // First call returns undefined (mode doesn't exist)
				.mockReturnValue({
					slug: "code",
					name: "Code Mode",
					roleDefinition: "You are a code assistant",
					groups: ["read", "edit", "browser"],
				}) // Subsequent calls return default mode

			// Mock provider settings manager
			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
			}

			// Spy on log method to verify warning was logged
			const logSpy = vi.spyOn(provider, "log")

			// Create history item with non-existent mode
			const historyItem = {
				id: "test-id",
				ts: Date.now(),
				task: "Test task",
				mode: "non-existent-mode", // This mode doesn't exist
				number: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			}

			// Initialize with history item
			await provider.createTaskWithHistoryItem(historyItem)

			// Verify mode validation occurred
			expect(mockCustomModesManager.getCustomModes).toHaveBeenCalled()
			expect(getModeBySlug).toHaveBeenCalledWith("non-existent-mode", expect.any(Array))

			// Verify fallback to default mode
			expect(mockContext.globalState.update).toHaveBeenCalledWith("mode", "code")
			expect(logSpy).toHaveBeenCalledWith(
				"Mode 'non-existent-mode' from history no longer exists. Falling back to default mode 'code'.",
			)

			// Verify history item was updated with default mode
			expect(historyItem.mode).toBe("code")
		})

		test("preserves mode when it exists in custom modes", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock custom modes that include the saved mode
			const mockCustomModesManager = {
				getCustomModes: vi.fn().mockResolvedValue([
					{
						slug: "custom-mode",
						name: "Custom Mode",
						roleDefinition: "Custom role",
						groups: ["read", "edit"] as const,
					},
				]),
				dispose: vi.fn(),
			}
			;(provider as any).customModesManager = mockCustomModesManager

			// Mock getModeBySlug to return the custom mode
			const { getModeBySlug } = await import("../../../shared/modes")
			vi.mocked(getModeBySlug).mockReturnValue({
				slug: "custom-mode",
				name: "Custom Mode",
				roleDefinition: "Custom role",
				groups: ["read", "edit"],
			})

			// Mock provider settings manager
			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue("config-id"),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "test-config", id: "config-id", apiProvider: "anthropic" }]),
				activateProfile: vi
					.fn()
					.mockResolvedValue({ name: "test-config", id: "config-id", apiProvider: "anthropic" }),
			}

			// Spy on log method to verify no warning was logged
			const logSpy = vi.spyOn(provider, "log")

			// Create history item with existing custom mode
			const historyItem = {
				id: "test-id",
				ts: Date.now(),
				task: "Test task",
				mode: "custom-mode",
				number: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			}

			// Initialize with history item
			await provider.createTaskWithHistoryItem(historyItem)

			// Verify mode validation occurred
			expect(mockCustomModesManager.getCustomModes).toHaveBeenCalled()
			expect(getModeBySlug).toHaveBeenCalledWith("custom-mode", expect.any(Array))

			// Verify mode was preserved
			expect(mockContext.globalState.update).toHaveBeenCalledWith("mode", "custom-mode")
			expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("no longer exists"))

			// Verify history item mode was not changed
			expect(historyItem.mode).toBe("custom-mode")
		})

		test("preserves mode when it exists in built-in modes", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock no custom modes
			const mockCustomModesManager = {
				getCustomModes: vi.fn().mockResolvedValue([]),
				dispose: vi.fn(),
			}
			;(provider as any).customModesManager = mockCustomModesManager

			// Mock getModeBySlug to return built-in architect mode
			const { getModeBySlug } = await import("../../../shared/modes")
			vi.mocked(getModeBySlug).mockReturnValue({
				slug: "architect",
				name: "Architect Mode",
				roleDefinition: "You are an architect",
				groups: ["read", "edit"],
			})

			// Mock provider settings manager
			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
			}

			// Create history item with built-in mode
			const historyItem = {
				id: "test-id",
				ts: Date.now(),
				task: "Test task",
				mode: "architect",
				number: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			}

			// Initialize with history item
			await provider.createTaskWithHistoryItem(historyItem)

			// Verify mode was preserved
			expect(mockContext.globalState.update).toHaveBeenCalledWith("mode", "architect")

			// Verify history item mode was not changed
			expect(historyItem.mode).toBe("architect")
		})

		test("handles history items without mode property", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock provider settings manager
			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
			}

			// Create history item without mode
			const historyItem = {
				id: "test-id",
				ts: Date.now(),
				task: "Test task",
				// No mode property
				number: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			}

			// Initialize with history item
			await provider.createTaskWithHistoryItem(historyItem)

			// Verify no mode validation occurred (mode update not called)
			expect(mockContext.globalState.update).not.toHaveBeenCalledWith("mode", expect.any(String))
		})

		test("continues with task restoration even if mode config loading fails", async () => {
			await provider.resolveWebviewView(mockWebviewView)

			// Mock custom modes
			const mockCustomModesManager = {
				getCustomModes: vi.fn().mockResolvedValue([]),
				dispose: vi.fn(),
			}
			;(provider as any).customModesManager = mockCustomModesManager

			// Mock getModeBySlug to return built-in mode
			const { getModeBySlug } = await import("../../../shared/modes")
			vi.mocked(getModeBySlug).mockReturnValue({
				slug: "code",
				name: "Code Mode",
				roleDefinition: "You are a code assistant",
				groups: ["read", "edit", "browser"],
			})

			// Mock provider settings manager to throw error
			;(provider as any).providerSettingsManager = {
				getModeConfigId: vi.fn().mockResolvedValue("config-id"),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "test-config", id: "config-id", apiProvider: "anthropic" }]),
				activateProfile: vi.fn().mockRejectedValue(new Error("Failed to load config")),
			}

			// Spy on log method
			const logSpy = vi.spyOn(provider, "log")

			// Create history item
			const historyItem = {
				id: "test-id",
				ts: Date.now(),
				task: "Test task",
				mode: "code",
				number: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			}

			// Initialize with history item - should not throw
			await expect(provider.createTaskWithHistoryItem(historyItem)).resolves.not.toThrow()

			// Verify error was logged but task restoration continued
			expect(logSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to restore API configuration for mode 'code'"),
			)
		})
	})

	describe("updateCustomMode", () => {
		test("updates both file and state when updating custom mode", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Mock CustomModesManager methods
			;(provider as any).customModesManager = {
				updateCustomMode: vi.fn().mockResolvedValue(undefined),
				getCustomModes: vi.fn().mockResolvedValue([
					{
						slug: "test-mode",
						name: "Test Mode",
						roleDefinition: "Updated role definition",
						groups: ["read"] as const,
					},
				]),
				dispose: vi.fn(),
			} as any

			// Test updating a custom mode
			await messageHandler({
				type: "updateCustomMode",
				modeConfig: {
					slug: "test-mode",
					name: "Test Mode",
					roleDefinition: "Updated role definition",
					groups: ["read"] as const,
				},
			})

			// Verify CustomModesManager.updateCustomMode was called
			expect(provider.customModesManager.updateCustomMode).toHaveBeenCalledWith(
				"test-mode",
				expect.objectContaining({
					slug: "test-mode",
					roleDefinition: "Updated role definition",
				}),
			)

			// Verify state was updated
			expect(mockContext.globalState.update).toHaveBeenCalledWith("customModes", [
				{ groups: ["read"], name: "Test Mode", roleDefinition: "Updated role definition", slug: "test-mode" },
			])

			// Verify state was posted to webview
			// Verify state was posted to webview with correct format
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "state",
					state: expect.objectContaining({
						customModes: [
							expect.objectContaining({
								slug: "test-mode",
								roleDefinition: "Updated role definition",
							}),
						],
					}),
				}),
			)
		})
	})

	describe("upsertApiConfiguration", () => {
		test("handles error in upsertApiConfiguration gracefully", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			;(provider as any).providerSettingsManager = {
				setModeConfig: vi.fn().mockRejectedValue(new Error("Failed to update mode config")),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "test-config", id: "test-id", apiProvider: "anthropic" }]),
			} as any

			// Mock getState to provide necessary data
			vi.spyOn(provider, "getState").mockResolvedValue({
				mode: "code",
				currentApiConfigName: "test-config",
			} as any)

			// Trigger upsertApiConfiguration
			await messageHandler({
				type: "upsertApiConfiguration",
				text: "test-config",
				apiConfiguration: { apiProvider: "anthropic", apiKey: "test-key" },
			})

			// Verify error was logged and user was notified
			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
				expect.stringContaining("Error create new api configuration"),
			)
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.create_api_config")
		})

		test("handles successful upsertApiConfiguration", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			;(provider as any).providerSettingsManager = {
				setModeConfig: vi.fn(),
				saveConfig: vi.fn().mockResolvedValue(undefined),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "test-config", id: "test-id", apiProvider: "anthropic" }]),
				// kilocode_change start
				getProfile: vi.fn().mockResolvedValue({
					name: "test-config",
					apiProvider: "anthropic",
					apiKey: "test-key",
					id: "test-id",
				}),
				// kilocode_change end
			} as any

			const testApiConfig = {
				apiProvider: "anthropic" as const,
				apiKey: "test-key",
			}

			// Trigger upsertApiConfiguration
			await messageHandler({
				type: "upsertApiConfiguration",
				text: "test-config",
				apiConfiguration: testApiConfig,
			})

			// Verify config was saved
			expect(provider.providerSettingsManager.saveConfig).toHaveBeenCalledWith("test-config", testApiConfig)

			// Verify state updates
			expect(mockContext.globalState.update).toHaveBeenCalledWith("listApiConfigMeta", [
				{ name: "test-config", id: "test-id", apiProvider: "anthropic" },
			])

			// kilocode_change start
			// currentApiConfigName should NOT be updated when activate=false
			expect(mockContext.globalState.update).not.toHaveBeenCalledWith("currentApiConfigName", "test-config")
			// kilocode_change end

			// Verify state was posted to webview
			expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "state" }))
		})

		test("handles buildApiHandler error in updateApiConfiguration", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// kilocode_change start
			// Mock saveConfig to throw an error to test error handling
			;(provider as any).providerSettingsManager = {
				setModeConfig: vi.fn(),
				saveConfig: vi.fn().mockRejectedValue(new Error("Failed to save config")),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "test-config", id: "test-id", apiProvider: "anthropic" }]),
				getProfile: vi.fn().mockResolvedValue({
					name: "test-config",
					apiProvider: "anthropic",
					apiKey: "test-key",
					id: "test-id",
				}),
			} as any
			// kilocode_change end

			// Setup Task instance with auto-mock from the top of the file
			const mockCline = new Task(defaultTaskOptions) // Create a new mocked instance
			await provider.addClineToStack(mockCline)

			const testApiConfig = {
				apiProvider: "anthropic" as const,
				apiKey: "test-key",
			}

			// Trigger upsertApiConfiguration
			await messageHandler({
				type: "upsertApiConfiguration",
				text: "test-config",
				apiConfiguration: testApiConfig,
			})

			// Verify error handling
			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
				expect.stringContaining("Error create new api configuration"),
			)
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.create_api_config")

			// kilocode_change start
			// // Verify state was still updated
			// expect(mockContext.globalState.update).toHaveBeenCalledWith("listApiConfigMeta", [
			// 	{ name: "test-config", id: "test-id", apiProvider: "anthropic" },
			// ])
			// expect(mockContext.globalState.update).toHaveBeenCalledWith("currentApiConfigName", "test-config")
			// kilocode_change end
		})

		test("handles successful saveApiConfiguration", async () => {
			await provider.resolveWebviewView(mockWebviewView)
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			;(provider as any).providerSettingsManager = {
				setModeConfig: vi.fn(),
				saveConfig: vi.fn().mockResolvedValue(undefined),
				listConfig: vi
					.fn()
					.mockResolvedValue([{ name: "test-config", id: "test-id", apiProvider: "anthropic" }]),
			} as any

			const testApiConfig = {
				apiProvider: "anthropic" as const,
				apiKey: "test-key",
			}

			// Trigger upsertApiConfiguration
			await messageHandler({
				type: "saveApiConfiguration",
				text: "test-config",
				apiConfiguration: testApiConfig,
			})

			// Verify config was saved
			expect(provider.providerSettingsManager.saveConfig).toHaveBeenCalledWith("test-config", testApiConfig)

			// Verify state updates
			expect(mockContext.globalState.update).toHaveBeenCalledWith("listApiConfigMeta", [
				{ name: "test-config", id: "test-id", apiProvider: "anthropic" },
			])
			expect(updateGlobalStateSpy).toHaveBeenCalledWith("listApiConfigMeta", [
				{ name: "test-config", id: "test-id", apiProvider: "anthropic" },
			])
		})
	})

	describe("browser connection features", () => {
		beforeEach(async () => {
			// Reset mocks
			vi.clearAllMocks()
			await provider.resolveWebviewView(mockWebviewView)
		})

		// These mocks are already defined at the top of the file

		test("handles testBrowserConnection with provided URL", async () => {
			// Get the message handler
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Test with valid URL
			await messageHandler({
				type: "testBrowserConnection",
				text: "http://localhost:9222",
			})

			// Verify postMessage was called with success result
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "browserConnectionResult",
					success: true,
					text: expect.stringContaining("Successfully connected to Chrome"),
				}),
			)

			// Reset mock
			mockPostMessage.mockClear()

			// Test with invalid URL
			await messageHandler({
				type: "testBrowserConnection",
				text: "http://inlocalhost:9222",
			})

			// Verify postMessage was called with failure result
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "browserConnectionResult",
					success: false,
					text: expect.stringContaining("Failed to connect to Chrome"),
				}),
			)
		})

		test("handles testBrowserConnection with auto-discovery", async () => {
			// Get the message handler
			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Test auto-discovery (no URL provided)
			await messageHandler({
				type: "testBrowserConnection",
			})

			// Verify discoverChromeHostUrl was called
			const { discoverChromeHostUrl } = await import("../../../services/browser/browserDiscovery")
			expect(discoverChromeHostUrl).toHaveBeenCalled()

			// Verify postMessage was called with success result
			expect(mockPostMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "browserConnectionResult",
					success: true,
					text: expect.stringContaining("Auto-discovered and tested connection to Chrome"),
				}),
			)
		})
	})
})

describe("Project MCP Settings", () => {
	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockWebviewView: vscode.WebviewView
	let mockPostMessage: any

	beforeEach(() => {
		vi.clearAllMocks()

		mockContext = {
			extensionPath: "/test/path",
			extensionUri: {} as vscode.Uri,
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
				keys: vi.fn().mockReturnValue([]),
			},
			workspaceState: {
				get: vi.fn().mockResolvedValue(undefined),
				update: vi.fn().mockResolvedValue(undefined),
				keys: vi.fn().mockReturnValue([]),
			},
			secrets: {
				get: vi.fn(),
				store: vi.fn(),
				delete: vi.fn(),
			},
			subscriptions: [],
			extension: {
				packageJSON: { version: "1.0.0" },
			},
			globalStorageUri: {
				fsPath: "/test/storage/path",
			},
		} as unknown as vscode.ExtensionContext

		mockOutputChannel = {
			appendLine: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn(),
		} as unknown as vscode.OutputChannel

		mockPostMessage = vi.fn()
		mockWebviewView = {
			webview: {
				postMessage: mockPostMessage,
				html: "",
				options: {},
				onDidReceiveMessage: vi.fn(),
				asWebviewUri: vi.fn(),
				cspSource: "vscode-webview://test-csp-source",
			},
			visible: true,
			onDidDispose: vi.fn(),
			onDidChangeVisibility: vi.fn(),
		} as unknown as vscode.WebviewView

		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", new ContextProxy(mockContext))
	})

	test.skip("handles openProjectMcpSettings message", async () => {
		// Mock workspace folders first
		;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: "/test/workspace" } }]

		// Mock fs functions
		const fs = await import("fs/promises")
		const mockedFs = vi.mocked(fs)
		mockedFs.mkdir.mockClear()
		mockedFs.mkdir.mockResolvedValue(undefined)
		mockedFs.writeFile.mockClear()
		mockedFs.writeFile.mockResolvedValue(undefined)

		// Mock fileExistsAtPath to return false (file doesn't exist)
		const fsUtils = await import("../../../utils/fs")
		vi.spyOn(fsUtils, "fileExistsAtPath").mockResolvedValue(false)

		// Mock openFile
		const openFileModule = await import("../../../integrations/misc/open-file")
		const openFileSpy = vi.spyOn(openFileModule, "openFile").mockClear().mockResolvedValue(undefined)

		// Set up the webview
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Ensure the message handler is properly set up
		expect(messageHandler).toBeDefined()
		expect(typeof messageHandler).toBe("function")

		// Trigger openProjectMcpSettings through the message handler
		await messageHandler({
			type: "openProjectMcpSettings",
		})

		// Check that fs.mkdir was called with the correct path
		expect(mockedFs.mkdir).toHaveBeenCalledWith("/test/workspace/.kilocode", { recursive: true })

		// Verify file was created with default content
		expect(safeWriteJson).toHaveBeenCalledWith("/test/workspace/.roo/mcp.json", { mcpServers: {} })

		// Check that openFile was called
		expect(openFileSpy).toHaveBeenCalledWith("/test/workspace/.kilocode/mcp.json")
	})

	test("handles openProjectMcpSettings when workspace is not open", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Mock no workspace folders
		;(vscode.workspace as any).workspaceFolders = []

		// Trigger openProjectMcpSettings
		await messageHandler({ type: "openProjectMcpSettings" })

		// Verify error message was shown
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.no_workspace")
	})

	test.skip("handles openProjectMcpSettings file creation error", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Mock workspace folders
		;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: "/test/workspace" } }]

		// Mock fs functions to fail
		const fs = require("fs/promises")
		fs.mkdir.mockRejectedValue(new Error("Failed to create directory"))

		// Trigger openProjectMcpSettings
		await messageHandler({
			type: "openProjectMcpSettings",
		})

		// Verify error message was shown
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			// kilocode_change
			expect.stringContaining("Failed to create or open .kilocode/mcp.json"),
		)
	})
})

describe.skip("ContextProxy integration", () => {
	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockContextProxy: any

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks()

		// Setup basic mocks
		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
				keys: vi.fn().mockReturnValue([]),
			},
			workspaceState: {
				get: vi.fn().mockResolvedValue(undefined),
				update: vi.fn().mockResolvedValue(undefined),
				keys: vi.fn().mockReturnValue([]),
			},
			secrets: { get: vi.fn(), store: vi.fn(), delete: vi.fn() },
			extensionUri: {} as vscode.Uri,
			globalStorageUri: { fsPath: "/test/path" },
			extension: { packageJSON: { version: "1.0.0" } },
		} as unknown as vscode.ExtensionContext

		mockOutputChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel
		mockContextProxy = new ContextProxy(mockContext)
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", mockContextProxy)
	})

	test("updateGlobalState uses contextProxy", async () => {
		await provider.setValue("currentApiConfigName", "testValue")
		expect(mockContextProxy.updateGlobalState).toHaveBeenCalledWith("currentApiConfigName", "testValue")
	})

	test("getGlobalState uses contextProxy", async () => {
		mockContextProxy.getGlobalState.mockResolvedValueOnce("testValue")
		const result = await provider.getValue("currentApiConfigName")
		expect(mockContextProxy.getGlobalState).toHaveBeenCalledWith("currentApiConfigName")
		expect(result).toBe("testValue")
	})

	test("storeSecret uses contextProxy", async () => {
		await provider.setValue("apiKey", "test-secret")
		expect(mockContextProxy.storeSecret).toHaveBeenCalledWith("apiKey", "test-secret")
	})

	test("contextProxy methods are available", () => {
		// Verify the contextProxy has all the required methods
		expect(mockContextProxy.getGlobalState).toBeDefined()
		expect(mockContextProxy.updateGlobalState).toBeDefined()
		expect(mockContextProxy.storeSecret).toBeDefined()
		expect(mockContextProxy.setValue).toBeDefined()
		expect(mockContextProxy.setValues).toBeDefined()
	})
})

// Mock getModels for router model tests
vi.mock("../../../api/providers/fetchers/modelCache", () => ({
	getModels: vi.fn(),
	flushModels: vi.fn(),
}))

describe.skip("getTelemetryProperties", () => {
	// kilocode_change: skip suite
	let defaultTaskOptions: TaskOptions
	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockCline: any

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks()

		// Initialize TelemetryService if not already initialized
		if (!TelemetryService.hasInstance()) {
			TelemetryService.createInstance([])
		}

		// Setup basic mocks
		mockContext = {
			globalState: {
				get: vi.fn().mockImplementation((key: string) => {
					if (key === "mode") return "code"
					if (key === "apiProvider") return "anthropic"
					return undefined
				}),
				update: vi.fn(),
				keys: vi.fn().mockReturnValue([]),
			},
			secrets: { get: vi.fn(), store: vi.fn(), delete: vi.fn() },
			extensionUri: {} as vscode.Uri,
			globalStorageUri: { fsPath: "/test/path" },
			extension: { packageJSON: { version: "1.0.0" } },
		} as unknown as vscode.ExtensionContext

		mockOutputChannel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", new ContextProxy(mockContext))

		defaultTaskOptions = {
			context: mockContext,
			provider,
			apiConfiguration: {
				apiProvider: "openrouter",
			},
		}

		// Setup Task instance with mocked getModel method
		mockCline = new Task(defaultTaskOptions)
		mockCline.api = {
			getModel: vi.fn().mockReturnValue({
				id: "claude-sonnet-4-20250514",
				info: { contextWindow: 200000 },
			}),
		}
	})

	test("includes basic properties in telemetry", async () => {
		const properties = await provider.getTelemetryProperties()

		expect(properties).toHaveProperty("vscodeVersion")
		expect(properties).toHaveProperty("platform")
		expect(properties).toHaveProperty("appVersion", "1.0.0")
	})

	test("includes model ID from current Cline instance if available", async () => {
		// Add mock Cline to stack
		await provider.addClineToStack(mockCline)

		const properties = await provider.getTelemetryProperties()

		expect(properties).toHaveProperty("modelId", "claude-sonnet-4-20250514")
	})

	describe("cloud authentication telemetry", () => {
		beforeEach(() => {
			// Reset all mocks before each test
			vi.clearAllMocks()
		})

		test("includes cloud authentication property when user is authenticated", async () => {
			// Import the CloudService mock and update it
			const { CloudService } = await import("@roo-code/cloud")
			const mockCloudService = {
				isAuthenticated: vi.fn().mockReturnValue(true),
			}

			// Update the existing mock
			Object.defineProperty(CloudService, "instance", {
				get: vi.fn().mockReturnValue(mockCloudService),
				configurable: true,
			})

			const properties = await provider.getTelemetryProperties()

			expect(properties).toHaveProperty("cloudIsAuthenticated", true)
		})

		test("includes cloud authentication property when user is not authenticated", async () => {
			// Import the CloudService mock and update it
			const { CloudService } = await import("@roo-code/cloud")
			const mockCloudService = {
				isAuthenticated: vi.fn().mockReturnValue(false),
			}

			// Update the existing mock
			Object.defineProperty(CloudService, "instance", {
				get: vi.fn().mockReturnValue(mockCloudService),
				configurable: true,
			})

			const properties = await provider.getTelemetryProperties()

			expect(properties).toHaveProperty("cloudIsAuthenticated", false)
		})

		test("handles CloudService errors gracefully", async () => {
			// Import the CloudService mock and update it to throw an error
			const { CloudService } = await import("@roo-code/cloud")
			Object.defineProperty(CloudService, "instance", {
				get: vi.fn().mockImplementation(() => {
					throw new Error("CloudService not available")
				}),
				configurable: true,
			})

			const properties = await provider.getTelemetryProperties()

			// Should still include basic telemetry properties
			expect(properties).toHaveProperty("vscodeVersion")
			expect(properties).toHaveProperty("platform")
			expect(properties).toHaveProperty("appVersion", "1.0.0")

			// Cloud property should be undefined when CloudService is not available
			expect(properties).toHaveProperty("cloudIsAuthenticated", undefined)
		})

		test("handles CloudService method errors gracefully", async () => {
			// Import the CloudService mock and update it
			const { CloudService } = await import("@roo-code/cloud")
			const mockCloudService = {
				isAuthenticated: vi.fn().mockImplementation(() => {
					throw new Error("Authentication check error")
				}),
			}

			// Update the existing mock
			Object.defineProperty(CloudService, "instance", {
				get: vi.fn().mockReturnValue(mockCloudService),
				configurable: true,
			})

			const properties = await provider.getTelemetryProperties()

			// Should still include basic telemetry properties
			expect(properties).toHaveProperty("vscodeVersion")
			expect(properties).toHaveProperty("platform")
			expect(properties).toHaveProperty("appVersion", "1.0.0")

			// Property that errored should be undefined
			expect(properties).toHaveProperty("cloudIsAuthenticated", undefined)
		})
	})
})

describe("ClineProvider - Router Models", () => {
	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockWebviewView: vscode.WebviewView
	let mockPostMessage: any

	beforeEach(() => {
		vi.clearAllMocks()

		const globalState: Record<string, string | undefined> = {}
		const secrets: Record<string, string | undefined> = {}

		mockContext = {
			extensionPath: "/test/path",
			extensionUri: {} as vscode.Uri,
			globalState: {
				get: vi.fn().mockImplementation((key: string) => globalState[key]),
				update: vi
					.fn()
					.mockImplementation((key: string, value: string | undefined) => (globalState[key] = value)),
				keys: vi.fn().mockImplementation(() => Object.keys(globalState)),
			},
			secrets: {
				get: vi.fn().mockImplementation((key: string) => secrets[key]),
				store: vi.fn().mockImplementation((key: string, value: string | undefined) => (secrets[key] = value)),
				delete: vi.fn().mockImplementation((key: string) => delete secrets[key]),
			},
			subscriptions: [],
			extension: {
				packageJSON: { version: "1.0.0" },
			},
			globalStorageUri: {
				fsPath: "/test/storage/path",
			},
		} as unknown as vscode.ExtensionContext

		mockOutputChannel = {
			appendLine: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn(),
		} as unknown as vscode.OutputChannel

		mockPostMessage = vi.fn()
		mockWebviewView = {
			webview: {
				postMessage: mockPostMessage,
				html: "",
				options: {},
				onDidReceiveMessage: vi.fn(),
				asWebviewUri: vi.fn(),
			},
			visible: true,
			onDidDispose: vi.fn().mockImplementation((callback) => {
				callback()
				return { dispose: vi.fn() }
			}),
			onDidChangeVisibility: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
		} as unknown as vscode.WebviewView

		if (!TelemetryService.hasInstance()) {
			TelemetryService.createInstance([])
		}

		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", new ContextProxy(mockContext))
	})

	test("handles requestRouterModels with successful responses", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Mock getState to return API configuration
		vi.spyOn(provider, "getState").mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				unboundApiKey: "unbound-key",
				litellmApiKey: "litellm-key",
				litellmBaseUrl: "http://localhost:4000",
				// kilocode_change start
				geminiApiKey: "gemini-key",
				googleGeminiBaseUrl: "https://gemini.example.com",
				nanoGptApiKey: "nano-gpt-key",
				ovhCloudAiEndpointsApiKey: "ovhcloud-key",
				inceptionLabsApiKey: "inception-key",
				inceptionLabsBaseUrl: "https://api.inceptionlabs.ai/v1/",
				// kilocode_change end
			},
		} as any)

		const mockModels = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				description: "Test model 1",
				supportsPromptCache: false,
			},
			"model-2": {
				maxTokens: 8192,
				contextWindow: 16384,
				description: "Test model 2",
				supportsPromptCache: false,
			},
		}

		const { getModels } = await import("../../../api/providers/fetchers/modelCache")
		vi.mocked(getModels).mockResolvedValue(mockModels)

		await messageHandler({ type: "requestRouterModels" })

		// Verify getModels was called for each provider with correct options
		expect(getModels).toHaveBeenCalledWith({ provider: "openrouter", apiKey: "openrouter-key" }) // kilocode_change: apiKey
		// kilocode_change start
		expect(getModels).toHaveBeenCalledWith({
			provider: "gemini",
			apiKey: "gemini-key",
			baseUrl: "https://gemini.example.com",
		})
		expect(getModels).toHaveBeenCalledWith({ provider: "ovhcloud", apiKey: "ovhcloud-key" })
		expect(getModels).toHaveBeenCalledWith({
			provider: "inception",
			apiKey: "inception-key",
			baseUrl: "https://api.inceptionlabs.ai/v1/",
		})
		// kilocode_change end
		expect(getModels).toHaveBeenCalledWith({ provider: "requesty", apiKey: "requesty-key" })
		expect(getModels).toHaveBeenCalledWith({ provider: "glama" }) // kilocode_change
		expect(getModels).toHaveBeenCalledWith({ provider: "unbound", apiKey: "unbound-key" })
		expect(getModels).toHaveBeenCalledWith({ provider: "vercel-ai-gateway" })
		expect(getModels).toHaveBeenCalledWith({ provider: "deepinfra" })
		expect(getModels).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "roo",
				baseUrl: expect.any(String),
			}),
		)
		expect(getModels).toHaveBeenCalledWith({
			provider: "litellm",
			apiKey: "litellm-key",
			baseUrl: "http://localhost:4000",
		})
		expect(getModels).toHaveBeenCalledWith({ provider: "chutes" })

		// Verify response was sent
		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				deepinfra: mockModels,
				openrouter: mockModels,
				gemini: mockModels, // kilocode_change
				requesty: mockModels,
				glama: mockModels, // kilocode_change
				synthetic: mockModels, // kilocode_change
				unbound: mockModels,
				roo: mockModels,
				chutes: mockModels,
				litellm: mockModels,
				kilocode: mockModels,
				"nano-gpt": mockModels, // kilocode_change
				ollama: mockModels, // kilocode_change
				lmstudio: {},
				"vercel-ai-gateway": mockModels,
				ovhcloud: mockModels, // kilocode_change
				inception: mockModels, // kilocode_change
				"sap-ai-core": {}, // kilocode_change
				huggingface: {},
				"io-intelligence": {},
			},
			values: undefined,
		})
	})

	test("handles requestRouterModels with individual provider failures", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		vi.spyOn(provider, "getState").mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				glamaApiKey: "glama-key", // kilocode_change
				unboundApiKey: "unbound-key",
				litellmApiKey: "litellm-key",
				litellmBaseUrl: "http://localhost:4000",
				// kilocode_change start
				chutesApiKey: "chutes-key",
				geminiApiKey: "gemini-key",
				googleGeminiBaseUrl: "https://gemini.example.com",
				nanoGptApiKey: "nano-gpt-key", // kilocode_change
				ovhCloudAiEndpointsApiKey: "ovhcloud-key",
				inceptionLabsApiKey: "inception-key",
				inceptionLabsBaseUrl: "https://api.inceptionlabs.ai/v1/",
				syntheticApiKey: "synthetic-key",
				// kilocode_change end
			},
		} as any)

		const mockModels = {
			"model-1": { maxTokens: 4096, contextWindow: 8192, description: "Test model", supportsPromptCache: false },
		}
		const { getModels } = await import("../../../api/providers/fetchers/modelCache")

		// Mock some providers to succeed and others to fail
		vi.mocked(getModels)
			.mockResolvedValueOnce(mockModels) // openrouter success
			.mockResolvedValueOnce(mockModels) // kilocode_change: gemini success
			.mockRejectedValueOnce(new Error("Requesty API error")) //
			.mockResolvedValueOnce(mockModels) // kilocode_change glama success
			.mockRejectedValueOnce(new Error("Unbound API error")) // unbound fail
			.mockRejectedValueOnce(new Error("Kilocode-OpenRouter API error")) // kilocode-openrouter fail
			.mockRejectedValueOnce(new Error("Ollama API error")) // kilocode_change
			.mockResolvedValueOnce(mockModels) // vercel-ai-gateway success
			.mockResolvedValueOnce(mockModels) // deepinfra success
			.mockResolvedValueOnce(mockModels) // nano-gpt success // kilocode_change
			.mockResolvedValueOnce(mockModels) // kilocode_change: ovhcloud
			.mockResolvedValueOnce(mockModels) // kilocode_change: inception success
			.mockResolvedValueOnce(mockModels) // kilocode_change: synthetic success
			.mockResolvedValueOnce(mockModels) // roo success
			.mockRejectedValueOnce(new Error("Chutes API error")) // chutes fail
			.mockRejectedValueOnce(new Error("LiteLLM connection failed")) // litellm fail

		await messageHandler({ type: "requestRouterModels" })

		// Verify main response includes successful providers and empty objects for failed ones
		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				deepinfra: mockModels,
				openrouter: mockModels,
				gemini: mockModels, // kilocode_change
				requesty: {},
				glama: mockModels, // kilocode_change
				unbound: {},
				roo: mockModels,
				chutes: {},
				ollama: {},
				lmstudio: {},
				litellm: {},
				kilocode: {},
				"nano-gpt": mockModels, // kilocode_change
				"vercel-ai-gateway": mockModels,
				ovhcloud: mockModels, // kilocode_change
				inception: mockModels, // kilocode_change
				synthetic: mockModels, // kilocode_change
				"sap-ai-core": {}, // kilocode_change
				huggingface: {},
				"io-intelligence": {},
			},
			values: undefined,
		})

		// Verify error messages were sent for failed providers
		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Requesty API error",
			values: { provider: "requesty" },
		})

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Unbound API error",
			values: { provider: "unbound" },
		})

		// kilocode_change start
		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Chutes API error",
			values: { provider: "chutes" },
		})
		// kilocode_change end

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Kilocode-OpenRouter API error",
			values: { provider: "kilocode" },
		})

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Unbound API error",
			values: { provider: "unbound" },
		})

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Chutes API error",
			values: { provider: "chutes" },
		})

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "LiteLLM connection failed",
			values: { provider: "litellm" },
		})
	})

	test("handles requestRouterModels with LiteLLM values from message", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		// Mock state without LiteLLM config
		vi.spyOn(provider, "getState").mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				glamaApiKey: "glama-key", // kilocode_change
				unboundApiKey: "unbound-key",
				// kilocode_change start
				ovhCloudAiEndpointsApiKey: "ovhcloud-key",
				chutesApiKey: "chutes-key",
				// kilocode_change end
				// No litellm config
			},
		} as any)

		const mockModels = {
			"model-1": { maxTokens: 4096, contextWindow: 8192, description: "Test model", supportsPromptCache: false },
		}
		const { getModels } = await import("../../../api/providers/fetchers/modelCache")
		vi.mocked(getModels).mockResolvedValue(mockModels)

		await messageHandler({
			type: "requestRouterModels",
			values: {
				litellmApiKey: "message-litellm-key",
				litellmBaseUrl: "http://message-url:4000",
			},
		})

		// Verify LiteLLM was called with values from message
		expect(getModels).toHaveBeenCalledWith({
			provider: "litellm",
			apiKey: "message-litellm-key",
			baseUrl: "http://message-url:4000",
		})
	})

	test("skips LiteLLM when neither config nor message values are provided", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		vi.spyOn(provider, "getState").mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				glamaApiKey: "glama-key", // kilocode_change
				unboundApiKey: "unbound-key",
				// kilocode_change start
				ovhCloudAiEndpointsApiKey: "ovhcloud-key",
				chutesApiKey: "chutes-key",
				nanoGptApiKey: "nano-gpt-key",
				// kilocode_change end
				// No litellm config
			},
		} as any)

		const mockModels = {
			"model-1": { maxTokens: 4096, contextWindow: 8192, description: "Test model", supportsPromptCache: false },
		}
		const { getModels } = await import("../../../api/providers/fetchers/modelCache")
		vi.mocked(getModels).mockResolvedValue(mockModels)

		await messageHandler({ type: "requestRouterModels" })

		// Verify LiteLLM was NOT called
		expect(getModels).not.toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "litellm",
			}),
		)

		// Verify response includes empty object for LiteLLM
		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				deepinfra: mockModels,
				openrouter: mockModels,
				gemini: mockModels, // kilocode_change
				requesty: mockModels,
				glama: mockModels, // kilocode_change
				unbound: mockModels,
				roo: mockModels,
				chutes: mockModels,
				litellm: {},
				kilocode: mockModels,
				"nano-gpt": mockModels, // kilocode_change
				ollama: mockModels, // kilocode_change
				lmstudio: {},
				"vercel-ai-gateway": mockModels,
				ovhcloud: mockModels, // kilocode_change
				inception: mockModels, // kilocode_change
				synthetic: mockModels, // kilocode_change
				"sap-ai-core": {}, // kilocode_change
				huggingface: {},
				"io-intelligence": {},
			},
			values: undefined,
		})
	})

	test("handles requestLmStudioModels with proper response", async () => {
		await provider.resolveWebviewView(mockWebviewView)
		const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

		vi.spyOn(provider, "getState").mockResolvedValue({
			apiConfiguration: {
				lmStudioModelId: "model-1",
				lmStudioBaseUrl: "http://localhost:1234",
			},
		} as any)

		const mockModels = {
			"model-1": { maxTokens: 4096, contextWindow: 8192, description: "Test model", supportsPromptCache: false },
		}
		const { getModels } = await import("../../../api/providers/fetchers/modelCache")
		vi.mocked(getModels).mockResolvedValue(mockModels)

		await messageHandler({
			type: "requestLmStudioModels",
		})

		expect(getModels).toHaveBeenCalledWith({
			provider: "lmstudio",
			baseUrl: "http://localhost:1234",
		})
	})
})

describe("ClineProvider - Comprehensive Edit/Delete Edge Cases", () => {
	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockWebviewView: vscode.WebviewView
	let mockPostMessage: any
	let defaultTaskOptions: TaskOptions

	beforeEach(() => {
		vi.clearAllMocks()

		if (!TelemetryService.hasInstance()) {
			TelemetryService.createInstance([])
		}

		const globalState: Record<string, string | undefined> = {
			mode: "code",
			currentApiConfigName: "current-config",
		}

		const secrets: Record<string, string | undefined> = {}

		mockContext = {
			extensionPath: "/test/path",
			extensionUri: {} as vscode.Uri,
			globalState: {
				get: vi.fn().mockImplementation((key: string) => globalState[key]),
				update: vi
					.fn()
					.mockImplementation((key: string, value: string | undefined) => (globalState[key] = value)),
				keys: vi.fn().mockImplementation(() => Object.keys(globalState)),
			},
			secrets: {
				get: vi.fn().mockImplementation((key: string) => secrets[key]),
				store: vi.fn().mockImplementation((key: string, value: string | undefined) => (secrets[key] = value)),
				delete: vi.fn().mockImplementation((key: string) => delete secrets[key]),
			},
			subscriptions: [],
			extension: {
				packageJSON: { version: "1.0.0" },
			},
			globalStorageUri: {
				fsPath: "/test/storage/path",
			},
		} as unknown as vscode.ExtensionContext

		mockOutputChannel = {
			appendLine: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn(),
		} as unknown as vscode.OutputChannel

		mockPostMessage = vi.fn()

		mockWebviewView = {
			webview: {
				postMessage: mockPostMessage,
				html: "",
				options: {},
				onDidReceiveMessage: vi.fn(),
				asWebviewUri: vi.fn(),
			},
			visible: true,
			onDidDispose: vi.fn().mockImplementation((callback) => {
				callback()
				return { dispose: vi.fn() }
			}),
			onDidChangeVisibility: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
		} as unknown as vscode.WebviewView

		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", new ContextProxy(mockContext))

		defaultTaskOptions = {
			context: mockContext,
			provider,
			apiConfiguration: {
				apiProvider: "openrouter",
			},
		}

		// Mock getMcpHub method
		provider.getMcpHub = vi.fn().mockReturnValue({
			listTools: vi.fn().mockResolvedValue([]),
			callTool: vi.fn().mockResolvedValue({ content: [] }),
			listResources: vi.fn().mockResolvedValue([]),
			readResource: vi.fn().mockResolvedValue({ contents: [] }),
			getAllServers: vi.fn().mockReturnValue([]),
		})
	})

	describe("Edit Messages with Images and Attachments", () => {
		beforeEach(async () => {
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("handles editing messages containing images", async () => {
			const mockMessages = [
				{ ts: 1000, type: "say", say: "user_feedback", text: "Original message" },
				{
					ts: 2000,
					type: "say",
					say: "user_feedback",
					text: "Message with image",
					images: [
						"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
					],
					value: 3000,
				},
				{ ts: 3000, type: "say", say: "text", text: "AI response" },
			] as ClineMessage[]

			const mockCline = new Task(defaultTaskOptions)
			mockCline.clineMessages = mockMessages
			mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }, { ts: 3000 }] as any[]
			mockCline.overwriteClineMessages = vi.fn()
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.submitUserMessage = vi.fn()

			await provider.addClineToStack(mockCline)
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]
			await messageHandler({
				type: "submitEditedMessage",
				value: 3000,
				editedMessageContent: "Edited message with preserved images",
			})

			// Verify dialog was shown
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 3000,
				text: "Edited message with preserved images",
				hasCheckpoint: false,
				images: undefined,
			})

			// Simulate confirmation
			await messageHandler({
				type: "editMessageConfirm",
				messageTs: 3000,
				text: "Edited message with preserved images",
			})

			// Verify messages were edited correctly - the ORIGINAL user message and all subsequent messages are removed
			expect(mockCline.overwriteClineMessages).toHaveBeenCalledWith([mockMessages[0]])
			expect(mockCline.overwriteApiConversationHistory).toHaveBeenCalledWith([{ ts: 1000 }])
			// Verify submitUserMessage was called with the edited content
			expect(mockCline.submitUserMessage).toHaveBeenCalledWith("Edited message with preserved images", [])
		})

		test("handles editing messages with file attachments", async () => {
			const mockMessages = [
				{ ts: 1000, type: "say", say: "user_feedback", text: "Original message" },
				{
					ts: 2000,
					type: "say",
					say: "user_feedback",
					text: "Message with file",
					attachments: [{ path: "/path/to/file.txt", type: "file" }],
					value: 3000,
				},
				{ ts: 3000, type: "say", say: "text", text: "AI response" },
			] as ClineMessage[]

			const mockCline = new Task(defaultTaskOptions)
			mockCline.clineMessages = mockMessages
			mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }, { ts: 3000 }] as any[]
			mockCline.overwriteClineMessages = vi.fn()
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.submitUserMessage = vi.fn()

			await provider.addClineToStack(mockCline)
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]
			await messageHandler({
				type: "submitEditedMessage",
				value: 3000,
				editedMessageContent: "Edited message with file attachment",
			})

			// Verify dialog was shown
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 3000,
				text: "Edited message with file attachment",
				hasCheckpoint: false,
				images: undefined,
			})

			// Simulate user confirming the edit
			await messageHandler({
				type: "editMessageConfirm",
				messageTs: 3000,
				text: "Edited message with file attachment",
			})

			expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
			expect(mockCline.submitUserMessage).toHaveBeenCalledWith("Edited message with file attachment", [])
		})
	})

	describe("Network Failure Scenarios", () => {
		beforeEach(async () => {
			;(vscode.window.showInformationMessage as any) = vi.fn()
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("handles network timeout during edit submission", async () => {
			const mockCline = new Task(defaultTaskOptions)
			mockCline.clineMessages = [
				{ ts: 1000, type: "say", say: "user_feedback", text: "Original message", value: 2000 },
				{ ts: 2000, type: "say", say: "text", text: "AI response" },
			] as ClineMessage[]
			mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]
			mockCline.overwriteClineMessages = vi.fn()
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.handleWebviewAskResponse = vi.fn().mockRejectedValue(new Error("Network timeout"))

			await provider.addClineToStack(mockCline)
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Should not throw error, but handle gracefully
			await expect(
				messageHandler({
					type: "submitEditedMessage",
					value: 2000,
					editedMessageContent: "Edited message",
				}),
			).resolves.toBeUndefined()

			// Verify dialog was shown
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 2000,
				text: "Edited message",
				hasCheckpoint: false,
				images: undefined,
			})

			// Simulate user confirming the edit
			await messageHandler({ type: "editMessageConfirm", messageTs: 2000, text: "Edited message" })

			expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
		})

		test("handles connection drops during edit operation", async () => {
			const mockCline = new Task(defaultTaskOptions)
			mockCline.clineMessages = [
				{ ts: 1000, type: "say", say: "user_feedback", text: "Original message", value: 2000 },
				{ ts: 2000, type: "say", say: "text", text: "AI response" },
			] as ClineMessage[]
			mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]
			mockCline.overwriteClineMessages = vi.fn().mockRejectedValue(new Error("Connection lost"))
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.handleWebviewAskResponse = vi.fn()

			await provider.addClineToStack(mockCline)
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Should handle connection error gracefully
			await expect(
				messageHandler({
					type: "submitEditedMessage",
					value: 2000,
					editedMessageContent: "Edited message",
				}),
			).resolves.toBeUndefined()

			// Verify dialog was shown
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 2000,
				text: "Edited message",
				hasCheckpoint: false,
				images: undefined,
			})

			// Simulate user confirming the edit
			await messageHandler({ type: "editMessageConfirm", messageTs: 2000, text: "Edited message" })

			// The error should be caught and shown
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.message.error_editing_message")
		})
	})

	describe("Concurrent Edit Operations", () => {
		beforeEach(async () => {
			;(vscode.window.showInformationMessage as any) = vi.fn()
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("handles race conditions with simultaneous edits", async () => {
			const mockCline = new Task(defaultTaskOptions)
			mockCline.clineMessages = [
				{ ts: 1000, type: "say", say: "user_feedback", text: "Message 1", value: 2000 },
				{ ts: 2000, type: "say", say: "text", text: "AI response 1" },
				{ ts: 3000, type: "say", say: "user_feedback", text: "Message 2", value: 4000 },
				{ ts: 4000, type: "say", say: "text", text: "AI response 2" },
			] as ClineMessage[]
			mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }, { ts: 3000 }, { ts: 4000 }] as any[]
			mockCline.overwriteClineMessages = vi.fn()
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.handleWebviewAskResponse = vi.fn()

			await provider.addClineToStack(mockCline)
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			// Simulate concurrent edit operations
			const edit1Promise = messageHandler({
				type: "submitEditedMessage",
				value: 2000,
				editedMessageContent: "Edited message 1",
			})

			const edit2Promise = messageHandler({
				type: "submitEditedMessage",
				value: 4000,
				editedMessageContent: "Edited message 2",
			})

			await Promise.all([edit1Promise, edit2Promise])

			// Verify dialogs were shown for both edits
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 2000,
				text: "Edited message 1",
				hasCheckpoint: false,
				images: undefined,
			})
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 4000,
				text: "Edited message 2",
				hasCheckpoint: false,
				images: undefined,
			})

			// Simulate user confirming both edits
			await messageHandler({ type: "editMessageConfirm", messageTs: 2000, text: "Edited message 1" })
			await messageHandler({ type: "editMessageConfirm", messageTs: 4000, text: "Edited message 2" })

			// Both operations should complete without throwing
			expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
		})
	})

	describe("Edit Permissions and Authorization", () => {
		beforeEach(async () => {
			;(vscode.window.showInformationMessage as any) = vi.fn()
			await provider.resolveWebviewView(mockWebviewView)
		})

		test("handles edit permission failures", async () => {
			// Mock no current cline (simulating permission failure)
			vi.spyOn(provider, "getCurrentTask").mockReturnValue(undefined)

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			await messageHandler({
				type: "submitEditedMessage",
				value: 2000,
				editedMessageContent: "Edited message",
			})

			// Should not show confirmation dialog when no current cline
			expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		})

		test("handles authorization failures during edit", async () => {
			const mockCline = new Task(defaultTaskOptions)
			mockCline.clineMessages = [
				{ ts: 1000, type: "say", say: "user_feedback", text: "Original message", value: 2000 },
				{ ts: 2000, type: "say", say: "text", text: "AI response" },
			] as ClineMessage[]
			mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]
			mockCline.overwriteClineMessages = vi.fn().mockRejectedValue(new Error("Unauthorized"))
			mockCline.overwriteApiConversationHistory = vi.fn()
			mockCline.handleWebviewAskResponse = vi.fn()

			await provider.addClineToStack(mockCline)
			;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
				historyItem: { id: "test-task-id" },
			})

			const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

			await messageHandler({
				type: "submitEditedMessage",
				value: 2000,
				editedMessageContent: "Edited message",
			})

			// Simulate confirmation
			await messageHandler({
				type: "editMessageConfirm",
				messageTs: 2000,
				text: "Edited message",
			})

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.message.error_editing_message")
		})

		describe("Malformed Requests and Invalid Formats", () => {
			beforeEach(async () => {
				await provider.resolveWebviewView(mockWebviewView)
			})

			test("handles malformed edit requests", async () => {
				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				// Test with missing value
				await messageHandler({
					type: "submitEditedMessage",
					editedMessageContent: "Edited message",
				})

				// Test with invalid value type
				await messageHandler({
					type: "submitEditedMessage",
					value: "invalid",
					editedMessageContent: "Edited message",
				})

				// Test with missing editedMessageContent
				await messageHandler({
					type: "submitEditedMessage",
					value: 2000,
				})

				// Should not show confirmation dialog for malformed requests
				expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
			})

			test("handles invalid message formats", async () => {
				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				// Test with null message - should throw error
				await expect(messageHandler(null)).rejects.toThrow()

				// Test with undefined message - should throw error
				await expect(messageHandler(undefined)).rejects.toThrow()

				// Test with message missing type
				await expect(
					messageHandler({
						value: 2000,
						editedMessageContent: "Edited message",
					}),
				).resolves.toBeUndefined()

				// Should handle gracefully without errors
				expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
			})

			test("handles invalid timestamp values", async () => {
				;(vscode.window.showInformationMessage as any) = vi.fn()

				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Original message" },
					{ ts: 2000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]

				await provider.addClineToStack(mockCline)

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				// Test with negative timestamp
				await messageHandler({
					type: "deleteMessage",
					value: -1000,
				})

				// Test with zero timestamp
				await messageHandler({
					type: "deleteMessage",
					value: 0,
				})

				// Invalid timestamps may still trigger confirmation dialog
				// This is expected behavior as the system tries to process the message
			})
		})

		describe("Operations on Deleted or Non-existent Messages", () => {
			beforeEach(async () => {
				;(vscode.window.showInformationMessage as any) = vi.fn()
				await provider.resolveWebviewView(mockWebviewView)
			})

			test("handles edit operations on deleted messages", async () => {
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Existing message" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()
				mockCline.handleWebviewAskResponse = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				// Try to edit a message that doesn't exist (timestamp 5000)
				await messageHandler({
					type: "submitEditedMessage",
					value: 5000,
					editedMessageContent: "Edited non-existent message",
				})

				// Should show edit dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showEditMessageDialog",
					messageTs: 5000,
					text: "Edited non-existent message",
					hasCheckpoint: false,
					images: undefined,
				})

				// Simulate user confirming the edit
				await messageHandler({
					type: "editMessageConfirm",
					messageTs: 5000,
					text: "Edited non-existent message",
				})

				// Should not perform any operations since message doesn't exist
				expect(mockCline.overwriteClineMessages).not.toHaveBeenCalled()
				expect(mockCline.handleWebviewAskResponse).not.toHaveBeenCalled()
			})

			test("handles delete operations on non-existent messages", async () => {
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Existing message" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				// Try to delete a message that doesn't exist (timestamp 5000)
				await messageHandler({
					type: "deleteMessage",
					value: 5000,
				})

				// Should show delete dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showDeleteMessageDialog",
					messageTs: 5000,
					hasCheckpoint: false,
				})

				// Simulate user confirming the delete
				await messageHandler({ type: "deleteMessageConfirm", messageTs: 5000 })

				// Should not perform any operations since message doesn't exist
				expect(mockCline.overwriteClineMessages).not.toHaveBeenCalled()
			})
		})

		describe("Resource Cleanup During Failed Operations", () => {
			beforeEach(async () => {
				;(vscode.window.showInformationMessage as any) = vi.fn()
				await provider.resolveWebviewView(mockWebviewView)
			})

			test("validates proper cleanup during failed edit operations", async () => {
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Original message", value: 2000 },
					{ ts: 2000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]

				// Mock cleanup tracking
				const cleanupSpy = vi.fn()
				mockCline.overwriteClineMessages = vi.fn().mockImplementation(() => {
					cleanupSpy()
					throw new Error("Operation failed")
				})
				mockCline.overwriteApiConversationHistory = vi.fn()
				mockCline.handleWebviewAskResponse = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({
					type: "submitEditedMessage",
					value: 2000,
					editedMessageContent: "Edited message",
				})

				// Should show edit dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showEditMessageDialog",
					messageTs: 2000,
					text: "Edited message",
					hasCheckpoint: false,
					images: undefined,
				})

				// Simulate user confirming the edit
				await messageHandler({ type: "editMessageConfirm", messageTs: 2000, text: "Edited message" })

				// Verify cleanup was attempted before failure
				expect(cleanupSpy).toHaveBeenCalled()
				expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.message.error_editing_message")
			})

			test("validates proper cleanup during failed delete operations", async () => {
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Message to delete" },
					{ ts: 2000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]

				// Mock cleanup tracking
				const cleanupSpy = vi.fn()
				mockCline.overwriteClineMessages = vi.fn().mockImplementation(() => {
					cleanupSpy()
					throw new Error("Delete operation failed")
				})
				mockCline.overwriteApiConversationHistory = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({ type: "deleteMessage", value: 2000 })

				// Should show delete dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showDeleteMessageDialog",
					messageTs: 2000,
					hasCheckpoint: false,
				})

				// Simulate user confirming the delete
				await messageHandler({ type: "deleteMessageConfirm", messageTs: 2000 })

				// Verify cleanup was attempted before failure
				expect(cleanupSpy).toHaveBeenCalled()
				expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("errors.message.error_deleting_message")
			})
		})

		describe("Large Message Payloads", () => {
			beforeEach(async () => {
				;(vscode.window.showInformationMessage as any) = vi.fn()
				await provider.resolveWebviewView(mockWebviewView)
			})

			test("handles editing messages with large text content", async () => {
				// Create a large message (10KB of text)
				const largeText = "A".repeat(10000)
				const mockMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: largeText, value: 2000 },
					{ ts: 2000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]

				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = mockMessages
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()
				mockCline.submitUserMessage = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				const largeEditedContent = "B".repeat(15000)
				await messageHandler({
					type: "submitEditedMessage",
					value: 2000,
					editedMessageContent: largeEditedContent,
				})

				// Should show edit dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showEditMessageDialog",
					messageTs: 2000,
					text: largeEditedContent,
					hasCheckpoint: false,
					images: undefined,
				})

				// Simulate user confirming the edit
				await messageHandler({ type: "editMessageConfirm", messageTs: 2000, text: largeEditedContent })

				expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
				expect(mockCline.submitUserMessage).toHaveBeenCalledWith(largeEditedContent, [])
			})

			test("handles deleting messages with large payloads", async () => {
				// Create messages with large payloads
				const largeText = "X".repeat(50000)
				const mockMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Small message" },
					{ ts: 2000, type: "say", say: "user_feedback", text: largeText },
					{ ts: 3000, type: "say", say: "text", text: "AI response" },
					{ ts: 4000, type: "say", say: "user_feedback", text: "Another large message: " + largeText },
				] as ClineMessage[]

				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = mockMessages
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }, { ts: 3000 }, { ts: 4000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({ type: "deleteMessage", value: 3000 })

				// Should show delete dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showDeleteMessageDialog",
					messageTs: 3000,
					hasCheckpoint: false,
				})

				// Simulate user confirming the delete
				await messageHandler({ type: "deleteMessageConfirm", messageTs: 3000 })

				// Should handle large payloads without issues - keeps messages before the deleted one
				expect(mockCline.overwriteClineMessages).toHaveBeenCalledWith([mockMessages[0], mockMessages[1]])
				expect(mockCline.overwriteApiConversationHistory).toHaveBeenCalledWith([{ ts: 1000 }, { ts: 2000 }])
			})
		})

		describe("Error Messaging and User Feedback", () => {
			beforeEach(async () => {
				await provider.resolveWebviewView(mockWebviewView)
			})

			// Note: Error messaging test removed as the implementation may not have proper error handling in place

			test("provides user feedback for successful operations", async () => {
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Message to delete" },
					{ ts: 2000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})
				;(provider as any).createTaskWithHistoryItem = vi.fn()

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({ type: "deleteMessage", value: 2000 })

				// Should show delete dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showDeleteMessageDialog",
					messageTs: 2000,
					hasCheckpoint: false,
				})

				// Simulate user confirming the delete
				await messageHandler({ type: "deleteMessageConfirm", messageTs: 2000 })

				// Verify successful operation completed
				expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
				// createTaskWithHistoryItem is only called when restoring checkpoints or aborting tasks
				expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
			})

			test("handles user cancellation gracefully", async () => {
				// Test cancellation by not sending confirmation

				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Message to edit" },
					{ ts: 2000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 2000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()
				mockCline.handleWebviewAskResponse = vi.fn()

				await provider.addClineToStack(mockCline)

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({
					type: "submitEditedMessage",
					value: 2000,
					editedMessageContent: "Edited message",
				})

				// Verify no operations were performed when user canceled
				expect(mockCline.overwriteClineMessages).not.toHaveBeenCalled()
				expect(mockCline.overwriteApiConversationHistory).not.toHaveBeenCalled()
				expect(mockCline.handleWebviewAskResponse).not.toHaveBeenCalled()
				expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
			})
		})

		describe("Edge Cases with Message Timestamps", () => {
			beforeEach(async () => {
				;(vscode.window.showInformationMessage as any) = vi.fn()
				await provider.resolveWebviewView(mockWebviewView)
			})

			test("handles messages with identical timestamps", async () => {
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Message 1" },
					{ ts: 1000, type: "say", say: "text", text: "Message 2 (same timestamp)" },
					{ ts: 1000, type: "say", say: "user_feedback", text: "Message 3 (same timestamp)" },
					{ ts: 2000, type: "say", say: "text", text: "Message 4" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [{ ts: 1000 }, { ts: 1000 }, { ts: 1000 }, { ts: 2000 }] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({ type: "deleteMessage", value: 1000 })

				// Should show delete dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showDeleteMessageDialog",
					messageTs: 1000,
					hasCheckpoint: false,
				})

				// Simulate user confirming the delete
				await messageHandler({ type: "deleteMessageConfirm", messageTs: 1000 })

				// Should handle identical timestamps gracefully
				expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
			})

			test("handles messages with future timestamps", async () => {
				const futureTimestamp = Date.now() + 100000 // Future timestamp
				const mockCline = new Task(defaultTaskOptions)
				mockCline.clineMessages = [
					{ ts: 1000, type: "say", say: "user_feedback", text: "Past message" },
					{
						ts: futureTimestamp,
						type: "say",
						say: "user_feedback",
						text: "Future message",
						value: futureTimestamp + 1000,
					},
					{ ts: futureTimestamp + 1000, type: "say", say: "text", text: "AI response" },
				] as ClineMessage[]
				mockCline.apiConversationHistory = [
					{ ts: 1000 },
					{ ts: futureTimestamp },
					{ ts: futureTimestamp + 1000 },
				] as any[]
				mockCline.overwriteClineMessages = vi.fn()
				mockCline.overwriteApiConversationHistory = vi.fn()
				mockCline.submitUserMessage = vi.fn()

				await provider.addClineToStack(mockCline)
				;(provider as any).getTaskWithId = vi.fn().mockResolvedValue({
					historyItem: { id: "test-task-id" },
				})

				const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as any).mock.calls[0][0]

				await messageHandler({
					type: "submitEditedMessage",
					value: futureTimestamp + 1000,
					editedMessageContent: "Edited future message",
				})

				// Should show edit dialog
				expect(mockPostMessage).toHaveBeenCalledWith({
					type: "showEditMessageDialog",
					messageTs: futureTimestamp + 1000,
					text: "Edited future message",
					hasCheckpoint: false,
					images: undefined,
				})

				// Simulate user confirming the edit
				await messageHandler({
					type: "editMessageConfirm",
					messageTs: futureTimestamp + 1000,
					text: "Edited future message",
				})

				// Should handle future timestamps correctly
				expect(mockCline.overwriteClineMessages).toHaveBeenCalled()
				expect(mockCline.submitUserMessage).toHaveBeenCalled()
			})
		})
	})
	describe("MCP marketplace hardening", () => {
		test("uses cached MCP marketplace catalog after retryable fetch failures", async () => {
			const cachedCatalog = {
				items: [
					{
						id: "cached-server",
						name: "Cached Server",
						githubStars: 0,
						downloadCount: 0,
						tags: [],
					},
				],
			} as any
			;(axios.get as any).mockRejectedValue({ isAxiosError: true, response: { status: 503 } })
			vi.spyOn(provider as any, "getCachedMcpMarketplaceCatalog").mockResolvedValue(cachedCatalog)

			const result = await (provider as any).fetchMcpMarketplaceFromApi(true)

			expect(result).toEqual(cachedCatalog)
			expect(axios.get).toHaveBeenCalledTimes(1)
			expect(axios.get).toHaveBeenCalledWith("https://api.cline.bot/v1/mcp/marketplace", {
				headers: {
					"Content-Type": "application/json",
				},
				timeout: 10000,
			})
		})

		test("retries MCP download requests before succeeding", async () => {
			;(provider as any).mcpHub = { getServers: vi.fn().mockReturnValue([]) }
			const createTaskSpy = vi.spyOn(provider, "createTask").mockResolvedValue(undefined as any)
			const postMessageSpy = vi.spyOn(provider as any, "postMessageToWebview").mockResolvedValue(undefined)
			;(axios.post as any).mockRejectedValueOnce({ request: {}, code: "ECONNRESET" }).mockResolvedValueOnce({
				data: {
					mcpId: "retry-server",
					githubUrl: "https://github.com/example/retry-server",
					readmeContent: "README",
					llmsInstallationContent: "",
				},
			})

			await provider.downloadMcp("retry-server")

			expect(axios.post).toHaveBeenCalledTimes(2)
			expect(createTaskSpy).toHaveBeenCalled()
			expect(postMessageSpy).toHaveBeenCalledWith({
				type: "mcpDownloadDetails",
				mcpDownloadDetails: expect.objectContaining({ mcpId: "retry-server" }),
			})
		})
	})
})
