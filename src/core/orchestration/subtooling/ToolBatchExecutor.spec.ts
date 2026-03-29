// kilocode_change - new file
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { compareActivityItems } from "../events/projections"
import { orchestrationEventStore } from "../events/store"
import { ToolBatchExecutor } from "./ToolBatchExecutor"

describe("ToolBatchExecutor", () => {
	const executor = new ToolBatchExecutor()

	beforeEach(() => {
		orchestrationEventStore.clear("task-1")
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("returns completed when all calls succeed", async () => {
		const result = await executor.execute(
			{
				requestId: "request-1",
				taskId: "task-1",
				intent: "Gather context",
				calls: [],
			},
			{
				requestId: "request-1",
				parallelGroups: [
					[{ tool: "read_file", arguments: {}, readOnly: true, batchable: true, parallelSafe: true }],
				],
				sequentialCalls: [],
				rejectedCalls: [],
			},
			{ execute: async () => "ok" },
		)

		expect(result.status).toBe("completed")
		expect(result.summary).toContain("completed successfully")
	})

	it("publishes tool batch activity with compare-ordered ids when timestamps tie", async () => {
		vi.spyOn(Date, "now").mockReturnValue(100)

		await executor.execute(
			{
				requestId: "request-1",
				taskId: "task-1",
				intent: "Gather context",
				calls: [],
			},
			{
				requestId: "request-1",
				parallelGroups: [],
				sequentialCalls: [
					{
						callId: "call-1",
						tool: "read_file",
						arguments: {},
						readOnly: true,
						batchable: true,
						parallelSafe: false,
					},
				],
				rejectedCalls: [],
			},
			{ execute: async () => "ok" },
		)

		const activity = orchestrationEventStore.get("task-1")
		const expectedOrder = [...activity].sort(compareActivityItems)

		expect(activity).toHaveLength(3)
		expect(activity.every((item) => item.kind === "toolBatch")).toBe(true)
		expect(activity).toEqual(expectedOrder)
		expect(activity.map((item) => item.id)).toEqual([
			"tool-batch-request-1-completed",
			"tool-batch-request-1-progress-1",
			"tool-batch-request-1-started",
		])
	})

	it("returns partial when some calls fail", async () => {
		const result = await executor.execute(
			{
				requestId: "request-1",
				taskId: "task-1",
				intent: "Gather context",
				calls: [],
			},
			{
				requestId: "request-1",
				parallelGroups: [
					[
						{ tool: "read_file", arguments: {}, readOnly: true, batchable: true, parallelSafe: true },
						{ tool: "list_files", arguments: {}, readOnly: true, batchable: true, parallelSafe: true },
					],
				],
				sequentialCalls: [],
				rejectedCalls: [],
			},
			{
				execute: async (call) => {
					if (call.tool === "list_files") {
						throw new Error("failed")
					}
					return "ok"
				},
			},
		)

		expect(result.status).toBe("partial")
		expect(result.errors).toHaveLength(1)
	})

	it("returns failed when all calls fail", async () => {
		const result = await executor.execute(
			{
				requestId: "request-1",
				taskId: "task-1",
				intent: "Gather context",
				calls: [],
			},
			{
				requestId: "request-1",
				parallelGroups: [],
				sequentialCalls: [
					{ tool: "codebase_search", arguments: {}, readOnly: true, batchable: true, parallelSafe: false },
				],
				rejectedCalls: [],
			},
			{ execute: async () => Promise.reject(new Error("failed")) },
		)

		expect(result.status).toBe("failed")
		expect(result.results).toHaveLength(0)
	})
})
