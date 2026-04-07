import { requestUserInputTool } from "../RequestUserInputTool"
import { ToolUse } from "../../../shared/tools"
import { NativeToolCallParser } from "../../assistant-message/NativeToolCallParser"

describe("requestUserInputTool", () => {
	let mockCline: any
	let mockPushToolResult: any
	let toolResult: any

	const questions = [
		{
			header: "Scope",
			question: "Which slice should I implement first?",
			options: [
				{ label: "Search", description: "Start with provider-aware search." },
				{ label: "UI", description: "Start with the structured input UI." },
			],
		},
	]

	beforeEach(() => {
		vi.clearAllMocks()

		mockCline = {
			ask: vi.fn().mockResolvedValue({ text: "Scope: Search" }),
			say: vi.fn().mockResolvedValue(undefined),
			recordToolError: vi.fn(),
			consecutiveMistakeCount: 0,
			didToolFailInCurrentTurn: false,
			providerRef: {
				deref: () => ({
					getState: () => Promise.resolve({ yoloMode: false }),
				}),
			},
		}

		mockPushToolResult = vi.fn((result) => {
			toolResult = result
		})
	})

	it("requests structured input and forwards metadata to task.ask", async () => {
		const block: ToolUse<"request_user_input"> = {
			type: "tool_use",
			name: "request_user_input",
			params: {},
			partial: false,
			nativeArgs: { questions },
		}

		await requestUserInputTool.handle(mockCline, block, {
			askApproval: vi.fn(),
			handleError: vi.fn(),
			pushToolResult: mockPushToolResult,
			removeClosingTag: vi.fn((tag, value) => value || ""),
			toolProtocol: "native",
		})

		expect(mockCline.ask).toHaveBeenCalledWith(
			"followup",
			expect.stringContaining("1. Scope"),
			false,
			undefined,
			false,
			{
				metadata: {
					requestUserInput: {
						questions,
					},
				},
			},
		)
		expect(mockCline.say).toHaveBeenCalledWith("user_feedback", "Scope: Search", undefined)
		expect(toolResult).toContain("<answer>")
	})

	it("returns an error result when yoloMode is enabled", async () => {
		mockCline.providerRef = {
			deref: () => ({
				getState: () => Promise.resolve({ yoloMode: true }),
			}),
		}

		const block: ToolUse<"request_user_input"> = {
			type: "tool_use",
			name: "request_user_input",
			params: {},
			partial: false,
			nativeArgs: { questions },
		}

		await requestUserInputTool.handle(mockCline, block, {
			askApproval: vi.fn(),
			handleError: vi.fn(),
			pushToolResult: mockPushToolResult,
			removeClosingTag: vi.fn((tag, value) => value || ""),
			toolProtocol: "native",
		})

		expect(mockCline.ask).not.toHaveBeenCalled()
		expect(toolResult).toContain("not available in yolo mode")
	})

	it("streams only the first question during partial handling", async () => {
		const block: ToolUse<"request_user_input"> = {
			type: "tool_use",
			name: "request_user_input",
			params: {},
			partial: true,
			nativeArgs: { questions },
		}

		await requestUserInputTool.handle(mockCline, block, {
			askApproval: vi.fn(),
			handleError: vi.fn(),
			pushToolResult: mockPushToolResult,
			removeClosingTag: vi.fn((tag, value) => value || ""),
			toolProtocol: "native",
		})

		expect(mockCline.ask).toHaveBeenCalledWith("followup", "Which slice should I implement first?", true)
	})

	describe("NativeToolCallParser integration", () => {
		beforeEach(() => {
			NativeToolCallParser.clearAllStreamingToolCalls()
			NativeToolCallParser.clearRawChunkState()
		})

		it("finalizes request_user_input native args", () => {
			NativeToolCallParser.startStreamingToolCall("call_789", "request_user_input")
			NativeToolCallParser.processStreamingChunk(
				"call_789",
				JSON.stringify({
					questions,
				}),
			)

			const result = NativeToolCallParser.finalizeStreamingToolCall("call_789")

			expect(result).not.toBeNull()
			if (result?.type === "tool_use") {
				expect(result.name).toBe("request_user_input")
				expect(result.nativeArgs).toEqual({ questions })
			}
		})
	})
})
