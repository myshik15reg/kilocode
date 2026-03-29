import type { Task } from "../../task/Task"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrganizationAllowListViolationError } from "../../../utils/errors"

import * as taskInstantiationService from "./TaskInstantiationService"
import { prepareTaskBirthOrchestration } from "./TaskBirthOrchestrationService"

// kilocode_change - new file

describe("prepareTaskBirthOrchestration", () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	function createPreparedBirthHarness(overrides: Partial<taskInstantiationService.TaskInstantiationState> = {}) {
		const instantiate = vi.fn().mockImplementation((options) => ({
			taskId: options.historyItem?.id ?? "task-1",
			instanceId: "inst-1",
			parentTask: options.parentTask,
			rootTask: options.rootTask,
			rootTaskId: options.rootTask?.taskId,
			options,
		}))
		vi.spyOn(taskInstantiationService, "prepareTaskInstantiation").mockResolvedValue({
			state: {
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-7-sonnet",
					consecutiveMistakeLimit: 0,
				},
				organizationAllowList: { allowAll: true, providers: {} },
				diffEnabled: false,
				enableCheckpoints: true,
				checkpointTimeout: 60,
				fuzzyMatchThreshold: 1,
				experiments: {},
				cloudUserInfo: null,
				taskSyncEnabled: false,
				remoteControlEnabled: false,
				...overrides,
			} as any,
			commonOptions: {} as any,
			instantiate,
		})
		const placeTaskInActiveStack = vi
			.spyOn(taskInstantiationService, "placeTaskInActiveStack")
			.mockResolvedValue("placed-root")
		const snapshotCurrentStackToBackground = vi.fn()
		const setCurrentStack = vi.fn()
		const addClineToStack = vi.fn().mockResolvedValue(undefined)
		const syncActiveStackToBackground = vi.fn().mockReturnValue("placed-root")
		const log = vi.fn()
		const runtime = {
			context: { extension: { packageJSON: {} } } as any,
			provider: { providerId: "provider" } as any,
			taskCreationCallback: vi.fn(),
			getState: vi.fn(),
			getCurrentStack: vi.fn(() => []),
			setCurrentStack,
			snapshotCurrentStackToBackground,
			addClineToStack,
			rootStackLifecycle: { syncActiveStackToBackground },
			log,
		}

		return {
			instantiate,
			placeTaskInActiveStack,
			snapshotCurrentStackToBackground,
			setCurrentStack,
			addClineToStack,
			syncActiveStackToBackground,
			log,
			runtime,
		}
	}

	it("resets the active stack for a top-level create before fresh task instantiation", async () => {
		const harness = createPreparedBirthHarness()
		harness.runtime.getCurrentStack = vi.fn(() => [{ taskId: "existing-root" }] as any)

		const prepared = await prepareTaskBirthOrchestration(harness.runtime)
		const admission = prepared.admitFreshTask({})
		const task = prepared.instantiateFreshTask({
			text: "Ship slice",
			admission,
		}) as Task & { options: any }

		expect(harness.snapshotCurrentStackToBackground).toHaveBeenCalledTimes(1)
		expect(harness.setCurrentStack).toHaveBeenCalledWith([])
		expect(admission).toEqual({ rootTask: undefined, taskNumber: 1 })
		expect(harness.instantiate).toHaveBeenCalledWith(
			expect.objectContaining({
				task: "Ship slice",
				rootTask: undefined,
				taskNumber: 1,
				enableBridge: false,
			}),
		)
		expect(task.options.task).toBe("Ship slice")
	})

	it("inherits the current root for child create when not detached", async () => {
		const rootTask = { taskId: "root-1" } as Task
		const parentTask = { taskId: "parent-1" } as Task
		const harness = createPreparedBirthHarness()
		harness.runtime.getCurrentStack = vi.fn(() => [rootTask])

		const prepared = await prepareTaskBirthOrchestration(harness.runtime)
		const admission = prepared.admitFreshTask({ parentTask })
		prepared.instantiateFreshTask({
			text: "Child",
			parentTask,
			admission,
		})

		expect(harness.snapshotCurrentStackToBackground).not.toHaveBeenCalled()
		expect(harness.setCurrentStack).not.toHaveBeenCalled()
		expect(admission).toEqual({ rootTask, taskNumber: 2 })
		expect(harness.instantiate).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTask,
				rootTask,
				taskNumber: 2,
			}),
		)
	})

	it("does not inherit the parent root for detached child create", async () => {
		const rootTask = { taskId: "root-1" } as Task
		const parentTask = { taskId: "parent-1" } as Task
		const harness = createPreparedBirthHarness()
		harness.runtime.getCurrentStack = vi.fn(() => [rootTask])

		const prepared = await prepareTaskBirthOrchestration(harness.runtime)
		const admission = prepared.admitFreshTask({ parentTask, detachFromParentRoot: true })
		prepared.instantiateFreshTask({
			text: "Detached",
			parentTask,
			options: { detachFromParentRoot: true },
			admission,
		})

		expect(admission).toEqual({ rootTask: undefined, taskNumber: 2 })
		expect(harness.instantiate).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTask,
				rootTask: undefined,
				detachFromParentRoot: true,
				taskNumber: 2,
			}),
		)
	})

	it("throws when the active profile violates the organization allow list", async () => {
		const harness = createPreparedBirthHarness({
			organizationAllowList: { allowAll: false, providers: {} } as any,
		})

		const prepared = await prepareTaskBirthOrchestration(harness.runtime)

		expect(() => prepared.admitFreshTask({})).toThrow(OrganizationAllowListViolationError)
		expect(harness.instantiate).not.toHaveBeenCalled()
	})

	it("uses task-sync bridge selection for history instantiation and centralizes placement logging", async () => {
		const harness = createPreparedBirthHarness({
			cloudUserInfo: { id: "cloud", extensionBridgeEnabled: true } as any,
			taskSyncEnabled: true,
		})
		const prepared = await prepareTaskBirthOrchestration(harness.runtime)
		const historyItem = {
			id: "history-1",
			number: 7,
			workspace: "/tmp/project",
			status: "active",
		} as any

		const task = prepared.instantiateHistoryTask({
			historyItem,
			startTask: false,
		}) as Task
		const rootTaskId = await prepared.placeTask({
			task,
			rootTaskId: "rehydrated-root",
			logContext: "createTaskWithHistoryItem",
		})

		expect(harness.instantiate).toHaveBeenCalledWith(
			expect.objectContaining({
				historyItem,
				taskNumber: 7,
				workspacePath: "/tmp/project",
				startTask: false,
				enableBridge: true,
				initialStatus: "active",
			}),
		)
		expect(harness.placeTaskInActiveStack).toHaveBeenCalledWith(
			{
				addClineToStack: harness.addClineToStack,
				rootStackLifecycle: { syncActiveStackToBackground: harness.syncActiveStackToBackground },
			},
			{
				task,
				rootTaskId: "rehydrated-root",
			},
		)
		expect(rootTaskId).toBe("placed-root")
		expect(harness.log).toHaveBeenCalledWith(
			"[createTaskWithHistoryItem] parent task history-1.inst-1 instantiated",
		)
	})

	it("logs child placement when the shared seam places a nested task", async () => {
		const harness = createPreparedBirthHarness()
		const prepared = await prepareTaskBirthOrchestration(harness.runtime)
		const task = {
			taskId: "child-1",
			instanceId: "inst-child",
			parentTask: { taskId: "parent-1" },
		} as Task

		const rootTaskId = await prepared.placeTask({
			task,
			rootTaskId: "root-1",
			logContext: "createTaskWithHistoryItem",
		})

		expect(harness.placeTaskInActiveStack).toHaveBeenCalledWith(
			{
				addClineToStack: harness.addClineToStack,
				rootStackLifecycle: { syncActiveStackToBackground: harness.syncActiveStackToBackground },
			},
			{
				task,
				rootTaskId: "root-1",
			},
		)
		expect(rootTaskId).toBe("placed-root")
		expect(harness.log).toHaveBeenCalledWith(
			"[createTaskWithHistoryItem] child task child-1.inst-child instantiated",
		)
	})
})
