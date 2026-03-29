import type { ClineMessage, HistoryItem } from "@roo-code/types"

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("vscode", () => {
	const window = {
		createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
		showErrorMessage: vi.fn(),
		onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
	}
	const workspace = {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((_key: string, defaultValue: any) => defaultValue),
			update: vi.fn(),
		})),
		workspaceFolders: [],
	}
	const env = { machineId: "test-machine", uriScheme: "vscode", appName: "VSCode", language: "en", sessionId: "sess" }
	const Uri = { file: (p: string) => ({ fsPath: p, toString: () => p }) }
	const commands = { executeCommand: vi.fn() }
	const ExtensionMode = { Development: 2 }
	const version = "1.0.0-test"
	return { window, workspace, env, Uri, commands, ExtensionMode, version }
})

vi.mock("../../task-persistence/taskMessages", () => ({
	readTaskMessages: vi.fn().mockResolvedValue([]),
}))
vi.mock("../../task-persistence", () => ({
	readApiMessages: vi.fn().mockResolvedValue([]),
	saveApiMessages: vi.fn().mockResolvedValue(undefined),
	saveTaskMessages: vi.fn().mockResolvedValue(undefined),
}))

import { readApiMessages, saveApiMessages, saveTaskMessages } from "../../task-persistence"
import { readTaskMessages } from "../../task-persistence/taskMessages"
import {
	SubagentResumeService,
	type ReopenParentFromDelegationParams,
	type SubagentResumeRuntime,
} from "./SubagentResumeService"

// kilocode_change - new file

