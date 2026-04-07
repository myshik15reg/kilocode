import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"

vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
	},
	env: {
		openExternal: vi.fn().mockResolvedValue(true),
		clipboard: {
			writeText: vi.fn().mockResolvedValue(undefined),
		},
	},
	Uri: {
		parse: vi.fn((rawUrl: string) => {
			const parsed = new URL(rawUrl)
			return {
				scheme: parsed.protocol.replace(/:$/, ""),
				toString: () => rawUrl,
			}
		}),
	},
}))

vi.mock("../../../shared/kilocode/cli-sessions/core/SessionManager", () => ({
	SessionManager: {
		init: vi.fn(),
	},
}))

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string, args?: Record<string, unknown>) => {
		if (args?.url && typeof args.url === "string") {
			return `${key}:${args.url}`
		}
		return key
	}),
}))

import type { ClineProvider } from "../ClineProvider"
import { webviewMessageHandler } from "../webviewMessageHandler"
import { SessionManager } from "../../../shared/kilocode/cli-sessions/core/SessionManager"

describe("webviewMessageHandler security boundaries", () => {
	let provider: Partial<ClineProvider>

	beforeEach(() => {
		vi.clearAllMocks()
		provider = {
			contextProxy: {
				getValue: vi.fn(),
				setValue: vi.fn(),
			} as any,
			getTaskHistory: vi.fn().mockReturnValue([{ id: "visible-task" }]),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			postMessageToWebview: vi.fn().mockResolvedValue(undefined),
			updateTaskHistory: vi.fn().mockResolvedValue(undefined),
			log: vi.fn(),
		}

		vi.mocked(SessionManager.init).mockReturnValue({
			sessionId: "active-session",
			shareSession: vi.fn().mockResolvedValue({ share_id: "share-123" }),
			getSessionFromTask: vi.fn().mockResolvedValue("session-from-visible-task"),
		} as any)
	})

	it("rejects generic host state writes from untrusted webview messages", async () => {
		await webviewMessageHandler(
			provider as ClineProvider,
			{ type: "updateGlobalState", stateKey: "currentApiConfigName", stateValue: "attacker" } as any,
		)

		expect(provider.contextProxy?.setValue).not.toHaveBeenCalled()
		expect(provider.postStateToWebview).not.toHaveBeenCalled()
		expect(provider.log).toHaveBeenCalledWith(expect.stringContaining("Rejected updateGlobalState"))
	})

	it("rejects task-history mutation from the webview channel", async () => {
		await webviewMessageHandler(
			provider as ClineProvider,
			{ type: "addTaskToHistory", historyItem: { id: "forged-task" } } as any,
		)

		expect(provider.updateTaskHistory).not.toHaveBeenCalled()
		expect(provider.postStateToWebview).not.toHaveBeenCalled()
		expect(provider.log).toHaveBeenCalledWith(expect.stringContaining("Rejected addTaskToHistory"))
	})

	it("allows trusted internal task-history mutation", async () => {
		const historyItem = { id: "trusted-task" }

		await webviewMessageHandler(
			provider as ClineProvider,
			{ type: "addTaskToHistory", historyItem } as any,
			undefined,
			{ source: "internal" },
		)

		expect(provider.updateTaskHistory).toHaveBeenCalledWith(historyItem)
		expect(provider.postStateToWebview).toHaveBeenCalled()
	})

	it("shares only the active session instead of a forged session id", async () => {
		const sessionService = {
			sessionId: "active-session",
			shareSession: vi.fn().mockResolvedValue({ share_id: "share-123" }),
			getSessionFromTask: vi.fn().mockResolvedValue("session-from-visible-task"),
		}
		vi.mocked(SessionManager.init).mockReturnValue(sessionService as any)

		await webviewMessageHandler(
			provider as ClineProvider,
			{
				type: "sessionShare",
				sessionId: "attacker-session",
			} as any,
		)

		expect(sessionService.shareSession).toHaveBeenCalledWith("active-session")
		expect(sessionService.shareSession).not.toHaveBeenCalledWith("attacker-session")
		expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith("https://app.kilo.ai/share/share-123")
	})

	it("rejects task session sharing outside the visible history scope", async () => {
		;(provider.getTaskHistory as ReturnType<typeof vi.fn>).mockReturnValue([{ id: "visible-task" }])
		const sessionService = {
			shareSession: vi.fn().mockResolvedValue({ share_id: "share-123" }),
			getSessionFromTask: vi.fn().mockResolvedValue("hidden-session"),
		}
		vi.mocked(SessionManager.init).mockReturnValue(sessionService as any)

		await webviewMessageHandler(
			provider as ClineProvider,
			{
				type: "shareTaskSession",
				text: "hidden-task",
			} as any,
		)

		expect(sessionService.getSessionFromTask).not.toHaveBeenCalled()
		expect(sessionService.shareSession).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Task is not available in current workspace history",
		)
	})

	it("blocks unsupported external URI schemes", async () => {
		await webviewMessageHandler(
			provider as ClineProvider,
			{
				type: "openExternal",
				url: "file:///tmp/secret.txt",
			} as any,
		)

		expect(vscode.env.openExternal).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Unsupported external URL. Only http(s) links are allowed.",
		)
	})

	it("allows trusted http(s) external links", async () => {
		await webviewMessageHandler(
			provider as ClineProvider,
			{
				type: "openInBrowser",
				url: "https://example.com/docs",
			} as any,
		)

		expect(vscode.env.openExternal).toHaveBeenCalledWith(expect.objectContaining({ scheme: "https" }))
	})
})
