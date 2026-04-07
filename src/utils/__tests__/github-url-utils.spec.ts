import { execFile } from "child_process"
import { platform } from "os"
import * as vscode from "vscode"

vi.mock("child_process", () => ({
	execFile: vi.fn(),
}))

vi.mock("os", () => ({
	platform: vi.fn(),
}))

import { openUrlInBrowser } from "../github-url-utils"

const mockExecFile = vi.mocked(execFile)
const mockPlatform = vi.mocked(platform)

describe("openUrlInBrowser", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.env as typeof vscode.env & { clipboard: vscode.Clipboard }).clipboard = {
			readText: vi.fn().mockResolvedValue(""),
			writeText: vi.fn().mockResolvedValue(undefined),
		} as vscode.Clipboard
		mockPlatform.mockReturnValue("win32")
		vi.spyOn(vscode.env, "openExternal").mockResolvedValue(true)
		mockExecFile.mockImplementation((...args: any[]) => {
			const done = args[args.length - 1]
			done?.(null)
			return {} as never
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("launches Windows browser commands without shell interpolation", async () => {
		const url = "https://example.com/issues/new?title=a&body=b"

		await openUrlInBrowser(url)

		expect(mockExecFile).toHaveBeenCalledWith(
			"rundll32.exe",
			["url.dll,FileProtocolHandler", url],
			expect.any(Function),
		)
		expect(vscode.env.openExternal).not.toHaveBeenCalled()
	})

	it("falls back to the next Windows opener without concatenating the URL into a shell string", async () => {
		const url = "https://example.com/issues/new?title=a&body=b"
		mockExecFile
			.mockImplementationOnce((...args: any[]) => {
				const done = args[args.length - 1]
				done?.(new Error("primary failed"))
				return {} as never
			})
			.mockImplementationOnce((...args: any[]) => {
				const done = args[args.length - 1]
				done?.(null)
				return {} as never
			})

		await openUrlInBrowser(url)

		expect(mockExecFile).toHaveBeenNthCalledWith(
			1,
			"rundll32.exe",
			["url.dll,FileProtocolHandler", url],
			expect.any(Function),
		)
		expect(mockExecFile).toHaveBeenNthCalledWith(2, "explorer.exe", [url], expect.any(Function))
	})
})
