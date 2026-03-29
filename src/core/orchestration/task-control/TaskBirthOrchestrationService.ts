import * as vscode from "vscode"

import { BridgeOrchestrator } from "@roo-code/cloud"
import type { CreateTaskOptions, HistoryItem } from "@roo-code/types"

import { t } from "../../../i18n"
import { OrganizationAllowListViolationError } from "../../../utils/errors"

import type { Task } from "../../task/Task"
import type { ClineProvider } from "../../webview/ClineProvider"
import type { TaskRootStackLifecycleService } from "./TaskRootStackLifecycleService"
import * as taskInstantiationService from "./TaskInstantiationService"

// kilocode_change - new file

export interface TaskBirthPlacementOptions {
	task: Task
	rootTaskId?: string
	logContext: "createTask" | "createTaskWithHistoryItem"
}

export interface TaskBirthFreshAdmissionOptions {
	parentTask?: Task
	detachFromParentRoot?: boolean
}

export interface TaskBirthFreshAdmission {
	rootTask: Task | undefined
	taskNumber: number
}

export interface TaskBirthFreshInstantiationOptions {
	text?: string
	images?: string[]
	parentTask?: Task
	options?: CreateTaskOptions
	admission: TaskBirthFreshAdmission
}

export interface TaskBirthHistoryInstantiationOptions {
	historyItem: HistoryItem & { rootTask?: Task; parentTask?: Task }
	startTask: boolean
}

export interface TaskBirthOrchestrationRuntime {
	context: vscode.ExtensionContext
	provider: ClineProvider
	taskCreationCallback: (task: Task) => void
	getState(): Promise<taskInstantiationService.TaskInstantiationState>
	getCurrentStack(): readonly Task[]
	setCurrentStack(stack: Task[]): void
	snapshotCurrentStackToBackground(): void
	addClineToStack(task: Task): Promise<void>
	rootStackLifecycle: Pick<TaskRootStackLifecycleService, "syncActiveStackToBackground">
	log(message: string): void
}

export interface PreparedTaskBirthOrchestration {
	admitFreshTask(options: TaskBirthFreshAdmissionOptions): TaskBirthFreshAdmission
	instantiateFreshTask(options: TaskBirthFreshInstantiationOptions): Task
	instantiateHistoryTask(options: TaskBirthHistoryInstantiationOptions): Task
	placeTask(options: TaskBirthPlacementOptions): Promise<string>
}

export async function prepareTaskBirthOrchestration(
	runtime: TaskBirthOrchestrationRuntime,
): Promise<PreparedTaskBirthOrchestration> {
	const prepared = await taskInstantiationService.prepareTaskInstantiation({
		context: runtime.context,
		provider: runtime.provider,
		taskCreationCallback: runtime.taskCreationCallback,
		getState: runtime.getState,
	})

	return {
		admitFreshTask(options) {
			const creationPolicy = taskInstantiationService.planTaskCreationPolicy({
				state: prepared.state,
				activeStack: runtime.getCurrentStack(),
				parentTask: options.parentTask,
				detachFromParentRoot: options.detachFromParentRoot,
			})

			if (creationPolicy.shouldResetActiveStack) {
				runtime.snapshotCurrentStackToBackground()
				runtime.setCurrentStack([])
			}

			if (!creationPolicy.allowProfile) {
				throw new OrganizationAllowListViolationError(t("common:errors.violated_organization_allowlist"))
			}

			return {
				rootTask: creationPolicy.rootTask,
				taskNumber: creationPolicy.taskNumber,
			}
		},
		instantiateFreshTask(options) {
			return prepared.instantiate({
				task: options.text,
				images: options.images,
				rootTask: options.admission.rootTask,
				parentTask: options.parentTask,
				taskNumber: options.admission.taskNumber,
				enableBridge: BridgeOrchestrator.isEnabled(
					prepared.state.cloudUserInfo,
					prepared.state.remoteControlEnabled,
				),
				initialTodos: options.options?.initialTodos,
				...options.options,
			})
		},
		instantiateHistoryTask(options) {
			return prepared.instantiate({
				historyItem: options.historyItem,
				rootTask: options.historyItem.rootTask,
				parentTask: options.historyItem.parentTask,
				taskNumber: options.historyItem.number,
				workspacePath: options.historyItem.workspace,
				startTask: options.startTask,
				enableBridge: BridgeOrchestrator.isEnabled(
					prepared.state.cloudUserInfo,
					prepared.state.taskSyncEnabled,
				),
				initialStatus: options.historyItem.status,
			})
		},
		async placeTask(options) {
			const rootTaskId = await taskInstantiationService.placeTaskInActiveStack(
				{
					addClineToStack: runtime.addClineToStack,
					rootStackLifecycle: runtime.rootStackLifecycle,
				},
				{
					task: options.task,
					rootTaskId: options.rootTaskId,
				},
			)

			runtime.log(
				`[${options.logContext}] ${options.task.parentTask ? "child" : "parent"} task ${options.task.taskId}.${options.task.instanceId} instantiated`,
			)

			return rootTaskId
		},
	}
}
