import * as vscode from "vscode"
import { randomUUID } from "crypto"
import fs from "fs/promises"
import path from "path"

import { ORGANIZATION_ALLOW_ALL, type HistoryItem, type ProviderSettings, DEFAULT_MODES } from "@roo-code/types"
import { CloudService } from "@roo-code/cloud"

import type { ExtensionState } from "../../../shared/ExtensionMessage"

import { ClineProvider } from "../ClineProvider"
import { ContextProxy } from "../../config/ContextProxy"
import { Task } from "../../task/Task"
import { getSystemPromptFilePath } from "../../prompts/sections/custom-system-prompt"
import { fileExistsAtPath } from "../../../utils/fs"
import { MdmService } from "../../../services/mdm/MdmService"

// Mock necessary modules and classes
vi.mock("vscode", async () => {
	const actualVscode = await vi.importActual("vscode")
	return {
		...actualVscode,
		window: {
			...(actualVscode as any).window,
			createOutputChannel: vi.fn(() => ({
				appendLine: vi.fn(),
			})),
			showErrorMessage: vi.fn(),
			showInformationMessage: vi.fn(),
		},
		workspace: {
			...(actualVscode as any).workspace,
			getConfiguration: vi.fn(() => ({
				get: vi.fn(),
				update: vi.fn(),
			})),
			workspaceFolders: [{ uri: { fsPath: "/test/workspace" } }],
		},
		env: {
			machineId: "test-machine-id",
		},
		commands: {
			executeCommand: vi.fn(),
		},
		Uri: {
			file: vi.fn((p) => ({ fsPath: p, path: p })),
		},
	}
})
vi.mock("../../config/ContextProxy")
vi.mock("../../task/Task")
vi.mock("../../../services/code-index/manager")
vi.mock("../../../services/mdm/MdmService")
vi.mock("../../prompts/sections/custom-system-prompt")
vi.mock("../../../utils/fs")
vi.mock("@roo-code/cloud", async () => {
	const actual = await vi.importActual("@roo-code/cloud")
	return {
		...actual,
		CloudService: {
			hasInstance: vi.fn(() => true),
			instance: {
				getAllowList: vi.fn().mockResolvedValue(ORGANIZATION_ALLOW_ALL),
				getUserInfo: vi.fn().mockReturnValue(null),
				isAuthenticated: vi.fn().mockReturnValue(false),
				canShareTask: vi.fn().mockResolvedValue(false),
				isTaskSyncEnabled: vi.fn().mockReturnValue(false),
				getOrganizationSettings: vi.fn().mockReturnValue({}),
				on: vi.fn(),
				off: vi.fn(),
			},
		},
	}
})

