import React from "react"

import { render, screen, fireEvent } from "@/utils/test-utils"
import { vscode } from "@/utils/vscode"

import { ErrorRow } from "../ErrorRow"

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		version: "1.0.0",
		apiConfiguration: {},
	}),
}))

vi.mock("@/components/ui/hooks/useSelectedModel", () => ({
	useSelectedModel: () => ({
		provider: "test-provider",
		id: "test-model",
	}),
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const map: Record<string, string> = {
				"chat:error": "Error",
				"chat:errorDetails.title": "Error Details",
				"chat:errorDetails.copyToClipboard": "Copy to Clipboard",
				"chat:errorDetails.copied": "Copied!",
				"chat:errorDetails.diagnostics": "Get detailed error info",
			}
			return map[key] ?? key
		},
	}),
	initReactI18next: {
		type: "3rdParty",
		init: vi.fn(),
	},
}))

describe("ErrorRow diagnostics download", () => {
	it("sends downloadErrorDiagnostics message with error metadata", () => {
		const mockPostMessage = vi.mocked(vscode.postMessage)

		render(<ErrorRow type="error" message="Something went wrong" errorDetails="Detailed error body" />)

		const infoButton = screen.getByRole("button", { name: "Error Details" })
		fireEvent.click(infoButton)

		const downloadButton = screen.getByRole("button", { name: "Get detailed error info" })
		fireEvent.click(downloadButton)

		expect(mockPostMessage).toHaveBeenCalled()
		const call = mockPostMessage.mock.calls.find(([arg]) => arg.type === "downloadErrorDiagnostics")
		expect(call).toBeTruthy()
		if (!call) return

		const payload = call[0] as { type: string; values?: any }
		expect(payload.values).toBeTruthy()
		if (!payload.values) return

		expect(payload.values).toMatchObject({
			version: "1.0.0",
			provider: "test-provider",
			model: "test-model",
		})
		expect(typeof payload.values.timestamp).toBe("string")
	})

	it("uses a responsive layout for error details actions", () => {
		render(<ErrorRow type="error" message="Something went wrong" errorDetails="Detailed error body" />)

		const infoButton = screen.getByRole("button", { name: "Error Details" })
		fireEvent.click(infoButton)

		const copyButton = screen.getByRole("button", { name: "Copy to Clipboard" })
		const downloadButton = screen.getByRole("button", { name: "Get detailed error info" })
		const footer = copyButton.parentElement

		expect(footer).not.toBeNull()
		expect(footer).toHaveClass("!grid", "!grid-cols-1", "sm:!grid-cols-2")
		expect(copyButton).toHaveClass("w-full", "min-w-0", "!whitespace-normal")
		expect(downloadButton).toHaveClass("w-full", "min-w-0", "!whitespace-normal")
	})
})
