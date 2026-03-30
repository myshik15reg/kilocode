import type { ActivityItem } from "@roo-code/types"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { compareActivityItems, getActivityProjection, mergeActivityItems } from "../events/projections"
import { orchestrationEventStore } from "../events/store"
import { SubagentCoordinator } from "./SubagentCoordinator"

// kilocode_change - new file
describe("SubagentCoordinator", () => {
	beforeEach(() => {
		for (const taskId of [
			"parent-1",
			"parent-2",
			"parent-3",
			"child-1",
			"child-2",
			"child-3",
			"other-root-child",
		]) {
			orchestrationEventStore.clear(taskId)
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("rehydrates restored bindings and reopens parent on completion", async () => {
		let resultListener: ((event: any) => void | Promise<void>) | undefined
		const reopenParentFromDelegation = vi.fn().mockResolvedValue(undefined)

		const bridge = {
			hasCapacity: vi.fn(() => true),
			launch: vi.fn(),
			cancel: vi.fn(),
			pause: vi.fn(),
			resume: vi.fn(),
			listBindings: vi.fn(() => [
				{
					request: {
						parentTaskId: "parent-1",
						rootTaskId: "root-1",
						targetTaskId: "child-1",
						mode: "code",
						handoff: { summary: "Do work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					parentTaskId: "parent-1",
					childTaskId: "child-1",
					sessionId: "child-1",
					status: "paused",
					updatedAt: 100,
				},
			]),
			onStatus: vi.fn((_listener) => () => undefined),
			onResult: vi.fn((listener) => {
				resultListener = listener
				return () => undefined
			}),
			relay: vi.fn().mockResolvedValue(undefined),
		}

		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation } as any, bridge as any)

		expect(coordinator.getBindingForTask("child-1")).toMatchObject({
			parentTaskId: "parent-1",
			childTaskId: "child-1",
			sessionId: "child-1",
			status: "paused",
		})
		expect(coordinator.getTaskRelayRegistration("child-1")).toMatchObject({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "parent_only",
		})

		expect(resultListener).toBeDefined()
		await resultListener?.({
			taskId: "child-1",
			sessionId: "child-1",
			status: "completed",
			output: "Done",
			summary: "Done",
			timestamp: 200,
		})

		expect(reopenParentFromDelegation).toHaveBeenCalledWith({
			parentTaskId: "parent-1",
			childTaskId: "child-1",
			completionResultSummary: "Done",
			preserveParentFocus: true,
		})
		expect(coordinator.getBindingForTask("child-1")).toBeUndefined()
		expect(coordinator.getTaskRelayRegistration("child-1")).toBeUndefined()
	})

	it("supports start -> pause -> reload -> recover -> resume -> completion", async () => {
		let statusListener: ((event: any) => void | Promise<void>) | undefined
		let resultListener: ((event: any) => void | Promise<void>) | undefined
		let persistedStatus: "queued" | "running" | "paused" | "completed" = "queued"
		const reopenParentFromDelegation = vi.fn().mockResolvedValue(undefined)

		const bridge = {
			hasCapacity: vi.fn(() => true),
			launch: vi.fn(async () => {
				persistedStatus = "running"
				return { taskId: "child-2", sessionId: "child-2", status: "running" as const }
			}),
			cancel: vi.fn(),
			pause: vi.fn(async () => {
				persistedStatus = "paused"
			}),
			resume: vi.fn(async () => {
				persistedStatus = "running"
			}),
			listBindings: vi.fn(() => [
				{
					request: {
						parentTaskId: "parent-2",
						rootTaskId: "root-2",
						targetTaskId: "child-2",
						mode: "code",
						handoff: { summary: "Do background work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					parentTaskId: "parent-2",
					childTaskId: "child-2",
					sessionId: "child-2",
					status: persistedStatus,
					updatedAt: 200,
				},
			]),
			onStatus: vi.fn((listener) => {
				statusListener = listener
				return () => undefined
			}),
			onResult: vi.fn((listener) => {
				resultListener = listener
				return () => undefined
			}),
			relay: vi.fn().mockResolvedValue(undefined),
		}

		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation } as any, bridge as any)
		await coordinator.launch({
			parentTaskId: "parent-2",
			rootTaskId: "root-2",
			targetTaskId: "child-2",
			mode: "code",
			handoff: { summary: "Do background work" },
			execution: "background",
			isolation: "shared",
			relayPolicy: "parent_only",
		})
		await coordinator.pause("child-2")
		expect(bridge.pause).toHaveBeenCalledWith("child-2")
		expect(coordinator.getBindingForTask("child-2")).toMatchObject({ status: "paused" })

		coordinator.dispose()
		const recoveredCoordinator = new SubagentCoordinator({ reopenParentFromDelegation } as any, bridge as any)
		expect(recoveredCoordinator.getBindingForTask("child-2")).toMatchObject({
			parentTaskId: "parent-2",
			childTaskId: "child-2",
			status: "paused",
		})

		await recoveredCoordinator.resume("child-2")
		expect(bridge.resume).toHaveBeenCalledWith("child-2")
		expect(recoveredCoordinator.getBindingForTask("child-2")).toMatchObject({ status: "running" })

		await statusListener?.({
			taskId: "child-2",
			sessionId: "child-2",
			state: "running",
			message: "Recovered background subagent running",
			timestamp: 300,
		})
		await resultListener?.({
			taskId: "child-2",
			sessionId: "child-2",
			status: "completed",
			output: "Done after recovery",
			summary: "Done after recovery",
			timestamp: 400,
		})

		expect(reopenParentFromDelegation).toHaveBeenCalledWith({
			parentTaskId: "parent-2",
			childTaskId: "child-2",
			completionResultSummary: "Done after recovery",
			preserveParentFocus: true,
		})
		expect(recoveredCoordinator.getBindingForTask("child-2")).toBeUndefined()
	})

	it("ignores duplicate completion events after recovery rebind", async () => {
		let resultListener: ((event: any) => void | Promise<void>) | undefined
		const reopenParentFromDelegation = vi.fn().mockResolvedValue(undefined)

		const bridge = {
			hasCapacity: vi.fn(() => true),
			launch: vi.fn(),
			cancel: vi.fn(),
			pause: vi.fn(),
			resume: vi.fn(),
			listBindings: vi.fn(() => [
				{
					request: {
						parentTaskId: "parent-3",
						rootTaskId: "root-3",
						targetTaskId: "child-3",
						mode: "code",
						handoff: { summary: "Do recovered work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					parentTaskId: "parent-3",
					childTaskId: "child-3",
					sessionId: "child-3",
					status: "running",
					updatedAt: 100,
				},
			]),
			onStatus: vi.fn((_listener) => () => undefined),
			onResult: vi.fn((listener) => {
				resultListener = listener
				return () => undefined
			}),
			relay: vi.fn().mockResolvedValue(undefined),
		}

		new SubagentCoordinator({ reopenParentFromDelegation } as any, bridge as any)
		await resultListener?.({
			taskId: "child-3",
			sessionId: "child-3",
			status: "completed",
			output: "Done once",
			summary: "Done once",
			timestamp: 200,
		})
		await resultListener?.({
			taskId: "child-3",
			sessionId: "child-3",
			status: "completed",
			output: "Done twice",
			summary: "Done twice",
			timestamp: 201,
		})

		expect(reopenParentFromDelegation).toHaveBeenCalledTimes(1)
	})

	it("delivers child to parent relay under parent_only policy", async () => {
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge as any)
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

		const result = await coordinator.relay({
			kind: "parent",
			fromTaskId: "child-1",
			toTaskId: "parent-1",
			rootTaskId: "root-1",
			content: "Need review",
			metadata: { reason: "handoff" },
		})

		expect(result).toMatchObject({ status: "delivered", recipientTaskIds: ["parent-1"] })
		expect(bridge.relay).toHaveBeenCalledWith(expect.objectContaining({ recipientTaskIds: ["parent-1"] }))
		expect(orchestrationEventStore.get("parent-1").at(-1)).toMatchObject({ kind: "relay", status: "delivered" })
	})

	it("delivers child to child relay within one root task when policy is group", async () => {
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge as any)
		coordinator.registerTaskRelay({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})
		coordinator.registerTaskRelay({
			taskId: "child-2",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})

		const result = await coordinator.relay({
			kind: "task",
			fromTaskId: "child-1",
			toTaskId: "child-2",
			rootTaskId: "root-1",
			content: "Use shared finding",
		})

		expect(result).toMatchObject({ status: "delivered", recipientTaskIds: ["child-2"] })
		expect(orchestrationEventStore.get("child-2").at(-1)).toMatchObject({ kind: "relay", status: "delivered" })
	})

	it("delivers child to group relay within one root task", async () => {
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge as any)
		coordinator.registerTaskRelay({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})
		coordinator.registerTaskRelay({
			taskId: "child-2",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})
		coordinator.registerTaskRelay({
			taskId: "child-3",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})

		const result = await coordinator.relay({
			kind: "group",
			fromTaskId: "child-1",
			groupId: "group-1",
			rootTaskId: "root-1",
			content: "Shared update",
		})

		expect(result.status).toBe("delivered")
		expect(result.recipientTaskIds.sort()).toEqual(["child-2", "child-3"])
		expect(bridge.relay).toHaveBeenCalledWith(expect.objectContaining({ recipientTaskIds: ["child-2", "child-3"] }))
	})

	it("blocks relay across different root tasks", async () => {
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge as any)
		coordinator.registerTaskRelay({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			relayPolicy: "group",
			groupId: "group-1",
		})
		coordinator.registerTaskRelay({
			taskId: "other-root-child",
			rootTaskId: "root-2",
			parentTaskId: "parent-2",
			relayPolicy: "group",
			groupId: "group-2",
		})

		const result = await coordinator.relay({
			kind: "task",
			fromTaskId: "child-1",
			toTaskId: "other-root-child",
			rootTaskId: "root-1",
			content: "Cross root should fail",
		})

		expect(result.status).toBe("blocked")
		expect(result.reason).toBe("cross_root_forbidden")
		expect(bridge.relay).not.toHaveBeenCalled()
		expect(orchestrationEventStore.get("child-1").at(-1)).toMatchObject({ kind: "relay", status: "blocked" })
	})

	it("publishes subagent status via provider seam and preserves projection recovery semantics", async () => {
		vi.spyOn(Date, "now").mockReturnValueOnce(50).mockReturnValueOnce(100).mockReturnValueOnce(200)
		let statusListener: ((event: any) => void | Promise<void>) | undefined
		let persistedActivity: ActivityItem[] = []
		const recordTaskActivity = vi.fn(async (_taskId: string, activity: ActivityItem) => {
			persistedActivity = mergeActivityItems(persistedActivity, [activity])
		})
		const bridge = {
			hasCapacity: vi.fn(() => true),
			launch: vi.fn(async () => ({ taskId: "child-1", sessionId: "session-1", status: "queued" as const })),
			cancel: vi.fn(),
			onStatus: vi.fn((listener) => {
				statusListener = listener
				return () => undefined
			}),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator(
			{ reopenParentFromDelegation: vi.fn(), recordTaskActivity } as any,
			bridge as any,
		)

		await coordinator.launch({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			targetTaskId: "child-1",
			mode: "code",
			handoff: { summary: "Do work" },
			execution: "background",
			isolation: "shared",
			relayPolicy: "parent_only",
		})
		await statusListener?.({
			taskId: "child-1",
			sessionId: "session-1",
			state: "running",
			message: "Background subagent running",
			timestamp: 200,
		})

		expect(recordTaskActivity).toHaveBeenCalledTimes(2)
		expect(recordTaskActivity.mock.calls.map(([taskId]) => taskId)).toEqual(["parent-1", "parent-1"])
		expect(persistedActivity.map((item) => item.kind)).toEqual(["subagent", "subagent"])
		expect((persistedActivity[0] as Extract<ActivityItem, { kind: "subagent" }>).explainability).toMatchObject({
			stage: "delegation",
			reasonCode: "background_subagent_selected",
		})
		expect((persistedActivity[1] as Extract<ActivityItem, { kind: "subagent" }>).explainability).toMatchObject({
			stage: "status",
			reasonCode: "subagent_running",
			source: "status",
			mode: "code",
			execution: "background",
			outcomeSummary: "Background subagent running",
		})

		orchestrationEventStore.clear("parent-1")
		const projection = getActivityProjection(persistedActivity, orchestrationEventStore.get("parent-1"))
		expect(projection.items).toEqual(persistedActivity)
		expect(projection.activeItems).toEqual(persistedActivity)
		expect(projection.latestSummary).toBe("Background subagent running")
	})

	it("publishes relay activity with compare-ordered ids when provider seam is unavailable", async () => {
		vi.spyOn(Date, "now").mockReturnValue(100)
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge as any)
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

		await coordinator.relay({
			kind: "parent",
			fromTaskId: "child-1",
			toTaskId: "parent-1",
			rootTaskId: "root-1",
			content: "Visible in activity",
		})
		await coordinator.relay({
			kind: "task",
			fromTaskId: "child-1",
			toTaskId: "missing-child",
			rootTaskId: "root-1",
			content: "Should be blocked",
		})

		const deliveredActivity = orchestrationEventStore.get("parent-1")
		expect(deliveredActivity).toHaveLength(1)
		expect(deliveredActivity[0]).toMatchObject({ kind: "relay", status: "delivered", id: "relay-child-1-100" })
		expect(deliveredActivity).toEqual([...deliveredActivity].sort(compareActivityItems))

		const blockedActivity = orchestrationEventStore.get("child-1")
		expect(blockedActivity.at(-1)).toMatchObject({ kind: "relay", status: "blocked", id: "relay-child-1-100" })
		expect(blockedActivity).toEqual([...blockedActivity].sort(compareActivityItems))
	})

	it("logs relay activity and hides relay from active items projection", async () => {
		const bridge = {
			hasCapacity: vi.fn(),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn(() => () => undefined),
			onResult: vi.fn(() => () => undefined),
			relay: vi.fn().mockResolvedValue(undefined),
		}
		const coordinator = new SubagentCoordinator({ reopenParentFromDelegation: vi.fn() } as any, bridge as any)
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

		await coordinator.relay({
			kind: "parent",
			fromTaskId: "child-1",
			toTaskId: "parent-1",
			rootTaskId: "root-1",
			content: "Visible in activity",
		})

		const activity = orchestrationEventStore.get("parent-1")
		expect(activity.at(-1)).toMatchObject({
			kind: "relay",
			status: "delivered",
			summary: expect.stringContaining("Relay delivered"),
		})
	})

	it("ignores terminal status event when completion result follows", async () => {
		let statusListener: ((event: any) => void | Promise<void>) | undefined
		let resultListener: ((event: any) => void | Promise<void>) | undefined
		const recorded: any[] = []
		const reopenParentFromDelegation = vi.fn().mockResolvedValue(undefined)

		const bridge = {
			hasCapacity: vi.fn(() => true),
			launch: vi.fn(),
			cancel: vi.fn(),
			onStatus: vi.fn((listener) => {
				statusListener = listener
				return () => undefined
			}),
			onResult: vi.fn((listener) => {
				resultListener = listener
				return () => undefined
			}),
			listBindings: vi.fn(() => [
				{
					request: {
						parentTaskId: "parent-1",
						rootTaskId: "root-1",
						targetTaskId: "child-1",
						mode: "code",
						handoff: { summary: "Do work" },
						execution: "background",
						isolation: "shared",
						relayPolicy: "parent_only",
					},
					parentTaskId: "parent-1",
					childTaskId: "child-1",
					sessionId: "child-1",
					status: "running",
					updatedAt: 100,
				},
			]),
		}

		new SubagentCoordinator(
			{
				reopenParentFromDelegation,
				recordTaskActivity: vi.fn(async (_taskId, activity) => recorded.push(activity)),
			} as any,
			bridge as any,
		)

		await statusListener?.({
			taskId: "child-1",
			sessionId: "child-1",
			state: "completed",
			message: "Background subagent completed",
			timestamp: 200,
		})

		await resultListener?.({
			taskId: "child-1",
			sessionId: "child-1",
			status: "completed",
			output: "Done",
			summary: "Done",
			timestamp: 201,
		})

		const completedActivities = recorded.filter(
			(activity) => activity.kind === "subagent" && activity.status === "completed",
		) as Array<Extract<ActivityItem, { kind: "subagent" }>>
		expect(completedActivities).toHaveLength(1)
		expect(completedActivities[0]).toMatchObject({
			summary: "Background subagent completed",
			explainability: {
				stage: "outcome",
				reasonCode: "subagent_completed",
				source: "status",
				mode: "code",
				execution: "background",
				outcomeSummary: "Background subagent completed",
			},
		})
		expect(reopenParentFromDelegation).toHaveBeenCalledTimes(1)
		expect(reopenParentFromDelegation).toHaveBeenCalledWith({
			parentTaskId: "parent-1",
			childTaskId: "child-1",
			completionResultSummary: "Done",
			preserveParentFocus: true,
		})
	})
})
