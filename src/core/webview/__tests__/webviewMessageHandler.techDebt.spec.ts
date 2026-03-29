import { describe, it, expect, beforeEach, vi } from "vitest"

import { webviewMessageHandler } from "../webviewMessageHandler"
import type { ClineProvider } from "../ClineProvider"

describe("webviewMessageHandler - tech debt", () => {
	let mockProvider: Partial<ClineProvider>

	beforeEach(() => {
		vi.clearAllMocks()
		mockProvider = {
			updateTechDebtStatus: vi.fn().mockResolvedValue(undefined),
			convertTechDebtToTask: vi.fn().mockResolvedValue({ taskId: "created-task" } as any),
		} as Partial<ClineProvider>
	})

	it("accepts tech debt items", async () => {
		await webviewMessageHandler(mockProvider as ClineProvider, {
			type: "acceptTechDebt",
			text: "source-task-1",
			itemId: "debt-1",
		})

		expect(mockProvider.updateTechDebtStatus).toHaveBeenCalledWith("source-task-1", "debt-1", "accepted")
	})

	it("dismisses tech debt items", async () => {
		await webviewMessageHandler(mockProvider as ClineProvider, {
			type: "dismissTechDebt",
			text: "source-task-1",
			itemId: "debt-1",
		})

		expect(mockProvider.updateTechDebtStatus).toHaveBeenCalledWith("source-task-1", "debt-1", "dismissed")
	})

	it("converts tech debt items to tasks", async () => {
		await webviewMessageHandler(mockProvider as ClineProvider, {
			type: "convertTechDebtToTask",
			text: "source-task-1",
			itemId: "debt-1",
		})

		expect(mockProvider.convertTechDebtToTask).toHaveBeenCalledWith({ taskId: "source-task-1", itemId: "debt-1" })
	})
})
