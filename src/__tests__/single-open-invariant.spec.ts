// npx vitest run __tests__/single-open-invariant.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { ClineProvider } from "../core/webview/ClineProvider"
import { TaskDetachmentService } from "../core/orchestration/task-control/TaskDetachmentService"
import { TaskRootStackLifecycleService } from "../core/orchestration/task-control/TaskRootStackLifecycleService"
import * as taskBirthOrchestrationService from "../core/orchestration/task-control/TaskBirthOrchestrationService"
import { API } from "../extension/api"
import * as ProfileValidatorMod from "../shared/ProfileValidator"

// Mock Task class used by ClineProvider to avoid heavy startup
vi.mock("../core/task/Task", () => {
	class TaskStub {
		public taskId: string
		public instanceId = "inst"
		public parentTask?: any
		public apiConfiguration: any
		public rootTask?: any
		public rootTaskId?: string
		public enableBridge?: boolean
		constructor(opts: any) {
			this.taskId = opts.historyItem?.id ?? `task-${Math.random().toString(36).slice(2, 8)}`
			this.parentTask = opts.parentTask
			this.rootTask = opts.rootTask
			this.rootTaskId = opts.historyItem?.rootTaskId ?? opts.rootTask?.taskId
			this.apiConfiguration = opts.apiConfiguration ?? { apiProvider: "anthropic" }
			opts.onCreated?.(this)
		}
		on() {}
		off() {}
		emit() {}
	}
	return { Task: TaskStub }
})

