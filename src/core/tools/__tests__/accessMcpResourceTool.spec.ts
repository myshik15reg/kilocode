import { accessMcpResourceTool } from "../accessMcpResourceTool"
import { Task } from "../../task/Task"
import { ToolUse } from "../../../shared/tools"

vi.mock("../../prompts/responses", () => ({
	formatResponse: {
		toolResult: vi.fn((result: string, images?: string[]) =>
			images?.length ? [result, ...images] : `Tool result: ${result}`,
		),
		toolDenied: vi.fn(() => "Tool denied"),
	},
}))

describe("accessMcpResourceTool", () => {
	let mockTask: Partial<Task>
	let mockAskApproval: ReturnType<typeof vi.fn>
	let mockHandleError: ReturnType<typeof vi.fn>
	let mockPushToolResult: ReturnType<typeof vi.fn>
	let mockRemoveClosingTag: ReturnType<typeof vi.fn>
	let mockProviderRef: any

	beforeEach(() => {
		mockAskApproval = vi.fn()
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn()
		mockRemoveClosingTag = vi.fn((tag: string, value?: string) => value || "")

		mockProviderRef = {
			deref: vi.fn().mockReturnValue({
				getMcpHub: () => ({
					readResource: vi.fn(),
				}),
			}),
		}

		mockTask = {
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn(),
			say: vi.fn(),
			ask: vi.fn(),
			providerRef: mockProviderRef,
		}
	})

	it("compacts oversized MCP resource text before surfacing it", async () => {
		const longText = `${"A".repeat(9000)}${"B".repeat(9000)}${"C".repeat(9000)}`
		const readResource = vi.fn().mockResolvedValue({
			contents: [{ uri: "resource://doc", text: longText }],
		})
		mockProviderRef.deref.mockReturnValue({
			getMcpHub: () => ({
				readResource,
			}),
		})
		mockAskApproval.mockResolvedValue(true)

		const block: ToolUse = {
			type: "tool_use",
			name: "access_mcp_resource",
			params: {
				server_name: "test_server",
				uri: "resource://doc",
			},
			partial: false,
		}

		await accessMcpResourceTool.handle(mockTask as Task, block as any, {
			askApproval: mockAskApproval,
			handleError: mockHandleError,
			pushToolResult: mockPushToolResult,
			removeClosingTag: mockRemoveClosingTag,
			toolProtocol: "xml",
		})

		const responseCall = (mockTask.say as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) => call[0] === "mcp_server_response",
		)
		expect(responseCall?.[1]).toContain("[NOTE] MCP response truncated")
		expect(responseCall?.[1].startsWith("A".repeat(8000))).toBe(true)
		expect(responseCall?.[1].endsWith("C".repeat(3000))).toBe(true)
		expect(mockPushToolResult).toHaveBeenCalledWith(expect.stringContaining("[NOTE] MCP response truncated"))
	})

	it("keeps image payloads while compacting text", async () => {
		const readResource = vi.fn().mockResolvedValue({
			contents: [
				{ uri: "resource://doc", text: `${"A".repeat(9000)}${"C".repeat(9000)}` },
				{ uri: "resource://img", mimeType: "image/png", blob: "abc123" },
			],
		})
		mockProviderRef.deref.mockReturnValue({
			getMcpHub: () => ({
				readResource,
			}),
		})
		mockAskApproval.mockResolvedValue(true)

		const block: ToolUse = {
			type: "tool_use",
			name: "access_mcp_resource",
			params: {
				server_name: "test_server",
				uri: "resource://doc",
			},
			partial: false,
		}

		await accessMcpResourceTool.handle(mockTask as Task, block as any, {
			askApproval: mockAskApproval,
			handleError: mockHandleError,
			pushToolResult: mockPushToolResult,
			removeClosingTag: mockRemoveClosingTag,
			toolProtocol: "xml",
		})

		expect(mockTask.say).toHaveBeenCalledWith(
			"mcp_server_response",
			expect.stringContaining("[NOTE] MCP response truncated"),
			["data:image/png;base64,abc123"],
		)
		const pushed = mockPushToolResult.mock.calls[0][0]
		expect(Array.isArray(pushed)).toBe(true)
		expect(pushed[1]).toBe("data:image/png;base64,abc123")
	})
})
