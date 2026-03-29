import { describe, expect, it } from "vitest"

import {
	getActiveActivityItems,
	getActivityProjection,
	getLatestActivitySummary,
	mergeActivityItems,
} from "./projections"

// kilocode_change - new file
describe("orchestration projections", () => {
	it("keeps relay items in latest summary but out of active activity", () => {
		const relay = {
			kind: "relay",
			id: "relay-1",
			taskId: "task-1",
			rootTaskId: "root-1",
			status: "delivered",
			envelope: {
				kind: "parent",
				fromTaskId: "child-1",
				toTaskId: "parent-1",
				rootTaskId: "root-1",
				content: "Relay summary",
				requiresParentVisibility: true,
				timestamp: 100,
			},
			summary: "Relay delivered from child-1 to parent parent-1 (1 recipients).",
			timestamp: 100,
		} as const

		expect(getLatestActivitySummary([relay as any])).toBe(relay.summary)
		expect(getActiveActivityItems([relay as any])).toEqual([])
	})

	it("treats continue as active but branch as timeline-only", () => {
		const continueControl = {
			kind: "taskControl",
			id: "tc-continue",
			taskId: "task-1",
			control: "continue",
			summary: "Task continued",
			timestamp: 100,
		} as const
		const branchControl = {
			kind: "taskControl",
			id: "tc-branch",
			taskId: "task-1",
			control: "branch",
			summary: "Task branched",
			timestamp: 101,
		} as const

		expect(getActiveActivityItems([continueControl as any, branchControl as any])).toEqual([continueControl])
	})

	it("returns live activity when no persisted history exists", () => {
		const liveOnly = {
			kind: "subagent",
			id: "subagent-live-1",
			taskId: "task-1",
			sessionId: "session-1",
			status: "running",
			summary: "Child task is running",
			timestamp: 200,
		} as const

		expect(getActivityProjection(undefined, [liveOnly as any]).items).toEqual([liveOnly])
	})

	it("returns persisted activity when no live activity exists", () => {
		const persistedOnly = {
			kind: "toolBatch",
			id: "tool-persisted-1",
			requestId: "request-1",
			taskId: "task-1",
			status: "completed",
			summary: "Batch completed",
			timestamp: 150,
		} as const

		expect(getActivityProjection([persistedOnly as any], undefined).items).toEqual([persistedOnly])
	})

	it("merges persisted and live activity with live wins dedup and deterministic ordering", () => {
		const persistedCompleted = {
			kind: "subagent",
			id: "subagent-1",
			taskId: "task-1",
			sessionId: "session-1",
			status: "completed",
			summary: "Persisted completed status",
			timestamp: 300,
		} as const
		const persistedOlder = {
			kind: "toolBatch",
			id: "tool-1",
			requestId: "request-1",
			taskId: "task-1",
			status: "started",
			summary: "Started earlier",
			timestamp: 100,
		} as const
		const liveDuplicate = {
			kind: "subagent",
			id: "subagent-1",
			taskId: "task-1",
			sessionId: "session-1",
			status: "running",
			summary: "Live running status",
			timestamp: 300,
		} as const
		const liveNewer = {
			kind: "taskControl",
			id: "task-control-1",
			taskId: "task-1",
			control: "continue",
			summary: "Task continued",
			timestamp: 400,
		} as const

		expect(
			mergeActivityItems(
				[persistedCompleted as any, persistedOlder as any],
				[liveDuplicate as any, liveNewer as any],
			),
		).toEqual([persistedOlder, liveDuplicate, liveNewer])
	})

	it("keeps deterministic recovery ordering when live updates replace persisted duplicates on reload", () => {
		const persistedContinue = {
			kind: "taskControl",
			id: "control-continue",
			taskId: "task-1",
			control: "continue",
			summary: "Task continued before reload",
			timestamp: 200,
		} as const
		const persistedChild = {
			kind: "subagent",
			id: "subagent-child",
			taskId: "task-1",
			sessionId: "session-1",
			status: "queued",
			summary: "Child queued before reload",
			timestamp: 300,
		} as const
		const liveBranch = {
			kind: "taskControl",
			id: "control-branch",
			taskId: "task-1",
			control: "branch",
			summary: "Task branched after reload",
			timestamp: 300,
		} as const
		const liveChild = {
			kind: "subagent",
			id: "subagent-child",
			taskId: "task-1",
			sessionId: "session-1",
			status: "paused",
			summary: "Child paused after reload",
			timestamp: 300,
		} as const

		const projection = getActivityProjection(
			[persistedChild as any, persistedContinue as any],
			[liveBranch as any, liveChild as any],
		)

		expect(projection.items).toEqual([persistedContinue, liveBranch, liveChild])
		expect(projection.activeItems).toEqual([persistedContinue, liveChild])
		expect(projection.latestSummary).toBe("Child paused after reload")
	})

	it("preserves continue and branch task-control semantics after merge", () => {
		const continueControl = {
			kind: "taskControl",
			id: "tc-continue",
			taskId: "task-1",
			control: "continue",
			summary: "Task continued",
			timestamp: 100,
		} as const
		const branchControl = {
			kind: "taskControl",
			id: "tc-branch",
			taskId: "task-1",
			control: "branch",
			summary: "Task branched",
			timestamp: 101,
		} as const

		const projection = getActivityProjection([branchControl as any], [continueControl as any])

		expect(projection.items).toEqual([continueControl, branchControl])
		expect(projection.activeItems).toEqual([continueControl])
		expect(projection.latestSummary).toBe("Task branched")
	})
})
