// kilocode_change - new file
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ToolCallCandidate } from "@roo-code/types"

import { getActivityProjection } from "../../orchestration/events/projections"
import { orchestrationEventStore } from "../../orchestration/events/store"
import { OrchestrationDispatcher } from "../../orchestration/OrchestrationDispatcher"
import { OrchestrationPolicy } from "../../orchestration/policy/OrchestrationPolicy"
import { Task } from "../Task"

function createTaskHarness(options?: {
	taskId?: string
	rootTaskId?: string
	userIntent?: string
	flags?: { hasBackgroundCapacity: boolean; hasHelperRouting: boolean }
}) {
	const task = Object.create(Task.prototype) as any
	task.taskId = options?.taskId ?? "task-orchestration-1"
	task.rootTaskId = options?.rootTaskId ?? task.taskId
	task.orchestrationPolicy = new OrchestrationPolicy()
	task.orchestrationDispatcher = new OrchestrationDispatcher()
	task.getUserIntent = vi.fn(() => options?.userIntent ?? "Collect context from the codebase")
	task.getOrchestrationFlags = vi.fn().mockResolvedValue(
		options?.flags ?? {
			hasBackgroundCapacity: false,
			hasHelperRouting: false,
		},
	)

	return task
}

describe("Task orchestration integration", () => {
	beforeEach(() => {
		orchestrationEventStore.clear("task-orchestration-1")
		orchestrationEventStore.clear("task-orchestration-2")
	})

	afterEach(() => {
		vi.restoreAllMocks()
		orchestrationEventStore.clear("task-orchestration-1")
		orchestrationEventStore.clear("task-orchestration-2")
	})

	/**
	 * Proves the real orchestration loop for subtooling:
	 * policy selection -> dispatcher routing -> planner/executor run -> activity projection.
	 */
	it("routes safe read-only batches through the orchestration loop and preserves partial-failure activity", async () => {
		const task = createTaskHarness({
			taskId: "task-orchestration-1",
			rootTaskId: "root-orchestration-1",
			userIntent: "Collect context from the codebase before making a decision",
		})
		const execute = vi.fn(async (call: { tool: string }) => {
			if (call.tool === "list_files") {
				throw new Error("listing unavailable")
			}
			return `${call.tool} ok`
		})
		const candidates: ToolCallCandidate[] = [
			{ callId: "call-1", tool: "read_file", arguments: { files: [{ path: "a.ts" }] } },
			{ callId: "call-2", tool: "list_files", arguments: { path: ".", recursive: false } },
			{ callId: "call-3", tool: "search_files", arguments: { path: ".", regex: "TODO" } },
		]

		const result = await Task.prototype.executeSafeToolBatch.call(task, candidates, execute)

		expect(task.getOrchestrationFlags).toHaveBeenCalledTimes(1)
		expect(task.getUserIntent).toHaveBeenCalledTimes(1)
		expect(execute).toHaveBeenCalledTimes(3)
		expect(result).toMatchObject({
			status: "partial",
			summary: "Tool batch completed with partial failures (2 succeeded, 1 failed).",
			results: expect.arrayContaining([
				expect.objectContaining({ tool: "read_file", success: true, content: "read_file ok" }),
				expect.objectContaining({ tool: "search_files", success: true, content: "search_files ok" }),
			]),
			errors: [expect.objectContaining({ tool: "list_files", message: "listing unavailable" })],
		})

		const activity = orchestrationEventStore.get("task-orchestration-1")
		expect(activity).toHaveLength(3)
		expect(activity.map((item) => item.kind)).toEqual(["toolBatch", "toolBatch", "toolBatch"])
		expect(activity).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "toolBatch",
					status: "started",
					summary: "Running tool batch for 3 read-only calls.",
				}),
				expect.objectContaining({
					kind: "toolBatch",
					status: "completed",
					summary: "Tool batch completed with partial failures (2 succeeded, 1 failed).",
				}),
			]),
		)

		const projection = getActivityProjection([], activity)
		expect(projection.latestSummary).toBe(activity[activity.length - 1]?.summary)
		expect(projection.items).toEqual(activity)
		expect(projection.items.map((item) => item.summary)).toContain(
			"Tool batch completed with partial failures (2 succeeded, 1 failed).",
		)
	})

	it("falls back cleanly when the candidate set is not a safe read-only batch", async () => {
		const task = createTaskHarness({
			taskId: "task-orchestration-2",
			rootTaskId: "root-orchestration-2",
			userIntent: "Collect context and write a file",
		})
		const execute = vi.fn()
		const candidates: ToolCallCandidate[] = [
			{ callId: "call-1", tool: "read_file", arguments: { files: [{ path: "a.ts" }] } },
			{ callId: "call-2", tool: "write_to_file", arguments: { path: "b.ts", content: "export {}" } },
		]

		const result = await Task.prototype.executeSafeToolBatch.call(task, candidates, execute)

		expect(result).toBeUndefined()
		expect(execute).not.toHaveBeenCalled()
		expect(orchestrationEventStore.get("task-orchestration-2")).toEqual([])
	})
})
