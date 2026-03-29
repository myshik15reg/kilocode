import {
	RooCodeEventName,
	type CreateTaskOptions,
	type HistoryItem,
	type SubagentLaunchRequest,
	type TodoItem,
} from "@roo-code/types"

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
	branchFromTaskId?: string
	branchStrategy?: "full" | "summary"
}

export interface LaunchBackgroundSubagentParams {
	parentTaskId: string
	message: string
	initialTodos: TodoItem[]
	mode: string
	isolation?: "auto" | "shared" | "worktree"
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

export interface SubagentDelegationRuntime {
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
		}
	}

	private async persistForegroundDelegationMetadata(params: {
		parentTaskId: string
		parentDelegationDepth: number | undefined
		child: Task
		execution?: "auto" | "foreground" | "background"
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
