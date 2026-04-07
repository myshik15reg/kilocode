import { webviewMessageHandler } from "../webviewMessageHandler"
import type { ClineProvider } from "../ClineProvider"
import { runLocalAiDiagnostics } from "../localAiDiagnostics"

vi.mock("../localAiDiagnostics", () => ({
	runLocalAiDiagnostics: vi.fn(),
}))

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
	},
}))

// kilocode_change - new file

describe("webviewMessageHandler - runLocalAiDiagnostics", () => {
	const mockProvider = {
		postMessageToWebview: vi.fn(),
		contextProxy: {
			getValue: vi.fn(),
			setValue: vi.fn(),
		},
	} as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns diagnostics payload back to the webview", async () => {
		vi.mocked(runLocalAiDiagnostics).mockResolvedValue({
			ranAt: "2026-04-03T20:00:00.000Z",
			checks: [{ checkId: "ollama-service", status: "ok", title: "Ollama", message: "ok" }],
		})

		await webviewMessageHandler(mockProvider, { type: "runLocalAiDiagnostics" } as any)

		expect(runLocalAiDiagnostics).toHaveBeenCalledWith(mockProvider)
		expect(mockProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "localAiDiagnosticsResult",
			localAiDiagnostics: {
				ranAt: "2026-04-03T20:00:00.000Z",
				checks: [{ checkId: "ollama-service", status: "ok", title: "Ollama", message: "ok" }],
			},
			success: true,
		})
	})

	it("marks the response as unsuccessful when diagnostics contain failures", async () => {
		vi.mocked(runLocalAiDiagnostics).mockResolvedValue({
			ranAt: "2026-04-03T20:00:00.000Z",
			checks: [{ checkId: "local-helper-runtime", status: "failed", title: "Runtime", message: "boom" }],
		})

		await webviewMessageHandler(mockProvider, { type: "runLocalAiDiagnostics" } as any)

		expect(mockProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "localAiDiagnosticsResult",
			localAiDiagnostics: {
				ranAt: "2026-04-03T20:00:00.000Z",
				checks: [{ checkId: "local-helper-runtime", status: "failed", title: "Runtime", message: "boom" }],
			},
			success: false,
		})
	})
})
