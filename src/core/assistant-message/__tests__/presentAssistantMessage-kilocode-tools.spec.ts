// kilocode_change - new file

import { beforeEach, describe, expect, it, vi } from "vitest"
import { presentAssistantMessage } from "../presentAssistantMessage"

const mocks = vi.hoisted(() => ({
	newRuleTool: vi.fn(),
	reportBugTool: vi.fn(),
	condenseTool: vi.fn(),
	runSlashCommandHandle: vi.fn(),
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
vi.mock("../../tools/kilocode/newRuleTool", () => ({
	newRuleTool: mocks.newRuleTool,
}))
vi.mock("../../tools/kilocode/reportBugTool", () => ({
	reportBugTool: mocks.reportBugTool,
}))
vi.mock("../../tools/kilocode/condenseTool", () => ({
	condenseTool: mocks.condenseTool,
}))
vi.mock("../../tools/RunSlashCommandTool", () => ({
	runSlashCommandTool: {
		handle: mocks.runSlashCommandHandle,
	},
}))

describe("presentAssistantMessage - kilocode tool routing", () => {
	const createMockTask = () => {
		const provider = {
			getState: vi.fn().mockResolvedValue({
				mode: "code",
				customModes: [],
				experiments: {},
			}),
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
				getModel: () => ({ id: "test-model", info: {} }),
			},
			browserSession: {
				closeBrowser: vi.fn().mockResolvedValue(undefined),
			},
			recordToolUsage: vi.fn(),
			recordToolError: vi.fn(),
			checkpointSave: vi.fn().mockResolvedValue(undefined),
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
			task: vi.fn().mockResolvedValue({ response: "yesButtonClicked" }),
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

		return task
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.newRuleTool.mockImplementation(
			async (_cline: any, _block: any, _askApproval: any, _handleError: any, pushToolResult: any) => {
				pushToolResult("new rule result")
			},
		)
		mocks.reportBugTool.mockImplementation(
			async (_cline: any, _block: any, _askApproval: any, _handleError: any, pushToolResult: any) => {
				pushToolResult("report bug result")
			},
		)
		mocks.condenseTool.mockImplementation(
			async (_cline: any, _block: any, _askApproval: any, _handleError: any, pushToolResult: any) => {
				pushToolResult("condense result")
			},
		)
		mocks.runSlashCommandHandle.mockImplementation(async (_cline: any, _block: any, callbacks: any) => {
			callbacks.pushToolResult("slash command result")
		})
	})

	it("routes new_rule to the dedicated handler", async () => {
		const task = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-new-rule-1",
				name: "new_rule",
				params: { path: ".kilocode/rules/example.md", content: "rule body" },
				partial: false,
			},
		]

		await presentAssistantMessage(task)

		expect(mocks.newRuleTool).toHaveBeenCalledTimes(1)
		expect(task.recordToolUsage).toHaveBeenCalledWith("new_rule")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-new-rule-1",
					content: "new rule result",
				}),
			]),
		)
	})

	it("routes report_bug to the dedicated handler", async () => {
		const task = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-report-bug-1",
				name: "report_bug",
				params: { title: "Broken flow", description: "Steps to reproduce" },
				partial: false,
			},
		]

		await presentAssistantMessage(task)

		expect(mocks.reportBugTool).toHaveBeenCalledTimes(1)
		expect(task.recordToolUsage).toHaveBeenCalledWith("report_bug")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-report-bug-1",
					content: "report bug result",
				}),
			]),
		)
	})

	it("routes condense to the dedicated handler", async () => {
		const task = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-condense-1",
				name: "condense",
				params: { message: "Please summarize this context" },
				partial: false,
			},
		]

		await presentAssistantMessage(task)

		expect(mocks.condenseTool).toHaveBeenCalledTimes(1)
		expect(task.recordToolUsage).toHaveBeenCalledWith("condense")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-condense-1",
					content: "condense result",
				}),
			]),
		)
	})

	it("routes run_slash_command to RunSlashCommandTool.handle", async () => {
		const task = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-slash-1",
				name: "run_slash_command",
				params: { command: "init", args: "--fast" },
				partial: false,
			},
		]

		await presentAssistantMessage(task)

		expect(mocks.runSlashCommandHandle).toHaveBeenCalledTimes(1)
		expect(task.recordToolUsage).toHaveBeenCalledWith("run_slash_command")
		expect(task.userMessageContent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "tool-slash-1",
					content: "slash command result",
				}),
			]),
		)
	})
})
