// kilocode_change - new file
import { describe, expect, it, vi } from "vitest"

import { OrchestrationDispatcher } from "./OrchestrationDispatcher"

describe("OrchestrationDispatcher", () => {
	it("returns direct fallback when the decision stays direct", async () => {
		const dispatcher = new OrchestrationDispatcher()

		const result = await dispatcher.dispatch(
			{ kind: "direct", reason: "Single tool call is best handled directly.", confidence: "high" },
			[{ tool: "read_file", arguments: { files: [{ path: "a.ts" }] } }],
			{
				executeToolBatch: vi.fn(),
				executeSubagent: vi.fn(),
			},
		)

		expect(result).toMatchObject({ handled: false, route: "direct" })
	})

	it("executes the existing subtooling batch path", async () => {
		const dispatcher = new OrchestrationDispatcher()
		const executeToolBatch = vi.fn(async (call) => `${call.tool} ok`)

		const result = await dispatcher.dispatch(
			{
				kind: "subtooling",
				reason: "Batch read-only calls.",
				confidence: "high",
				payload: {
					requestId: "request-1",
					taskId: "task-1",
					intent: "Gather context",
					calls: [
						{ callId: "tool-1", tool: "read_file", arguments: { files: [{ path: "a.ts" }] } },
						{ callId: "tool-2", tool: "list_files", arguments: { path: ".", recursive: false } },
					],
				},
			},
			[
				{ callId: "tool-1", tool: "read_file", arguments: { files: [{ path: "a.ts" }] } },
				{ callId: "tool-2", tool: "list_files", arguments: { path: ".", recursive: false } },
			],
			{
				executeToolBatch,
				executeSubagent: vi.fn(),
			},
		)

		expect(result.handled).toBe(true)
		expect(result.route).toBe("subtooling")
		expect(executeToolBatch).toHaveBeenCalledTimes(2)
	})

	it("executes the subagent launch path for a runnable background new_task", async () => {
		const dispatcher = new OrchestrationDispatcher()
		const executeSubagent = vi.fn().mockResolvedValue("Delegated to child task child-1")

		const result = await dispatcher.dispatch(
			{
				kind: "subagent",
				reason: "Launch a background child task.",
				confidence: "high",
				payload: {
					parentTaskId: "task-1",
					rootTaskId: "root-1",
					mode: "code",
					handoff: { summary: "Research the issue" },
					execution: "background",
					isolation: "shared",
					relayPolicy: "parent_only",
				},
			},
			[
				{
					callId: "tool-1",
					tool: "new_task",
					arguments: { mode: "code", message: "Research the issue", execution: "background" },
				},
			],
			{
				executeToolBatch: vi.fn(),
				executeSubagent,
			},
		)

		expect(result).toMatchObject({
			handled: true,
			route: "subagent",
			result: { callId: "tool-1", tool: "new_task", content: "Delegated to child task child-1" },
		})
		expect(executeSubagent).toHaveBeenCalledTimes(1)
	})

	it("downgrades unsafe subagent payloads back to direct", async () => {
		const dispatcher = new OrchestrationDispatcher()

		const result = await dispatcher.dispatch(
			{
				kind: "subagent",
				reason: "Launch a background child task.",
				confidence: "high",
			},
			[
				{
					callId: "tool-1",
					tool: "new_task",
					arguments: { mode: "code", message: "Research the issue", execution: "background" },
				},
			],
			{
				executeToolBatch: vi.fn(),
				executeSubagent: vi.fn(),
			},
		)

		expect(result).toMatchObject({
			handled: false,
			route: "direct",
			reason: expect.stringContaining("missing or unsafe"),
		})
	})

	it("downgrades subagent routing when the candidate set is not a single new_task", async () => {
		const dispatcher = new OrchestrationDispatcher()
		const executeSubagent = vi.fn()

		const result = await dispatcher.dispatch(
			{
				kind: "subagent",
				reason: "Launch a background child task.",
				confidence: "high",
				payload: {
					parentTaskId: "task-1",
					rootTaskId: "root-1",
					mode: "code",
					handoff: { summary: "Research the issue" },
					execution: "background",
					isolation: "shared",
					relayPolicy: "parent_only",
				},
			},
			[{ callId: "tool-1", tool: "read_file", arguments: { files: [{ path: "a.ts" }] } }],
			{
				executeToolBatch: vi.fn(),
				executeSubagent,
			},
		)

		expect(result).toMatchObject({
			handled: false,
			route: "direct",
			reason: expect.stringContaining("single background new_task"),
		})
		expect(executeSubagent).not.toHaveBeenCalled()
	})

	it("downgrades subagent routing when the launch cannot produce a runnable result", async () => {
		const dispatcher = new OrchestrationDispatcher()
		const executeSubagent = vi.fn().mockResolvedValue(undefined)

		const result = await dispatcher.dispatch(
			{
				kind: "subagent",
				reason: "Launch a background child task.",
				confidence: "high",
				payload: {
					parentTaskId: "task-1",
					rootTaskId: "root-1",
					mode: "code",
					handoff: { summary: "Research the issue" },
					execution: "background",
					isolation: "shared",
					relayPolicy: "parent_only",
				},
			},
			[
				{
					callId: "tool-1",
					tool: "new_task",
					arguments: { mode: "code", message: "Research the issue", execution: "background" },
				},
			],
			{
				executeToolBatch: vi.fn(),
				executeSubagent,
			},
		)

		expect(result).toMatchObject({
			handled: false,
			route: "direct",
			reason: expect.stringContaining("downgraded to the direct path"),
		})
		expect(executeSubagent).toHaveBeenCalledTimes(1)
	})
})
