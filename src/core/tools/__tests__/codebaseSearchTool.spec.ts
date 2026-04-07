// kilocode_change: file added
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("vscode", () => ({
	workspace: {
		asRelativePath: vi.fn((value: string) => value.replace(/^.*[\\/]repo[\\/]/, "")),
	},
}))

import { codebaseSearchTool } from "../CodebaseSearchTool"
import { formatResponse } from "../../prompts/responses"
import { Task } from "../../task/Task"
import { CodeIndexManager } from "../../../services/code-index/manager"
import { ManagedIndexer } from "../../../services/code-index/managed/ManagedIndexer" // kilocode_change

vi.mock("../../../services/code-index/manager", () => ({
	CodeIndexManager: {
		getInstance: vi.fn(),
	},
}))

vi.mock("../../../services/code-index/managed/ManagedIndexer", () => ({
	ManagedIndexer: {
		getInstance: vi.fn().mockReturnValue({
			isEnabled: vi.fn().mockReturnValue(false),
			search: vi.fn(),
		}),
	},
}))

describe("codebaseSearchTool", () => {
	let mockTask: Partial<Task>
	let askApproval: ReturnType<typeof vi.fn>
	let handleError: ReturnType<typeof vi.fn>
	let pushToolResult: ReturnType<typeof vi.fn>
	let removeClosingTag: (tag: string, text?: string) => string
	let toolProtocol: "xml" | "native"

	beforeEach(() => {
		vi.clearAllMocks()

		mockTask = {
			taskId: "task-1",
			cwd: "/repo",
			consecutiveMistakeCount: 0,
			getTaskScopedRetrievalMode: vi.fn(() => undefined),
			say: vi.fn().mockResolvedValue(undefined),
			ask: vi.fn(),
			sayAndCreateMissingParamError: vi.fn(),
			providerRef: {
				deref: vi.fn().mockReturnValue({ context: {} }),
			} as any,
		} as any

		askApproval = vi.fn().mockResolvedValue(true)
		handleError = vi.fn()
		pushToolResult = vi.fn()
		removeClosingTag = vi.fn((_, text) => text || "")
		toolProtocol = "xml"
	})

	it("returns a deterministic tool_error when query is missing/empty", async () => {
		// FIX: codebase_search-missing-query (TestAnalyzer)
		const block = {
			type: "tool_use" as const,
			name: "codebase_search" as const,
			params: {} as any,
			partial: false,
		}

		await codebaseSearchTool.handle(mockTask as Task, block, {
			askApproval: askApproval,
			handleError,
			pushToolResult,
			removeClosingTag,
			toolProtocol,
		})

		expect(askApproval).not.toHaveBeenCalled()
		expect(handleError).not.toHaveBeenCalled()
		expect(pushToolResult).toHaveBeenCalledTimes(1)
		expect(pushToolResult).toHaveBeenCalledWith(
			formatResponse.toolError(
				'Invalid arguments for codebase_search: missing or empty required parameter "query". Do NOT retry with {}. Retry with JSON arguments like: { "query": "<what you need to find>", "path": null }. If you don\'t know what to search for, ask the user a clarifying question instead of calling codebase_search with an empty query.',
				toolProtocol,
			),
		)

		expect(mockTask.consecutiveMistakeCount).toBe(1)
		expect((mockTask as any).didToolFailInCurrentTurn).toBe(true)
	})

	it("returns a friendly message when indexing is still in progress", async () => {
		const managerMock = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			getCurrentStatus: vi.fn().mockReturnValue({
				systemStatus: "Indexing" as const,
				message: "Processing files",
				processedItems: 10,
				totalItems: 100,
				currentItemUnit: "files",
			}),
			searchIndex: vi.fn(),
		}

		vi.mocked(CodeIndexManager.getInstance).mockReturnValue(managerMock as any)

		const block = {
			type: "tool_use" as const,
			name: "codebase_search" as const,
			params: { query: "example" },
			partial: false,
		}

		await codebaseSearchTool.handle(mockTask as Task, block, {
			askApproval,
			handleError,
			pushToolResult,
			removeClosingTag,
			toolProtocol,
		})

		expect(managerMock.searchIndex).not.toHaveBeenCalled()
		expect(pushToolResult).toHaveBeenCalledTimes(1)
		const pushedMessage = pushToolResult.mock.calls[0][0] as string
		expect(pushedMessage).toBe(
			formatResponse.toolError(
				"Processing files (Progress: 10/100 files). Semantic search is unavailable until indexing completes. Please try again later.",
			),
		)

		expect(mockTask.say).toHaveBeenCalledTimes(1)
		const sayMock = mockTask.say as unknown as ReturnType<typeof vi.fn>
		const sayCall = sayMock.mock.calls[0]
		expect(sayCall[0]).toBe("codebase_search_result")
		const payload = JSON.parse(sayCall[1])
		expect(payload).toEqual({
			tool: "codebaseSearch",
			content: {
				query: "example",
				results: [],
				status: {
					systemStatus: "Indexing",
					message: "Processing files",
					processedItems: 10,
					totalItems: 100,
					currentItemUnit: "files",
				},
			},
		})
	})

	it("uses artifact retrieval when code indexing is disabled but the query targets workflow docs", async () => {
		const managerMock = {
			isFeatureEnabled: false,
			isFeatureConfigured: false,
			getCurrentStatus: vi.fn().mockReturnValue({
				systemStatus: "Standby" as const,
				message: "Code indexing disabled",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "files",
			}),
			searchIndexDetailed: vi.fn().mockResolvedValue({
				query: "workflow protocol guide",
				queryClass: "workflow_docs",
				retrievalMode: "adaptive",
				retrievalConfidence: 0.84,
				results: [
					{
						score: 0.84,
						confidence: 0.84,
						sourceKind: "workflow",
						citationLabel: ".kilocode/workflows/quickref.md:1-3",
						retrievalPath: ["workspace", ".kilocode", "workflows", "quickref.md"],
						sources: [{ type: "lexical", label: "artifact match in quickref.md", score: 0.84 }],
						scoreBreakdown: { total: 0.84, lexical: 0.84 },
						payload: {
							filePath: "/repo/.kilocode/workflows/quickref.md",
							startLine: 1,
							endLine: 3,
							codeChunk: "workflow docs guidance",
						},
					},
				],
				keyPoints: [".kilocode/workflows/quickref.md:1-3"],
				sources: [{ type: "lexical", label: "artifact match in quickref.md", score: 0.84 }],
				warnings: ["Code indexing is disabled; returned artifact matches only."],
				postprocessUsed: true,
				compressionApplied: false,
			}),
		}

		vi.mocked(CodeIndexManager.getInstance).mockReturnValue(managerMock as any)

		const block = {
			type: "tool_use" as const,
			name: "codebase_search" as const,
			params: { query: "workflow protocol guide" },
			partial: false,
		}

		await codebaseSearchTool.handle(mockTask as Task, block, {
			askApproval,
			handleError,
			pushToolResult,
			removeClosingTag,
			toolProtocol,
		})

		expect(managerMock.searchIndexDetailed).toHaveBeenCalledWith({
			query: "workflow protocol guide",
			directoryPrefix: undefined,
			retrievalMode: undefined,
			taskId: "task-1",
		})
		expect(handleError).not.toHaveBeenCalled()
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Query class: workflow_docs"))
		expect(pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Source kind: workflow"))
	})

	it("sanitizes managed search failures and avoids logging sensitive error details", async () => {
		// FIX: 2026-02-19-reviewer-managed-search-log-redaction (TestAnalyzer)
		const managerMock = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			getCurrentStatus: vi.fn().mockReturnValue({
				systemStatus: "Indexing" as const,
				message: "Processing files",
				processedItems: 10,
				totalItems: 100,
				currentItemUnit: "files",
			}),
			searchIndex: vi.fn(),
		}

		vi.mocked(CodeIndexManager.getInstance).mockReturnValue(managerMock as any)

		const sensitiveError = new Error("request failed: https://user:pass@secret.example.com:1234/path?token=abc")
		vi.mocked(ManagedIndexer.getInstance).mockReturnValue({
			isEnabled: vi.fn().mockReturnValue(true),
			search: vi.fn().mockRejectedValue(sensitiveError),
		} as any)

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

		const block = {
			type: "tool_use" as const,
			name: "codebase_search" as const,
			params: { query: "example" },
			partial: false,
		}

		await codebaseSearchTool.handle(mockTask as Task, block, {
			askApproval,
			handleError,
			pushToolResult,
			removeClosingTag,
			toolProtocol,
		})

		const loggedMessages = logSpy.mock.calls.map((call) => String(call[0])).join("\n")
		expect(loggedMessages).not.toContain("secret.example.com")
		expect(loggedMessages).not.toContain("token=abc")
	})
	it("includes structured retrieval metadata in the UI payload and formatted tool output", async () => {
		const managerMock = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			getCurrentStatus: vi.fn().mockReturnValue({
				systemStatus: "Indexed",
				message: "Ready",
				processedItems: 100,
				totalItems: 100,
				currentItemUnit: "files",
			}),
			searchIndexDetailed: vi.fn().mockResolvedValue({
				query: "investigate delegation flow",
				queryClass: "broad_repo_research",
				queryRewrite: "investigate delegation orchestration flow",
				results: [
					{
						score: 0.91,
						confidence: 0.74,
						retrievalStage: "rerank",
						sourceKind: "code",
						citationLabel: "SubagentDelegationService.ts:120",
						retrievalPath: ["semantic", "rerank"],
						sources: [{ label: "delegation" }],
						scoreBreakdown: { total: 0.91, semantic: 0.81, rerank: 0.94 },
						payload: {
							filePath: "/repo/src/core/orchestration/subagents/SubagentDelegationService.ts",
							startLine: 120,
							endLine: 148,
							codeChunk: "const request = buildBackgroundRequest()",
						},
					},
				],
				keyPoints: ["background delegation uses structured handoff"],
				sources: [{ label: "delegation" }],
				warnings: ["rerank applied"],
				postprocessUsed: true,
				retrievalMode: "hybrid",
				retrievalConfidence: 0.61,
				compressionApplied: true,
				adaptiveCutoffApplied: true,
			}),
		}

		vi.mocked(CodeIndexManager.getInstance).mockReturnValue(managerMock as any)

		const block = {
			type: "tool_use" as const,
			name: "codebase_search" as const,
			params: { query: "investigate delegation flow" },
			partial: false,
		}

		await codebaseSearchTool.handle(mockTask as Task, block, {
			askApproval,
			handleError,
			pushToolResult,
			removeClosingTag,
			toolProtocol,
		})

		expect(managerMock.searchIndexDetailed).toHaveBeenCalledWith({
			query: "investigate delegation flow",
			directoryPrefix: undefined,
			retrievalMode: undefined,
			taskId: "task-1",
		})
		const sayMock = mockTask.say as unknown as ReturnType<typeof vi.fn>
		const payload = JSON.parse(sayMock.mock.calls[0][1])
		expect(payload.content).toEqual(
			expect.objectContaining({
				queryClass: "broad_repo_research",
				queryRewrite: "investigate delegation orchestration flow",
				retrievalMode: "hybrid",
				retrievalConfidence: 0.61,
				compressionApplied: true,
				adaptiveCutoffApplied: true,
			}),
		)
		expect(payload.content.results[0]).toEqual(
			expect.objectContaining({
				filePath: "src/core/orchestration/subagents/SubagentDelegationService.ts",
				retrievalStage: "rerank",
				sourceKind: "code",
				citationLabel: "SubagentDelegationService.ts:120",
				scoreBreakdown: { total: 0.91, semantic: 0.81, rerank: 0.94 },
			}),
		)

		const output = pushToolResult.mock.calls.at(-1)?.[0]
		expect(output).toContain("Query class: broad_repo_research")
		expect(output).toContain("Query rewrite: investigate delegation orchestration flow")
		expect(output).toContain("Retrieval mode: hybrid")
		expect(output).toContain("Retrieval confidence: 0.61")
		expect(output).toContain("Compression: applied")
		expect(output).toContain("Adaptive cutoff: applied")
		expect(output).toContain("Citation: SubagentDelegationService.ts:120")
		expect(output).toContain("Score breakdown: total=0.91 semantic=0.81 rerank=0.94")
	})
})
