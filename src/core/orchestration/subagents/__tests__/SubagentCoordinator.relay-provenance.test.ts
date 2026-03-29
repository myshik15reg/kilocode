// kilocode_change - new file
import type { ActivityItem } from "@roo-code/types"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getActivityProjection, mergeActivityItems } from "../../events/projections"
import { orchestrationEventStore } from "../../events/store"
import { SubagentCoordinator } from "../SubagentCoordinator"

describe("SubagentCoordinator relay provenance integration", () => {
	beforeEach(() => {
		for (const taskId of ["parent-1", "child-1", "child-2"]) {
			orchestrationEventStore.clear(taskId)
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
		for (const taskId of ["parent-1", "child-1", "child-2"]) {
			orchestrationEventStore.clear(taskId)
		}
	})

	/**
	 * Verifies the highest-signal relay path inside one root task:
	 * parent-only delivery is allowed, sibling delivery is blocked by scope,
	 * and persisted activity keeps relay provenance metadata for recovery/rendering.
	 */
	it("persists same-root relay provenance and blocks sibling scope violations under parent_only", async () => {
		vi.spyOn(Date, "now").mockReturnValue(101)
		const persistedByTaskId = new Map<string, ActivityItem[]>()
		const recordTaskActivity = vi.fn(async (taskId: string, activity: ActivityItem) => {
			persistedByTaskId.set(taskId, mergeActivityItems(persistedByTaskId.get(taskId) ?? [], [activity]))
		})
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator(
			{ reopenParentFromDelegation: vi.fn(), recordTaskActivity } as any,
			bridge as any,
		)
		coordinator.registerTaskRelay({
			taskId: "parent-1",
			rootTaskId: "root-1",
			relayPolicy: "group",
			groupId: "group-1",
		})
		coordinator.registerTaskRelay({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "parent_only",
			groupId: "group-1",
		})
		coordinator.registerTaskRelay({
			taskId: "child-2",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})

		const delivered = await coordinator.relay({
			kind: "parent",
			fromTaskId: "child-1",
			toTaskId: "parent-1",
			rootTaskId: "root-1",
			content: "Need parent review",
			metadata: { lineage: ["root-1", "child-1"], source: "relay-test" },
		})
		const blocked = await coordinator.relay({
			kind: "task",
			fromTaskId: "child-1",
			toTaskId: "child-2",
			rootTaskId: "root-1",
			content: "Should stay parent-only",
			metadata: { lineage: ["root-1", "child-1"], source: "relay-test" },
		})

		expect(delivered).toMatchObject({ status: "delivered", recipientTaskIds: ["parent-1"] })
		expect(blocked).toMatchObject({ status: "blocked", reason: "policy_forbidden" })
		expect(bridge.relay).toHaveBeenCalledTimes(1)
		expect(bridge.relay).toHaveBeenCalledWith(
			expect.objectContaining({
				envelope: expect.objectContaining({
					kind: "parent",
					rootTaskId: "root-1",
					requiresParentVisibility: true,
					metadata: { lineage: ["root-1", "child-1"], source: "relay-test" },
				}),
				recipientTaskIds: ["parent-1"],
			}),
		)
		expect(recordTaskActivity).toHaveBeenCalledTimes(2)
		expect(persistedByTaskId.get("parent-1")).toEqual([
			expect.objectContaining({
				kind: "relay",
				status: "delivered",
				envelope: expect.objectContaining({
					content: "Need parent review",
					metadata: { lineage: ["root-1", "child-1"], source: "relay-test" },
				}),
			}),
		])
		expect(persistedByTaskId.get("child-1")).toEqual([
			expect.objectContaining({
				kind: "relay",
				status: "blocked",
				summary: "Relay blocked: policy_forbidden",
			}),
		])

		const projection = getActivityProjection(persistedByTaskId.get("parent-1") ?? [], [])
		expect(projection.latestSummary).toContain("Relay delivered from child-1 to parent parent-1")
		expect(projection.activeItems).toEqual([])
	})
})
