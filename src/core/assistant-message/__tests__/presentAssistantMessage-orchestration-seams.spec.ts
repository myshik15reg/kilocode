import { beforeEach, describe, expect, it, vi } from "vitest"
import { TOOL_PROTOCOL } from "@roo-code/types"
import { presentAssistantMessage } from "../presentAssistantMessage"

const mocks = vi.hoisted(() => ({
	validateToolUse: vi.fn(),
	readFileHandle: vi.fn(),
	listFilesHandle: vi.fn(),
	searchFilesHandle: vi.fn(),
	fetchInstructionsHandle: vi.fn(),
	codebaseSearchHandle: vi.fn(),
	webSearchHandle: vi.fn(),
	accessMcpResourceHandle: vi.fn(),
	newTaskHandle: vi.fn(),
	captureToolUsage: vi.fn(),
	captureConsecutiveMistakeError: vi.fn(),
	captureException: vi.fn(),
	resolveToolAlias: vi.fn((tool: string) => tool),
}))

vi.mock("../../task/Task")
vi.mock("../../tools/validateToolUse", () => ({
	validateToolUse: mocks.validateToolUse,
}))
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureToolUsage: mocks.captureToolUsage,
			captureConsecutiveMistakeError: mocks.captureConsecutiveMistakeError,
			captureException: mocks.captureException,
		},
	},
}))
vi.mock("../../tools/ReadFileTool", () => ({
	readFileTool: {
		handle: mocks.readFileHandle,
		getReadFileToolDescription: vi.fn(() => "[read_file]"),
	},
}))
vi.mock("../../tools/ListFilesTool", () => ({
	listFilesTool: {
		handle: mocks.listFilesHandle,
	},
}))
vi.mock("../../tools/SearchFilesTool", () => ({
	searchFilesTool: {
		handle: mocks.searchFilesHandle,
	},
}))
vi.mock("../../tools/FetchInstructionsTool", () => ({
	fetchInstructionsTool: {
		handle: mocks.fetchInstructionsHandle,
	},
}))
vi.mock("../../tools/CodebaseSearchTool", () => ({
	codebaseSearchTool: {
		handle: mocks.codebaseSearchHandle,
	},
}))
vi.mock("../../tools/WebSearchTool", () => ({
	webSearchTool: {
		handle: mocks.webSearchHandle,
	},
}))
vi.mock("../../tools/accessMcpResourceTool", () => ({
	accessMcpResourceTool: {
		handle: mocks.accessMcpResourceHandle,
	},
}))
vi.mock("../../tools/NewTaskTool", () => ({
	newTaskTool: {
		handle: mocks.newTaskHandle,
	},
}))
vi.mock("../prompts/tools/filter-tools-for-mode", () => ({
	resolveToolAlias: mocks.resolveToolAlias,
}))

