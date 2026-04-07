import {
	RooCodeEventName,
	type CreateTaskOptions,
	type HistoryItem,
	type SubagentHandoff,
	type SubagentLaunchRequest,
	type TodoItem,
} from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { ConversationWindowBuilder } from "../context/ConversationWindowBuilder" // kilocode_change
import type { PatternMemoryProviderLike } from "../pattern-memory/PatternMemoryTypes"
import { recordDelegationPatternOutcome } from "../pattern-memory/PatternMemoryRecorder"
import { sanitizeTaskArchetype } from "../pattern-memory/OrchestrationPatternMemoryService"
import type { Task } from "../../task/Task"

// kilocode_change - new file
export const MAX_SUBAGENT_DELEGATION_DEPTH = 8

export interface DelegateParentAndOpenChildParams {
	parentTaskId: string
	parentTask?: Task
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
	goal?: string
	doneWhen?: string
	constraints?: string[]
	deliverable?: string
	acceptanceCriteria?: string[]
	inputs?: NonNullable<SubagentHandoff["inputs"]>
	evidenceNeeded?: boolean
	budget?: { maxTokens?: number; maxSteps?: number; maxCostUsd?: number }
	canAbstain?: boolean
	priorResultSummary?: string
	strategy?: "direct" | "sequential"
	expectedArtifact?: string
	role?: string
	permissions?: string[]
	retryBudget?: number
	retrievalPackId?: string
	taskIntent?: SubagentLaunchRequest["taskIntent"]
	retrievalMode?: SubagentLaunchRequest["retrievalMode"]
	structuredDelegation?: boolean
}

export interface LaunchBackgroundSubagentParams {
	parentTaskId: string
	parentTask?: Task
	message: string
	initialTodos: TodoItem[]
	mode: string
	isolation?: "auto" | "shared" | "worktree"
	helperProfile?: string
	profileClass?: "strong" | "balanced" | "cheap" | "none"
	routingSource?: "explicit" | "recommended" | "default"
	recommendationReasonCode?: string
	goal?: string
	doneWhen?: string
	constraints?: string[]
	deliverable?: string
	acceptanceCriteria?: string[]
	inputs?: NonNullable<SubagentHandoff["inputs"]>
	evidenceNeeded?: boolean
	budget?: { maxTokens?: number; maxSteps?: number; maxCostUsd?: number }
	canAbstain?: boolean
	priorResultSummary?: string
	strategy?: "direct" | "sequential"
	expectedArtifact?: string
	role?: string
	permissions?: string[]
	retryBudget?: number
	retrievalPackId?: string
	taskIntent?: SubagentLaunchRequest["taskIntent"]
	retrievalMode?: SubagentLaunchRequest["retrievalMode"]
	structuredDelegation?: boolean
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
	deleteBackgroundRootTaskStack?(rootTaskId: string): void
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
	private readonly conversationWindowBuilder = new ConversationWindowBuilder()

	constructor(private readonly runtime: SubagentDelegationRuntime) {}

