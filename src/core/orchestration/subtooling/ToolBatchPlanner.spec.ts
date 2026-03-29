// kilocode_change - new file
import { describe, expect, it } from "vitest"

import { ToolBatchPlanner } from "./ToolBatchPlanner"

describe("ToolBatchPlanner", () => {
	const planner = new ToolBatchPlanner()

	it("plans parallel-safe read-only calls into one parallel group", () => {
		const plan = planner.plan({
			requestId: "request-1",
			taskId: "task-1",
			intent: "Gather context",
			calls: [
				{ tool: "read_file", arguments: {}, readOnly: true, batchable: true, parallelSafe: true },
				{ tool: "list_files", arguments: {}, readOnly: true, batchable: true, parallelSafe: true },
			],
		})

		expect(plan.parallelGroups).toHaveLength(1)
		expect(plan.parallelGroups[0]).toHaveLength(2)
		expect(plan.sequentialCalls).toHaveLength(0)
		expect(plan.rejectedCalls).toHaveLength(0)
	})

	it("plans non-parallel-safe read-only calls sequentially", () => {
		const plan = planner.plan({
			requestId: "request-1",
			taskId: "task-1",
			intent: "Gather context",
			calls: [{ tool: "codebase_search", arguments: {}, readOnly: true, batchable: true, parallelSafe: false }],
		})

		expect(plan.parallelGroups).toHaveLength(0)
		expect(plan.sequentialCalls).toHaveLength(1)
	})

	it("rejects unsafe calls", () => {
		const plan = planner.plan({
			requestId: "request-1",
			taskId: "task-1",
			intent: "Mutate file",
			calls: [{ tool: "write_to_file", arguments: {}, readOnly: false, batchable: false, parallelSafe: false }],
		})

		expect(plan.rejectedCalls).toEqual([{ tool: "write_to_file", reason: "Tool is not read-only." }])
	})
})