describe("presentAssistantMessage - orchestration seams", () => {
	const createMockTask = (providerState: Record<string, unknown> = {}) => {
		const getState = vi.fn().mockResolvedValue({
			mode: "code",
			customModes: [],
			experiments: {},
			...providerState,
		})

		const provider = {
			getState,
			getMcpHub: vi.fn().mockReturnValue(undefined),
		}

		const task: any = {
			taskId: "test-task-id",
			instanceId: "test-instance",
			abort: false,
			presentAssistantMessageLocked: false,
			presentAssistantMessageHasPendingUpdates: false,
			currentStreamingContentIndex: 0,
			assistantMessageContent: [],
			userMessageContent: [],
			userMessageContentReady: false,
			didCompleteReadingStream: true,
			didRejectTool: false,
			didAlreadyUseTool: false,
			diffEnabled: false,
			consecutiveMistakeCount: 0,
			clineMessages: [],
			api: {
				getModel: () => ({ id: "test-model", info: { includedTools: ["read_file"] } }),
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
				deref: () => provider,
			},
			dispatchOrchestrationExecution: vi.fn(),
			say: vi.fn().mockResolvedValue(undefined),
			ask: vi.fn().mockResolvedValue({ response: "yesButtonClicked" }),
		}

		task.pushToolResultToUserContent = vi.fn().mockImplementation((toolResult: any) => {
			const existingResult = task.userMessageContent.find(
				(block: any) => block.type === "tool_result" && block.tool_use_id === toolResult.tool_use_id,
			)
			if (existingResult) {
				return false
			}
			task.userMessageContent.push(toolResult)
			return true
		})

		return { task, getState }
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.resolveToolAlias.mockImplementation((tool: string) => tool)

		const toolHandlers = [
			mocks.readFileHandle,
			mocks.listFilesHandle,
			mocks.searchFilesHandle,
			mocks.fetchInstructionsHandle,
			mocks.codebaseSearchHandle,
			mocks.webSearchHandle,
			mocks.accessMcpResourceHandle,
			mocks.newTaskHandle,
		]
		for (const handler of toolHandlers) {
			handler.mockReset()
		}
	})

	it("executes a safe read_file batch through the orchestrated seam", async () => {
		const { task, getState } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-read-1",
				name: "read_file",
				params: {},
				nativeArgs: { files: [{ path: "src/a.ts" }] },
				partial: false,
			},
		]
		task.dispatchOrchestrationExecution.mockImplementation(async (calls: any, callbacks: any) => {
			expect(calls).toEqual([
				{ callId: "tool-read-1", tool: "read_file", arguments: { files: [{ path: "src/a.ts" }] } },
			])
			const content = await callbacks.executeToolBatch(calls[0])
			return {
				handled: true,
				route: "subtooling",
				decision: { kind: "subtooling", reason: "batch", confidence: "high" },
				batchResult: {
					requestId: "req-1",
					status: "completed",
					results: [{ callId: "tool-read-1", tool: "read_file", content, success: true }],
					errors: [],
					summary: "Batch finished",
				},
			}
		})
		mocks.readFileHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			expect(callbacks.toolProtocol).toBe(TOOL_PROTOCOL.NATIVE)
			expect(callbacks.toolCallId).toBe("tool-read-1")
			callbacks.pushToolResult("file content")
		})

		await presentAssistantMessage(task)

		expect(getState).toHaveBeenCalled()
		expect(mocks.validateToolUse).toHaveBeenCalledWith(
			"read_file",
			"code",
			[],
			{ apply_diff: false },
			{ files: [{ path: "src/a.ts" }] },
			{},
			["read_file"],
		)
		expect(mocks.readFileHandle).toHaveBeenCalledTimes(1)
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-read-1",
					content: "file content",
					is_error: false,
				}),
				expect.objectContaining({ type: "text", text: "Batch finished" }),
			]),
		)
		expect(task.didAlreadyUseTool).toBe(true)
		expect(task.userMessageContentReady).toBe(true)
	})

	it("validates native read_file arguments from nativeArgs when orchestration falls back to local execution", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-read-local-1",
				name: "read_file",
				params: {},
				nativeArgs: { files: [{ path: "src/local.ts" }] },
				partial: false,
			},
		]
		task.dispatchOrchestrationExecution.mockResolvedValue({ handled: false })
		mocks.readFileHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			callbacks.pushToolResult("local file content")
		})

		await presentAssistantMessage(task)

		expect(mocks.validateToolUse).toHaveBeenCalledWith(
			"read_file",
			"code",
			[],
			{ apply_diff: false },
			{ files: [{ path: "src/local.ts" }] },
			{},
			["read_file"],
		)
		expect(mocks.readFileHandle).toHaveBeenCalledTimes(1)
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-read-local-1",
					content: "local file content",
				}),
			]),
		)
	})

	it("returns the default placeholder when a batched tool produces no text result", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-list-1",
				name: "list_files",
				params: { path: ".", recursive: false },
				nativeArgs: { path: ".", recursive: false },
				partial: false,
			},
		]
		task.dispatchOrchestrationExecution.mockImplementation(async (calls: any, callbacks: any) => {
			const content = await callbacks.executeToolBatch(calls[0])
			return {
				handled: true,
				route: "subtooling",
				decision: { kind: "subtooling", reason: "batch", confidence: "high" },
				batchResult: {
					requestId: "req-empty",
					status: "completed",
					results: [{ callId: "tool-list-1", tool: "list_files", content, success: true }],
					errors: [],
					summary: "Empty batch finished",
				},
			}
		})
		mocks.listFilesHandle.mockResolvedValue(undefined)

		await presentAssistantMessage(task)

		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-list-1",
					content: "(tool did not return anything)",
					is_error: false,
				}),
			]),
		)
	})

	it("routes a background new_task through executeSubagent and binds the returned text", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-sub-1",
				name: "new_task",
				params: { mode: "code", message: "Research issue" },
				nativeArgs: { mode: "code", message: "Research issue" },
				partial: false,
			},
		]
		task.dispatchOrchestrationExecution.mockImplementation(async (calls: any, callbacks: any) => {
			const content = await callbacks.executeSubagent(calls[0])
			return {
				handled: true,
				route: "subagent",
				decision: { kind: "subagent", reason: "delegate", confidence: "high" },
				result: {
					callId: "tool-sub-1",
					tool: "new_task",
					content,
				},
			}
		})
		mocks.newTaskHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			expect(callbacks.toolCallId).toBe("tool-sub-1")
			callbacks.pushToolResult([{ type: "text", text: "Delegated child task" }])
		})

		await presentAssistantMessage(task)

		expect(mocks.newTaskHandle).toHaveBeenCalledTimes(1)
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-sub-1",
					content: "Delegated child task",
					is_error: false,
				}),
			]),
		)
		expect(task.didAlreadyUseTool).toBe(true)
	})

	it("falls back to the first candidate block when a subagent result omits callId", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-sub-fallback",
				name: "new_task",
				params: { mode: "code", message: "Fallback research" },
				nativeArgs: { mode: "code", message: "Fallback research" },
				partial: false,
			},
		]
		task.dispatchOrchestrationExecution.mockResolvedValue({
			handled: true,
			route: "subagent",
			decision: { kind: "subagent", reason: "delegate", confidence: "high" },
			result: {
				tool: "new_task",
				content: "Delegated without call id",
			},
		})

		await presentAssistantMessage(task)

		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-sub-fallback",
					content: "Delegated without call id",
					is_error: false,
				}),
			]),
		)
	})

	it("binds batch results and errors back to each candidate tool result", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-read-2",
				name: "read_file",
				params: { files: [{ path: "a.ts" }] },
				nativeArgs: { files: [{ path: "a.ts" }] },
				partial: false,
			},
			{
				type: "tool_use",
				id: "tool-search-2",
				name: "search_files",
				params: { path: "src", regex: "TODO" },
				nativeArgs: { path: "src", regex: "TODO" },
				partial: false,
			},
		]
		task.dispatchOrchestrationExecution.mockResolvedValue({
			handled: true,
			route: "subtooling",
			decision: { kind: "subtooling", reason: "batch", confidence: "high" },
			batchResult: {
				requestId: "req-batch-errors",
				status: "completed",
				results: [{ callId: "tool-read-2", tool: "read_file", content: "read ok", success: true }],
				errors: [{ callId: "tool-search-2", tool: "search_files", message: "search failed" }],
				summary: "Batch with mixed results",
			},
		})

		await presentAssistantMessage(task)

		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-read-2",
					content: "read ok",
					is_error: false,
				}),
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-search-2",
					content: "search failed",
					is_error: true,
				}),
				expect.objectContaining({ type: "text", text: "Batch with mixed results" }),
			]),
		)
		expect(task.currentStreamingContentIndex).toBe(2)
	})

	it("stops orchestration when the first candidate tool is partial", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-partial-1",
				name: "read_file",
				params: { files: [{ path: "a.ts" }] },
				nativeArgs: { files: [{ path: "a.ts" }] },
				partial: true,
			},
		]

		await presentAssistantMessage(task)

		expect(task.dispatchOrchestrationExecution).not.toHaveBeenCalled()
	})
})
