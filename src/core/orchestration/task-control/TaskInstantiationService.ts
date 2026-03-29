import * as vscode from "vscode"

import { ProfileValidator } from "../../../shared/ProfileValidator"

import type { Task } from "../../task/Task"
import { Task as TaskInstance, type TaskOptions } from "../../task/Task"
import type { ClineProvider, ClineProviderState } from "../../webview/ClineProvider"
import type { TaskRootStackLifecycleService } from "./TaskRootStackLifecycleService"

// kilocode_change - new file

export type TaskInstantiationState = Pick<
	ClineProviderState,
	| "apiConfiguration"
	| "organizationAllowList"
	| "diffEnabled"
	| "enableCheckpoints"
	| "checkpointTimeout"
	| "fuzzyMatchThreshold"
	| "experiments"
	| "cloudUserInfo"
	| "taskSyncEnabled"
	| "remoteControlEnabled"
>

export type CommonTaskInstantiationOptions = Pick<
	TaskOptions,
	| "context"
	| "provider"
	| "apiConfiguration"
	| "enableDiff"
	| "enableCheckpoints"
	| "checkpointTimeout"
	| "fuzzyMatchThreshold"
	| "consecutiveMistakeLimit"
	| "experiments"
	| "onCreated"
>

export interface TaskInstantiationContext {
	context: vscode.ExtensionContext
	provider: ClineProvider
	taskCreationCallback: (task: Task) => void
	getState(): Promise<TaskInstantiationState>
}

export interface PreparedTaskInstantiation {
	state: TaskInstantiationState
	commonOptions: CommonTaskInstantiationOptions
	instantiate(extraOptions: Omit<TaskOptions, keyof CommonTaskInstantiationOptions>): Task
}

export interface TaskPlacementRuntime {
	addClineToStack(task: Task): Promise<void>
	rootStackLifecycle: Pick<TaskRootStackLifecycleService, "syncActiveStackToBackground">
}

export interface PlaceTaskInActiveStackOptions {
	task: Task
	rootTaskId?: string
}

export interface TaskCreationPolicyContext {
	state: Pick<TaskInstantiationState, "apiConfiguration" | "organizationAllowList">
	activeStack: readonly Task[]
	parentTask?: Task
	detachFromParentRoot?: boolean
}

export interface TaskCreationPolicyPlan {
	allowProfile: boolean
	shouldResetActiveStack: boolean
	rootTask: Task | undefined
	taskNumber: number
}

export function planTaskCreationPolicy(context: TaskCreationPolicyContext): TaskCreationPolicyPlan {
	const shouldResetActiveStack = !context.parentTask
	const nextActiveStack = shouldResetActiveStack ? [] : context.activeStack

	return {
		allowProfile: ProfileValidator.isProfileAllowed(
			context.state.apiConfiguration,
			context.state.organizationAllowList,
		),
		shouldResetActiveStack,
		rootTask: context.detachFromParentRoot === true ? undefined : nextActiveStack[0],
		taskNumber: nextActiveStack.length + 1,
	}
}

export async function placeTaskInActiveStack(
	runtime: TaskPlacementRuntime,
	options: PlaceTaskInActiveStackOptions,
): Promise<string> {
	await runtime.addClineToStack(options.task)

	return (
		runtime.rootStackLifecycle.syncActiveStackToBackground(
			options.rootTaskId ?? options.task.rootTaskId ?? options.task.rootTask?.taskId ?? options.task.taskId,
		) ?? options.task.taskId
	)
}

export async function prepareTaskInstantiation(context: TaskInstantiationContext): Promise<PreparedTaskInstantiation> {
	const state = await context.getState()
	const commonOptions: CommonTaskInstantiationOptions = {
		context: context.context,
		provider: context.provider,
		apiConfiguration: state.apiConfiguration,
		enableDiff: state.diffEnabled,
		enableCheckpoints: state.enableCheckpoints,
		checkpointTimeout: state.checkpointTimeout,
		fuzzyMatchThreshold: state.fuzzyMatchThreshold,
		consecutiveMistakeLimit: state.apiConfiguration.consecutiveMistakeLimit,
		experiments: state.experiments,
		onCreated: context.taskCreationCallback,
	}

	return {
		state,
		commonOptions,
		instantiate(extraOptions) {
			return new TaskInstance({
				...commonOptions,
				...extraOptions,
			})
		},
	}
}
