// kilocode_change - new file
import type { ClineMessage } from "@roo-code/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type * as vscode from "vscode"

import { AgentManagerProvider } from "../../../kilocode/agent-manager/AgentManagerProvider"
import { AgentManagerBridge } from "../../bridge/AgentManagerBridge"
import { SubagentCoordinator } from "../SubagentCoordinator"

vi.mock("vscode", () => {
	const window = {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		onDidCloseTerminal: vi.fn(() => ({ dispose: vi.fn() })),
		createTerminal: vi.fn(() => ({ show: vi.fn(), dispose: vi.fn() })),
	}
	const Uri = {
		joinPath: vi.fn(),
	}
	const workspace = {
		workspaceFolders: [],
		getConfiguration: vi.fn(() => ({ get: vi.fn() })),
	}
	const ExtensionMode = {
		Development: 1,
		Production: 2,
		Test: 3,
	}
	const ThemeIcon = vi.fn()
	const env = {
		appRoot: "/mock/vscode/app/root",
		clipboard: { writeText: vi.fn() },
	}

	return { window, Uri, workspace, ExtensionMode, ThemeIcon, env }
})

describe("reload/recovery harness", () => {
	let provider: AgentManagerProvider
	let bridge: AgentManagerBridge
	let recoveryState: { backgroundBindings: any[] }
	let historyById: Map<string, any>
	let workspaceState: {
		get: ReturnType<typeof vi.fn>
		update: ReturnType<typeof vi.fn>
	}
	let hostStub: {
		getState: ReturnType<typeof vi.fn>
		getTaskHistory: ReturnType<typeof vi.fn>
		updateTaskHistory: ReturnType<typeof vi.fn>
		providerSettingsManager: { getProfile: ReturnType<typeof vi.fn> }
		customModesManager: { getCustomModes: ReturnType<typeof vi.fn> }
		reopenParentFromDelegation: ReturnType<typeof vi.fn>
		recordTaskActivity: ReturnType<typeof vi.fn>
	}

	beforeEach(() => {
		recoveryState = {
			backgroundBindings: [
				{
					sessionId: "child-paused",
					taskId: "child-paused",
					request: {
						parentTaskId: "parent-1",
						rootTaskId: "root-1",
						targetTaskId: "child-paused",
						mode: "code",
						handoff: { summary: "Recovered background work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "paused",
					updatedAt: 456,
				},
			],
		}

		historyById = new Map([
			[
				"child-paused",
				{
					id: "child-paused",
					rootTaskId: "root-1",
					parentTaskId: "parent-1",
					number: 1,
					ts: 100,
					task: "Recovered background work",
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					lifecycleState: "paused",
					pauseReason: "Waiting for reload recovery",
					pausedAt: 400,
					resumeContextSummary: "Recovered resume summary",
				},
			],
		])

		workspaceState = {
			get: vi.fn((key: string) => (key === "kilocode.agentManager.recoveryState" ? recoveryState : undefined)),
			update: vi.fn(async (key: string, value: unknown) => {
				if (key === "kilocode.agentManager.recoveryState") {
					recoveryState = value as { backgroundBindings: any[] }
				}
			}),
		}

		hostStub = {
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "kilocode" },
				autoRestartProblematicProcesses: false,
				problematicProcessRestartLimit: 1,
				parallelAgentsEnabled: false,
				parallelAgentCount: 1,
			}),
			getTaskHistory: vi.fn(() => Array.from(historyById.values())),
			updateTaskHistory: vi.fn(async (item: any) => {
				historyById.set(item.id, item)
				return Array.from(historyById.values())
			}),
			providerSettingsManager: {
				getProfile: vi.fn(),
			},
			customModesManager: {
				getCustomModes: vi.fn().mockResolvedValue([]),
			},
			reopenParentFromDelegation: vi.fn().mockResolvedValue(undefined),
			recordTaskActivity: vi.fn().mockResolvedValue(undefined),
		}

		const outputChannel: vscode.OutputChannel = {
			name: "test",
			append: vi.fn(),
			appendLine: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn(),
			show: vi.fn(),
			hide: vi.fn(),
			replace: vi.fn(),
		} as unknown as vscode.OutputChannel

		const context = {
			extensionUri: { fsPath: "/mock/extension/path" } as any,
			extensionMode: 1,
			workspaceState,
		} as unknown as vscode.ExtensionContext

		provider = new AgentManagerProvider(context, outputChannel, hostStub as any)
		;(provider as any).processHandler = {
			hasStdin: vi.fn(() => false),
			writeToStdin: vi.fn(),
			stopProcess: vi.fn(),
			hasProcess: vi.fn(() => false),
		}
		;(provider as any).spawnAgentWithCommonSetup = vi.fn().mockResolvedValue(true)
		;(provider as any).resumeSession = vi.fn().mockResolvedValue(undefined)
		;(provider as any).remoteSessionService = {
			fetchSessionDataForResume: vi.fn().mockResolvedValue(undefined),
		}

		bridge = new AgentManagerBridge(provider)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("restores -> rebinds -> resumes -> reopens parent after recovered completion", async () => {
		expect(provider.listBackgroundSubagentBindings()).toEqual([
			expect.objectContaining({
				taskId: "child-paused",
				sessionId: "child-paused",
				status: "paused",
			}),
		])
		expect((provider as any).registry.getSession("child-paused")).toMatchObject({
			taskId: "child-paused",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			status: "stopped",
			lifecycleStatus: "paused",
			recoveryState: "recoverable",
			pendingReaction: "resume",
			restartHandoff: "Recovered resume summary",
		})

		const coordinator = new SubagentCoordinator(hostStub as any, bridge)

		expect(bridge.listBindings()).toEqual([
			expect.objectContaining({
				childTaskId: "child-paused",
				sessionId: "child-paused",
				status: "paused",
			}),
		])
		expect(coordinator.getBindingForTask("child-paused")).toMatchObject({
			parentTaskId: "parent-1",
			childTaskId: "child-paused",
			sessionId: "child-paused",
			status: "paused",
		})

		await coordinator.resume("child-paused")

		expect((provider as any).resumeSession).toHaveBeenCalledWith(
			"child-paused",
			"Recovered resume summary",
			"Background: code",
		)
		expect(hostStub.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-paused",
				lifecycleState: "running",
				pauseReason: undefined,
				pausedAt: undefined,
			}),
		)
		expect((provider as any).registry.getSession("child-paused")).toMatchObject({
			lifecycleStatus: "active",
			activityState: "active",
			recoveryState: undefined,
			pendingReaction: undefined,
		})
		expect(coordinator.getBindingForTask("child-paused")).toMatchObject({ status: "running" })
		;(provider as any).sessionMessages.set("child-paused", [
			{ type: "say", say: "completion_result", text: "Recovered child finished", ts: 500 } as ClineMessage,
		])
		;(provider as any).processHandlerCallbacks.onSessionCompleted("child-paused", 0)
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(hostStub.reopenParentFromDelegation).toHaveBeenCalledWith({
			parentTaskId: "parent-1",
			childTaskId: "child-paused",
			completionResultSummary: "Recovered child finished",
			preserveParentFocus: true,
		})
		expect(coordinator.getBindingForTask("child-paused")).toBeUndefined()
		expect(provider.listBackgroundSubagentBindings()).toEqual([])
		expect(workspaceState.update).toHaveBeenCalledWith("kilocode.agentManager.recoveryState", {
			backgroundBindings: [],
		})
	})
})
