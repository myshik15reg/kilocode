// npx vitest run __tests__/provider-delegation.spec.ts

import { afterEach, describe, expect, it, vi } from "vitest"
import { RooCodeEventName } from "@roo-code/types"

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

import { ClineProvider } from "../core/webview/ClineProvider"
import * as subagentComposition from "../core/orchestration/subagents/SubagentServiceComposition"

// kilocode_change start

afterEach(() => {
	vi.restoreAllMocks()
})

describe("ClineProvider delegation seams", () => {
	it("creates subagent services through the composition seam with provider-backed runtime", async () => {
		const mockedDelegationService = {
			delegateParentAndOpenChild: vi.fn(),
			launchBackgroundSubagent: vi.fn(),
		} as any
		const mockedResumeService = { reopenParentFromDelegation: vi.fn() } as any
		const mockedTaskControlService = { pauseTask: vi.fn(), resumeTask: vi.fn() } as any
		const mockedTaskCancellationService = { cancelTask: vi.fn() } as any
		const mockedTaskRecoveryPacketService = { buildRecoveryPacket: vi.fn() } as any
		const mockedTaskDetachmentService = { clearTask: vi.fn(), closeTaskToHistory: vi.fn() } as any
		const mockedRootStackLifecycleService = {
			snapshotCurrentStackToBackground: vi.fn(),
			restoreBackgroundStack: vi.fn(),
			getNextActiveRootTaskId: vi.fn(),
			getActiveRootTaskIds: vi.fn(),
			getRunningRootTaskIds: vi.fn(),
			removeCompletedBackgroundRoot: vi.fn(),
			getRootTaskIdForStack: vi.fn(),
			syncActiveStackToBackground: vi.fn(),
		} as any
		const mockedTaskRehydrationService = { prepareRehydration: vi.fn(), restoreModeAndProfile: vi.fn() } as any
		const mockedTaskRestartService = { restartTaskFromHistoryWithHandoff: vi.fn() } as any
		const mockedTaskBranchService = { branchTask: vi.fn() } as any
		const createSubagentServices = vi.spyOn(subagentComposition, "createSubagentServices").mockReturnValue({
			subagentDelegationService: mockedDelegationService,
			subagentResumeService: mockedResumeService,
			taskControlService: mockedTaskControlService,
			taskCancellationService: mockedTaskCancellationService,
			taskRecoveryPacketService: mockedTaskRecoveryPacketService,
			taskDetachmentService: mockedTaskDetachmentService,
			rootStackLifecycleService: mockedRootStackLifecycleService,
			taskRehydrationService: mockedTaskRehydrationService,
			taskRestartService: mockedTaskRestartService,
			taskBranchService: mockedTaskBranchService,
		})
		const emit = vi.fn()
		const provider = {
			clineStack: [{ taskId: "stack-task", rootTaskId: "root-1" }],
			backgroundRootTaskStacks: new Map<string, any[]>([
				["root-1", [{ taskId: "stack-task", rootTaskId: "root-1" }]],
			]),
			focusedRootTaskId: "root-1",
			contextProxy: { globalStorageUri: { fsPath: "/tmp/storage" } },
			getCurrentTask: vi.fn(() => ({ taskId: "current-task" })),
			getRootTaskIdForStack: vi.fn(
				(stack: Array<{ rootTaskId?: string; taskId?: string }>) => stack[0]?.rootTaskId ?? stack[0]?.taskId,
			),
			restoreBackgroundStack: vi.fn(() => true),
			removeClineFromStack: vi.fn().mockResolvedValue(undefined),
			handleModeSwitch: vi.fn().mockResolvedValue(undefined),
			createTask: vi.fn().mockResolvedValue({ taskId: "child-task" }),
			getTaskWithId: vi
				.fn()
				.mockResolvedValue({
					historyItem: {
						id: "task-1",
						number: 1,
						task: "Task",
						ts: 1,
						tokensIn: 0,
						tokensOut: 0,
						totalCost: 0,
					},
				}),
			updateTaskHistory: vi.fn().mockResolvedValue([]),
			publishActivity: vi.fn().mockResolvedValue(undefined),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			createTaskWithHistoryItem: vi.fn().mockResolvedValue(undefined),
			persistTaskStopState: vi.fn().mockResolvedValue(undefined),
			showProblematicProcessNotification: vi.fn().mockResolvedValue(undefined),
			buildRecoveryPacket: vi.fn().mockResolvedValue({
				summary: "Recovered",
				handoff: "<restart_handoff>Recovered</restart_handoff>",
				recoveryMode: "standard",
				restartAttempt: 1,
			}),
			log: vi.fn(),
			subagentCoordinator: { hasCapacity: vi.fn(), launch: vi.fn() },
			emit,
		} as any

		const services = (ClineProvider.prototype as any).createSubagentServices.call(provider)
		const runtime = createSubagentServices.mock.calls[0]?.[0]

		expect(services.subagentDelegationService).toBe(mockedDelegationService)
		expect(services.subagentResumeService).toBe(mockedResumeService)
		expect(services.taskControlService).toBe(mockedTaskControlService)
		expect(services.taskRecoveryPacketService).toBe(mockedTaskRecoveryPacketService)
		expect(services.taskDetachmentService).toBe(mockedTaskDetachmentService)
		expect(services.taskRehydrationService).toBe(mockedTaskRehydrationService)
		expect(services.taskRestartService).toBe(mockedTaskRestartService)
		expect(createSubagentServices).toHaveBeenCalledTimes(1)
		expect(runtime.getCurrentTask()).toEqual({ taskId: "current-task" })
		expect(runtime.getCurrentStack()).toEqual([{ taskId: "stack-task", rootTaskId: "root-1" }])
		runtime.setCurrentStack([{ taskId: "child-task", rootTaskId: "child-root" }] as any)
		expect(provider.clineStack).toEqual([{ taskId: "child-task", rootTaskId: "child-root" }])
		runtime.setBackgroundRootTaskStack("child-root", [{ taskId: "child-task" }] as any)
		expect(provider.backgroundRootTaskStacks.get("child-root")).toEqual([{ taskId: "child-task" }])
		runtime.setFocusedRootTaskId("child-root")
		expect(provider.focusedRootTaskId).toBe("child-root")
		expect(runtime.getFocusedRootTaskId()).toBe("child-root")
		expect(runtime.getGlobalStoragePath()).toBe("/tmp/storage")
		expect(runtime.getSubagentCoordinator()).toBe(provider.subagentCoordinator)
		await runtime.postStateToWebview()
		expect(provider.postStateToWebview).toHaveBeenCalledTimes(1)
		await runtime.createTaskWithHistoryItem({ id: "restored-parent" } as any, { startTask: false })
		expect(provider.createTaskWithHistoryItem).toHaveBeenCalledWith({ id: "restored-parent" }, { startTask: false })
		await runtime.persistTaskStopState("task-1", "loop_detected", "Stopped", "aborted")
		expect(provider.persistTaskStopState).toHaveBeenCalledWith(
			"task-1",
			"loop_detected",
			"Stopped",
			"aborted",
			undefined,
		)
		await runtime.showProblematicProcessNotification({
			taskId: "task-1",
			reason: "restart_limit_exceeded",
			restartAttempt: 2,
			restartPlanned: false,
		})
		expect(provider.showProblematicProcessNotification).toHaveBeenCalledWith({
			taskId: "task-1",
			reason: "restart_limit_exceeded",
			restartAttempt: 2,
			restartPlanned: false,
		})
		await runtime.buildRecoveryPacket({ historyItem: { id: "task-1" } as any, apiConversationHistory: [] })
		expect(provider.buildRecoveryPacket).toHaveBeenCalledWith({
			historyItem: { id: "task-1" },
			apiConversationHistory: [],
		})
		runtime.emitTaskDelegated("parent-1", "child-1")
		runtime.emitTaskDelegationCompleted("parent-1", "child-1", "done")
		runtime.emitTaskDelegationResumed("parent-1", "child-1")
		expect(emit).toHaveBeenNthCalledWith(1, RooCodeEventName.TaskDelegated, "parent-1", "child-1")
		expect(emit).toHaveBeenNthCalledWith(2, RooCodeEventName.TaskDelegationCompleted, "parent-1", "child-1", "done")
		expect(emit).toHaveBeenNthCalledWith(3, RooCodeEventName.TaskDelegationResumed, "parent-1", "child-1")
	})

	it("forwards public delegation params verbatim to SubagentDelegationService", async () => {
		const childTask = { taskId: "child-bg", rootTaskId: "child-bg" } as any
		const delegateParentAndOpenChild = vi.fn().mockResolvedValue(childTask)
		const provider = {
			subagentDelegationService: {
				delegateParentAndOpenChild,
			},
		} as any

		const params = {
			parentTaskId: "parent-1",
			message: "Background research",
			initialTodos: [{ id: "todo-1", content: "Inspect parser flow", status: "pending" }],
			mode: "code",
			execution: "background",
			isolation: "shared",
		}

		const launched = await (ClineProvider.prototype as any).delegateParentAndOpenChild.call(provider, params)

		expect(launched).toBe(childTask)
		expect(delegateParentAndOpenChild).toHaveBeenCalledWith(params)
	})

	it("forwards background launch params verbatim to SubagentDelegationService", async () => {
		const childTask = { taskId: "child-auto", rootTaskId: "child-auto" } as any
		const launchBackgroundSubagent = vi.fn().mockResolvedValue(childTask)
		const provider = {
			subagentDelegationService: {
				launchBackgroundSubagent,
			},
		} as any

		const params = {
			parentTaskId: "parent-legacy",
			message: "Legacy background work",
			initialTodos: [],
			mode: "code",
		}

		const launched = await (ClineProvider.prototype as any).launchBackgroundSubagent.call(provider, params)

		expect(launched).toBe(childTask)
		expect(launchBackgroundSubagent).toHaveBeenCalledWith(params)
	})

	it("forwards public reopen params verbatim to SubagentResumeService", async () => {
		const reopenParentFromDelegation = vi.fn().mockResolvedValue(undefined)
		const provider = {
			subagentResumeService: {
				reopenParentFromDelegation,
			},
		} as any

		const params = {
			parentTaskId: "parent-1",
			childTaskId: "child-1",
			completionResultSummary: "Recovered",
			preserveParentFocus: true,
		}

		await (ClineProvider.prototype as any).reopenParentFromDelegation.call(provider, params)

		expect(reopenParentFromDelegation).toHaveBeenCalledWith(params)
	})

	it("forwards public pause/resume/cancel/clear/close params verbatim to task control services", async () => {
		const pauseTask = vi.fn().mockResolvedValue(undefined)
		const resumeTask = vi.fn()
		const cancelTask = vi.fn().mockResolvedValue(undefined)
		const clearTask = vi.fn().mockResolvedValue(undefined)
		const closeTaskToHistory = vi.fn().mockResolvedValue(undefined)
		const restartTaskFromHistoryWithHandoff = vi.fn().mockResolvedValue(true)
		const provider = {
			taskControlService: {
				pauseTask,
				resumeTask,
			},
			taskCancellationService: {
				cancelTask,
			},
			taskDetachmentService: {
				clearTask,
				closeTaskToHistory,
			},
			taskRestartService: {
				restartTaskFromHistoryWithHandoff,
			},
		} as any

		await (ClineProvider.prototype as any).pauseTask.call(provider, "child-bg", "Paused by user")
		expect(pauseTask).toHaveBeenCalledWith("child-bg", "Paused by user")
		;(ClineProvider.prototype as any).resumeTask.call(provider, "child-bg", "continue")
		expect(resumeTask).toHaveBeenCalledWith("child-bg", "continue")

		await (ClineProvider.prototype as any).cancelTask.call(provider)
		expect(cancelTask).toHaveBeenCalledWith()

		await (ClineProvider.prototype as any).clearTask.call(provider)
		expect(clearTask).toHaveBeenCalledWith()

		await (ClineProvider.prototype as any).closeTaskToHistory.call(provider)
		expect(closeTaskToHistory).toHaveBeenCalledWith()

		await (ClineProvider.prototype as any).restartTaskFromHistoryWithHandoff.call(provider, "child-bg", {
			force: true,
		})
		expect(restartTaskFromHistoryWithHandoff).toHaveBeenCalledWith("child-bg", { force: true })
	})
})

// kilocode_change end
