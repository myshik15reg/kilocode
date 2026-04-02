import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"

import { API } from "../api"
import { ClineProvider } from "../../core/webview/ClineProvider"

vi.mock("vscode")
vi.mock("../../core/webview/ClineProvider")

describe("API - ResumeTask", () => {
	let api: API
	let mockOutputChannel: vscode.OutputChannel
	let mockProvider: ClineProvider
	let mockResumeTask: ReturnType<typeof vi.fn>
	let mockGetTaskWithId: ReturnType<typeof vi.fn>
	let mockCreateTaskWithHistoryItem: ReturnType<typeof vi.fn>
	let mockPostMessageToWebview: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
		} as unknown as vscode.OutputChannel

		mockResumeTask = vi.fn()
		mockGetTaskWithId = vi.fn()
		mockCreateTaskWithHistoryItem = vi.fn()
		mockPostMessageToWebview = vi.fn()

		mockProvider = {
			context: {} as vscode.ExtensionContext,
			on: vi.fn(),
			getCurrentTaskStack: vi.fn().mockReturnValue([]),
			viewLaunched: true,
			resumeTask: mockResumeTask,
			getTaskWithId: mockGetTaskWithId,
			createTaskWithHistoryItem: mockCreateTaskWithHistoryItem,
			postMessageToWebview: mockPostMessageToWebview,
		} as unknown as ClineProvider

		api = new API(mockOutputChannel, mockProvider, undefined, false)
	})

	it("routes resume through provider.resumeTask so task-control cascade logic runs", async () => {
		await api.resumeTask("parent-1")

		expect(mockResumeTask).toHaveBeenCalledWith("parent-1")
	})

	it("does not use legacy history rehydration path when resuming", async () => {
		await api.resumeTask("parent-1")

		expect(mockGetTaskWithId).not.toHaveBeenCalled()
		expect(mockCreateTaskWithHistoryItem).not.toHaveBeenCalled()
		expect(mockPostMessageToWebview).not.toHaveBeenCalled()
		expect(mockResumeTask).toHaveBeenCalledTimes(1)
	})
})
