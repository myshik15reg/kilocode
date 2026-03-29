import type { HistoryItem, ProviderSettingsEntry } from "@roo-code/types"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	TaskRehydrationService,
	type TaskRehydrationRuntime,
	type RehydratableHistoryItem,
} from "./TaskRehydrationService"

// kilocode_change - new file

describe("TaskRehydrationService", () => {
	let currentTask: { taskId: string } | undefined
	let currentStack: any[]
	let restoredTask: { taskId: string } | undefined
	let runtime: TaskRehydrationRuntime
	let snapshotCurrentStackToBackground: ReturnType<typeof vi.fn>
	let setCurrentStack: ReturnType<typeof vi.fn>
	let restoreBackgroundStack: ReturnType<typeof vi.fn>
	let postStateToWebview: ReturnType<typeof vi.fn>
	let cleanupTaskEventListeners: ReturnType<typeof vi.fn>
	let performPreparationTasks: ReturnType<typeof vi.fn>
	let getCustomModes: ReturnType<typeof vi.fn>
	let updateGlobalState: ReturnType<typeof vi.fn>
	let getModeConfigId: ReturnType<typeof vi.fn>
	let listProviderProfiles: ReturnType<typeof vi.fn>
	let getProviderProfile: ReturnType<typeof vi.fn>
	let activateProviderProfile: ReturnType<typeof vi.fn>
	let getPendingEditOperation: ReturnType<typeof vi.fn>
	let clearPendingEditOperation: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>

	const createHistoryItem = (overrides: Partial<RehydratableHistoryItem> = {}): RehydratableHistoryItem => ({
		id: "task-1",
		number: 1,
		task: "Primary task",
		ts: 1,
		tokensIn: 0,
		tokensOut: 0,
		totalCost: 0,
		...(overrides as Partial<HistoryItem>),
	})

	const defaultProfiles: ProviderSettingsEntry[] = [
		{ name: "mode-profile", id: "mode-profile-id", apiProvider: "anthropic" },
		{ name: "task-profile", id: "task-profile-id", apiProvider: "openai" },
	]

	afterEach(() => {
		vi.useRealTimers()
	})

	beforeEach(() => {
		currentTask = { taskId: "current-task" }
		currentStack = []
		restoredTask = { taskId: "restored-root" }
		snapshotCurrentStackToBackground = vi.fn()
		setCurrentStack = vi.fn((stack) => {
			currentStack = [...stack]
		})
		restoreBackgroundStack = vi.fn(() => true)
		postStateToWebview = vi.fn().mockResolvedValue(undefined)
		cleanupTaskEventListeners = vi.fn()
		performPreparationTasks = vi.fn().mockResolvedValue(undefined)
		getCustomModes = vi.fn().mockResolvedValue([])
		updateGlobalState = vi.fn().mockResolvedValue(undefined)
		getModeConfigId = vi.fn().mockResolvedValue("mode-profile-id")
		listProviderProfiles = vi.fn().mockResolvedValue(defaultProfiles)
		getProviderProfile = vi.fn().mockResolvedValue({ apiProvider: "anthropic" })
		activateProviderProfile = vi.fn().mockResolvedValue(undefined)
		getPendingEditOperation = vi.fn()
		clearPendingEditOperation = vi.fn()
		log = vi.fn()
		runtime = {
			getCurrentTask: vi.fn(() => currentTask as any),
			getCurrentStack: vi.fn(() => [...currentStack]),
			setCurrentStack,
			snapshotCurrentStackToBackground,
			restoreBackgroundStack: vi.fn((rootTaskId: string) => {
				const restored = restoreBackgroundStack(rootTaskId)
				if (restored) {
					currentTask = restoredTask
				}
				return restored
			}),
			postStateToWebview,
			cleanupTaskEventListeners,
			performPreparationTasks,
			getCustomModes,
			updateGlobalState,
			getModeConfigId,
			listProviderProfiles,
			getProviderProfile,
			activateProviderProfile,
			getPendingEditOperation,
			clearPendingEditOperation,
			log,
		}
	})

	it("returns the restored task for root-level history items that already exist in background", async () => {
		const service = new TaskRehydrationService(runtime)
		const historyItem = createHistoryItem({ id: "root-1" })

		const result = await service.prepareRehydration(historyItem)

		expect(snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(setCurrentStack).toHaveBeenCalledWith([])
		expect(restoreBackgroundStack).toHaveBeenCalledWith("root-1")
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
		expect(result).toEqual({
			targetRootTaskId: "root-1",
			isRehydratingCurrentTask: false,
			restoredTask,
		})
	})

	it("clears focus after snapshot without restore fast-path for non-root history reopen", async () => {
		const service = new TaskRehydrationService(runtime)
		const historyItem = createHistoryItem({ id: "child-1", rootTaskId: "root-1" })

		const result = await service.prepareRehydration(historyItem)

		expect(snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(setCurrentStack).toHaveBeenCalledWith([])
		expect(restoreBackgroundStack).not.toHaveBeenCalled()
		expect(postStateToWebview).not.toHaveBeenCalled()
		expect(result).toEqual({
			targetRootTaskId: "root-1",
			isRehydratingCurrentTask: false,
		})
	})

	it("preserves flicker-free current-task rehydration by skipping snapshot and clear", async () => {
		currentTask = { taskId: "task-1" }
		const service = new TaskRehydrationService(runtime)
		const historyItem = createHistoryItem({ id: "task-1" })

		const result = await service.prepareRehydration(historyItem)

		expect(snapshotCurrentStackToBackground).not.toHaveBeenCalled()
		expect(setCurrentStack).not.toHaveBeenCalled()
		expect(restoreBackgroundStack).not.toHaveBeenCalled()
		expect(postStateToWebview).not.toHaveBeenCalled()
		expect(result).toEqual({
			targetRootTaskId: "task-1",
			isRehydratingCurrentTask: true,
		})
	})

	it("replaces the current task in place after aborting and cleaning up the old one", async () => {
		const oldTask = {
			taskId: "task-1",
			instanceId: "old-instance",
			abortTask: vi.fn().mockResolvedValue(undefined),
		} as any
		const newTask = {
			taskId: "task-1",
			instanceId: "new-instance",
			emit: vi.fn(),
		} as any
		currentStack = [{ taskId: "parent-task" }, oldTask]
		const service = new TaskRehydrationService(runtime)

		await service.replaceCurrentTaskInPlace(newTask)

		expect(oldTask.abortTask).toHaveBeenCalledWith(true)
		expect(cleanupTaskEventListeners).toHaveBeenCalledWith(oldTask)
		expect(setCurrentStack).toHaveBeenCalledWith([{ taskId: "parent-task" }, newTask])
		expect(newTask.emit).toHaveBeenCalledWith("taskFocused")
		expect(performPreparationTasks).toHaveBeenCalledWith(newTask)
		expect(log).toHaveBeenCalledWith(
			"[createTaskWithHistoryItem] rehydrated task task-1.new-instance in-place (flicker-free)",
		)
	})

	it("logs abort failures but still replaces the current task in place", async () => {
		const oldTask = {
			taskId: "task-1",
			instanceId: "old-instance",
			abortTask: vi.fn().mockRejectedValue(new Error("boom")),
		} as any
		const newTask = {
			taskId: "task-1",
			instanceId: "new-instance",
			emit: vi.fn(),
		} as any
		currentStack = [oldTask]
		const service = new TaskRehydrationService(runtime)

		await service.replaceCurrentTaskInPlace(newTask)

		expect(cleanupTaskEventListeners).toHaveBeenCalledWith(oldTask)
		expect(setCurrentStack).toHaveBeenCalledWith([newTask])
		expect(newTask.emit).toHaveBeenCalledWith("taskFocused")
		expect(performPreparationTasks).toHaveBeenCalledWith(newTask)
		expect(log).toHaveBeenNthCalledWith(
			1,
			"[createTaskWithHistoryItem] abortTask() failed for old task task-1.old-instance: boom",
		)
		expect(log).toHaveBeenNthCalledWith(
			2,
			"[createTaskWithHistoryItem] rehydrated task task-1.new-instance in-place (flicker-free)",
		)
	})

	it("falls back invalid saved mode before restoring mode-based profile", async () => {
		const service = new TaskRehydrationService(runtime)
		const historyItem = createHistoryItem({ mode: "missing-mode" })

		await service.restoreModeAndProfile(historyItem)

		expect(historyItem.mode).toBe("code")
		expect(updateGlobalState).toHaveBeenNthCalledWith(1, "mode", "code")
		expect(getModeConfigId).toHaveBeenCalledWith("code")
		expect(activateProviderProfile).toHaveBeenCalledWith({ name: "mode-profile" })
		expect(log).toHaveBeenCalledWith(
			expect.stringContaining(
				"Mode 'missing-mode' from history no longer exists. Falling back to default mode 'code'.",
			),
		)
	})

	it("restores explicit task profile without activating mode-based profile first", async () => {
		const service = new TaskRehydrationService(runtime)
		const historyItem = createHistoryItem({ mode: "architect", apiConfigName: "task-profile" })

		await service.restoreModeAndProfile(historyItem)

		expect(updateGlobalState).toHaveBeenCalledWith("mode", "architect")
		expect(getModeConfigId).not.toHaveBeenCalled()
		expect(activateProviderProfile).toHaveBeenCalledTimes(1)
		expect(activateProviderProfile).toHaveBeenCalledWith(
			{ name: "task-profile" },
			{ persistModeConfig: false, persistTaskHistory: false },
		)
	})

	it("does not clobber current configuration with incomplete mode profile data", async () => {
		getProviderProfile.mockResolvedValue({})
		const service = new TaskRehydrationService(runtime)

		await service.restoreModeAndProfile(createHistoryItem({ mode: "architect" }))

		expect(activateProviderProfile).not.toHaveBeenCalled()
		expect(log).not.toHaveBeenCalled()
	})

	it("returns early when the mode has no saved provider config id", async () => {
		getModeConfigId.mockResolvedValue(undefined)
		const service = new TaskRehydrationService(runtime)

		await service.restoreModeAndProfile(createHistoryItem({ mode: "architect" }))

		expect(listProviderProfiles).toHaveBeenCalledTimes(1)
		expect(updateGlobalState).toHaveBeenNthCalledWith(2, "listApiConfigMeta", defaultProfiles)
		expect(getProviderProfile).not.toHaveBeenCalled()
		expect(activateProviderProfile).not.toHaveBeenCalled()
	})

	it("returns early when the saved mode provider config id no longer matches a profile", async () => {
		getModeConfigId.mockResolvedValue("missing-profile-id")
		const service = new TaskRehydrationService(runtime)

		await service.restoreModeAndProfile(createHistoryItem({ mode: "architect" }))

		expect(listProviderProfiles).toHaveBeenCalledTimes(1)
		expect(getProviderProfile).not.toHaveBeenCalled()
		expect(activateProviderProfile).not.toHaveBeenCalled()
		expect(log).not.toHaveBeenCalled()
	})

	it("logs and continues when mode profile restoration fails", async () => {
		getProviderProfile.mockRejectedValue(new Error("mode boom"))
		const service = new TaskRehydrationService(runtime)

		await expect(service.restoreModeAndProfile(createHistoryItem({ mode: "architect" }))).resolves.toBeUndefined()

		expect(log).toHaveBeenCalledWith(
			expect.stringContaining(
				"Failed to restore API configuration for mode 'architect': mode boom. Continuing with default configuration.",
			),
		)
	})

	it("logs and keeps the current configuration when explicit task profile is missing", async () => {
		const service = new TaskRehydrationService(runtime)

		await service.restoreModeAndProfile(createHistoryItem({ apiConfigName: "missing-task-profile" }))

		expect(activateProviderProfile).not.toHaveBeenCalled()
		expect(log).toHaveBeenCalledWith(
			"Provider profile 'missing-task-profile' from history no longer exists. Using current configuration.",
		)
	})

	it("logs and continues when explicit task profile restore fails", async () => {
		activateProviderProfile.mockRejectedValue(new Error("boom"))
		const service = new TaskRehydrationService(runtime)

		await expect(
			service.restoreModeAndProfile(createHistoryItem({ apiConfigName: "task-profile" })),
		).resolves.toBeUndefined()

		expect(log).toHaveBeenCalledWith(
			expect.stringContaining(
				"Failed to restore API configuration 'task-profile' for task: boom. Continuing with current configuration.",
			),
		)
	})

	it("returns immediately when no pending edit exists for the task", () => {
		const task = {
			taskId: "task-1",
		} as any
		const service = new TaskRehydrationService(runtime)

		service.replayPendingEditIfNeeded(task)

		expect(getPendingEditOperation).toHaveBeenCalledWith("task-task-1")
		expect(clearPendingEditOperation).not.toHaveBeenCalled()
		expect(log).not.toHaveBeenCalled()
	})

	it("replays a pending edit after the 100ms initialization delay", async () => {
		vi.useFakeTimers()
		const pendingEdit = {
			messageTs: 3,
			editedContent: "Edited content",
			images: ["image1.png"],
			messageIndex: 2,
			apiConversationHistoryIndex: 2,
		}
		getPendingEditOperation.mockReturnValue(pendingEdit)
		const overwriteClineMessages = vi.fn().mockResolvedValue(undefined)
		const overwriteApiConversationHistory = vi.fn().mockResolvedValue(undefined)
		const handleWebviewAskResponse = vi.fn().mockResolvedValue(undefined)
		const task = {
			taskId: "task-1",
			clineMessages: [{ ts: 1 }, { ts: 2 }, { ts: 3 }, { ts: 4 }],
			apiConversationHistory: [{ ts: 1 }, { ts: 2 }, { ts: 3 }, { ts: 4 }],
			overwriteClineMessages,
			overwriteApiConversationHistory,
			handleWebviewAskResponse,
		} as any
		const service = new TaskRehydrationService(runtime)

		service.replayPendingEditIfNeeded(task)

		expect(getPendingEditOperation).toHaveBeenCalledWith("task-task-1")
		expect(clearPendingEditOperation).toHaveBeenCalledWith("task-task-1")
		expect(handleWebviewAskResponse).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(99)
		expect(handleWebviewAskResponse).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)

		expect(overwriteClineMessages).toHaveBeenCalledWith([{ ts: 1 }, { ts: 2 }])
		expect(overwriteApiConversationHistory).toHaveBeenCalledWith([{ ts: 1 }, { ts: 2 }])
		expect(handleWebviewAskResponse).toHaveBeenCalledWith("messageResponse", "Edited content", ["image1.png"])
		expect(log).toHaveBeenCalledWith(
			"[createTaskWithHistoryItem] Processing pending edit after checkpoint restoration",
		)
	})

	it("clears pending edit state but safely no-ops when the restored message cannot be found", async () => {
		vi.useFakeTimers()
		getPendingEditOperation.mockReturnValue({
			messageTs: 999,
			editedContent: "Edited content",
			images: [],
			messageIndex: 2,
			apiConversationHistoryIndex: 2,
		})
		const overwriteClineMessages = vi.fn().mockResolvedValue(undefined)
		const overwriteApiConversationHistory = vi.fn().mockResolvedValue(undefined)
		const handleWebviewAskResponse = vi.fn().mockResolvedValue(undefined)
		const task = {
			taskId: "task-1",
			clineMessages: [{ ts: 1 }, { ts: 2 }, { ts: 3 }],
			apiConversationHistory: [{ ts: 1 }, { ts: 2 }, { ts: 3 }],
			overwriteClineMessages,
			overwriteApiConversationHistory,
			handleWebviewAskResponse,
		} as any
		const service = new TaskRehydrationService(runtime)

		service.replayPendingEditIfNeeded(task)
		await vi.advanceTimersByTimeAsync(100)

		expect(clearPendingEditOperation).toHaveBeenCalledWith("task-task-1")
		expect(overwriteClineMessages).not.toHaveBeenCalled()
		expect(overwriteApiConversationHistory).not.toHaveBeenCalled()
		expect(handleWebviewAskResponse).not.toHaveBeenCalled()
	})

	it("logs replay failures without rethrowing them", async () => {
		vi.useFakeTimers()
		getPendingEditOperation.mockReturnValue({
			messageTs: 3,
			editedContent: "Edited content",
			images: [],
			messageIndex: 2,
			apiConversationHistoryIndex: 2,
		})
		const task = {
			taskId: "task-1",
			clineMessages: [{ ts: 1 }, { ts: 2 }, { ts: 3 }],
			apiConversationHistory: [{ ts: 1 }, { ts: 2 }, { ts: 3 }],
			overwriteClineMessages: vi.fn().mockRejectedValue(new Error("boom")),
			overwriteApiConversationHistory: vi.fn().mockResolvedValue(undefined),
			handleWebviewAskResponse: vi.fn().mockResolvedValue(undefined),
		} as any
		const service = new TaskRehydrationService(runtime)

		service.replayPendingEditIfNeeded(task)
		await vi.advanceTimersByTimeAsync(100)

		expect(log).toHaveBeenCalledWith("[createTaskWithHistoryItem] Error processing pending edit: Error: boom")
	})
})
