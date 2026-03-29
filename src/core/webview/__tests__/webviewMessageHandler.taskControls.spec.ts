import { describe, it, expect, beforeEach, vi } from "vitest"

import { webviewMessageHandler } from "../webviewMessageHandler"
import type { ClineProvider } from "../ClineProvider"

describe("webviewMessageHandler - task controls", () => {
	let mockProvider: Partial<ClineProvider>

	beforeEach(() => {
		vi.clearAllMocks()
		mockProvider = {
			pauseTask: vi.fn().mockResolvedValue(undefined),
			resumeTask: vi.fn(),
			branchTask: vi.fn().mockResolvedValue({ taskId: "branch-1" } as any),
		} as Partial<ClineProvider>
	})

	it("routes pauseTask messages", async () => {
		await webviewMessageHandler(mockProvider as ClineProvider, {
			type: "pauseTask",
			text: "task-1",
		})

		expect(mockProvider.pauseTask).toHaveBeenCalledWith("task-1", undefined)
	})

	it("routes resumeTask messages", async () => {
		await webviewMessageHandler(mockProvider as ClineProvider, {
			type: "resumeTask",
			text: "task-1",
		})

		expect(mockProvider.resumeTask).toHaveBeenCalledWith("task-1")
	})

	it("routes branchTask messages", async () => {
		await webviewMessageHandler(mockProvider as ClineProvider, {
			type: "branchTask",
			text: "task-1",
			values: { message: "Follow-up", branchStrategy: "summary" },
		})

		expect(mockProvider.branchTask).toHaveBeenCalledWith("task-1", {
			message: "Follow-up",
			branchStrategy: "summary",
		})
	})
})
