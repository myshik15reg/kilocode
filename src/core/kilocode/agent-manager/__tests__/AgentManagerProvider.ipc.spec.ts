import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from "vitest"
import * as vscode from "vscode"
import { AgentManagerProvider } from "../AgentManagerProvider"
// kilocode_change start
import * as telemetry from "../telemetry"
// kilocode_change end
import { AgentRegistry } from "../AgentRegistry"
import type { RuntimeProcessHandler } from "../RuntimeProcessHandler"
import type { SubagentLaunchRequest } from "@roo-code/types"

// Minimal mocks for VS Code APIs
vi.mock("vscode", () => {
	const window = {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
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
	}
	return { window, Uri, workspace, ExtensionMode, ThemeIcon, env }
})

// kilocode_change start
vi.mock("../telemetry", () => ({
	getPlatformDiagnostics: vi.fn(() => ({ platform: "win32", shell: "powershell" })),
	captureAgentManagerOpened: vi.fn(),
	captureAgentManagerSessionStarted: vi.fn(),
	captureAgentManagerSessionStopped: vi.fn(),
	captureAgentManagerLoginIssue: vi.fn(),
}))
// kilocode_change end

describe("AgentManagerProvider IPC paths", () => {
	let provider: AgentManagerProvider
	let mockProcessHandler: Mocked<RuntimeProcessHandler>
	let mockPanel: any
	let output: string[]
	let registry: AgentRegistry
	// kilocode_change start
	let runtimeRegistry: AgentRegistry
	// kilocode_change end

	beforeEach(() => {
		output = []
		registry = new AgentRegistry()

		mockProcessHandler = {
			hasStdin: vi.fn(),
			writeToStdin: vi.fn(),
			stopProcess: vi.fn(),
			hasProcess: vi.fn(),
		} as unknown as Mocked<RuntimeProcessHandler>

		mockPanel = {
			webview: { postMessage: vi.fn() },
			dispose: vi.fn(),
		}

		const outputChannel: vscode.OutputChannel = {
			name: "test",
			append: (value: string) => output.push(value),
			appendLine: (value: string) => output.push(value),
			clear: vi.fn(),
			dispose: vi.fn(),
			show: vi.fn(),
			hide: vi.fn(),
			replace: vi.fn(),
		} as unknown as vscode.OutputChannel

		const context = {
			extensionUri: { fsPath: "/mock/extension/path" } as any,
			asAbsolutePath: (p: string) => p,
			extensionMode: 1, // Development mode
			workspaceState: { get: vi.fn(), update: vi.fn().mockResolvedValue(undefined) },
		} as unknown as vscode.ExtensionContext
		const providerStub = {
			getState: vi.fn().mockResolvedValue({ apiConfiguration: { apiProvider: "kilocode" } }),
			updateTaskHistory: vi.fn().mockResolvedValue([]),
			providerSettingsManager: {
				getProfile: vi.fn(),
			},
			customModesManager: {
				getCustomModes: vi.fn().mockResolvedValue([]),
			},
		}

		provider = new AgentManagerProvider(context, outputChannel, providerStub as any)
		runtimeRegistry = (provider as any).registry

		// Inject mocks
		;(provider as any).processHandler = mockProcessHandler
		;(provider as any).panel = mockPanel
		;(provider as any).registry = registry
	})

	it("sendMessage surfaces stdin errors", async () => {
		mockProcessHandler.hasStdin.mockReturnValue(true)
		mockProcessHandler.writeToStdin.mockRejectedValue(new Error("boom"))

		await expect(provider.sendMessage("sess", "hello")).rejects.toThrow("boom")

		expect(mockProcessHandler.writeToStdin).toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Failed to send message to agent: boom")
	})

	it("cancelSession falls back to stopProcess when stdin missing", async () => {
		mockProcessHandler.hasStdin.mockReturnValue(false)

		await provider.cancelSession("sess")

		expect(mockProcessHandler.stopProcess).toHaveBeenCalledWith("sess")
	})

	it("respondToApproval surfaces stdin errors", async () => {
		mockProcessHandler.hasStdin.mockReturnValue(true)
		mockProcessHandler.writeToStdin.mockRejectedValue(new Error("denied"))

		await expect(provider.respondToApproval("sess", true, "ok")).rejects.toThrow("denied")

		expect(vscode.window.showErrorMessage).toHaveBeenLastCalledWith("Failed to send approval-yes to agent: denied")
	})

	// kilocode_change start
	it("performStartAgentSession preserves provider-facing actions for planner outcomes", async () => {
		const startOptions = {
			parallelMode: true,
			labelOverride: "Worker A",
			sessionId: "session-1",
			helperProfile: "helper-a",
			sessionGroup: {
				groupId: "group-1",
				rootSessionId: "root-1",
				label: "Swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		}
		const spawnPlan = {
			prompt: "Implement feature",
			workspace: "/mock/workspace",
			processStartTime: 123,
			spawnOptions: {
				sessionId: "session-1",
				label: "Worker A",
				parallelMode: true,
			},
		}
		const planStartSession = vi
			.fn()
			.mockResolvedValueOnce({ kind: "failed", reason: "missing-workspace" })
			.mockResolvedValueOnce({
				kind: "spawn",
				spawnPlan,
				groupEvent: {
					groupId: "group-1",
					sessionId: "session-1",
					label: "Worker A",
				},
			})
		const publishGroupEvent = vi.fn()
		const spawnAgentWithCommonSetup = vi.fn().mockResolvedValue(undefined)

		;(provider as any).sessionSpawnPlanner = { planStartSession }
		;(provider as any).publishGroupEvent = publishGroupEvent
		;(provider as any).spawnAgentWithCommonSetup = spawnAgentWithCommonSetup

		await (provider as any).performStartAgentSession("Implement feature", startOptions)
		await (provider as any).performStartAgentSession("Implement feature", startOptions)

		expect(planStartSession).toHaveBeenCalledTimes(2)
		expect(planStartSession).toHaveBeenNthCalledWith(1, {
			prompt: "Implement feature",
			options: startOptions,
		})
		expect(planStartSession).toHaveBeenNthCalledWith(2, {
			prompt: "Implement feature",
			options: startOptions,
		})
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Please open a folder before starting an agent.")
		expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({ type: "agentManager.startSessionFailed" })
		expect(publishGroupEvent).toHaveBeenCalledTimes(1)
		expect(publishGroupEvent).toHaveBeenCalledWith("group-1", "session-1", "creating", "Worker A")
		expect(spawnAgentWithCommonSetup).toHaveBeenCalledTimes(1)
		expect(spawnAgentWithCommonSetup).toHaveBeenCalledWith(spawnPlan, expect.any(Function))
	})
	// kilocode_change end

	// kilocode_change start
	it("resumeSession preserves provider-facing actions for orchestrator plans", async () => {
		registry.createSession("resume-1", "Saved prompt", Date.now(), {
			labelOverride: "Saved label",
			mode: "architect",
		})

		const sendMessage = vi.fn().mockResolvedValue(undefined)
		const spawnAgentWithCommonSetup = vi.fn().mockResolvedValue(undefined)
		const buildNormalizedSpawnPlan = vi.fn().mockResolvedValue({
			prompt: "Resume work",
			workspace: "/mock/workspace",
			processStartTime: 123,
			spawnOptions: {
				sessionId: "resume-1",
				label: "Saved label",
				mode: "code",
			},
		})
		const planResumeSession = vi
			.fn()
			.mockResolvedValueOnce({ kind: "send-message" })
			.mockResolvedValueOnce({ kind: "queued" })
			.mockResolvedValueOnce({
				kind: "spawn",
				prompt: "Resume work",
				spawnOptions: {
					sessionId: "resume-1",
					label: "Saved label",
					mode: "code",
				},
			})

		;(provider as any).sendMessage = sendMessage
		;(provider as any).spawnAgentWithCommonSetup = spawnAgentWithCommonSetup
		;(provider as any).resumeOrchestrator = { planResumeSession }
		;(provider as any).sessionSpawnPlanner = { buildNormalizedSpawnPlan }

		await provider.resumeSession("resume-1", "Resume work", "Manual label", ["img-1"])
		await provider.resumeSession("resume-1", "Resume work", "Manual label", ["img-1"])
		await provider.resumeSession("resume-1", "Resume work", "Manual label", ["img-1"])

		expect(planResumeSession).toHaveBeenCalledTimes(3)
		expect(planResumeSession).toHaveBeenNthCalledWith(1, {
			sessionId: "resume-1",
			content: "Resume work",
			sessionLabel: "Manual label",
			images: ["img-1"],
			session: expect.objectContaining({
				sessionId: "resume-1",
				label: "Saved label",
				prompt: "Saved prompt",
				mode: "architect",
			}),
		})
		expect(sendMessage).toHaveBeenCalledTimes(1)
		expect(sendMessage).toHaveBeenCalledWith("resume-1", "Resume work", undefined, ["img-1"])
		expect(buildNormalizedSpawnPlan).toHaveBeenCalledTimes(1)
		expect(buildNormalizedSpawnPlan).toHaveBeenCalledWith({
			prompt: "Resume work",
			options: {
				sessionId: "resume-1",
				label: "Saved label",
				mode: "code",
			},
		})
		expect(spawnAgentWithCommonSetup).toHaveBeenCalledTimes(1)
		expect(spawnAgentWithCommonSetup).toHaveBeenCalledWith(
			{
				prompt: "Resume work",
				workspace: "/mock/workspace",
				processStartTime: 123,
				spawnOptions: {
					sessionId: "resume-1",
					label: "Saved label",
					mode: "code",
				},
			},
			expect.any(Function),
		)
	})
	// kilocode_change end

	// kilocode_change start
	it("resumeSession reports failure when no normalized spawn plan can be built", async () => {
		registry.createSession("resume-2", "Saved prompt", Date.now(), {
			labelOverride: "Saved label",
			mode: "architect",
		})

		const spawnAgentWithCommonSetup = vi.fn().mockResolvedValue(undefined)
		const buildNormalizedSpawnPlan = vi.fn().mockResolvedValue(undefined)
		const planResumeSession = vi.fn().mockResolvedValue({
			kind: "spawn",
			prompt: "Resume work",
			spawnOptions: {
				sessionId: "resume-2",
				label: "Saved label",
				mode: "code",
			},
		})

		;(provider as any).spawnAgentWithCommonSetup = spawnAgentWithCommonSetup
		;(provider as any).resumeOrchestrator = { planResumeSession }
		;(provider as any).sessionSpawnPlanner = { buildNormalizedSpawnPlan }

		await provider.resumeSession("resume-2", "Resume work")

		expect(buildNormalizedSpawnPlan).toHaveBeenCalledWith({
			prompt: "Resume work",
			options: {
				sessionId: "resume-2",
				label: "Saved label",
				mode: "code",
			},
		})
		expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({ type: "agentManager.startSessionFailed" })
		expect(spawnAgentWithCommonSetup).not.toHaveBeenCalled()
	})
	// kilocode_change end

	// kilocode_change start
	it("reports background subagent capacity and launches with target session id", async () => {
		;(provider as any).hasSessionLaunchCapacity = vi.fn(() => true)
		;(provider as any).hasQueueKeyCapacity = vi.fn(() => true)
		;(provider as any).startAgentSession = vi.fn().mockResolvedValue(undefined)

		const request: SubagentLaunchRequest = {
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			targetTaskId: "child-1",
			mode: "code",
			handoff: { summary: "Do work", context: ["ctx"] },
			execution: "background",
			isolation: "shared",
			relayPolicy: "parent_only",
		}
		const statusListener = vi.fn()
		provider.onBackgroundSubagentStatus(statusListener)

		expect(provider.hasBackgroundSubagentCapacity(request)).toBe(true)

		const started = await provider.startBackgroundSubagent(request)

		expect((provider as any).startAgentSession).toHaveBeenCalledWith(
			expect.stringContaining("Do work"),
			expect.objectContaining({ sessionId: "child-1", mode: "code" }),
		)
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "child-1",
				sessionId: "child-1",
				state: "running",
				message: "Background subagent started",
			}),
		)
		expect(started).toEqual({ taskId: "child-1", sessionId: "child-1", status: "running" })
	})
	// kilocode_change end

	it("normalizes legacy background requests before persisting bindings", async () => {
		;(provider as any).hasSessionLaunchCapacity = vi.fn(() => true)
		;(provider as any).hasQueueKeyCapacity = vi.fn(() => true)
		;(provider as any).startAgentSession = vi.fn().mockResolvedValue(undefined)

		const legacyRequest = {
			parentTaskId: "parent-legacy",
			rootTaskId: "root-legacy",
			mode: "code",
			handoff: { summary: "Do legacy work" },
		} as any

		const started = await provider.startBackgroundSubagent(legacyRequest)

		expect((provider as any).startAgentSession).toHaveBeenCalledWith(
			"Do legacy work",
			expect.objectContaining({
				sessionId: "parent-legacy",
				mode: "code",
				parallelMode: false,
				helperProfile: undefined,
			}),
		)
		expect((provider as any).backgroundSessionBindings.get("parent-legacy")).toEqual({
			request: expect.objectContaining({
				parentTaskId: "parent-legacy",
				rootTaskId: "root-legacy",
				execution: "foreground",
				isolation: "auto",
				relayPolicy: "parent_only",
			}),
			taskId: "parent-legacy",
		})
		expect(started).toEqual({ taskId: "parent-legacy", sessionId: "parent-legacy", status: "running" })
	})

	it("propagates helper profiles through background launches", async () => {
		;(provider as any).hasSessionLaunchCapacity = vi.fn(() => true)
		;(provider as any).hasQueueKeyCapacity = vi.fn(() => true)
		;(provider as any).startAgentSession = vi.fn().mockResolvedValue(undefined)

		const request: SubagentLaunchRequest = {
			parentTaskId: "parent-helper",
			rootTaskId: "root-helper",
			targetTaskId: "child-helper",
			mode: "code",
			handoff: { summary: "Do helper work" },
			execution: "background",
			isolation: "shared",
			relayPolicy: "parent_only",
			helperProfile: "helper-profile",
		}

		await provider.startBackgroundSubagent(request)

		expect((provider as any).startAgentSession).toHaveBeenCalledWith(
			expect.stringContaining("Do helper work"),
			expect.objectContaining({
				sessionId: "child-helper",
				helperProfile: "helper-profile",
			}),
		)
		expect((provider as any).backgroundSessionBindings.get("child-helper").request).toEqual(
			expect.objectContaining({ helperProfile: "helper-profile" }),
		)
	})

	it("falls back to active api configuration when helper profile lookup is unavailable", async () => {
		const providerSettingsManager = (provider as any).provider.providerSettingsManager
		providerSettingsManager.getProfile.mockRejectedValue(new Error("missing profile"))

		const apiConfiguration = await (provider as any).getApiConfigurationForCli("missing-helper")

		expect(providerSettingsManager.getProfile).toHaveBeenCalledWith({ name: "missing-helper" })
		expect((provider as any).provider.getState).toHaveBeenCalled()
		expect(apiConfiguration).toEqual({ apiProvider: "kilocode" })
		expect(output).toContain(
			"[AgentManager] Helper profile 'missing-helper' unavailable, falling back to active configuration: missing profile",
		)
	})

	it("returns helper profile api configuration when lookup succeeds", async () => {
		const providerSettingsManager = (provider as any).provider.providerSettingsManager
		const initialGetStateCallCount = (provider as any).provider.getState.mock.calls.length
		providerSettingsManager.getProfile.mockResolvedValue({
			name: "helper-profile",
			apiProvider: "openrouter",
			kilocodeToken: "helper-token",
		})

		const apiConfiguration = await (provider as any).getApiConfigurationForCli("helper-profile")

		expect(providerSettingsManager.getProfile).toHaveBeenCalledWith({ name: "helper-profile" })
		expect((provider as any).provider.getState.mock.calls.length).toBe(initialGetStateCallCount)
		expect(apiConfiguration).toEqual({ apiProvider: "openrouter", kilocodeToken: "helper-token" })
	})

	it("restores legacy persisted bindings with normalized defaults and fallback task ids", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "parent-restore",
					taskId: "stale-child-id",
					request: {
						parentTaskId: "parent-restore",
						rootTaskId: "root-restore",
						mode: "code",
						handoff: { summary: "Resume legacy work" },
					},
					lastKnownState: "paused",
					updatedAt: 321,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "parent-restore",
				rootTaskId: "root-restore",
				parentTaskId: "root-restore",
				number: 1,
				ts: 100,
				task: "Resume legacy work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "paused",
				pauseReason: "Waiting for resume",
			},
		])

		await (provider as any).restorePersistedBackgroundBindings()

		expect((provider as any).backgroundSessionBindings.get("parent-restore")).toEqual({
			request: expect.objectContaining({
				parentTaskId: "parent-restore",
				rootTaskId: "root-restore",
				execution: "foreground",
				isolation: "auto",
				relayPolicy: "parent_only",
			}),
			taskId: "parent-restore",
		})
		expect((provider as any).registry.getSession("parent-restore")).toMatchObject({
			taskId: "parent-restore",
			rootTaskId: "root-restore",
			parentTaskId: "parent-restore",
			status: "stopped",
			lifecycleStatus: "paused",
			recoveryState: "recoverable",
		})
	})

	it("restores paused background binding from persisted recovery state", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "child-1",
					taskId: "child-1",
					request: {
						parentTaskId: "parent-1",
						rootTaskId: "root-1",
						targetTaskId: "child-1",
						mode: "code",
						handoff: { summary: "Do work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "paused",
					updatedAt: 123,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-1",
				rootTaskId: "root-1",
				parentTaskId: "parent-1",
				number: 1,
				ts: 100,
				task: "Do work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "paused",
				pauseReason: "Waiting for resume",
				pausedAt: 123,
				resumeContextSummary: "Resume from checkpoint",
			},
		])

		await (provider as any).restorePersistedBackgroundBindings()

		expect((provider as any).backgroundSessionBindings.get("child-1")).toBeDefined()
		expect((provider as any).registry.getSession("child-1")).toMatchObject({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			status: "stopped",
			lifecycleStatus: "paused",
			recoveryState: "recoverable",
			pendingReaction: "resume",
		})
	})

	// kilocode_change start
	it("resumes restored paused background bindings from persisted resume handoff", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "child-restored",
					taskId: "child-restored",
					request: {
						parentTaskId: "parent-restored",
						rootTaskId: "root-restored",
						targetTaskId: "child-restored",
						mode: "code",
						handoff: { summary: "Do fallback work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "paused",
					updatedAt: 456,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-restored",
				rootTaskId: "root-restored",
				parentTaskId: "parent-restored",
				number: 1,
				ts: 100,
				task: "Do fallback work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "paused",
				pauseReason: "Waiting for resume",
				resumeContextSummary: "Resume from persisted summary",
			},
		])
		;(provider as any).resumeSession = vi.fn().mockResolvedValue(undefined)

		await (provider as any).restorePersistedBackgroundBindings()
		await provider.resumeBackgroundSubagent("child-restored")

		expect((provider as any).resumeSession).toHaveBeenCalledWith(
			"child-restored",
			"Resume from persisted summary",
			"Background: code",
		)
		expect((provider as any).provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-restored",
				lifecycleState: "running",
				pauseReason: undefined,
				pausedAt: undefined,
			}),
		)
		expect((provider as any).registry.getSession("child-restored")).toMatchObject({
			lifecycleStatus: "active",
			activityState: "active",
			recoveryState: undefined,
			pendingReaction: undefined,
			restartHandoff: "Resume from persisted summary",
		})
	})
	// kilocode_change end

	it("restores running-like background bindings as recoverable after reload", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "child-running",
					taskId: "child-running",
					request: {
						parentTaskId: "parent-2",
						rootTaskId: "root-2",
						targetTaskId: "child-running",
						mode: "code",
						handoff: { summary: "Keep going" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "running",
					updatedAt: 456,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-running",
				rootTaskId: "root-2",
				parentTaskId: "parent-2",
				number: 2,
				ts: 200,
				task: "Keep going",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])

		await (provider as any).restorePersistedBackgroundBindings()

		expect((provider as any).registry.getSession("child-running")).toMatchObject({
			taskId: "child-running",
			rootTaskId: "root-2",
			parentTaskId: "parent-2",
			status: "stopped",
			lifecycleStatus: "recoverable",
			activityState: "active",
			recoveryState: "recoverable",
		})
		expect(provider.listBackgroundSubagentBindings()).toEqual([
			expect.objectContaining({
				taskId: "child-running",
				sessionId: "child-running",
				status: "paused",
			}),
		])
	})

	it("lists paused and recoverable background bindings consistently after reload", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "child-paused",
					taskId: "child-paused",
					request: {
						parentTaskId: "parent-a",
						rootTaskId: "root-a",
						targetTaskId: "child-paused",
						mode: "code",
						handoff: { summary: "Resume paused work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "paused",
					updatedAt: 100,
				},
				{
					sessionId: "child-recoverable",
					taskId: "child-recoverable",
					request: {
						parentTaskId: "parent-b",
						rootTaskId: "root-b",
						targetTaskId: "child-recoverable",
						mode: "code",
						handoff: { summary: "Recover running work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "running",
					updatedAt: 200,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-paused",
				rootTaskId: "root-a",
				parentTaskId: "parent-a",
				number: 1,
				ts: 100,
				task: "Resume paused work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "paused",
				pauseReason: "Waiting for resume",
			},
			{
				id: "child-recoverable",
				rootTaskId: "root-b",
				parentTaskId: "parent-b",
				number: 2,
				ts: 200,
				task: "Recover running work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])

		await (provider as any).restorePersistedBackgroundBindings()

		expect(provider.listBackgroundSubagentBindings()).toEqual([
			expect.objectContaining({ taskId: "child-paused", sessionId: "child-paused", status: "paused" }),
			expect.objectContaining({ taskId: "child-recoverable", sessionId: "child-recoverable", status: "paused" }),
		])
		expect((provider as any).registry.getSession("child-paused")).toMatchObject({
			recoveryState: "recoverable",
			pendingReaction: "resume",
		})
		expect((provider as any).registry.getSession("child-recoverable")).toMatchObject({
			lifecycleStatus: "recoverable",
			recoveryState: "recoverable",
		})
	})

	it("does not restore completed background bindings into active coordinator bindings after reload", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "child-completed",
					taskId: "child-completed",
					request: {
						parentTaskId: "parent-3",
						rootTaskId: "root-3",
						targetTaskId: "child-completed",
						mode: "code",
						handoff: { summary: "Finished work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "completed",
					updatedAt: 789,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-completed",
				rootTaskId: "root-3",
				parentTaskId: "parent-3",
				number: 3,
				ts: 300,
				task: "Finished work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "completed",
			},
		])

		await (provider as any).restorePersistedBackgroundBindings()

		expect((provider as any).backgroundSessionBindings.get("child-completed")).toBeUndefined()
		expect(provider.listBackgroundSubagentBindings()).toEqual([])
		expect((provider as any).registry.getSession("child-completed")).toBeUndefined()
		expect((provider as any).context.workspaceState.update).toHaveBeenCalledWith(
			"kilocode.agentManager.recoveryState",
			{ backgroundBindings: [] },
		)
	})

	it("does not restore cancelled background bindings into active coordinator bindings after reload", async () => {
		const persisted = {
			backgroundBindings: [
				{
					sessionId: "child-cancelled",
					taskId: "child-cancelled",
					request: {
						parentTaskId: "parent-4",
						rootTaskId: "root-4",
						targetTaskId: "child-cancelled",
						mode: "code",
						handoff: { summary: "Cancelled work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					lastKnownState: "cancelled",
					updatedAt: 987,
				},
			],
		}
		;((provider as any).context.workspaceState.get as Mock).mockReturnValue(persisted)
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-cancelled",
				rootTaskId: "root-4",
				parentTaskId: "parent-4",
				number: 4,
				ts: 400,
				task: "Cancelled work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lifecycleState: "cancelled",
			},
		])

		await (provider as any).restorePersistedBackgroundBindings()

		expect((provider as any).backgroundSessionBindings.get("child-cancelled")).toBeUndefined()
		expect(provider.listBackgroundSubagentBindings()).toEqual([])
		expect((provider as any).registry.getSession("child-cancelled")).toBeUndefined()
		expect((provider as any).context.workspaceState.update).toHaveBeenCalledWith(
			"kilocode.agentManager.recoveryState",
			{ backgroundBindings: [] },
		)
	})

	// kilocode_change start
	it("emits successful background completion through provider seam, consumes the binding immediately, and posts completion state event", async () => {
		registry.createSession("child-success", "background task", Date.now(), {
			taskId: "child-success",
			rootTaskId: "root-success",
			parentTaskId: "parent-success",
		})
		;(provider as any).backgroundSessionBindings.set("child-success", {
			request: {
				parentTaskId: "parent-success",
				rootTaskId: "root-success",
				targetTaskId: "child-success",
				mode: "code",
				handoff: { summary: "Do work" },
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
			},
			taskId: "child-success",
		})
		;(provider as any).sessionMessages.set("child-success", [
			{ ts: 1, type: "say", say: "completion_result", text: "Completed from runtime", partial: false },
		])

		const statusListener = vi.fn()
		const resultListener = vi.fn()
		provider.onBackgroundSubagentStatus(statusListener)
		provider.onBackgroundSubagentResult(resultListener)
		;(provider as any).processHandlerCallbacks.onSessionCompleted("child-success", 0)

		expect(registry.getSession("child-success")).toMatchObject({
			lifecycleStatus: "completed",
			activityState: "idle",
			needsAttention: false,
			recoveryState: undefined,
			pendingReaction: undefined,
		})
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "child-success",
				sessionId: "child-success",
				state: "completed",
			}),
		)
		expect(resultListener).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "child-success",
				sessionId: "child-success",
				status: "completed",
				summary: "Completed from runtime",
				output: "Completed from runtime",
			}),
		)
		expect((provider as any).backgroundSessionBindings.has("child-success")).toBe(false)
		expect((provider as any).context.workspaceState.update).toHaveBeenCalledWith(
			"kilocode.agentManager.recoveryState",
			{ backgroundBindings: [] },
		)
		expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.stateEvent",
				sessionId: "child-success",
				eventType: "ask_completion_result",
			}),
		)

		await provider.releaseBackgroundSubagentBinding("child-success")

		expect((provider as any).backgroundSessionBindings.has("child-success")).toBe(false)
		expect((provider as any).context.workspaceState.update).toHaveBeenLastCalledWith(
			"kilocode.agentManager.recoveryState",
			{ backgroundBindings: [] },
		)
	})

	it("marks failed background exit as failed and does not emit completion result", () => {
		registry.createSession("child-failed", "background task", Date.now(), {
			taskId: "child-failed",
			rootTaskId: "root-failed",
			parentTaskId: "parent-failed",
		})
		registry.updateSessionStatus("child-failed", "error")
		;(provider as any).backgroundSessionBindings.set("child-failed", {
			request: {
				parentTaskId: "parent-failed",
				rootTaskId: "root-failed",
				targetTaskId: "child-failed",
				mode: "code",
				handoff: { summary: "Do work" },
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
			},
			taskId: "child-failed",
		})

		const statusListener = vi.fn()
		const resultListener = vi.fn()
		provider.onBackgroundSubagentStatus(statusListener)
		provider.onBackgroundSubagentResult(resultListener)
		;(provider as any).processHandlerCallbacks.onSessionCompleted("child-failed", 1)

		expect(registry.getSession("child-failed")).toMatchObject({
			lifecycleStatus: "failed",
			recoveryState: undefined,
			pendingReaction: undefined,
		})
		expect(statusListener).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "child-failed",
				sessionId: "child-failed",
				state: "failed",
			}),
		)
		expect(resultListener).not.toHaveBeenCalled()
		expect(mockPanel.webview.postMessage).not.toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.stateEvent",
				sessionId: "child-failed",
				eventType: "ask_completion_result",
			}),
		)
	})

	it("pauses and resumes background subagent sessions through runtime state", async () => {
		;(provider as any).provider.getTaskHistory = vi.fn().mockReturnValue([
			{
				id: "child-1",
				rootTaskId: "root-1",
				parentTaskId: "parent-1",
				number: 1,
				ts: 100,
				task: "background task",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
		])
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
		})
		;(provider as any).backgroundSessionBindings.set("child-1", {
			request: {
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				targetTaskId: "child-1",
				mode: "code",
				handoff: { summary: "Do work" },
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
			},
			taskId: "child-1",
		})
		mockProcessHandler.hasStdin.mockReturnValue(true)
		mockProcessHandler.writeToStdin.mockResolvedValue(undefined)
		;(provider as any).resumeSession = vi.fn().mockResolvedValue(undefined)

		await provider.pauseSession("child-1")
		expect(mockProcessHandler.writeToStdin).toHaveBeenCalledWith(
			"child-1",
			expect.objectContaining({ type: "pauseTask", text: "child-1" }),
		)
		expect(registry.getSession("child-1")).toMatchObject({
			lifecycleStatus: "paused",
			recoveryState: "recoverable",
			pendingReaction: "resume",
		})
		expect((provider as any).provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-1",
				lifecycleState: "paused",
				pauseReason: "Paused by user",
			}),
		)

		await provider.resumeBackgroundSubagent("child-1")
		expect((provider as any).resumeSession).toHaveBeenCalledWith("child-1", "Do work", "background task")
		expect(registry.getSession("child-1")).toMatchObject({
			lifecycleStatus: "active",
			recoveryState: undefined,
			pendingReaction: undefined,
		})
		expect((provider as any).provider.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "child-1",
				lifecycleState: "running",
				pauseReason: undefined,
				pausedAt: undefined,
			}),
		)
	})

	it("lists persisted background bindings for coordinator rebinding after reload", () => {
		registry.createSession("child-1", "background task", Date.now(), {
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			lifecycleStatus: "paused",
			activityState: "paused",
		})
		;(provider as any).backgroundSessionBindings.set("child-1", {
			request: {
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				targetTaskId: "child-1",
				mode: "code",
				handoff: { summary: "Do work" },
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
			},
			taskId: "child-1",
		})

		expect(provider.listBackgroundSubagentBindings()).toEqual([
			expect.objectContaining({
				taskId: "child-1",
				sessionId: "child-1",
				status: "paused",
			}),
		])
	})

	// kilocode_change start
	it("preserves runtime callback delegation through the provider seam for resumed session startup and sync events", async () => {
		runtimeRegistry.createSession("session-1", "Prompt", Date.now(), {
			parallelMode: true,
			mode: "code",
			sessionGroup: { groupId: "group-1", rootSessionId: "root-1", label: "Worker A" },
		})
		;(provider as any).sessionMessages.set("session-1", [
			{ ts: 10, type: "say", say: "text", text: "resume history", partial: false },
		])

		const postMessage = vi.spyOn(provider as any, "postMessage")
		const postStateToWebview = vi.spyOn(provider as any, "postStateToWebview")
		const handleWorktreeSessionCreated = vi
			.spyOn(provider as any, "handleWorktreeSessionCreated")
			.mockResolvedValue(undefined)
		;(telemetry.captureAgentManagerSessionStarted as Mock).mockClear()
		;(provider as any).processHandlerCallbacks.onSessionCreated(false, { prompt: "resume prompt" })
		;(provider as any).processHandlerCallbacks.onModeChanged("session-1", "architect", "code")
		;(provider as any).processHandlerCallbacks.onPendingSessionChanged({
			prompt: "Prompt",
			label: "Prompt",
			startTime: 123,
		})
		;(provider as any).processHandlerCallbacks.onWorktreeSessionCreated("session-1", "/tmp/worktree")
		await Promise.resolve()

		expect((provider as any).sessionMessages.get("session-1")).toEqual([
			expect.objectContaining({ ts: 10, text: "resume history" }),
		])
		expect((provider as any).firstApiReqStarted.get("session-1")).toBe(true)
		expect((provider as any).lastPostedChatMessages.get("session-1")).toBe(
			JSON.stringify([{ ts: 10, type: "say", say: "text", text: "resume history", partial: false }]),
		)
		expect(telemetry.captureAgentManagerSessionStarted).toHaveBeenCalledWith("session-1", true)
		expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "agentManager.groupEvent",
				groupId: "group-1",
				sessionId: "session-1",
				eventType: "running",
				summary: "Prompt",
			}),
		)
		expect(runtimeRegistry.getSession("session-1")).toMatchObject({ mode: "architect" })
		expect(postMessage).toHaveBeenCalledWith({
			type: "agentManager.modeChanged",
			sessionId: "session-1",
			mode: "architect",
			previousMode: "code",
		})
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
		expect(postMessage).toHaveBeenCalledWith({
			type: "agentManager.pendingSession",
			pendingSession: { prompt: "Prompt", label: "Prompt", startTime: 123 },
		})
		expect(handleWorktreeSessionCreated).toHaveBeenCalledWith("session-1", "/tmp/worktree")
	})

	it("rebinds renamed background sessions through the provider seam without disturbing provider maps", () => {
		registry.createSession("new-session", "background task", Date.now(), {
			taskId: "task-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			lifecycleStatus: "paused",
			activityState: "paused",
		})
		;(provider as any).backgroundSessionBindings.set("old-session", {
			request: {
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				targetTaskId: "task-1",
				mode: "code",
				handoff: { summary: "Do work" },
				execution: "background",
				isolation: "shared",
				relayPolicy: "parent_only",
			},
			taskId: "task-1",
		})
		;(provider as any).sessionMessages.set("old-session", [
			{ ts: 1, type: "say", say: "text", text: "hello", partial: false },
		])
		;(provider as any).firstApiReqStarted.set("old-session", true)
		;(provider as any).processStartTimes.set("old-session", 123)
		;(provider as any).sendingMessageMap.set("old-session", "message-1")
		;(provider as any).processHandlerCallbacks.onSessionRenamed("old-session", "new-session")

		expect((provider as any).sessionMessages.has("old-session")).toBe(false)
		expect((provider as any).sessionMessages.get("new-session")).toEqual([
			expect.objectContaining({ text: "hello" }),
		])
		expect((provider as any).firstApiReqStarted.has("old-session")).toBe(false)
		expect((provider as any).firstApiReqStarted.get("new-session")).toBe(true)
		expect((provider as any).processStartTimes.has("old-session")).toBe(false)
		expect((provider as any).processStartTimes.get("new-session")).toBe(123)
		expect((provider as any).sendingMessageMap.has("old-session")).toBe(false)
		expect((provider as any).sendingMessageMap.get("new-session")).toBe("message-1")
		expect((provider as any).backgroundSessionBindings.has("old-session")).toBe(false)
		expect((provider as any).backgroundSessionBindings.get("new-session")).toEqual({
			request: expect.objectContaining({ targetTaskId: "task-1" }),
			taskId: "task-1",
		})
		expect(provider.listBackgroundSubagentBindings()).toEqual([
			expect.objectContaining({
				taskId: "task-1",
				sessionId: "new-session",
				status: "paused",
			}),
		])
	})
	// kilocode_change end
})
