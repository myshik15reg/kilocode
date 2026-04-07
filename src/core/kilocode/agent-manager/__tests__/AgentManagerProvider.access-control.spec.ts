import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"
import { AgentManagerProvider } from "../AgentManagerProvider"

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
		clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		openExternal: vi.fn().mockResolvedValue(true),
	}
	return { window, Uri, workspace, ExtensionMode, ThemeIcon, env }
})

vi.mock("../telemetry", () => ({
	getPlatformDiagnostics: vi.fn(() => ({ platform: "win32", shell: "powershell" })),
	captureAgentManagerOpened: vi.fn(),
	captureAgentManagerSessionStarted: vi.fn(),
	captureAgentManagerSessionStopped: vi.fn(),
	captureAgentManagerLoginIssue: vi.fn(),
}))

describe("AgentManagerProvider access control", () => {
	let provider: AgentManagerProvider

	beforeEach(() => {
		vi.clearAllMocks()

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
			asAbsolutePath: (value: string) => value,
			extensionMode: 1,
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
		;(provider as any).panel = { webview: { postMessage: vi.fn() }, dispose: vi.fn() }
		;(provider as any).processHandler = {
			hasStdin: vi.fn(),
			writeToStdin: vi.fn(),
			stopProcess: vi.fn(),
			hasProcess: vi.fn(),
		}
	})

	it("allows control actions for visible local sessions", () => {
		;(provider as any).registry.createSession("local-1", "Prompt", Date.now())
		const stopAgentSession = vi.fn()
		;(provider as any).stopAgentSession = stopAgentSession
		;(provider as any).handleMessage({ type: "agentManager.stopSession", sessionId: "local-1" })

		expect(stopAgentSession).toHaveBeenCalledWith("local-1")
	})

	it("rejects control actions for out-of-scope local sessions", () => {
		;(provider as any).registry.createSession("hidden-1", "Prompt", Date.now(), {
			gitUrl: "https://example.com/other.git",
		})
		const stopAgentSession = vi.fn()
		;(provider as any).stopAgentSession = stopAgentSession
		;(provider as any).handleMessage({ type: "agentManager.stopSession", sessionId: "hidden-1" })

		expect(stopAgentSession).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Cannot stop a session outside the current workspace scope.",
		)
	})

	it("rejects group actions for groups outside the visible workspace scope", () => {
		;(provider as any).registry.createSession("hidden-2", "Prompt", Date.now(), {
			gitUrl: "https://example.com/other.git",
			sessionGroup: {
				groupId: "group-1",
				rootSessionId: "hidden-2",
				label: "Hidden group",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})
		const stopSessionGroup = vi.fn()
		;(provider as any).stopSessionGroup = stopSessionGroup
		;(provider as any).handleMessage({ type: "agentManager.stopSessionGroup", groupId: "group-1" })

		expect(stopSessionGroup).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Cannot stop a session group outside the current workspace scope.",
		)
	})

	it("allows refresh for remote sessions that were explicitly posted to the webview", () => {
		const refreshSessionMessages = vi.fn().mockResolvedValue(undefined)
		;(provider as any).refreshSessionMessages = refreshSessionMessages
		;(provider as any).visibleRemoteSessionIds = new Set(["remote-1"])
		;(provider as any).handleMessage({
			type: "agentManager.refreshSessionMessages",
			sessionId: "remote-1",
		})

		expect(refreshSessionMessages).toHaveBeenCalledWith("remote-1")
	})
})
