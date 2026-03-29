import { SubagentDelegationService, type SubagentDelegationRuntime } from "./SubagentDelegationService"
import { SubagentResumeService, type SubagentResumeRuntime } from "./SubagentResumeService"
import { TaskCancellationService, type TaskCancellationRuntime } from "../task-control/TaskCancellationService"
import { TaskControlService, type TaskControlRuntime } from "../task-control/TaskControlService"
import { TaskRecoveryPacketService, type TaskRecoveryPacketRuntime } from "../task-control/TaskRecoveryPacketService"
import { TaskDetachmentService, type TaskDetachmentRuntime } from "../task-control/TaskDetachmentService"
import {
	TaskRootStackLifecycleService,
	type TaskRootStackLifecycleRuntime,
} from "../task-control/TaskRootStackLifecycleService"
import { TaskRehydrationService, type TaskRehydrationRuntime } from "../task-control/TaskRehydrationService"
import { TaskRestartService, type TaskRestartRuntime } from "../task-control/TaskRestartService"
import { TaskBranchService, type TaskBranchRuntime } from "../task-control/TaskBranchService"

// kilocode_change - new file
export type SubagentServiceRuntime = SubagentDelegationRuntime &
	SubagentResumeRuntime &
	TaskControlRuntime &
	TaskCancellationRuntime &
	TaskRecoveryPacketRuntime &
	TaskDetachmentRuntime &
	TaskRootStackLifecycleRuntime &
	TaskRehydrationRuntime &
	TaskRestartRuntime &
	TaskBranchRuntime

export interface SubagentServices {
	subagentDelegationService: SubagentDelegationService
	subagentResumeService: SubagentResumeService
	taskControlService: TaskControlService
	taskCancellationService: TaskCancellationService
	taskRecoveryPacketService: TaskRecoveryPacketService
	taskDetachmentService: TaskDetachmentService
	rootStackLifecycleService: TaskRootStackLifecycleService
	taskRehydrationService: TaskRehydrationService
	taskRestartService: TaskRestartService
	taskBranchService: TaskBranchService
}

export function createSubagentServices(runtime: SubagentServiceRuntime): SubagentServices {
	return {
		subagentDelegationService: new SubagentDelegationService(runtime),
		subagentResumeService: new SubagentResumeService(runtime),
		taskControlService: new TaskControlService(runtime),
		taskCancellationService: new TaskCancellationService(runtime),
		taskRecoveryPacketService: new TaskRecoveryPacketService(runtime),
		taskDetachmentService: new TaskDetachmentService(runtime),
		rootStackLifecycleService: new TaskRootStackLifecycleService(runtime),
		taskRehydrationService: new TaskRehydrationService(runtime),
		taskRestartService: new TaskRestartService(runtime),
		taskBranchService: new TaskBranchService(runtime),
	}
}