describe("SubagentResumeService", () => {
	let parentHistory: HistoryItem
	let childHistory: HistoryItem
	let updateTaskHistory: ReturnType<typeof vi.fn>
	let runtime: SubagentResumeRuntime
	let parentInstance: {
		overwriteClineMessages: ReturnType<typeof vi.fn>
		overwriteApiConversationHistory: ReturnType<typeof vi.fn>
		resumeAfterDelegation: ReturnType<typeof vi.fn>
	}
	let focusedRootTaskId: string | undefined
	let currentTask: { taskId: string } | undefined

	const reopenParams: ReopenParentFromDelegationParams = {
		parentTaskId: "parent-1",
		childTaskId: "child-1",
		completionResultSummary: "Done",
	}

	beforeEach(() => {
		vi.clearAllMocks()
		parentHistory = {
			id: "parent-1",
			number: 1,
			task: "Parent",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "delegated",
			lifecycleState: "paused",
			awaitingChildId: "child-1",
			childIds: ["child-1"],
			mode: "code",
		}
		childHistory = {
			id: "child-1",
			number: 2,
			task: "Child",
			ts: 2,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			status: "active",
			lifecycleState: "paused",
			parentTaskId: "parent-1",
			rootTaskId: "parent-1",
		}
		focusedRootTaskId = undefined
		currentTask = { taskId: "child-1" }
		parentInstance = {
			overwriteClineMessages: vi.fn().mockResolvedValue(undefined),
			overwriteApiConversationHistory: vi.fn().mockResolvedValue(undefined),
			resumeAfterDelegation: vi.fn().mockResolvedValue(undefined),
		}
		updateTaskHistory = vi.fn(async (item: HistoryItem) => {
			if (item.id === parentHistory.id) {
				parentHistory = item
			}
			if (item.id === childHistory.id) {
				childHistory = item
			}
			return [parentHistory, childHistory]
		})
		runtime = {
			getGlobalStoragePath: vi.fn(() => "/tmp"),
			getTaskWithId: vi.fn(async (taskId: string) => {
				if (taskId === parentHistory.id) {
					return { historyItem: parentHistory }
				}
				if (taskId === childHistory.id) {
					return { historyItem: childHistory }
				}
				throw new Error(`Unknown task ${taskId}`)
			}),
			updateTaskHistory,
			getCurrentTask: vi.fn(() => currentTask as any),
			removeClineFromStack: vi.fn(async () => {
				currentTask = undefined
			}),
			getFocusedRootTaskId: vi.fn(() => focusedRootTaskId),
			restoreBackgroundStack: vi.fn(() => false),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			createTaskWithHistoryItem: vi.fn().mockResolvedValue(parentInstance as any),
			emitTaskDelegationCompleted: vi.fn(),
			emitTaskDelegationResumed: vi.fn(),
			log: vi.fn(),
		}
	})

	it("persists histories and resumes reopened parent instance", async () => {
		const uiMessages: ClineMessage[] = [{ type: "ask", ask: "tool", text: "old", ts: 10 } as any]
		const apiMessages = [{ role: "user", content: [{ type: "text", text: "old" }], ts: 10 }]
		vi.mocked(readTaskMessages).mockResolvedValue(uiMessages)
		vi.mocked(readApiMessages).mockResolvedValue(apiMessages as any)

		const service = new SubagentResumeService(runtime)
		await service.reopenParentFromDelegation(reopenParams)

		expect(saveTaskMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "parent-1",
				globalStoragePath: "/tmp",
				messages: expect.arrayContaining([
					expect.objectContaining({ type: "say", say: "subtask_result", text: "Done" }),
				]),
			}),
		)
		expect(saveApiMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "parent-1",
				globalStoragePath: "/tmp",
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: "user",
						content: expect.arrayContaining([
							expect.objectContaining({
								type: "text",
								text: expect.stringContaining("Subtask child-1 completed"),
							}),
						]),
					}),
				]),
			}),
		)
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "child-1", status: "completed", lifecycleState: "completed" }),
		)
		expect(updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "parent-1",
				status: "active",
				lifecycleState: "running",
				completedByChildId: "child-1",
				awaitingChildId: undefined,
			}),
		)
		expect(runtime.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(runtime.createTaskWithHistoryItem).toHaveBeenCalledWith(
			expect.objectContaining({ id: "parent-1", status: "active", completedByChildId: "child-1" }),
			{ startTask: false },
		)
		expect(parentInstance.overwriteClineMessages).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ type: "say", say: "subtask_result", text: "Done" })]),
		)
		expect(parentInstance.overwriteApiConversationHistory).toHaveBeenCalled()
		expect(parentInstance.resumeAfterDelegation).toHaveBeenCalledTimes(1)
		expect(runtime.emitTaskDelegationCompleted).toHaveBeenCalledWith("parent-1", "child-1", "Done")
		expect(runtime.emitTaskDelegationResumed).toHaveBeenCalledWith("parent-1", "child-1")
	})

	it("updates existing trailing tool_result instead of appending another tool_result message", async () => {
		vi.mocked(readTaskMessages).mockResolvedValue([])
		vi.mocked(readApiMessages).mockResolvedValue([
			{ role: "user", content: [{ type: "text", text: "Create a subtask" }], ts: 1 },
			{
				role: "assistant",
				content: [{ type: "tool_use", name: "new_task", id: "toolu_1", input: { mode: "code" } }],
				ts: 2,
			},
			{
				role: "user",
				content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "Old result" }],
				ts: 3,
			},
		] as any)

		const service = new SubagentResumeService(runtime)
		await service.reopenParentFromDelegation(reopenParams)

		const savedMessages = vi.mocked(saveApiMessages).mock.calls[0][0].messages
		expect(savedMessages).toHaveLength(3)
		expect(savedMessages[2]).toMatchObject({
			role: "user",
			content: [
				expect.objectContaining({
					type: "tool_result",
					tool_use_id: "toolu_1",
					content: expect.stringContaining("Done"),
				}),
			],
		})
	})

	it("restores preserved parent focus without reopening a new instance", async () => {
		focusedRootTaskId = "parent-1"
		;(runtime.restoreBackgroundStack as ReturnType<typeof vi.fn>).mockReturnValue(true)
		const service = new SubagentResumeService(runtime)

		await service.reopenParentFromDelegation({ ...reopenParams, preserveParentFocus: true })

		expect(runtime.restoreBackgroundStack).toHaveBeenCalledWith("parent-1")
		expect(runtime.postStateToWebview).toHaveBeenCalledTimes(1)
		expect(runtime.createTaskWithHistoryItem).not.toHaveBeenCalled()
		expect(runtime.emitTaskDelegationResumed).toHaveBeenCalledWith("parent-1", "child-1")
	})

	it("logs and continues when child completion persistence fails", async () => {
		;(runtime.getTaskWithId as ReturnType<typeof vi.fn>).mockImplementation(async (taskId: string) => {
			if (taskId === "parent-1") {
				return { historyItem: parentHistory }
			}
			throw new Error("missing child")
		})
		const service = new SubagentResumeService(runtime)

		await expect(service.reopenParentFromDelegation(reopenParams)).resolves.toBeUndefined()

		expect(runtime.log).toHaveBeenCalledWith(
			expect.stringContaining("Failed to persist child completed status for child-1"),
		)
		expect(runtime.createTaskWithHistoryItem).toHaveBeenCalledTimes(1)
	})
})