	public async delegateParentAndOpenChild(params: DelegateParentAndOpenChildParams): Promise<Task> {
		const { parentTaskId, message, initialTodos, mode, execution, isolation } = params
		if (execution === "background") {
			const launched = await this.launchBackgroundSubagent({
				parentTaskId,
				parentTask: params.parentTask,
				message,
				initialTodos,
				mode,
				isolation,
				helperProfile: params.helperProfile,
				profileClass: params.profileClass ?? (params.helperProfile ? "cheap" : "none"),
				routingSource: params.routingSource,
				recommendationReasonCode: params.recommendationReasonCode,
				goal: params.goal,
				doneWhen: params.doneWhen,
				constraints: params.constraints,
				deliverable: params.deliverable,
				acceptanceCriteria: params.acceptanceCriteria,
				inputs: params.inputs,
				evidenceNeeded: params.evidenceNeeded,
				budget: params.budget,
				canAbstain: params.canAbstain,
				priorResultSummary: params.priorResultSummary,
				strategy: params.strategy,
				expectedArtifact: params.expectedArtifact,
				role: params.role,
				permissions: params.permissions,
				retryBudget: params.retryBudget,
				retrievalPackId: params.retrievalPackId,
				taskIntent: params.taskIntent,
				retrievalMode: params.retrievalMode,
				structuredDelegation: params.structuredDelegation,
			})
			if (launched) {
				return launched
			}
		}

		const { parent, parentStackBeforeDelegation, parentRootTaskIdBeforeDelegation } =
			this.resolveForegroundParentContext({
				parentTaskId,
				parentTask: params.parentTask,
			})
		const nextDelegationDepth = this.getNextDelegationDepth(parent)
		if (
			parentRootTaskIdBeforeDelegation &&
			parentStackBeforeDelegation.length > 0 &&
			!this.runtime.hasBackgroundRootTaskStack(parentRootTaskIdBeforeDelegation)
		) {
			this.runtime.setBackgroundRootTaskStack(parentRootTaskIdBeforeDelegation, [...parentStackBeforeDelegation])
		}
		const handoff = this.buildHandoffPayload({
			message,
			initialTodos,
			goal: params.goal,
			doneWhen: params.doneWhen,
			constraints: params.constraints,
			deliverable: params.deliverable,
			acceptanceCriteria: params.acceptanceCriteria,
			inputs: params.inputs,
			evidenceNeeded: params.evidenceNeeded,
			budget: params.budget,
			canAbstain: params.canAbstain,
			priorResultSummary: params.priorResultSummary,
			strategy: params.strategy,
		})

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

		let child: Task
		try {
			child = await this.runtime.createTask(message, undefined, parent, {
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
					...(params.retrievalMode ? { retrievalPolicy: params.retrievalMode } : {}),
				},
				initialStatus: "active",
			})
		} catch (error) {
			this.restoreForegroundParentAfterFailedDelegation(
				parentRootTaskIdBeforeDelegation,
				parentStackBeforeDelegation,
			)
			throw error
		}

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
			handoff,
			taskIntent: params.taskIntent,
			retrievalMode: params.retrievalMode,
			structuredDelegation: params.structuredDelegation,
		})

		TelemetryService.instance.captureTaskOutcomeDelegated(parentTaskId, {
			childTaskId: child.taskId,
			execution: execution === "background" ? "background" : "foreground",
			delegationDepth: nextDelegationDepth,
			isBackground: execution === "background",
			source: params.routingSource,
			reason: params.recommendationReasonCode,
			helperProfile: params.helperProfile,
			profileClass: params.profileClass,
		})
		TelemetryService.instance.captureDelegationHandoffUsed(
			parentTaskId,
			child.taskId,
			handoff.strategy ?? "sequential",
			handoff.canAbstain ?? false,
		)
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
		const parent = this.resolveBackgroundParent(params.parentTaskId, params.parentTask)
		const coordinator = this.runtime.getSubagentCoordinator()
		if (!parent || !coordinator) {
			return undefined
		}

		const nextDelegationDepth = this.getNextDelegationDepth(parent)
		const parentRootTaskId = this.resolveRootTaskId(parent)
		const preflightRequest = this.buildBackgroundLaunchRequest({
			parentTaskId: params.parentTaskId,
			parentTask: parent,
			rootTaskId: parentRootTaskId,
			message: params.message,
			initialTodos: params.initialTodos,
			mode: params.mode,
			isolation: params.isolation,
			helperProfile: params.helperProfile,
			profileClass: params.profileClass,
			routingSource: params.routingSource,
			recommendationReasonCode: params.recommendationReasonCode,
			goal: params.goal,
			doneWhen: params.doneWhen,
			constraints: params.constraints,
			deliverable: params.deliverable,
			acceptanceCriteria: params.acceptanceCriteria,
			inputs: params.inputs,
			evidenceNeeded: params.evidenceNeeded,
			budget: params.budget,
			canAbstain: params.canAbstain,
			priorResultSummary: params.priorResultSummary,
			strategy: params.strategy,
			expectedArtifact: params.expectedArtifact,
			role: params.role,
			permissions: params.permissions,
			retryBudget: params.retryBudget,
			retrievalPackId: params.retrievalPackId,
			taskIntent: params.taskIntent,
			retrievalMode: params.retrievalMode,
			structuredDelegation: params.structuredDelegation,
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
				...(params.retrievalMode ? { retrievalPolicy: params.retrievalMode } : {}),
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

		const launchRequest = this.buildBackgroundLaunchRequest({
			parentTaskId: params.parentTaskId,
			parentTask: parent,
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
			goal: params.goal,
			doneWhen: params.doneWhen,
			constraints: params.constraints,
			deliverable: params.deliverable,
			acceptanceCriteria: params.acceptanceCriteria,
			inputs: params.inputs,
			evidenceNeeded: params.evidenceNeeded,
			budget: params.budget,
			canAbstain: params.canAbstain,
			priorResultSummary: params.priorResultSummary,
			strategy: params.strategy,
			expectedArtifact: params.expectedArtifact,
			role: params.role,
			permissions: params.permissions,
			retryBudget: params.retryBudget,
			retrievalPackId: params.retrievalPackId,
			taskIntent: params.taskIntent,
			retrievalMode: params.retrievalMode,
			structuredDelegation: params.structuredDelegation,
		})
		let outcome: { mode: "background" | "foreground"; childTaskId: string }
		try {
			outcome = await coordinator.launch(launchRequest)
		} catch (error) {
			this.runtime.log(
				`[launchBackgroundSubagent] Background launch failed for ${child.taskId}: ${error instanceof Error ? error.message : String(error)}`,
			)
			await this.rollbackBackgroundLaunchFailure({
				parent,
				child,
				parentRootTaskId,
				reason: error instanceof Error ? error.message : String(error),
			})
			return undefined
		}
		if (outcome.mode === "foreground") {
			await this.rollbackBackgroundLaunchFailure({
				parent,
				child,
				parentRootTaskId,
				reason: "coordinator returned foreground fallback after background preflight",
			})
			return undefined
		}

		await this.persistBackgroundDelegationMetadata({
			parentTaskId: params.parentTaskId,
			parentDelegationDepth: parent.delegationDepth,
			childTaskId: child.taskId,
			handoff: launchRequest.handoff,
			taskIntent: params.taskIntent,
			retrievalMode: params.retrievalMode,
			structuredDelegation: params.structuredDelegation,
		})

		TelemetryService.instance.captureTaskOutcomeDelegated(params.parentTaskId, {
			childTaskId: child.taskId,
			execution: "background",
			delegationDepth: nextDelegationDepth,
			isBackground: true,
			source: params.routingSource,
			reason: params.recommendationReasonCode,
			helperProfile: params.helperProfile,
			profileClass: params.profileClass,
		})
		TelemetryService.instance.captureDelegationHandoffUsed(
			params.parentTaskId,
			child.taskId,
			launchRequest.handoff.strategy ?? "sequential",
			launchRequest.handoff.canAbstain ?? false,
		)
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

	private resolveForegroundParentContext(params: { parentTaskId: string; parentTask?: Task }): {
		parent: Task
		parentStackBeforeDelegation: Task[]
		parentRootTaskIdBeforeDelegation: string | undefined
	} {
		const currentParent = this.runtime.getCurrentTask()
		const currentStack = this.runtime.getCurrentStack()
		if (currentParent?.taskId === params.parentTaskId) {
			return {
				parent: currentParent,
				parentStackBeforeDelegation: currentStack,
				parentRootTaskIdBeforeDelegation:
					this.runtime.getRootTaskIdForStack(currentStack) ?? this.resolveRootTaskId(currentParent),
			}
		}

		if (params.parentTask?.taskId === params.parentTaskId) {
			const parentStackBeforeDelegation = currentStack.some((task) => task.taskId === params.parentTask!.taskId)
				? currentStack
				: [params.parentTask]
			return {
				parent: params.parentTask,
				parentStackBeforeDelegation,
				parentRootTaskIdBeforeDelegation:
					this.runtime.getRootTaskIdForStack(parentStackBeforeDelegation) ??
					this.resolveRootTaskId(params.parentTask),
			}
		}

		if (!currentParent) {
			throw new Error("[delegateParentAndOpenChild] No current task")
		}
		throw new Error(
			`[delegateParentAndOpenChild] Parent mismatch: expected ${params.parentTaskId}, current ${currentParent.taskId}`,
		)
	}

	private resolveBackgroundParent(parentTaskId: string, parentTask?: Task): Task | undefined {
		const currentParent = this.runtime.getCurrentTask()
		if (currentParent?.taskId === parentTaskId) {
			return currentParent
		}
		if (parentTask?.taskId === parentTaskId) {
			return parentTask
		}
		return undefined
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

	private restoreForegroundParentAfterFailedDelegation(
		parentRootTaskId: string | undefined,
		parentStackBeforeDelegation: Task[],
	): void {
		if (
			parentRootTaskId &&
			this.runtime.hasBackgroundRootTaskStack(parentRootTaskId) &&
			this.runtime.restoreBackgroundStack(parentRootTaskId)
		) {
			return
		}

		if (parentStackBeforeDelegation.length > 0) {
			this.runtime.setCurrentStack([...parentStackBeforeDelegation])
		}
		this.runtime.setFocusedRootTaskId(parentRootTaskId)
	}

	private async rollbackBackgroundLaunchFailure(params: {
		parent: Task
		child: Task
		parentRootTaskId: string
		reason: string
	}): Promise<void> {
		const childRootTaskId = this.resolveRootTaskId(params.child)
		if (childRootTaskId) {
			this.runtime.deleteBackgroundRootTaskStack?.(childRootTaskId)
		}

		this.runtime.setCurrentStack([params.parent])
		this.runtime.setFocusedRootTaskId(params.parentRootTaskId)
		if (this.runtime.hasBackgroundRootTaskStack(params.parentRootTaskId)) {
			this.runtime.restoreBackgroundStack(params.parentRootTaskId)
		}

		try {
			const { historyItem } = await this.runtime.getTaskWithId(params.child.taskId)
			await this.runtime.updateTaskHistory({
				...historyItem,
				status: "aborted",
				statusUpdatedAt: Date.now(),
				lifecycleState: "cancelled",
				pauseReason: undefined,
				pausedAt: undefined,
				lastStopSummary: `Background delegation launch failed: ${params.reason}`,
			})
		} catch (error) {
			this.runtime.log(
				`[launchBackgroundSubagent] Failed to rollback child ${params.child.taskId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	private buildBackgroundLaunchRequest(params: {
		parentTaskId: string
		parentTask?: Task
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
		goal?: string
		doneWhen?: string
		constraints?: string[]
		deliverable?: string
		acceptanceCriteria?: string[]
		inputs?: NonNullable<SubagentHandoff["inputs"]>
		evidenceNeeded?: boolean
		budget?: { maxTokens?: number; maxSteps?: number; maxCostUsd?: number }
		canAbstain?: boolean
		priorResultSummary?: string
		strategy?: "direct" | "sequential"
		expectedArtifact?: string
		role?: string
		permissions?: string[]
		retryBudget?: number
		retrievalPackId?: string
		taskIntent?: SubagentLaunchRequest["taskIntent"]
		retrievalMode?: SubagentLaunchRequest["retrievalMode"]
		structuredDelegation?: boolean
	}): SubagentLaunchRequest {
		const parent = params.parentTask ?? this.resolveBackgroundParent(params.parentTaskId)
		const contextLines = this.buildBackgroundHandoffContext(parent)

		const handoff = this.buildHandoffPayload({
			message: params.message,
			initialTodos: params.initialTodos,
			goal: params.goal,
			doneWhen: params.doneWhen,
			constraints: params.constraints,
			deliverable: params.deliverable,
			acceptanceCriteria: params.acceptanceCriteria,
			inputs: params.inputs,
			evidenceNeeded: params.evidenceNeeded,
			budget: params.budget,
			canAbstain: params.canAbstain,
			priorResultSummary: params.priorResultSummary,
			strategy: params.strategy,
		})
		const mergedContext = Array.from(new Set([...contextLines, ...(handoff.context ?? [])]))

		return {
			parentTaskId: params.parentTaskId,
			rootTaskId: params.rootTaskId,
			...(params.targetTaskId ? { targetTaskId: params.targetTaskId } : {}),
			mode: params.mode,
			handoff: {
				...handoff,
				...(mergedContext.length > 0 ? { context: mergedContext } : {}),
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
			...(params.role ? { role: params.role } : {}),
			...(params.permissions ? { permissions: params.permissions } : {}),
			...(params.expectedArtifact ? { expectedArtifact: params.expectedArtifact } : {}),
			...(params.retryBudget !== undefined ? { retryBudget: params.retryBudget } : {}),
			...(params.retrievalPackId ? { retrievalPackId: params.retrievalPackId } : {}),
			...(params.taskIntent ? { taskIntent: params.taskIntent } : {}),
			...(params.retrievalMode ? { retrievalMode: params.retrievalMode } : {}),
			...(params.structuredDelegation ? { structuredDelegation: params.structuredDelegation } : {}),
		}
	}

	private buildBackgroundHandoffContext(parent: Task | undefined): string[] {
		const historyWindow = this.conversationWindowBuilder.build({
			history: parent?.apiConversationHistory,
			maxMessages: 4,
			maxCharsPerMessage: 220,
			maxTotalChars: 700,
		})
		const historyLines = this.conversationWindowBuilder
			.renderHistoryEntries(historyWindow)
			.map((line) => `Recent context: ${line}`)
		return historyLines
	}

	private buildHandoffPayload(params: {
		message: string
		initialTodos: TodoItem[]
		goal?: string
		doneWhen?: string
		constraints?: string[]
		deliverable?: string
		acceptanceCriteria?: string[]
		inputs?: NonNullable<SubagentHandoff["inputs"]>
		evidenceNeeded?: boolean
		budget?: { maxTokens?: number; maxSteps?: number; maxCostUsd?: number }
		canAbstain?: boolean
		priorResultSummary?: string
		strategy?: "direct" | "sequential"
	}): SubagentHandoff {
		return {
			summary: params.message,
			context: params.initialTodos.map((todo) => `- ${todo.content}`),
			goal: params.goal ?? params.message,
			doneWhen: params.doneWhen ?? "Return a concise, source-backed summary to the parent task.",
			constraints: params.constraints,
			deliverable: params.deliverable,
			acceptanceCriteria: params.acceptanceCriteria,
			inputs: params.inputs,
			evidenceNeeded: params.evidenceNeeded,
			budget: params.budget,
			canAbstain: params.canAbstain ?? true,
			priorResultSummary: params.priorResultSummary,
			strategy: params.strategy ?? "sequential",
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
		handoff: SubagentHandoff
		taskIntent?: SubagentLaunchRequest["taskIntent"]
		retrievalMode?: SubagentLaunchRequest["retrievalMode"]
		structuredDelegation?: boolean
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
					...(params.taskIntent ? { taskIntent: params.taskIntent } : {}),
					...(params.retrievalMode ? { retrievalMode: params.retrievalMode } : {}),
					...(params.structuredDelegation ? { structuredDelegation: params.structuredDelegation } : {}),
					strategy: params.handoff.strategy,
					canAbstain: params.handoff.canAbstain,
					...(buildBudgetSummary(params.handoff.budget)
						? { budgetSummary: buildBudgetSummary(params.handoff.budget) }
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
		handoff: SubagentHandoff
		taskIntent?: SubagentLaunchRequest["taskIntent"]
		retrievalMode?: SubagentLaunchRequest["retrievalMode"]
		structuredDelegation?: boolean
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
		const timestamp = Date.now()
		await this.runtime.publishActivity(params.parentTaskId, {
			kind: "subagent",
			id: `subagent-${params.childTaskId}-${timestamp}`,
			taskId: params.childTaskId,
			sessionId: params.childTaskId,
			status: "queued",
			summary: `Background subagent ${params.childTaskId} queued from ${params.parentTaskId}`,
			explainability: {
				stage: "delegation",
				reasonCode: "background_subagent_selected",
				execution: "background",
				...(params.taskIntent ? { taskIntent: params.taskIntent } : {}),
				...(params.retrievalMode ? { retrievalMode: params.retrievalMode } : {}),
				...(params.structuredDelegation ? { structuredDelegation: params.structuredDelegation } : {}),
				strategy: params.handoff.strategy,
				canAbstain: params.handoff.canAbstain,
				...(buildBudgetSummary(params.handoff.budget)
					? { budgetSummary: buildBudgetSummary(params.handoff.budget) }
					: {}),
			},
			timestamp,
		})
	}
}

function buildBudgetSummary(budget?: {
	maxTokens?: number
	maxSteps?: number
	maxCostUsd?: number
}): string | undefined {
	if (!budget) {
		return undefined
	}
	const parts = [
		typeof budget.maxTokens === "number" ? `tokens:${budget.maxTokens}` : undefined,
		typeof budget.maxSteps === "number" ? `steps:${budget.maxSteps}` : undefined,
		typeof budget.maxCostUsd === "number" ? `cost:${budget.maxCostUsd}` : undefined,
	].filter(Boolean)
	return parts.length > 0 ? parts.join(",") : undefined
}
