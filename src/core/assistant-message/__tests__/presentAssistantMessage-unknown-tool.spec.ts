// npx vitest src/core/assistant-message/__tests__/presentAssistantMessage-unknown-tool.spec.ts

import { describe, it, expect, beforeEach, vi } from "vitest"
import { presentAssistantMessage } from "../presentAssistantMessage"

// Mock dependencies
vi.mock("../../task/Task")
vi.mock("../../tools/validateToolUse", () => ({
	validateToolUse: vi.fn(),
}))
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureToolUsage: vi.fn(),
			captureConsecutiveMistakeError: vi.fn(),
		},
	},
}))

describe("presentAssistantMessage - Unknown Tool Handling", () => {
	let mockTask: any

	beforeEach(() => {
		// Create a mock Task with minimal properties needed for testing
		mockTask = {
			taskId: "test-task-id",
			instanceId: "test-instance",
			abort: false,
			presentAssistantMessageLocked: false,
			presentAssistantMessageHasPendingUpdates: false,
			currentStreamingContentIndex: 0,
			assistantMessageContent: [],
			userMessageContent: [],
			didCompleteReadingStream: false,
			didRejectTool: false,
			didAlreadyUseTool: false,
			diffEnabled: false,
			consecutiveMistakeCount: 0,
			clineMessages: [],
			api: {
				getModel: () => ({ id: "test-model", info: {} }),
			},
			browserSession: {
				closeBrowser: vi.fn().mockResolvedValue(undefined),
			},
			recordToolUsage: vi.fn(),
			recordToolError: vi.fn(),
			toolRepetitionDetector: {
				check: vi.fn().mockReturnValue({ allowExecution: true }),
			},
			providerRef: {
				deref: () => ({
					getState: vi.fn().mockResolvedValue({
						mode: "code",
						customModes: [],
					}),
				}),
			},
			dispatchOrchestrationExecution: vi.fn().mockResolvedValue({
				handled: false,
				route: "direct",
				decision: { kind: "direct", reason: "direct", confidence: "high" },
				reason: "direct",
			}),
			say: vi.fn().mockResolvedValue(undefined),
			ask: vi.fn().mockResolvedValue({ response: "yesButtonClicked" }),
		}

		// Add pushToolResultToUserContent method after mockTask is created so 'this' binds correctly
		mockTask.pushToolResultToUserContent = vi.fn().mockImplementation((toolResult: any) => {
			const existingResult = mockTask.userMessageContent.find(
				(block: any) => block.type === "tool_result" && block.tool_use_id === toolResult.tool_use_id,
			)
			if (existingResult) {
				return false
			}
			mockTask.userMessageContent.push(toolResult)
			return true
		})
	})

	it("should return error for unknown tool in native protocol", async () => {
		// Set up a tool_use block with an unknown tool name and an ID (native protocol)
		const toolCallId = "tool_call_unknown_123"
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId, // ID indicates native protocol
				name: "nonexistent_tool",
				params: { some: "param" },
				partial: false,
			},
		]

		// Execute presentAssistantMessage
		await presentAssistantMessage(mockTask)

		// Verify that a tool_result with error was pushed
		const toolResult = mockTask.userMessageContent.find(
			(item: any) => item.type === "tool_result" && item.tool_use_id === toolCallId,
		)

		expect(toolResult).toBeDefined()
		expect(toolResult.tool_use_id).toBe(toolCallId)
		// The error is wrapped in JSON by formatResponse.toolError
		expect(toolResult.content).toContain("nonexistent_tool")
		expect(toolResult.content).toContain("does not exist")
		expect(toolResult.content).toContain("error")

		// Verify consecutiveMistakeCount was incremented
		expect(mockTask.consecutiveMistakeCount).toBe(1)

		// Verify recordToolError was called
		expect(mockTask.recordToolError).toHaveBeenCalledWith(
			"nonexistent_tool",
			expect.stringContaining("Unknown tool"),
		)

		// Verify error message was shown to user (uses i18n key)
		expect(mockTask.say).toHaveBeenCalledWith("error", "unknownToolError")
	})

	it("should return error for unknown tool in XML protocol", async () => {
		// Set up a tool_use block with an unknown tool name WITHOUT an ID (XML protocol)
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				// No ID = XML protocol
				name: "fake_tool_that_does_not_exist",
				params: { param1: "value1" },
				partial: false,
			},
		]

		// Execute presentAssistantMessage
		await presentAssistantMessage(mockTask)

		// For XML protocol, error is pushed as text blocks
		const textBlocks = mockTask.userMessageContent.filter((item: any) => item.type === "text")

		// There should be text blocks with error message
		expect(textBlocks.length).toBeGreaterThan(0)
		const hasErrorMessage = textBlocks.some(
			(block: any) =>
				block.text?.includes("fake_tool_that_does_not_exist") && block.text?.includes("does not exist"),
		)
		expect(hasErrorMessage).toBe(true)

		// Verify consecutiveMistakeCount was incremented
		expect(mockTask.consecutiveMistakeCount).toBe(1)

		// Verify recordToolError was called
		expect(mockTask.recordToolError).toHaveBeenCalled()

		// Verify error message was shown to user (uses i18n key)
		expect(mockTask.say).toHaveBeenCalledWith("error", "unknownToolError")
	})

	it("should handle unknown tool without freezing (native protocol)", async () => {
		// This test ensures the extension doesn't freeze when an unknown tool is called
		const toolCallId = "tool_call_freeze_test"
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId, // Native protocol
				name: "this_tool_definitely_does_not_exist",
				params: {},
				partial: false,
			},
		]

		// The test will timeout if the extension freezes
		const timeoutPromise = new Promise<boolean>((_, reject) => {
			setTimeout(() => reject(new Error("Test timed out - extension likely froze")), 5000)
		})

		const resultPromise = presentAssistantMessage(mockTask).then(() => true)

		// Race between the function completing and the timeout
		const completed = await Promise.race([resultPromise, timeoutPromise])
		expect(completed).toBe(true)

		// Verify a tool_result was pushed (critical for API not to freeze)
		const toolResult = mockTask.userMessageContent.find(
			(item: any) => item.type === "tool_result" && item.tool_use_id === toolCallId,
		)
		expect(toolResult).toBeDefined()
	})

	it("should increment consecutiveMistakeCount for unknown tools", async () => {
		// Test with multiple unknown tools to ensure mistake count increments
		const toolCallId = "tool_call_mistake_test"
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId,
				name: "unknown_tool_1",
				params: {},
				partial: false,
			},
		]

		expect(mockTask.consecutiveMistakeCount).toBe(0)

		await presentAssistantMessage(mockTask)

		expect(mockTask.consecutiveMistakeCount).toBe(1)
	})

	it("should set userMessageContentReady after handling unknown tool", async () => {
		const toolCallId = "tool_call_ready_test"
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId,
				name: "unknown_tool",
				params: {},
				partial: false,
			},
		]

		mockTask.didCompleteReadingStream = true
		mockTask.userMessageContentReady = false

		await presentAssistantMessage(mockTask)

		// userMessageContentReady should be set after processing
		expect(mockTask.userMessageContentReady).toBe(true)
	})

	it("should still work with didAlreadyUseTool flag for unknown tool", async () => {
		const toolCallId = "tool_call_already_used_test"
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId,
				name: "unknown_tool",
				params: {},
				partial: false,
			},
		]

		mockTask.didAlreadyUseTool = true

		await presentAssistantMessage(mockTask)

		// When didAlreadyUseTool is true, should send error tool_result
		const toolResult = mockTask.userMessageContent.find(
			(item: any) => item.type === "tool_result" && item.tool_use_id === toolCallId,
		)

		expect(toolResult).toBeDefined()
		expect(toolResult.is_error).toBe(true)
		expect(toolResult.content).toContain("was not executed because a tool has already been used")
	})

	it("should still work with didRejectTool flag for unknown tool", async () => {
		const toolCallId = "tool_call_rejected_test"
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId,
				name: "unknown_tool",
				params: {},
				partial: false,
			},
		]

		mockTask.didRejectTool = true

		await presentAssistantMessage(mockTask)

		// When didRejectTool is true, should send error tool_result
		const toolResult = mockTask.userMessageContent.find(
			(item: any) => item.type === "tool_result" && item.tool_use_id === toolCallId,
		)

		expect(toolResult).toBeDefined()
		expect(toolResult.is_error).toBe(true)
		expect(toolResult.content).toContain("due to user rejecting a previous tool")
	})

	it("returns one summary for safe read-only batch", async () => {
		mockTask.metadata = { task: "Collect context", images: [] }
		mockTask.dispatchOrchestrationExecution = vi.fn().mockResolvedValue({
			handled: true,
			route: "subtooling",
			decision: { kind: "subtooling", reason: "batch", confidence: "high" },
			batchResult: {
				requestId: "request-1",
				status: "completed",
				results: [
					{ callId: "tool-1", tool: "read_file", content: "file content", success: true },
					{ callId: "tool-2", tool: "list_files", content: "files list", success: true },
				],
				errors: [],
				summary: "Tool batch completed successfully (2 calls).",
			},
		})

		mockTask.api.getModel = () => ({ id: "test-model", info: { includedTools: [] } })
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-1",
				name: "read_file",
				params: {},
				nativeArgs: { files: [{ path: "a.ts" }] },
				partial: false,
			},
			{
				type: "tool_use",
				id: "tool-2",
				name: "list_files",
				params: { path: "." },
				nativeArgs: { path: ".", recursive: false },
				partial: false,
			},
		]

		await presentAssistantMessage(mockTask)

		expect(mockTask.dispatchOrchestrationExecution).toHaveBeenCalled()
		expect(
			mockTask.userMessageContent.some(
				(item: any) => item.type === "text" && item.text.includes("Tool batch completed successfully"),
			),
		).toBe(true)
	})

	it("maps safe batch tool errors back to the matching tool_result entries", async () => {
		mockTask.metadata = { task: "Collect context", images: [] }
		mockTask.dispatchOrchestrationExecution = vi.fn().mockResolvedValue({
			handled: true,
			route: "subtooling",
			decision: { kind: "subtooling", reason: "batch", confidence: "high" },
			batchResult: {
				requestId: "request-err-1",
				status: "completed",
				results: [{ callId: "tool-1", tool: "read_file", content: "file content", success: true }],
				errors: [{ callId: "tool-2", tool: "search_files", message: "Search failed" }],
				summary: "Tool batch completed with 1 error.",
			},
		})

		mockTask.api.getModel = () => ({ id: "test-model", info: { includedTools: [] } })
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-1",
				name: "read_file",
				params: { path: "a.ts" },
				nativeArgs: { path: "a.ts" },
				partial: false,
			},
			{
				type: "tool_use",
				id: "tool-2",
				name: "search_files",
				params: { regex: "TODO", path: "src" },
				nativeArgs: { regex: "TODO", path: "src" },
				partial: false,
			},
		]

		await presentAssistantMessage(mockTask)

		expect(mockTask.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-1",
					content: "file content",
					is_error: false,
				}),
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-2",
					content: "Search failed",
					is_error: true,
				}),
				expect.objectContaining({ type: "text", text: "Tool batch completed with 1 error." }),
			]),
		)
	})

	// kilocode_change start
	it("binds research batch results back to each tool_result for context-gathering flow", async () => {
		mockTask.metadata = { task: "Research parser issue", images: [] }
		mockTask.dispatchOrchestrationExecution = vi.fn().mockResolvedValue({
			handled: true,
			route: "subtooling",
			decision: { kind: "subtooling", reason: "batch", confidence: "high" },
			batchResult: {
				requestId: "request-research-1",
				status: "completed",
				results: [
					{ callId: "tool-1", tool: "read_file", content: "parser source", success: true },
					{ callId: "tool-2", tool: "search_files", content: "found TODOs", success: true },
					{ callId: "tool-3", tool: "list_files", content: "src/core/parser", success: true },
				],
				errors: [],
				summary: "Tool batch completed successfully (3 calls).",
			},
		})

		mockTask.api.getModel = () => ({ id: "test-model", info: { includedTools: [] } })
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-1",
				name: "read_file",
				params: { path: "src/core/parser.ts" },
				nativeArgs: { path: "src/core/parser.ts" },
				partial: false,
			},
			{
				type: "tool_use",
				id: "tool-2",
				name: "search_files",
				params: { regex: "TODO", path: "src" },
				nativeArgs: { regex: "TODO", path: "src" },
				partial: false,
			},
			{
				type: "tool_use",
				id: "tool-3",
				name: "list_files",
				params: { path: "src/core", recursive: true },
				nativeArgs: { path: "src/core", recursive: true },
				partial: false,
			},
		]

		await presentAssistantMessage(mockTask)

		expect(mockTask.dispatchOrchestrationExecution).toHaveBeenCalledTimes(1)
		expect(mockTask.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-1",
					content: "parser source",
					is_error: false,
				}),
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-2",
					content: "found TODOs",
					is_error: false,
				}),
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-3",
					content: "src/core/parser",
					is_error: false,
				}),
				expect.objectContaining({ type: "text", text: "Tool batch completed successfully (3 calls)." }),
			]),
		)
		expect(mockTask.didAlreadyUseTool).toBe(true)
	})

	it("binds a dispatched subagent launch to the matching tool_result entry", async () => {
		mockTask.metadata = { task: "Delegate parser research", images: [] }
		mockTask.dispatchOrchestrationExecution = vi.fn().mockResolvedValue({
			handled: true,
			route: "subagent",
			decision: { kind: "subagent", reason: "background delegation", confidence: "high" },
			result: {
				callId: "tool-1",
				tool: "new_task",
				content: "Delegated to child task child-bg",
			},
		})

		mockTask.api.getModel = () => ({ id: "test-model", info: { includedTools: [] } })
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-1",
				name: "new_task",
				params: { mode: "code", message: "Research", execution: "background" },
				nativeArgs: { mode: "code", message: "Research", execution: "background" },
				partial: false,
			},
		]

		await presentAssistantMessage(mockTask)

		expect(mockTask.dispatchOrchestrationExecution).toHaveBeenCalledTimes(1)
		expect(mockTask.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-1",
					content: "Delegated to child task child-bg",
					is_error: false,
				}),
			]),
		)
		expect(mockTask.didAlreadyUseTool).toBe(true)
	})

	it("preserves native direct flow when orchestration explicitly declines handling", async () => {
		const toolCallId = "tool_call_direct_fallback"
		mockTask.dispatchOrchestrationExecution = vi.fn().mockResolvedValue({
			handled: false,
			route: "direct",
			decision: { kind: "direct", reason: "fallback", confidence: "high" },
			reason: "fallback",
		})
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				id: toolCallId,
				name: "nonexistent_tool",
				params: { some: "param" },
				partial: false,
			},
		]

		await presentAssistantMessage(mockTask)

		expect(mockTask.dispatchOrchestrationExecution).toHaveBeenCalledWith(
			[{ callId: toolCallId, tool: "nonexistent_tool", arguments: { some: "param" } }],
			expect.objectContaining({
				executeToolBatch: expect.any(Function),
				executeSubagent: expect.any(Function),
			}),
		)

		expect(mockTask.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: toolCallId,
					is_error: true,
					content: expect.stringContaining("nonexistent_tool"),
				}),
			]),
		)
		expect(mockTask.say).toHaveBeenCalledWith("error", "unknownToolError")
	})
	// kilocode_change end
})
