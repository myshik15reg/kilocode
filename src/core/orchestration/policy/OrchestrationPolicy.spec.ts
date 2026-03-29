// kilocode_change - new file
import { describe, expect, it } from "vitest"

import { OrchestrationPolicy } from "./OrchestrationPolicy"

describe("OrchestrationPolicy", () => {
	const policy = new OrchestrationPolicy()

	it("chooses direct for a single tool call", () => {
		const decision = policy.decide({
			taskId: "task-1",
			userIntent: "Read one file",
			candidateToolCalls: [{ tool: "read_file", arguments: { files: [{ path: "a.ts" }] } }],
			hasBackgroundCapacity: false,
			hasHelperRouting: false,
		})

		expect(decision.kind).toBe("direct")
	})

	it("chooses subtooling for multiple safe read-only calls", () => {
		const decision = policy.decide({
			taskId: "task-1",
			userIntent: "Collect context from codebase",
			candidateToolCalls: [
				{ tool: "read_file", arguments: { files: [{ path: "a.ts" }] } },
				{ tool: "list_files", arguments: { path: ".", recursive: true } },
				{ tool: "search_files", arguments: { path: ".", regex: "TODO" } },
			],
			hasBackgroundCapacity: false,
			hasHelperRouting: false,
		})

		expect(decision.kind).toBe("subtooling")
		expect(decision.payload && "calls" in decision.payload).toBe(true)
	})

	it("chooses subagent for a runnable background new_task when capacity exists", () => {
		const decision = policy.decide({
			taskId: "task-1",
			rootTaskId: "root-1",
			userIntent: "Independently research this issue in the background",
			candidateToolCalls: [
				{
					tool: "new_task",
					arguments: {
						mode: "code",
						message: "Research the issue",
						execution: "background",
						todos: "[ ] Inspect parser",
					},
				},
			],
			hasBackgroundCapacity: true,
			hasHelperRouting: true,
		})

		expect(decision.kind).toBe("subagent")
		expect(decision.payload).toMatchObject({
			parentTaskId: "task-1",
			rootTaskId: "root-1",
			execution: "background",
			handoff: {
				summary: "Research the issue",
				context: ["[ ] Inspect parser"],
			},
		})
	})

	it("downgrades explicit subagent intent to direct when background capacity is unavailable", () => {
		const decision = policy.decide({
			taskId: "task-1",
			rootTaskId: "root-1",
			userIntent: "Research this in the background",
			candidateToolCalls: [
				{
					tool: "new_task",
					arguments: { mode: "code", message: "Research the issue", execution: "background" },
				},
			],
			hasBackgroundCapacity: false,
			hasHelperRouting: true,
		})

		expect(decision.kind).toBe("direct")
		expect(decision.reason).toContain("launch capacity")
	})

	it("downgrades mixed new_task payloads to direct", () => {
		const decision = policy.decide({
			taskId: "task-1",
			rootTaskId: "root-1",
			userIntent: "Delegate this background investigation",
			candidateToolCalls: [
				{
					tool: "new_task",
					arguments: { mode: "code", message: "Research the issue", execution: "background" },
				},
				{ tool: "read_file", arguments: { files: [{ path: "a.ts" }] } },
			],
			hasBackgroundCapacity: true,
			hasHelperRouting: true,
		})

		expect(decision.kind).toBe("direct")
		expect(decision.reason).toContain("single runnable background new_task")
	})

	it("downgrades foreground new_task execution to direct", () => {
		const decision = policy.decide({
			taskId: "task-1",
			rootTaskId: "root-1",
			userIntent: "Delegate this investigation",
			candidateToolCalls: [
				{
					tool: "new_task",
					arguments: { mode: "code", message: "Research the issue", execution: "foreground" },
				},
			],
			hasBackgroundCapacity: true,
			hasHelperRouting: true,
		})

		expect(decision.kind).toBe("direct")
		expect(decision.reason).toContain("single runnable background new_task")
	})

	it("downgrades incomplete background new_task payloads to direct", () => {
		const decision = policy.decide({
			taskId: "task-1",
			rootTaskId: "root-1",
			userIntent: "Delegate this background investigation",
			candidateToolCalls: [{ tool: "new_task", arguments: { mode: "code", execution: "background" } }],
			hasBackgroundCapacity: true,
			hasHelperRouting: true,
		})

		expect(decision.kind).toBe("direct")
		expect(decision.reason).toContain("single runnable background new_task")
	})
})
