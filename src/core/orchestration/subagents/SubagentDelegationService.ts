import {
	RooCodeEventName,
	type CreateTaskOptions,
	type HistoryItem,
	type SubagentLaunchRequest,
	type TodoItem,
} from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import type { PatternMemoryProviderLike } from "../pattern-memory/PatternMemoryTypes"
import { recordDelegationPatternOutcome } from "../pattern-memory/PatternMemoryRecorder"
import { sanitizeTaskArchetype } from "../pattern-memory/OrchestrationPatternMemoryService"
import type { Task } from "../../task/Task"

// kilocode_change - new file
export const MAX_SUBAGENT_DELEGATION_DEPTH = 8

export interface DelegateParentAndOpenChildParams {
	parentTaskId: string
	message: string
	initialTodos: TodoItem[]
	mode: string
	execution?: "auto" | "foreground" | "background"
	isolation?: "auto" | "shared" | "worktree"
	helperProfile?: string
	profileClass?: "strong" | "balanced" | "cheap" | "none"
	routingSource?: "explicit" | "recommended" | "default"
	recommendationReasonCode?: string
	branchFromTaskId?: string
	branchStrategy?: "full" | "summary"
}

export interface LaunchBackgroundSubagentParams {
	parentTaskId: string
	message: string
	initialTodos: TodoItem[]
	mode: string
	isolation?: "auto" | "shared" | "worktree"
	helperProfile?: string
	profileClass?: "strong" | "balanced" | "cheap" | "none"
	routingSource?: "explicit" | "recommended" | "default"
	recommendationReasonCode?: string
}

type TaskActivity = NonNullable<HistoryItem["activity"]>[number]

export type SubagentCoordinatorRuntime = {
	getBindingForTask?(taskId: string): unknown
	cancel?(taskId: string): Promise<unknown>
	pause?(taskId: string): Promise<unknown>
	resume?(taskId: string): Promise<unknown>
	hasCapacity(request: SubagentLaunchRequest): boolean
	launch(request: SubagentLaunchRequest): Promise<{ mode: "background" | "foreground"; childTaskId: string }>
}

export interface SubagentDelegationRuntime extends PatternMemoryProviderLike {
	getCurrentTask(): Task | undefined
	getCurrentStack(): Task[]
	setCurrentStack(stack: Task[]): void
	getRootTaskIdForStack(stack: Task[]): string | undefined
	hasBackgroundRootTaskStack(rootTaskId: string): boolean
	setBackgroundRootTaskStack(rootTaskId: string, stack: Task[]): void
	setFocusedRootTaskId(rootTaskId: string | undefined): void
	restoreBackgroundStack(rootTaskId: string): boolean
	removeClineFromStack(): Promise<void>
	handleModeSwitch(mode: string): Promise<void>
	createTask(text?: string, images?: string[], parentTask?: Task, options?: CreateTaskOptions): Promise<Task>
	getTaskWithId(taskId: string): Promise<{ historyItem: HistoryItem }>
	updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]>
	publishActivity(taskId: string, activity: TaskActivity): Promise<void>
	emitTaskDelegated(parentTaskId: string, childTaskId: string): void
	log(message: string): void
	getSubagentCoordinator(): SubagentCoordinatorRuntime | undefined
}

export class SubagentDelegationService {
	constructor(private readonly runtime: SubagentDelegationRuntime) {}