describe("ClineProvider", () => {
	let context: vscode.ExtensionContext
	let outputChannel: vscode.OutputChannel
	let contextProxy: ContextProxy
	let provider: ClineProvider
	let mdmService: MdmService

	const mockProviderSettings: ProviderSettings = {
		apiProvider: "kilocode",
		kilocodeToken: "test-token",
	}

	const mockState: ExtensionState = {
		version: "1.0.0",
		apiConfiguration: mockProviderSettings,
		mode: DEFAULT_MODES[0] as any,
		taskHistory: [],
		clineMessages: [],
		currentTaskItem: undefined,
		customModes: [],
		currentApiConfigName: "default",
		listApiConfigMeta: [],
		pinnedApiConfigs: {},
		customInstructions: "",
		dismissedUpsells: [],
		autoApprovalEnabled: false,
		yoloMode: false,
		alwaysAllowReadOnly: false,
		alwaysAllowReadOnlyOutsideWorkspace: false,
		alwaysAllowWrite: false,
		alwaysAllowWriteOutsideWorkspace: false,
		alwaysAllowWriteProtected: false,
		alwaysAllowExecute: false,
		alwaysAllowBrowser: false,
		alwaysApproveResubmit: false,
		requestDelaySeconds: 0,
		alwaysAllowMcp: false,
		alwaysAllowModeSwitch: false,
		alwaysAllowSubtasks: false,
		alwaysAllowFollowupQuestions: false,
		alwaysAllowUpdateTodoList: false,
		followupAutoApproveTimeoutMs: 0,
		allowedCommands: [],
		deniedCommands: [],
		allowedMaxRequests: 0,
		allowedMaxCost: 0,
		browserToolEnabled: false,
		browserViewportSize: "800x600",
		showAutoApproveMenu: false,
		hideCostBelowThreshold: 0,
		screenshotQuality: 75,
		remoteBrowserEnabled: false,
		cachedChromeHostUrl: "",
		remoteBrowserHost: "",
		ttsEnabled: false,
		ttsSpeed: 1,
		soundEnabled: false,
		soundVolume: 1,
		maxOpenTabsContext: 10,
		maxConcurrentFileReads: 5,
		allowVeryLargeReads: false,
		terminalOutputLineLimit: 1000,
		terminalOutputCharacterLimit: 10000,
		terminalShellIntegrationTimeout: 5000,
		terminalShellIntegrationDisabled: false,
		terminalCommandDelay: 0,
		terminalPowershellCounter: false,
		terminalZshClearEolMark: false,
		terminalZshOhMy: false,
		terminalZshP10k: false,
		terminalZdotdir: false,
		terminalCompressProgressBar: false,
		diagnosticsEnabled: false,
		diffEnabled: true,
		fuzzyMatchThreshold: 0.9,
		morphApiKey: "",
		fastApplyModel: "auto",
		language: "en",
		modeApiConfigs: {},
		customModePrompts: {},
		customSupportPrompts: {},
		enhancementApiConfigId: "",
		localWorkflowToggles: {},
		globalRulesToggles: {},
		localRulesToggles: {},
		globalWorkflowToggles: {},
		commitMessageApiConfigId: "",
		terminalCommandApiConfigId: "",
		dismissedNotificationIds: [],
		ghostServiceSettings: {},
		autoPurgeEnabled: false,
		autoPurgeDefaultRetentionDays: 30,
		autoPurgeFavoritedTaskRetentionDays: 0,
		autoPurgeCompletedTaskRetentionDays: 7,
		autoPurgeIncompleteTaskRetentionDays: 1,
		autoPurgeLastRunTimestamp: 0,
		condensingApiConfigId: "",
		customCondensingPrompt: "",
		yoloGatekeeperApiConfigId: "",
		codebaseIndexConfig: {},
		codebaseIndexModels: {},
		profileThresholds: {},
		systemNotificationsEnabled: false,
		includeDiagnosticMessages: false,
		maxDiagnosticMessages: 10,
		openRouterImageGenerationSelectedModel: "",
		includeTaskHistoryInEnhance: false,
		reasoningBlockCollapsed: false,
		includeCurrentTime: false,
		includeCurrentCost: false,
		currentTaskTodos: [],
		uriScheme: "vscode",
		uiKind: "webview",
		kiloCodeWrapperProperties: undefined,
		kilocodeDefaultModel: "default",
		shouldShowAnnouncement: false,
		taskHistoryFullLength: 0,
		taskHistoryVersion: 1,
		writeDelayMs: 50,
		enableCheckpoints: false,
		checkpointTimeout: 15,
		maxWorkspaceFiles: 100,
		showRooIgnoredFiles: false,
		maxReadFileLine: 5000,
		maxImageFileSize: 10,
		maxTotalImageSize: 50,
		experiments: {},
		mcpEnabled: false,
		enableMcpServerCreation: false,
		toolRequirements: {},
		cwd: "/test/workspace",
		telemetrySetting: "disabled",
		machineId: "test-machine-id",
		renderContext: "sidebar",
		cloudUserInfo: null,
		cloudIsAuthenticated: false,
		cloudApiUrl: "",
		cloudOrganizations: [],
		sharingEnabled: false,
		organizationSettingsVersion: 1,
		autoCondenseContext: false,
		autoCondenseContextPercent: 50,
		marketplaceItems: [],
		marketplaceInstalledMetadata: { project: {}, global: {} },
		hasOpenedModeSelector: false,
		openRouterImageApiKey: "",
		kiloCodeImageApiKey: "",
		openRouterUseMiddleOutTransform: false,
		messageQueue: [],
		lastShownAnnouncementId: "",
		apiModelId: "",
		mcpServers: [],
		hasSystemPromptOverride: false,
		mdmCompliant: true,
		remoteControlEnabled: false,
		taskSyncEnabled: false,
		featureRoomoteControlEnabled: false,
		virtualQuotaActiveModel: undefined,
		showTimestamps: false,
		historyPreviewCollapsed: false,
		showTaskTimeline: false,
		sendMessageOnEnter: true,
	}

	beforeEach(async () => {
		vi.clearAllMocks()
		MdmService.resetInstance()

		context = {
			extensionUri: vscode.Uri.file("/mock/extension"),
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
			} as unknown as vscode.Memento,
			secrets: {
				get: vi.fn(),
				store: vi.fn(),
				delete: vi.fn(),
			} as unknown as vscode.SecretStorage,
			globalStorageUri: vscode.Uri.file("/mock/globalStorage"),
		} as vscode.ExtensionContext

		outputChannel = ((await vi.importActual("vscode")) as typeof import("vscode")).window.createOutputChannel(
			"Kilo Code",
		)
		contextProxy = new ContextProxy(context)
		mdmService = await MdmService.createInstance(vi.fn())

		// Mock contextProxy methods
		vi.spyOn(contextProxy, "getValues").mockReturnValue(mockState as any)
		vi.spyOn(contextProxy, "getProviderSettings").mockReturnValue(mockProviderSettings)

		provider = new ClineProvider(context, outputChannel, "sidebar", contextProxy, mdmService)
	})

	describe("MDM Compliance", () => {
		it("should return true when no MDM service is present", () => {
			const localProvider = new ClineProvider(context, outputChannel, "sidebar", contextProxy) // No MDM service
			expect(localProvider.checkMdmCompliance()).toBe(true)
		})

		it("should return true when MDM service reports compliant", () => {
			vi.spyOn(mdmService, "isCompliant").mockReturnValue({ compliant: true })
			expect(provider.checkMdmCompliance()).toBe(true)
		})

		it("should return false when MDM service reports non-compliant", () => {
			vi.spyOn(mdmService, "isCompliant").mockReturnValue({
				compliant: false,
				reason: "Not authenticated",
			})
			expect(provider.checkMdmCompliance()).toBe(false)
		})
	})

	describe("getStateToPostToWebview", () => {
		it("should correctly set mdmCompliant to true when compliant", async () => {
			vi.spyOn(mdmService, "requiresCloudAuth").mockReturnValue(true)
			vi.spyOn(mdmService, "isCompliant").mockReturnValue({ compliant: true })

			const state = await provider.getStateToPostToWebview()
			expect(state.mdmCompliant).toBe(true)
		})

		it("should correctly set mdmCompliant to false when non-compliant", async () => {
			vi.spyOn(mdmService, "requiresCloudAuth").mockReturnValue(true)
			vi.spyOn(mdmService, "isCompliant").mockReturnValue({
				compliant: false,
				reason: "Not authenticated",
			})

			const state = await provider.getStateToPostToWebview()
			expect(state.mdmCompliant).toBe(false)
		})

		it("should correctly set mdmCompliant to undefined when MDM does not require auth", async () => {
			vi.spyOn(mdmService, "requiresCloudAuth").mockReturnValue(false)
			vi.spyOn(mdmService, "isCompliant").mockReturnValue({ compliant: true }) // This shouldn't matter

			const state = await provider.getStateToPostToWebview()
			expect(state.mdmCompliant).toBeUndefined()
		})
	})

	describe("createTask", () => {
		it("should create a new task and add it to the stack", async () => {
			const taskText = "This is a test task"
			const createdTask = await provider.createTask(taskText)

			expect(Task).toHaveBeenCalledWith(
				expect.objectContaining({
					task: taskText,
				}),
			)
			expect(provider.getTaskStackSize()).toBe(1)
			expect(provider.getCurrentTask()).toBe(createdTask)
		})

		it("should throw an error if the profile is not allowed", async () => {
			vi.spyOn(CloudService.instance, "getAllowList").mockResolvedValue({
				allowAll: false,
				providers: {
					anthropic: {
						allowAll: false,
						models: ["claude-3-sonnet-20240229"],
					},
				},
			})

			const settingsWithOpus: ProviderSettings = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-opus-20240229",
			}
			vi.spyOn(contextProxy, "getProviderSettings").mockReturnValue(settingsWithOpus)

			await expect(provider.createTask("test")).rejects.toThrow(
				"This action violates your organization's security policy.",
			)
		})
	})

	describe("System Prompt Override", () => {
		it("should report system prompt override if file exists", async () => {
			vi.mocked(getSystemPromptFilePath).mockReturnValue("/path/to/prompt.md")
			vi.mocked(fileExistsAtPath).mockResolvedValue(true)

			const state = await provider.getStateToPostToWebview()
			expect(state.hasSystemPromptOverride).toBe(true)
			expect(getSystemPromptFilePath).toHaveBeenCalledWith(expect.any(String), DEFAULT_MODES[0].slug)
			expect(fileExistsAtPath).toHaveBeenCalledWith("/path/to/prompt.md")
		})

		it("should not report system prompt override if file does not exist", async () => {
			vi.mocked(getSystemPromptFilePath).mockReturnValue("/path/to/prompt.md")
			vi.mocked(fileExistsAtPath).mockResolvedValue(false)

			const state = await provider.getStateToPostToWebview()
			expect(state.hasSystemPromptOverride).toBe(false)
		})
	})

	describe("Task History and Restoration", () => {
		let mockHistory: HistoryItem[]
		let taskDirPath: string

		beforeEach(async () => {
			const taskId = randomUUID()
			mockHistory = [
				{
					id: taskId,
					ts: Date.now(),
					task: "Test task from history",
					mode: "code",
					workspace: "/test/workspace",
					number: 1,
					totalCost: 0,
					tokensIn: 0,
					tokensOut: 0,
				},
			]
			vi.spyOn(contextProxy, "getValue").mockImplementation((key) => {
				if (key === "taskHistory") return mockHistory
				return mockState[key as keyof ExtensionState]
			})

			taskDirPath = path.join(context.globalStorageUri.fsPath, "tasks", taskId)
			vi.spyOn(fs, "mkdir").mockResolvedValue(undefined)
			vi.spyOn(fs, "readFile").mockResolvedValue("[]") // Mock reading history files
			vi.mocked(fileExistsAtPath).mockResolvedValue(true)

			// Mock getTaskDirectoryPath
			const storageUtils = await import("../../../utils/storage")
			vi.spyOn(storageUtils, "getTaskDirectoryPath").mockResolvedValue(taskDirPath)
		})

		it("should restore a task from history", async () => {
			const historyItem = mockHistory[0]
			await provider.createTaskWithHistoryItem(historyItem)

			expect(provider.getTaskStackSize()).toBe(1)
			const restoredTask = provider.getCurrentTask()
			expect(Task).toHaveBeenCalledWith(
				expect.objectContaining({
					historyItem,
				}),
			)
			expect(restoredTask).toBeInstanceOf(Task)
		})

		it("should handle task file not found during restoration", async () => {
			const historyItem = mockHistory[0]
			vi.mocked(fileExistsAtPath).mockResolvedValue(false) // Simulate file not found
			const spy = vi.spyOn(provider, "setTaskFileNotFound")

			await expect(provider.createTaskWithHistoryItem(historyItem)).rejects.toThrow("Task not found")

			expect(spy).toHaveBeenCalledWith(historyItem.id)
		})

		it("should delete a task and its associated files", async () => {
			const taskId = mockHistory[0].id
			const spy = vi.spyOn(provider, "deleteTaskFromState")

			// Mock fs.rm to simulate directory deletion
			const rmSpy = vi.spyOn(fs, "rm").mockResolvedValue(undefined)

			await provider.deleteTaskWithId(taskId)

			// Verify history update
			expect(spy).toHaveBeenCalledWith(taskId)

			// Verify directory deletion
			expect(rmSpy).toHaveBeenCalledWith(taskDirPath, { recursive: true, force: true })
		})

		it("should not delete a favorited task", async () => {
			const taskId = mockHistory[0].id
			mockHistory[0].isFavorited = true

			await expect(provider.deleteTaskWithId(taskId)).rejects.toThrow(
				"Cannot delete a favorited task. Please unfavorite it first.",
			)
		})

		it("should toggle favorite status of a task", async () => {
			const taskId = mockHistory[0].id
			const spy = vi.spyOn(provider, "updateGlobalState")
			await provider.toggleTaskFavorite(taskId)

			const [key, updatedHistory] = spy.mock.calls[0]
			const updatedTask = updatedHistory.find((item: HistoryItem) => item.id === taskId)

			expect(key).toBe("taskHistory")
			expect(updatedTask.isFavorited).toBe(true)
		})
	})
})
