import type { Task } from "../../task/Task"

import { describe, expect, it, vi } from "vitest"

import {
	placeTaskInActiveStack,
	planTaskCreationPolicy,
	prepareTaskInstantiation,
	type TaskInstantiationContext,
} from "./TaskInstantiationService"

// kilocode_change - new file

vi.mock("../../task/Task", () => {
	class TaskStub {
		public readonly options: Record<string, unknown>

		constructor(options: Record<string, unknown>) {
			this.options = options
		}
	}

	return {
		Task: TaskStub,
	}
})

describe("placeTaskInActiveStack", () => {
	it("activates the task and syncs the active root snapshot using task-derived identity by default", async () => {
		const task = { taskId: "child-1", rootTaskId: "root-1" } as Task
		const addClineToStack = vi.fn().mockResolvedValue(undefined)
		const syncActiveStackToBackground = vi.fn().mockReturnValue("root-1")

		const rootTaskId = await placeTaskInActiveStack(
			{
				addClineToStack,
				rootStackLifecycle: { syncActiveStackToBackground },
			},
			{ task },
		)

		expect(rootTaskId).toBe("root-1")
		expect(addClineToStack).toHaveBeenCalledWith(task)
		expect(syncActiveStackToBackground).toHaveBeenCalledWith("root-1")
	})

	it("preserves an explicit rehydration root when supplied", async () => {
		const task = { taskId: "hist-child", rootTaskId: "other-root" } as Task
		const addClineToStack = vi.fn().mockResolvedValue(undefined)
		const syncActiveStackToBackground = vi.fn().mockReturnValue("target-root")

		const rootTaskId = await placeTaskInActiveStack(
			{
				addClineToStack,
				rootStackLifecycle: { syncActiveStackToBackground },
			},
			{ task, rootTaskId: "target-root" },
		)

		expect(rootTaskId).toBe("target-root")
		expect(syncActiveStackToBackground).toHaveBeenCalledWith("target-root")
	})
})

describe("planTaskCreationPolicy", () => {
	it("resets top-level creation, clears inherited root, and restarts numbering from one", () => {
		const rootTask = { taskId: "root-1" } as Task

		const plan = planTaskCreationPolicy({
			state: {
				apiConfiguration: { apiProvider: "anthropic" },
				organizationAllowList: { allowAll: true, providers: {} },
			} as any,
			activeStack: [rootTask],
		})

		expect(plan).toEqual({
			allowProfile: true,
			shouldResetActiveStack: true,
			rootTask: undefined,
			taskNumber: 1,
		})
	})

	it("inherits the active root for child creation unless detachFromParentRoot is enabled", () => {
		const rootTask = { taskId: "root-1" } as Task
		const parentTask = { taskId: "parent-1" } as Task
		const state = {
			apiConfiguration: { apiProvider: "anthropic" },
			organizationAllowList: { allowAll: true, providers: {} },
		} as any

		expect(
			planTaskCreationPolicy({
				state,
				activeStack: [rootTask],
				parentTask,
			}),
		).toEqual({
			allowProfile: true,
			shouldResetActiveStack: false,
			rootTask,
			taskNumber: 2,
		})

		expect(
			planTaskCreationPolicy({
				state,
				activeStack: [rootTask],
				parentTask,
				detachFromParentRoot: true,
			}),
		).toEqual({
			allowProfile: true,
			shouldResetActiveStack: false,
			rootTask: undefined,
			taskNumber: 2,
		})
	})

	it("blocks admission when the current profile violates the organization allow-list", () => {
		const plan = planTaskCreationPolicy({
			state: {
				apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-3-7-sonnet" },
				organizationAllowList: {
					allowAll: false,
					providers: {
						openai: { allowAll: true },
					},
				},
			} as any,
			activeStack: [],
		})

		expect(plan.allowProfile).toBe(false)
	})
})

describe("prepareTaskInstantiation", () => {
	it("builds shared constructor options from the current provider state", async () => {
		const getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 7 },
			organizationAllowList: "*",
			diffEnabled: true,
			enableCheckpoints: false,
			checkpointTimeout: 45,
			fuzzyMatchThreshold: 0.8,
			experiments: { alpha: true },
			cloudUserInfo: { id: "cloud-user" },
			taskSyncEnabled: true,
			remoteControlEnabled: false,
		})
		const context = { extension: { packageJSON: {} } } as any
		const provider = { providerId: "provider" } as any
		const taskCreationCallback = vi.fn()

		const prepared = await prepareTaskInstantiation({
			context,
			provider,
			taskCreationCallback,
			getState,
		} satisfies TaskInstantiationContext)

		expect(getState).toHaveBeenCalledTimes(1)
		expect(prepared.state).toMatchObject({
			apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 7 },
			organizationAllowList: "*",
			diffEnabled: true,
			enableCheckpoints: false,
			checkpointTimeout: 45,
			fuzzyMatchThreshold: 0.8,
			experiments: { alpha: true },
			cloudUserInfo: { id: "cloud-user" },
			taskSyncEnabled: true,
			remoteControlEnabled: false,
		})
		expect(prepared.commonOptions).toEqual({
			context,
			provider,
			apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 7 },
			enableDiff: true,
			enableCheckpoints: false,
			checkpointTimeout: 45,
			fuzzyMatchThreshold: 0.8,
			consecutiveMistakeLimit: 7,
			experiments: { alpha: true },
			onCreated: taskCreationCallback,
		})
	})

	it("instantiates tasks by merging shared and caller-owned options without taking over caller decisions", async () => {
		const getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "openrouter", consecutiveMistakeLimit: 3 },
			organizationAllowList: ["org-a"],
			diffEnabled: false,
			enableCheckpoints: true,
			checkpointTimeout: 90,
			fuzzyMatchThreshold: 1,
			experiments: { beta: false },
			cloudUserInfo: null,
			taskSyncEnabled: false,
			remoteControlEnabled: true,
		})
		const context = { extension: { packageJSON: {} } } as any
		const provider = { providerId: "provider" } as any
		const taskCreationCallback = vi.fn()
		const rootTask = { taskId: "root-1" } as any
		const parentTask = { taskId: "parent-1" } as any

		const prepared = await prepareTaskInstantiation({
			context,
			provider,
			taskCreationCallback,
			getState,
		} satisfies TaskInstantiationContext)

		const task = prepared.instantiate({
			task: "Ship it",
			images: ["image-a"],
			rootTask,
			parentTask,
			taskNumber: 4,
			enableBridge: true,
			initialTodos: [{ id: "todo-1", content: "one", status: "pending" }],
		}) as Task & { options: Record<string, unknown> }

		expect(task.options).toEqual({
			context,
			provider,
			apiConfiguration: { apiProvider: "openrouter", consecutiveMistakeLimit: 3 },
			enableDiff: false,
			enableCheckpoints: true,
			checkpointTimeout: 90,
			fuzzyMatchThreshold: 1,
			consecutiveMistakeLimit: 3,
			experiments: { beta: false },
			onCreated: taskCreationCallback,
			task: "Ship it",
			images: ["image-a"],
			rootTask,
			parentTask,
			taskNumber: 4,
			enableBridge: true,
			initialTodos: [{ id: "todo-1", content: "one", status: "pending" }],
		})
	})
})
