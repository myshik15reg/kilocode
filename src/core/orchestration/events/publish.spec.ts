import type { ActivityItem } from "@roo-code/types"

import { afterEach, describe, expect, it, vi } from "vitest"

import { getActivityProjection } from "./projections"
import { publishOrchestrationActivity } from "./publish"
import { orchestrationEventStore } from "./store"

// kilocode_change - new file
describe("publishOrchestrationActivity", () => {
	afterEach(() => {
		orchestrationEventStore.clear("task-publish")
	})

	it("publishes one activity path into live and persisted representations with deterministic ordering", async () => {
		let persistedActivity: ActivityItem[] = []
		const persistence = {
			loadPersistedActivity: vi.fn(async () => persistedActivity),
			persistActivity: vi.fn(async (_taskId: string, items: ActivityItem[]) => {
				persistedActivity = items
			}),
		}

		const branchActivity = {
			kind: "taskControl",
			id: "control-branch",
			taskId: "task-publish",
			control: "branch",
			summary: "Task branched",
			timestamp: 100,
		} as const satisfies ActivityItem
		const continueActivity = {
			kind: "taskControl",
			id: "control-continue",
			taskId: "task-publish",
			control: "continue",
			summary: "Task continued",
			timestamp: 100,
		} as const satisfies ActivityItem

		await publishOrchestrationActivity({
			taskId: "task-publish",
			activity: branchActivity,
			persistence,
		})
		await publishOrchestrationActivity({
			taskId: "task-publish",
			activity: continueActivity,
			persistence,
		})

		expect(orchestrationEventStore.get("task-publish")).toEqual([branchActivity, continueActivity])
		expect(persistedActivity).toEqual([branchActivity, continueActivity])
		expect(persistence.persistActivity).toHaveBeenCalledTimes(2)
	})

	it("skips persistence when the persisted history already contains the same activity id", async () => {
		const duplicateActivity = {
			kind: "subagent",
			id: "subagent-child-1-100",
			taskId: "task-publish",
			sessionId: "session-1",
			status: "completed",
			summary: "Done",
			timestamp: 100,
		} as const satisfies ActivityItem
		const persistedActivity = [duplicateActivity]
		const persistence = {
			loadPersistedActivity: vi.fn(async () => persistedActivity),
			persistActivity: vi.fn(async () => undefined),
		}

		const result = await publishOrchestrationActivity({
			taskId: "task-publish",
			activity: duplicateActivity,
			persistence,
		})

		expect(result.persisted).toBe(false)
		expect(result.persistedActivity).toEqual([duplicateActivity])
		expect(persistence.persistActivity).not.toHaveBeenCalled()
		expect(orchestrationEventStore.get("task-publish")).toEqual([duplicateActivity])
	})

	it("keeps continue and branch control events recoverable after live activity is cleared", async () => {
		let persistedActivity: ActivityItem[] = []

		const continueActivity = {
			kind: "taskControl",
			id: "control-continue",
			taskId: "task-publish",
			control: "continue",
			summary: "Task continued",
			timestamp: 100,
		} as const satisfies ActivityItem
		const branchActivity = {
			kind: "taskControl",
			id: "control-branch",
			taskId: "task-publish",
			control: "branch",
			summary: "Task branched",
			timestamp: 200,
		} as const satisfies ActivityItem

		for (const activity of [continueActivity, branchActivity]) {
			await publishOrchestrationActivity({
				taskId: "task-publish",
				activity,
				loadPersistedActivity: async () => persistedActivity,
				persistActivity: async (_taskId, items) => {
					persistedActivity = items
				},
			})
		}

		orchestrationEventStore.clear("task-publish")
		const projection = getActivityProjection(persistedActivity, orchestrationEventStore.get("task-publish"))

		expect(projection.items).toEqual([continueActivity, branchActivity])
		expect(projection.activeItems).toEqual([continueActivity])
		expect(projection.latestSummary).toBe("Task branched")
	})
})