describe("Single-open-task invariant", () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it("User-initiated create: closes existing before opening new", async () => {
		// Allow profile
		vi.spyOn(ProfileValidatorMod.ProfileValidator, "isProfileAllowed").mockReturnValue(true)

		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const addClineToStack = vi.fn().mockResolvedValue(undefined)

		const provider: any = {
			// Simulate an existing task present in stack
			clineStack: [{ taskId: "existing-1" }],
			backgroundRootTaskStacks: new Map(),
			focusedRootTaskId: undefined,
			snapshotCurrentStackToBackground: vi.fn(),
			restoreBackgroundStack: vi.fn().mockReturnValue(false),
			taskRootStackLifecycleService: {
				syncActiveStackToBackground: vi.fn((rootTaskId: string) => {
					provider.backgroundRootTaskStacks.set(rootTaskId, [...provider.clineStack])
					provider.focusedRootTaskId = rootTaskId
					return rootTaskId
				}),
			},
			setValues: vi.fn(),
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
				organizationAllowList: "*",
				diffEnabled: false,
				enableCheckpoints: true,
				checkpointTimeout: 60,
				fuzzyMatchThreshold: 1.0,
				cloudUserInfo: null,
				remoteControlEnabled: false,
			}),
			removeClineFromStack,
			addClineToStack,
			setProviderProfile: vi.fn(),
			log: vi.fn(),
			getStateToPostToWebview: vi.fn(),
			providerSettingsManager: { getModeConfigId: vi.fn(), listConfig: vi.fn() },
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			taskCreationCallback: vi.fn(),
			contextProxy: {
				extensionUri: {},
				setValue: vi.fn(),
				getValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
		} as unknown as ClineProvider

		await (ClineProvider.prototype as any).createTask.call(provider, "New task")

		expect((provider as any).snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(removeClineFromStack).not.toHaveBeenCalled()
		expect(addClineToStack).toHaveBeenCalledTimes(1)
	})

	it("User-initiated create uses the shared birth seam after stack reset decisions", async () => {
		vi.spyOn(ProfileValidatorMod.ProfileValidator, "isProfileAllowed").mockReturnValue(true)
		const instantiate = vi.fn().mockReturnValue({
			taskId: "new-task",
			instanceId: "inst",
			parentTask: undefined,
			rootTaskId: undefined,
			rootTask: undefined,
		})
		const admitFreshTask = vi.fn().mockReturnValue({ rootTask: undefined, taskNumber: 1 })
		const placeTask = vi.fn().mockResolvedValue("new-task")
		const prepareTaskBirthOrchestration = vi
			.spyOn(taskBirthOrchestrationService, "prepareTaskBirthOrchestration")
			.mockResolvedValue({
				admitFreshTask,
				instantiateFreshTask: instantiate,
				instantiateHistoryTask: vi.fn(),
				placeTask,
			})
		const provider: any = {
			clineStack: [{ taskId: "existing-1" }],
			backgroundRootTaskStacks: new Map(),
			focusedRootTaskId: undefined,
			taskRootStackLifecycleService: {
				snapshotCurrentStackToBackground: vi.fn(() => {
					provider.clineStack = []
				}),
				syncActiveStackToBackground: vi.fn((rootTaskId: string) => {
					provider.backgroundRootTaskStacks.set(rootTaskId, [...provider.clineStack])
					return rootTaskId
				}),
			},
			snapshotCurrentStackToBackground: vi.fn(() =>
				provider.taskRootStackLifecycleService.snapshotCurrentStackToBackground(),
			),
			setValues: vi.fn(),
			getState: vi.fn(),
			addClineToStack: vi.fn(async (task: any) => {
				provider.clineStack.push(task)
				provider.focusedRootTaskId = task.rootTaskId ?? task.rootTask?.taskId ?? task.taskId
			}),
			setProviderProfile: vi.fn(),
			log: vi.fn(),
			taskCreationCallback: vi.fn(),
			context: { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } },
			contextProxy: {
				extensionUri: {},
				setValue: vi.fn(),
				getValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
		}

		await (ClineProvider.prototype as any).createTask.call(provider, "New task")

		expect(prepareTaskBirthOrchestration).toHaveBeenCalledTimes(1)
		expect(prepareTaskBirthOrchestration).toHaveBeenCalledWith({
			context: (provider as any).context,
			provider,
			taskCreationCallback: (provider as any).taskCreationCallback,
			getState: expect.any(Function),
			getCurrentStack: expect.any(Function),
			setCurrentStack: expect.any(Function),
			snapshotCurrentStackToBackground: expect.any(Function),
			addClineToStack: expect.any(Function),
			rootStackLifecycle: provider.taskRootStackLifecycleService,
			log: expect.any(Function),
		})
		expect(admitFreshTask).toHaveBeenCalledWith({
			parentTask: undefined,
			detachFromParentRoot: undefined,
		})
		expect(instantiate).toHaveBeenCalledWith({
			text: "New task",
			images: undefined,
			parentTask: undefined,
			options: {},
			admission: { rootTask: undefined, taskNumber: 1 },
		})
		expect(placeTask).toHaveBeenCalledWith({
			task: expect.objectContaining({ taskId: "new-task" }),
			logContext: "createTask",
		})
	})

	it("Child create preserves parent root identity when placement runs through the shared birth seam", async () => {
		vi.spyOn(ProfileValidatorMod.ProfileValidator, "isProfileAllowed").mockReturnValue(true)
		const rootTask = { taskId: "root-1" }
		const parentTask = { taskId: "parent-1" }
		const instantiate = vi.fn().mockReturnValue({
			taskId: "child-1",
			instanceId: "inst",
			parentTask,
			rootTask,
			rootTaskId: "root-1",
		})
		const provider: any = {
			clineStack: [rootTask],
			backgroundRootTaskStacks: new Map(),
			focusedRootTaskId: "root-1",
			taskRootStackLifecycleService: {
				snapshotCurrentStackToBackground: vi.fn(),
				syncActiveStackToBackground: vi.fn((rootTaskId: string) => {
					provider.backgroundRootTaskStacks.set(rootTaskId, [...provider.clineStack])
					return rootTaskId
				}),
			},
			setValues: vi.fn(),
			getState: vi.fn(),
			addClineToStack: vi.fn(async (task: any) => {
				provider.clineStack.push(task)
				provider.focusedRootTaskId = task.rootTaskId ?? task.rootTask?.taskId ?? task.taskId
			}),
			setProviderProfile: vi.fn(),
			log: vi.fn(),
			taskCreationCallback: vi.fn(),
			context: { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } },
			contextProxy: {
				extensionUri: {},
				setValue: vi.fn(),
				getValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
		}
		const admitFreshTask = vi.fn().mockReturnValue({ rootTask, taskNumber: 2 })
		const placeTask = vi.fn().mockImplementation(async ({ task }: any) => {
			provider.backgroundRootTaskStacks.set("root-1", [rootTask, task])
			provider.focusedRootTaskId = "root-1"
			return "root-1"
		})
		const prepareTaskBirthOrchestration = vi
			.spyOn(taskBirthOrchestrationService, "prepareTaskBirthOrchestration")
			.mockResolvedValue({
				admitFreshTask,
				instantiateFreshTask: instantiate,
				instantiateHistoryTask: vi.fn(),
				placeTask,
			})

		await (ClineProvider.prototype as any).createTask.call(provider, "Child task", undefined, parentTask)

		expect(prepareTaskBirthOrchestration).toHaveBeenCalledTimes(1)
		expect(provider.taskRootStackLifecycleService.snapshotCurrentStackToBackground).not.toHaveBeenCalled()
		expect(admitFreshTask).toHaveBeenCalledWith({
			parentTask,
			detachFromParentRoot: undefined,
		})
		expect(instantiate).toHaveBeenCalledWith({
			text: "Child task",
			images: undefined,
			parentTask,
			options: {},
			admission: { rootTask, taskNumber: 2 },
		})
		expect(placeTask).toHaveBeenCalledWith({
			task: expect.objectContaining({ taskId: "child-1" }),
			logContext: "createTask",
		})
		expect(provider.backgroundRootTaskStacks.get("root-1")).toEqual([
			rootTask,
			expect.objectContaining({ taskId: "child-1" }),
		])
		expect(provider.focusedRootTaskId).toBe("root-1")
	})

	it("History resume path always closes current before rehydration (non-rehydrating case)", async () => {
		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const addClineToStack = vi.fn().mockResolvedValue(undefined)
		const updateGlobalState = vi.fn().mockResolvedValue(undefined)

		const provider: any = {
			clineStack: [],
			getCurrentTask: vi.fn(() => undefined), // ensure not rehydrating
			backgroundRootTaskStacks: new Map(),
			focusedRootTaskId: undefined,
			snapshotCurrentStackToBackground: vi.fn(() => {
				provider.clineStack = []
			}),
			restoreBackgroundStack: vi.fn().mockReturnValue(false),
			removeClineFromStack,
			addClineToStack: vi.fn(async (task: any) => {
				provider.clineStack.push(task)
				return addClineToStack(task)
			}),
			updateGlobalState,
			log: vi.fn(),
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			providerSettingsManager: {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
			},
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
				diffEnabled: false,
				enableCheckpoints: true,
				checkpointTimeout: 60,
				fuzzyMatchThreshold: 1.0,
				experiments: {},
				cloudUserInfo: null,
				taskSyncEnabled: false,
			}),
			taskRehydrationService: {
				prepareRehydration: vi.fn().mockImplementation(async () => {
					provider.snapshotCurrentStackToBackground()
					return {
						targetRootTaskId: "hist-1",
						isRehydratingCurrentTask: false,
					}
				}),
				restoreModeAndProfile: vi.fn().mockResolvedValue(undefined),
				replaceCurrentTaskInPlace: vi.fn(),
				replayPendingEditIfNeeded: vi.fn(),
			},
			// Methods used by createTaskWithHistoryItem for pending edit cleanup
			getPendingEditOperation: vi.fn().mockReturnValue(undefined),
			clearPendingEditOperation: vi.fn(),
			context: { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } },
			contextProxy: {
				extensionUri: {},
				getValue: vi.fn(),
				setValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
			postStateToWebview: vi.fn(),
		}
		provider.taskRootStackLifecycleService = new TaskRootStackLifecycleService({
			getCurrentTask: () => provider.clineStack[provider.clineStack.length - 1],
			getCurrentStack: () => provider.clineStack,
			setCurrentStack: (stack: any[]) => {
				provider.clineStack = [...stack]
			},
			getBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.get(id),
			getBackgroundRootTaskEntries: () => provider.backgroundRootTaskStacks.entries(),
			setBackgroundRootTaskStack: (id: string, stack: any[]) =>
				provider.backgroundRootTaskStacks.set(id, [...stack]),
			deleteBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.delete(id),
			getFocusedRootTaskId: () => provider.focusedRootTaskId,
			setFocusedRootTaskId: (id: string | undefined) => {
				provider.focusedRootTaskId = id
			},
		})

		const historyItem = {
			id: "hist-1",
			number: 1,
			ts: Date.now(),
			task: "Task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			workspace: "/tmp",
		}

		const task = await (ClineProvider.prototype as any).createTaskWithHistoryItem.call(provider, historyItem)
		expect(task).toBeTruthy()
		expect((provider as any).snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(removeClineFromStack).not.toHaveBeenCalled()
		expect(addClineToStack).toHaveBeenCalledTimes(1)
	})

	it("History resume path uses the shared birth seam after rehydration setup", async () => {
		const instantiate = vi.fn().mockReturnValue({
			taskId: "hist-1",
			instanceId: "inst",
			parentTask: undefined,
			rootTaskId: "drift-root",
			rootTask: undefined,
		})
		const instantiateHistoryTask = vi.fn().mockReturnValue({
			taskId: "hist-1",
			instanceId: "inst",
			parentTask: undefined,
			rootTaskId: "drift-root",
			rootTask: undefined,
		})
		const placeTask = vi.fn().mockResolvedValue("hist-1")
		const prepareTaskBirthOrchestration = vi
			.spyOn(taskBirthOrchestrationService, "prepareTaskBirthOrchestration")
			.mockResolvedValue({
				admitFreshTask: vi.fn(),
				instantiateFreshTask: vi.fn(),
				instantiateHistoryTask,
				placeTask,
			})
		const restoreModeAndProfile = vi.fn().mockImplementation(async () => {})
		const replayPendingEditIfNeeded = vi.fn()
		const provider: any = {
			clineStack: [],
			getCurrentTask: vi.fn(() => undefined),
			backgroundRootTaskStacks: new Map(),
			focusedRootTaskId: undefined,
			snapshotCurrentStackToBackground: vi.fn(),
			restoreBackgroundStack: vi.fn().mockReturnValue(false),
			taskRootStackLifecycleService: {
				syncActiveStackToBackground: vi.fn((rootTaskId: string) => {
					provider.backgroundRootTaskStacks.set(rootTaskId, [...provider.clineStack])
					return rootTaskId
				}),
			},
			addClineToStack: vi.fn(async (task: any) => {
				provider.clineStack.push(task)
				provider.focusedRootTaskId = task.rootTaskId ?? task.rootTask?.taskId ?? task.taskId
			}),
			log: vi.fn(),
			getState: vi.fn(),
			context: { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } },
			contextProxy: {
				extensionUri: {},
				getValue: vi.fn(),
				setValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
			taskCreationCallback: vi.fn(),
			taskRehydrationService: {
				prepareRehydration: vi.fn().mockResolvedValue({
					targetRootTaskId: "hist-1",
					isRehydratingCurrentTask: false,
				}),
				restoreModeAndProfile,
				replaceCurrentTaskInPlace: vi.fn(),
				replayPendingEditIfNeeded,
			},
		}
		const historyItem = {
			id: "hist-1",
			number: 1,
			ts: Date.now(),
			task: "Task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			workspace: "/tmp",
			status: "active",
		} as any

		await (ClineProvider.prototype as any).createTaskWithHistoryItem.call(provider, historyItem, {
			startTask: false,
		})

		expect((provider as any).taskRehydrationService.prepareRehydration).toHaveBeenCalledWith(historyItem)
		expect(restoreModeAndProfile).toHaveBeenCalledWith(historyItem)
		expect(prepareTaskBirthOrchestration).toHaveBeenCalledTimes(1)
		expect(prepareTaskBirthOrchestration).toHaveBeenCalledWith({
			context: (provider as any).context,
			provider,
			taskCreationCallback: (provider as any).taskCreationCallback,
			getState: expect.any(Function),
			getCurrentStack: expect.any(Function),
			setCurrentStack: expect.any(Function),
			snapshotCurrentStackToBackground: expect.any(Function),
			addClineToStack: expect.any(Function),
			rootStackLifecycle: provider.taskRootStackLifecycleService,
			log: expect.any(Function),
		})
		expect(instantiateHistoryTask).toHaveBeenCalledWith({
			historyItem,
			startTask: false,
		})
		expect(placeTask).toHaveBeenCalledWith({
			task: expect.objectContaining({ taskId: "hist-1" }),
			rootTaskId: "hist-1",
			logContext: "createTaskWithHistoryItem",
		})
		expect(replayPendingEditIfNeeded).toHaveBeenCalledWith(expect.objectContaining({ taskId: "hist-1" }))
	})

	it("IPC StartNewTask path closes current before new task", async () => {
		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const createTask = vi.fn().mockResolvedValue({ taskId: "ipc-1" })
		const provider = {
			context: {} as any,
			removeClineFromStack,
			postStateToWebview: vi.fn(),
			postMessageToWebview: vi.fn(),
			createTask,
			getValues: vi.fn(() => ({})),
			providerSettingsManager: { saveConfig: vi.fn() },
			on: vi.fn((ev: any, cb: any) => {
				if (ev === "taskCreated") {
					// no-op for this test
				}
				return provider
			}),
		} as unknown as ClineProvider

		const output = { appendLine: vi.fn() } as any
		const api = new API(output, provider, undefined, false)

		const taskId = await api.startNewTask({
			configuration: {},
			text: "hello",
			images: undefined,
			newTab: false,
		})

		expect(taskId).toBe("ipc-1")
		expect(removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(createTask).toHaveBeenCalled()
	})

	it("clearTask detaches current root and restores another active background root", async () => {
		const focusedTask = { taskId: "root-1", instanceId: "inst-1", emit: vi.fn() }
		const backgroundTask = { taskId: "root-2", instanceId: "inst-2", emit: vi.fn() }
		const provider = {
			clearTask: vi.fn().mockResolvedValue(undefined),
			taskDetachmentService: new TaskDetachmentService({
				getCurrentStack: vi.fn(() => [focusedTask] as any),
				getRootTaskIdForStack: vi.fn((stack) => stack[0]?.taskId),
				snapshotCurrentStackToBackground: vi.fn(),
				restoreBackgroundStack: vi.fn(() => {
					provider.clineStack = [backgroundTask]
					provider.focusedRootTaskId = "root-2"
					backgroundTask.emit()
					return true
				}),
				getNextActiveRootTaskId: vi.fn(() => "root-2"),
				setCurrentStack: vi.fn((stack) => {
					provider.clineStack = [...stack]
				}),
				setFocusedRootTaskId: vi.fn((rootTaskId) => {
					provider.focusedRootTaskId = rootTaskId
				}),
			}),
			clineStack: [focusedTask],
			focusedRootTaskId: "root-1",
		} as any

		await ClineProvider.prototype.clearTask.call(provider)

		expect(provider.clineStack).toEqual([backgroundTask])
		expect(provider.focusedRootTaskId).toBe("root-2")
		expect(backgroundTask.emit).toHaveBeenCalled()
	})

	it("closeTaskToHistory detaches current root without restoring another active background root", async () => {
		const focusedTask = { taskId: "root-1", instanceId: "inst-1", emit: vi.fn() }
		const backgroundTask = { taskId: "root-2", instanceId: "inst-2", emit: vi.fn() }
		const provider = {
			closeTaskToHistory: vi.fn().mockResolvedValue(undefined),
			taskDetachmentService: new TaskDetachmentService({
				getCurrentStack: vi.fn(() => [focusedTask] as any),
				getRootTaskIdForStack: vi.fn((stack) => stack[0]?.taskId),
				snapshotCurrentStackToBackground: vi.fn(),
				restoreBackgroundStack: vi.fn(() => true),
				getNextActiveRootTaskId: vi.fn(),
				setCurrentStack: vi.fn((stack) => {
					provider.clineStack = [...stack]
				}),
				setFocusedRootTaskId: vi.fn((rootTaskId) => {
					provider.focusedRootTaskId = rootTaskId
				}),
			}),
			clineStack: [focusedTask],
			focusedRootTaskId: "root-1",
			backgroundRootTaskStacks: new Map([
				["root-1", [focusedTask]],
				["root-2", [backgroundTask]],
			]),
		} as any

		await ClineProvider.prototype.closeTaskToHistory.call(provider)

		expect(provider.clineStack).toEqual([])
		expect(provider.focusedRootTaskId).toBeUndefined()
		expect(provider.backgroundRootTaskStacks.get("root-1")).toEqual([focusedTask])
		expect(provider.backgroundRootTaskStacks.get("root-2")).toEqual([backgroundTask])
		expect(backgroundTask.emit).not.toHaveBeenCalled()
	})

	it("createTaskWithHistoryItem rehydrates a selected child task instead of restoring only its background root", async () => {
		const currentTask = { taskId: "root-1", instanceId: "inst-1" }
		const backgroundRootTask = { taskId: "root-2", instanceId: "inst-2", emit: vi.fn() }
		const activeChildTask = {
			taskId: "active-child-2",
			instanceId: "inst-3",
			emit: vi.fn(),
			rootTask: backgroundRootTask,
		}

		const provider = Object.create(ClineProvider.prototype) as any
		provider.clineStack = [currentTask]
		provider.backgroundRootTaskStacks = new Map([
			["root-1", [currentTask]],
			["root-2", [backgroundRootTask, activeChildTask]],
		])
		provider.focusedRootTaskId = "root-1"
		provider.customModesManager = { getCustomModes: vi.fn().mockResolvedValue([]) }
		provider.providerSettingsManager = {
			getModeConfigId: vi.fn().mockResolvedValue(undefined),
			listConfig: vi.fn().mockResolvedValue([]),
		}
		provider.updateGlobalState = vi.fn().mockResolvedValue(undefined)
		provider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
			diffEnabled: false,
			enableCheckpoints: true,
			checkpointTimeout: 60,
			fuzzyMatchThreshold: 1.0,
			experiments: {},
			cloudUserInfo: null,
			taskSyncEnabled: false,
		})
		provider.context = { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } }
		provider.contextProxy = {
			extensionUri: {},
			globalStorageUri: { fsPath: "/tmp" },
			getValue: vi.fn(),
			setValue: vi.fn(),
			setProviderSettings: vi.fn(),
			getProviderSettings: vi.fn(() => ({})),
		}
		provider.taskCreationCallback = vi.fn()
		provider.getPendingEditOperation = vi.fn().mockReturnValue(undefined)
		provider.clearPendingEditOperation = vi.fn()
		provider.log = vi.fn()
		provider.taskRehydrationService = {
			prepareRehydration: vi.fn().mockResolvedValue({
				targetRootTaskId: "root-2",
				isRehydratingCurrentTask: false,
			}),
			restoreModeAndProfile: vi.fn().mockResolvedValue(undefined),
			replaceCurrentTaskInPlace: vi.fn(),
			replayPendingEditIfNeeded: vi.fn(),
		}
		provider.addClineToStack = vi.fn(async (task: any) => {
			provider.clineStack.push(task)
			provider.focusedRootTaskId = task.rootTaskId ?? task.rootTask?.taskId ?? task.taskId
		})
		provider.taskRootStackLifecycleService = new TaskRootStackLifecycleService({
			getCurrentTask: () => provider.clineStack[provider.clineStack.length - 1],
			getCurrentStack: () => provider.clineStack,
			setCurrentStack: (stack: any[]) => {
				provider.clineStack = [...stack]
			},
			getBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.get(id),
			getBackgroundRootTaskEntries: () => provider.backgroundRootTaskStacks.entries(),
			setBackgroundRootTaskStack: (id: string, stack: any[]) =>
				provider.backgroundRootTaskStacks.set(id, [...stack]),
			deleteBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.delete(id),
			getFocusedRootTaskId: () => provider.focusedRootTaskId,
			setFocusedRootTaskId: (id: string | undefined) => {
				provider.focusedRootTaskId = id
			},
		})

		const historyItem = {
			id: "archived-child-2",
			rootTaskId: "root-2",
			parentTaskId: "root-2",
			number: 3,
			ts: Date.now(),
			task: "Archived child",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			workspace: "/tmp",
		}

		const task = await ClineProvider.prototype.createTaskWithHistoryItem.call(provider, historyItem)

		expect(task?.taskId).toBe("archived-child-2")
		expect(provider.addClineToStack).toHaveBeenCalledTimes(1)
		expect(provider.clineStack.at(-1)?.taskId).toBe("archived-child-2")
		expect(provider.clineStack.at(-1)?.taskId).not.toBe("active-child-2")
		expect(provider.focusedRootTaskId).toBe("root-2")
	})

	it("drops stale empty background roots when restore is attempted", () => {
		const provider = Object.create(ClineProvider.prototype) as any
		provider.backgroundRootTaskStacks = new Map([["root-stale", []]])
		provider.clineStack = []
		provider.focusedRootTaskId = undefined
		provider.taskRootStackLifecycleService = {
			restoreBackgroundStack: vi.fn((rootTaskId: string) =>
				TaskRootStackLifecycleService.prototype.restoreBackgroundStack.call(
					new TaskRootStackLifecycleService({
						getCurrentTask: () => provider.clineStack.at(-1),
						getCurrentStack: () => provider.clineStack,
						setCurrentStack: (stack: any[]) => {
							provider.clineStack = [...stack]
						},
						getBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.get(id),
						getBackgroundRootTaskEntries: () => provider.backgroundRootTaskStacks.entries(),
						setBackgroundRootTaskStack: (id: string, stack: any[]) =>
							provider.backgroundRootTaskStacks.set(id, [...stack]),
						deleteBackgroundRootTaskStack: (id: string) => provider.backgroundRootTaskStacks.delete(id),
						getFocusedRootTaskId: () => provider.focusedRootTaskId,
						setFocusedRootTaskId: (id: string | undefined) => {
							provider.focusedRootTaskId = id
						},
					}),
					rootTaskId,
				),
			),
		}

		const restored = ClineProvider.prototype["restoreBackgroundStack"].call(provider, "root-stale")

		expect(restored).toBe(false)
		expect(provider.backgroundRootTaskStacks.has("root-stale")).toBe(false)
	})
	it("showTaskWithId restores a background root without rebuilding unrelated history", async () => {
		const currentTask = { taskId: "root-1", instanceId: "inst-1" }
		const backgroundTask = { taskId: "root-2", instanceId: "inst-2", emit: vi.fn() }

		const provider = Object.create(ClineProvider.prototype) as any
		provider.clineStack = [currentTask]
		provider.backgroundRootTaskStacks = new Map([
			["root-1", [currentTask]],
			["root-2", [backgroundTask]],
		])
		provider.focusedRootTaskId = "root-1"
		provider.getCurrentTask = vi.fn(() => provider.clineStack[provider.clineStack.length - 1])
		provider.getTaskWithId = vi.fn(async () => ({ historyItem: { id: "root-2", task: "Root Two" } }))
		provider.createTaskWithHistoryItem = vi.fn(async (historyItem: any) => {
			return ClineProvider.prototype.createTaskWithHistoryItem.call(provider, historyItem)
		})
		provider.taskRehydrationService = {
			prepareRehydration: vi.fn().mockImplementation(async () => {
				provider.clineStack = [backgroundTask]
				provider.focusedRootTaskId = "root-2"
				return {
					targetRootTaskId: "root-2",
					isRehydratingCurrentTask: false,
					restoredTask: backgroundTask,
				}
			}),
			restoreModeAndProfile: vi.fn().mockResolvedValue(undefined),
			replaceCurrentTaskInPlace: vi.fn(),
			replayPendingEditIfNeeded: vi.fn(),
		}
		provider.postMessageToWebview = vi.fn().mockResolvedValue(undefined)
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined)
		provider.contextProxy = { getValue: vi.fn(() => []), setValue: vi.fn() }

		await ClineProvider.prototype.showTaskWithId.call(provider, "root-2")

		expect(provider.clineStack).toEqual([backgroundTask])
		expect(provider.focusedRootTaskId).toBe("root-2")
		expect(provider.postMessageToWebview).toHaveBeenCalledWith({ type: "action", action: "chatButtonClicked" })
	})
})