	public async delegateParentAndOpenChild(params: DelegateParentAndOpenChildParams): Promise<Task> {
		const { parentTaskId, message, initialTodos, mode, execution, isolation } = params
		if (execution === "background") {
			const launched = await this.launchBackgroundSubagent({
				parentTaskId,
				message,
				initialTodos,
				mode,
				isolation,
				helperProfile: params.helperProfile,
				profileClass: params.profileClass ?? (params.helperProfile ? "cheap" : "none"),
				routingSource: params.routingSource,
				recommendationReasonCode: params.recommendationReasonCode,
			})
			if (launched) {
				return launched
			}
		}

		const parentRootTaskIdBeforeDelegation = this.runtime.getRootTaskIdForStack(this.runtime.getCurrentStack())
		const parent = this.requireCurrentParent(parentTaskId)
		const nextDelegationDepth = this.getNextDelegationDepth(parent)

		try {
			await parent.flushPendingToolResultsToHistory()
		} catch (error) {
			this.runtime.log(
				`[delegateParentAndOpenChild] Error flushing pending tool results (non-fatal): ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}

		try {
			await this.runtime.removeClineFromStack()
		} catch (error) {
			this.runtime.log(
				`[delegateParentAndOpenChild] Error during parent disposal (non-fatal): ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}

		try {
			await this.runtime.handleModeSwitch(mode)
		} catch (error) {
			this.runtime.log(
				`[delegateParentAndOpenChild] handleModeSwitch failed for mode '${mode}': ${
					(error as Error)?.message ?? String(error)
				}`,
			)
		}

		const child = await this.runtime.createTask(message, undefined, parent, {
			initialTodos,
			delegationDepth: nextDelegationDepth,
			detachFromParentRoot: true,
			execution,
			isolation,
			patternContext: {
				taskArchetype: sanitizeTaskArchetype({
					mode,
					message,
					branchFromTaskId: params.branchFromTaskId,
					branchStrategy: params.branchStrategy,
					todos: initialTodos.map((todo) => todo.content).join("\n"),
				}),
				mode,
				executionType: execution === "background" ? "background" : "foreground",
				profileClass:
					params.profileClass ?? (execution === "background" && params.helperProfile ? "cheap" : "none"),
				...(params.branchStrategy ? { branchStrategy: params.branchStrategy } : {}),
				...(params.recommendationReasonCode
					? { recommendationReasonCode: params.recommendationReasonCode }
					: {}),
			},
			initialStatus: "active",
		})

		const childRootTaskId = this.resolveRootTaskId(child)
		if (childRootTaskId) {
			this.runtime.setBackgroundRootTaskStack(childRootTaskId, [...this.runtime.getCurrentStack()])
		}

		if (
			parentRootTaskIdBeforeDelegation &&
			this.runtime.hasBackgroundRootTaskStack(parentRootTaskIdBeforeDelegation)
		) {
			for (const activeTask of this.runtime.getCurrentStack()) {
				activeTask.emit(RooCodeEventName.TaskUnfocused)
			}
			this.runtime.setCurrentStack([])
			this.runtime.restoreBackgroundStack(parentRootTaskIdBeforeDelegation)
		}

		await this.persistForegroundDelegationMetadata({
			parentTaskId,
			parentDelegationDepth: parent.delegationDepth,
			child,
			execution,
			mode,
			helperProfile: params.helperProfile,
			profileClass: params.profileClass,
			routingSource: params.routingSource,
			recommendationReasonCode: params.recommendationReasonCode,
		})

		TelemetryService.instance.captureTaskOutcomeDelegated(parentTaskId, {
			childTaskId: child.taskId,
			execution: execution === "background" ? "background" : "foreground",
			delegationDepth: nextDelegationDepth,
			isBackground: execution === "background",
		})
		await recordDelegationPatternOutcome({
			provider: this.runtime,
			taskId: parentTaskId,
			message,
			mode,
			executionType: execution === "background" ? "background" : "foreground",
			profileClass:
				params.profileClass ?? (execution === "background" && params.helperProfile ? "cheap" : "none"),
			branchFromTaskId: params.branchFromTaskId,
			branchStrategy: params.branchStrategy,
			todos: initialTodos.map((todo) => todo.content).join("\n"),
			outcome: "delegated",
			reasonCode: params.recommendationReasonCode,
		})

		try {
			this.runtime.emitTaskDelegated(parentTaskId, child.taskId)
		} catch {
			// non-fatal
		}

		return child
	}

	public async launchBackgroundSubagent(params: LaunchBackgroundSubagentParams): Promise<Task | undefined> {
		const parent = this.runtime.getCurrentTask()
		const coordinator = this.runtime.getSubagentCoordinator()
		if (!parent || !coordinator) {
			return undefined
		}

		const nextDelegationDepth = this.getNextDelegationDepth(parent)
		const parentRootTaskId = this.resolveRootTaskId(parent)
		const preflightRequest = this.buildBackgroundLaunchRequest({
			parentTaskId: params.parentTaskId,
			rootTaskId: parentRootTaskId,
			message: params.message,
			initialTodos: params.initialTodos,
			mode: params.mode,
			isolation: params.isolation,
			helperProfile: params.helperProfile,
			profileClass: params.profileClass,
			routingSource: params.routingSource,
			recommendationReasonCode: params.recommendationReasonCode,
		})
		if (!coordinator.hasCapacity(preflightRequest)) {
			return undefined
		}

		const child = await this.runtime.createTask(params.message, undefined, parent, {
			initialTodos: params.initialTodos,
			delegationDepth: nextDelegationDepth,
			detachFromParentRoot: true,
			execution: "background",
			isolation: params.isolation,
			patternContext: {
				taskArchetype: sanitizeTaskArchetype({
					mode: params.mode,
					message: params.message,
					todos: params.initialTodos.map((todo) => todo.content).join("\n"),
				}),
				mode: params.mode,
				executionType: "background",
				profileClass: params.profileClass ?? (params.helperProfile ? "cheap" : "none"),
				...(params.recommendationReasonCode
					? { recommendationReasonCode: params.recommendationReasonCode }
					: {}),
			},
			initialStatus: "active",
		})

		const childRootTaskId = this.resolveRootTaskId(child)
		if (childRootTaskId) {
			this.runtime.setBackgroundRootTaskStack(childRootTaskId, [child])
		}
		this.runtime.setBackgroundRootTaskStack(parentRootTaskId, [parent])
		this.runtime.setCurrentStack([parent])
		this.runtime.setFocusedRootTaskId(parentRootTaskId)

		const outcome = await coordinator.launch(
			this.buildBackgroundLaunchRequest({
				parentTaskId: params.parentTaskId,
				rootTaskId: parentRootTaskId,
				targetTaskId: child.taskId,
				message: params.message,
				initialTodos: params.initialTodos,
				mode: params.mode,
				isolation: params.isolation,
				helperProfile: params.helperProfile,
				profileClass: params.profileClass,
				routingSource: params.routingSource,
				recommendationReasonCode: params.recommendationReasonCode,
			}),
		)
		if (outcome.mode === "foreground") {
			return undefined
		}

		await this.persistBackgroundDelegationMetadata({
			parentTaskId: params.parentTaskId,
			parentDelegationDepth: parent.delegationDepth,
			childTaskId: child.taskId,
		})

		TelemetryService.instance.captureTaskOutcomeDelegated(params.parentTaskId, {
			childTaskId: child.taskId,
			execution: "background",
			delegationDepth: nextDelegationDepth,
			isBackground: true,
		})
		await recordDelegationPatternOutcome({
			provider: this.runtime,
			taskId: params.parentTaskId,
			message: params.message,
			mode: params.mode,
			executionType: "background",
			profileClass: params.profileClass ?? (params.helperProfile ? "cheap" : "none"),
			todos: params.initialTodos.map((todo) => todo.content).join("\n"),
			outcome: "delegated",
			reasonCode: params.recommendationReasonCode,
		})

		return child
	}

	private requireCurrentParent(parentTaskId: string): Task {
		const parent = this.runtime.getCurrentTask()
		if (!parent) {
			throw new Error("[delegateParentAndOpenChild] No current task")
		}
		if (parent.taskId !== parentTaskId) {
			throw new Error(
				`[delegateParentAndOpenChild] Parent mismatch: expected ${parentTaskId}, current ${parent.taskId}`,
			)
		}

		return parent
	}

	private getNextDelegationDepth(parent: Task): number {
		const nextDelegationDepth = (parent.delegationDepth ?? 0) + 1
		if (nextDelegationDepth > MAX_SUBAGENT_DELEGATION_DEPTH) {
			throw new Error(
				`[delegateParentAndOpenChild] Maximum delegation depth exceeded (${MAX_SUBAGENT_DELEGATION_DEPTH})`,
			)
		}

		return nextDelegationDepth
	}

	private resolveRootTaskId(task: Task): string {
		return task.rootTaskId ?? task.rootTask?.taskId ?? task.taskId
	}

	private buildBackgroundLaunchRequest(params: {
		parentTaskId: string
		rootTaskId: string
		targetTaskId?: string
		message: string
		initialTodos: TodoItem[]
		mode: string
		isolation?: "auto" | "shared" | "worktree"
		helperProfile?: string
		profileClass?: "strong" | "balanced" | "cheap" | "none"
		routingSource?: "explicit" | "recommended" | "default"
		recommendationReasonCode?: string
	}): SubagentLaunchRequest {
		return {
			parentTaskId: params.parentTaskId,
			rootTaskId: params.rootTaskId,
			...(params.targetTaskId ? { targetTaskId: params.targetTaskId } : {}),
			mode: params.mode,
			handoff: {
				summary: params.message,
				context: params.initialTodos.map((todo) => `- ${todo.content}`),
			},
			execution: "background",
			isolation: params.isolation ?? "auto",
			relayPolicy: "parent_only",
			...(params.helperProfile ? { helperProfile: params.helperProfile } : {}),
			...(params.profileClass ? { profileClass: params.profileClass } : {}),
			...(params.routingSource ? { routingSource: params.routingSource } : {}),
			...(params.recommendationReasonCode
				? {
						routingReasonCode: params.recommendationReasonCode,
						recommendationReasonCode: params.recommendationReasonCode,
					}
				: {}),
		}
	}

	private async persistForegroundDelegationMetadata(params: {
		parentTaskId: string
		parentDelegationDepth: number | undefined
		child: Task
		execution?: "auto" | "foreground" | "background"
		mode?: string
		helperProfile?: string
		profileClass?: "strong" | "balanced" | "cheap" | "none"
		routingSource?: "explicit" | "recommended" | "default"
		recommendationReasonCode?: string
	}): Promise<void> {
		try {
			const { historyItem } = await this.runtime.getTaskWithId(params.parentTaskId)
			const childIds = Array.from(new Set([...(historyItem.childIds ?? []), params.child.taskId]))
			await this.runtime.updateTaskHistory({
				...historyItem,
				delegationDepth: params.parentDelegationDepth,
				status: "delegated",
				delegatedToId: params.child.taskId,
				awaitingChildId: params.child.taskId,
				childIds,
			})
			const timestamp = Date.now()
			await this.runtime.publishActivity(params.parentTaskId, {
				kind: "subagent",
				id: `subagent-${params.child.taskId}-${timestamp}`,
				taskId: params.child.taskId,
				sessionId: params.child.taskId,
				status: params.execution === "background" ? "queued" : "running",
				summary:
					params.execution === "background"
						? `Background subagent queued from ${params.parentTaskId}`
						: `Subtask ${params.child.taskId} started from ${params.parentTaskId}`,
				explainability: {
					stage: "delegation",
					reasonCode:
						params.execution === "background"
							? (params.recommendationReasonCode ?? "background_subagent_selected")
							: (params.recommendationReasonCode ?? "foreground_subtask_selected"),
					...(params.routingSource ? { source: params.routingSource } : {}),
					...(params.mode ? { mode: params.mode } : {}),
					execution: params.execution === "background" ? "background" : "foreground",
					...(params.profileClass ? { profileClass: params.profileClass } : {}),
					...(params.helperProfile ? { helperProfile: params.helperProfile } : {}),
					...(params.recommendationReasonCode
						? { recommendationReasonCode: params.recommendationReasonCode }
						: {}),
				},
				timestamp,
			})
		} catch (error) {
			this.runtime.log(
				`[delegateParentAndOpenChild] Failed to persist parent metadata for ${params.parentTaskId} -> ${params.child.taskId}: ${
					(error as Error)?.message ?? String(error)
				}`,
			)
		}
	}

	private async persistBackgroundDelegationMetadata(params: {
		parentTaskId: string
		parentDelegationDepth: number | undefined
		childTaskId: string
	}): Promise<void> {
		const { historyItem } = await this.runtime.getTaskWithId(params.parentTaskId)
		const childIds = Array.from(new Set([...(historyItem.childIds ?? []), params.childTaskId]))
		await this.runtime.updateTaskHistory({
			...historyItem,
			delegationDepth: params.parentDelegationDepth,
			status: "active",
			delegatedToId: params.childTaskId,
			awaitingChildId: params.childTaskId,
			childIds,
		})
	}
}
