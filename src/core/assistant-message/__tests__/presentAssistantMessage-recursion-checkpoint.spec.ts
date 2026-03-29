// kilocode_change - new file

import { beforeEach, describe, expect, it, vi } from "vitest"
import { presentAssistantMessage } from "../presentAssistantMessage"

const mocks = vi.hoisted(() => ({
	validateToolUse: vi.fn(),
	writeToFileHandle: vi.fn(),
	yieldPromise: vi.fn(),
	captureException: vi.fn(),
}))

vi.mock("../../task/Task")
vi.mock("../../tools/validateToolUse", () => ({
	validateToolUse: mocks.validateToolUse,
}))
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureToolUsage: vi.fn(),
			captureConsecutiveMistakeError: vi.fn(),
			captureException: mocks.captureException,
		},
	},
}))
vi.mock("../../tools/WriteToFileTool", () => ({
	writeToFileTool: {
		handle: mocks.writeToFileHandle,
	},
}))
vi.mock("../kilocode", () => ({
	yieldPromise: mocks.yieldPromise,
}))

describe("presentAssistantMessage - recursion and checkpoint edges", () => {
	const createMockTask = () => {
		const getState = vi.fn().mockResolvedValue({
			mode: "code",
			customModes: [],
			experiments: {},
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
			currentStreamingDidCheckpoint: false,
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

		return { task, getState }
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.writeToFileHandle.mockImplementation(async (_cline: any, block: any, callbacks: any) => {
			callbacks.pushToolResult(`wrote ${block.id}`)
		})
		mocks.yieldPromise.mockResolvedValue(undefined)
	})

	it("yields and recursively processes the next ready text block", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "text",
				content: "first chunk",
				partial: false,
			},
			{
				type: "text",
				content: "second chunk",
				partial: false,
			},
		]

		await presentAssistantMessage(task)

		expect(task.say).toHaveBeenNthCalledWith(1, "text", "first chunk", undefined, false)
		expect(task.say).toHaveBeenNthCalledWith(2, "text", "second chunk", undefined, false)
		expect(task.currentStreamingContentIndex).toBe(2)
		expect(task.userMessageContentReady).toBe(true)
	})

	it("re-enters after a pending partial text update becomes available", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "text",
				content: "partial chunk",
				partial: true,
			},
		]
		let reentered = false
		task.say = vi
			.fn()
			.mockImplementation(async (_type: string, _content: string, _images: unknown, partial?: boolean) => {
				if (partial && !reentered) {
					reentered = true
					await presentAssistantMessage(task)
				}
			})

		await presentAssistantMessage(task)

		expect(task.say).toHaveBeenCalledTimes(2)
		expect(task.say).toHaveBeenNthCalledWith(1, "text", "partial chunk", undefined, true)
		expect(task.say).toHaveBeenNthCalledWith(2, "text", "partial chunk", undefined, true)
		expect(task.presentAssistantMessageHasPendingUpdates).toBe(false)
		expect(task.currentStreamingContentIndex).toBe(0)
		expect(task.userMessageContentReady).toBe(false)
	})

	it("swallows checkpoint save errors and still executes the tool", async () => {
		const { task } = createMockTask()
		task.assistantMessageContent = [
			{
				type: "tool_use",
				id: "tool-write-error",
				name: "write_to_file",
				params: { path: "error.txt", content: "data" },
				partial: false,
			},
		]
		task.checkpointSave.mockRejectedValue(new Error("checkpoint failed"))
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

		await presentAssistantMessage(task)

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Error saving checkpoint: checkpoint failed"),
			expect.any(Error),
		)
		expect(mocks.writeToFileHandle).toHaveBeenCalledTimes(1)
		expect(task.userMessageContent).toEqual([
			{
				type: "tool_result",
				tool_use_id: "tool-write-error",
				content: "wrote tool-write-error",
			},
		])

		consoleErrorSpy.mockRestore()
	})
})
