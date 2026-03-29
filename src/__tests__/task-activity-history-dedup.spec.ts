import { describe, expect, it, vi } from "vitest"

import { orchestrationEventStore } from "../core/orchestration/events/store"
import { ClineProvider } from "../core/webview/ClineProvider"

// kilocode_change - assert dedup through the current provider activity persistence seam

describe("task activity history dedup", () => {
	it("does not persist duplicate activity entries with the same id through recordTaskActivity", async () => {
		const provider = Object.create(ClineProvider.prototype) as any
		let historyItem = {
			id: "task-1",
			task: "Parent",
			number: 1,
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			activity: [
				{
					kind: "subagent",
					id: "subagent-child-1-100",
					taskId: "child-1",
					sessionId: "session-1",
					status: "completed",
					summary: "Done",
					timestamp: 100,
				},
			],
		}

		provider.getTaskWithId = vi.fn(async () => ({ historyItem }))
		provider.updateTaskHistory = vi.fn(async (nextItem: any) => {
			historyItem = nextItem
			return [nextItem]
		})
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined)
		provider.log = vi.fn()

		await ClineProvider.prototype.recordTaskActivity.call(provider, "task-1", {
			kind: "subagent",
			id: "subagent-child-1-100",
			taskId: "child-1",
			sessionId: "session-1",
			status: "completed",
			summary: "Done",
			timestamp: 100,
		})

		expect(provider.updateTaskHistory).not.toHaveBeenCalled()
		expect(provider.postStateToWebview).toHaveBeenCalledTimes(1)
		expect(historyItem.activity).toHaveLength(1)
		expect(orchestrationEventStore.get("task-1")).toEqual([
			expect.objectContaining({ id: "subagent-child-1-100", taskId: "child-1" }),
		])

		orchestrationEventStore.clear("task-1")
	})
})
