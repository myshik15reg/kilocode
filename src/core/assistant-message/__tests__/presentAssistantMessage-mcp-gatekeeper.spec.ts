// kilocode_change - new file

import { beforeEach, describe, expect, it, vi } from "vitest"
import { presentAssistantMessage } from "../presentAssistantMessage"

const mocks = vi.hoisted(() => ({
	useMcpToolHandle: vi.fn(),
	askFollowupHandle: vi.fn(),
	gatekeeperApproval: vi.fn(),
	captureAskApproval: vi.fn(),
	recordSanitizedText: vi.fn(),
	captureToolUsage: vi.fn(),
	captureConsecutiveMistakeError: vi.fn(),
	captureException: vi.fn(),
}))

vi.mock("../../task/Task")
vi.mock("../../tools/validateToolUse", () => ({
	validateToolUse: vi.fn(),
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
vi.mock("../../tools/UseMcpToolTool", () => ({
	useMcpToolTool: {
		handle: mocks.useMcpToolHandle,
	},
}))
vi.mock("../../tools/AskFollowupQuestionTool", () => ({
	askFollowupQuestionTool: {
		handle: mocks.askFollowupHandle,
	},
}))
vi.mock("../kilocode/gatekeeper", () => ({
	evaluateGatekeeperApproval: mocks.gatekeeperApproval,
}))
vi.mock("../kilocode/captureAskApprovalEvent", () => ({
	captureAskApproval: mocks.captureAskApproval,
}))

describe("presentAssistantMessage - MCP and gatekeeper flows", () => {
	const createMockTask = (
		stateOverrides: Record<string, unknown> = {},
		providerOverrides: Record<string, unknown> = {},
	) => {
		const state = {
			mode: "code",
			customModes: [],
			experiments: {},
			...stateOverrides,
		}

		const provider = {
			getState: vi.fn().mockResolvedValue(state),
			getMcpHub: vi.fn().mockReturnValue(undefined),
			...providerOverrides,
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
				deref: () => provider,
			},
			dispatchOrchestrationExecution: vi.fn().mockResolvedValue({
				handled: false,
				route: "direct",
				decision: { kind: "direct", reason: "direct", confidence: "high" },
				reason: "direct",
			}),
			say: vi.fn().mockResolvedValue(undefined),
			ask: vi.fn().mockResolvedValue({ response: "yesButtonClicked" }),
			checkpointSave: vi.fn().mockResolvedValue(undefined),
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

		return { task, provider }
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.useMcpToolHandle.mockReset()
		mocks.askFollowupHandle.mockReset()
		mocks.gatekeeperApproval.mockReset()
		mocks.captureAskApproval.mockReset()
		mocks.recordSanitizedText.mockReset()
	})

	it("delegates native mcp_tool_use through use_mcp_tool with resolved server name", async () => {
		const { task } = createMockTask(
			{},
			{
				getMcpHub: vi.fn().mockReturnValue({
					findServerNameBySanitizedName: vi.fn().mockReturnValue("my server"),
				}),
			},
		)

		task.assistantMessageContent = [
			{
				type: "mcp_tool_use",
				id: "mcp-call-1",
				name: "mcp_my_server_search_docs",
				serverName: "my_server",
				toolName: "search_docs",
				arguments: { query: "tool batching" },
				partial: false,
			},
		]

		mocks.useMcpToolHandle.mockImplementation(async (_cline: any, syntheticToolUse: any, callbacks: any) => {
			expect(syntheticToolUse).toMatchObject({
				type: "tool_use",
				name: "use_mcp_tool",
				params: {
					server_name: "my server",
					tool_name: "search_docs",
					arguments: JSON.stringify({ query: "tool batching" }),
				},
				nativeArgs: {
					server_name: "my server",
					tool_name: "search_docs",
					arguments: { query: "tool batching" },
				},
			})
			callbacks.pushToolResult("mcp result")
		})

		await presentAssistantMessage(task)

		expect(mocks.useMcpToolHandle).toHaveBeenCalledTimes(1)
		expect(task.recordToolUsage).toHaveBeenCalledWith("use_mcp_tool")
		expect(mocks.captureToolUsage).toHaveBeenCalledWith(task.taskId, "use_mcp_tool", "native")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "mcp-call-1",
					content: "mcp result",
				}),
			]),
		)
		expect(task.didAlreadyUseTool).toBe(true)
	})

	it("denies tool approval through the gatekeeper in yolo mode", async () => {
		const { task } = createMockTask({ yoloMode: true })

		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "gatekeeper-deny-1",
				name: "ask_followup_question",
				params: { question: "Need approval?" },
				partial: false,
			},
		]

		mocks.gatekeeperApproval.mockResolvedValue(false)
		mocks.askFollowupHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			const approved = await callbacks.askApproval("tool", "approval message")
			expect(approved).toBe(false)
		})

		await presentAssistantMessage(task)

		expect(mocks.gatekeeperApproval).toHaveBeenCalledWith(task, "ask_followup_question", {
			question: "Need approval?",
		})
		expect(mocks.captureAskApproval).toHaveBeenCalledWith("ask_followup_question", false)
		expect(task.didRejectTool).toBe(true)
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "gatekeeper-deny-1",
					content: expect.any(String),
				}),
			]),
		)
	})

	it("approves tool execution through the gatekeeper in yolo mode", async () => {
		const { task } = createMockTask({ yoloMode: true })

		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "gatekeeper-allow-1",
				name: "ask_followup_question",
				params: { question: "Proceed with tool?" },
				partial: false,
			},
		]

		mocks.gatekeeperApproval.mockResolvedValue(true)
		mocks.askFollowupHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			const approved = await callbacks.askApproval("tool", "approval message")
			expect(approved).toBe(true)
			callbacks.pushToolResult("approved result")
		})

		await presentAssistantMessage(task)

		expect(mocks.captureAskApproval).toHaveBeenCalledWith("ask_followup_question", true)
		expect(task.didRejectTool).toBe(false)
		expect(task.recordToolUsage).toHaveBeenCalledWith("ask_followup_question")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "gatekeeper-allow-1",
					content: "approved result",
				}),
			]),
		)
	})

	it("removes partial closing tags before passing text to tool handlers", async () => {
		const { task } = createMockTask()

		task.assistantMessageContent = [
			{
				type: "tool_use",
				name: "ask_followup_question",
				params: { question: "Question text </ques" },
				partial: true,
			},
		]

		mocks.askFollowupHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			const sanitized = callbacks.removeClosingTag("question", "Question text </ques")
			mocks.recordSanitizedText(sanitized)
			callbacks.pushToolResult("partial result")
		})

		await presentAssistantMessage(task)

		expect(mocks.recordSanitizedText).toHaveBeenCalledWith("Question text")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "text",
					text: expect.stringContaining("partial result"),
				}),
			]),
		)
	})
})
