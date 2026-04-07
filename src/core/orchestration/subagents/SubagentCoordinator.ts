import type {
	ActivityItem,
	SubagentLaunchRequest,
	SubagentRelayEnvelope,
	SubagentResultEvent,
	SubagentStatusEvent,
} from "@roo-code/types"

import { TelemetryService } from "@roo-code/telemetry"

import type { ClineProvider } from "../../webview/ClineProvider"
import { MemoryPromotionService } from "../../../services/alfa-code"
import { publishOrchestrationActivity } from "../events/publish"
import type {
	ActiveSubagentBinding,
	SubagentBridge,
	SubagentControlOutcome,
	SubagentLaunchOutcome,
	TaskRelayInput,
	TaskRelayOutcome,
	TaskRelayRegistration,
} from "./types"

export interface SubagentCoordinatorOptions {
	memoryPromotionService?: MemoryPromotionService
}

const COMPLETION_RESULT_GRACE_MS = 1500

// kilocode_change - new file
export class SubagentCoordinator {
	private readonly bindingsByTaskId = new Map<string, ActiveSubagentBinding>()
	private readonly bindingsBySessionId = new Map<string, ActiveSubagentBinding>()
	private readonly relayRegistrationsByTaskId = new Map<string, TaskRelayRegistration>()
	private readonly disposers: Array<() => void> = []
	private readonly completedSessionIds = new Set<string>()
	private readonly pendingCompletionFallbacks = new Map<string, ReturnType<typeof setTimeout>>()
	private readonly memoryPromotionService: MemoryPromotionService

	constructor(
		private readonly provider: ClineProvider,
		private readonly bridge: SubagentBridge,
		options: SubagentCoordinatorOptions = {},
	) {
		this.memoryPromotionService = options.memoryPromotionService ?? new MemoryPromotionService()
		this.restoreBindingsFromBridge()
		this.disposers.push(this.bridge.onStatus((event) => void this.handleStatusEvent(event)))
		this.disposers.push(this.bridge.onResult((event) => void this.handleResultEvent(event)))
	}

	public dispose(): void {
		for (const dispose of this.disposers.splice(0)) {
			dispose()
		}
		for (const timer of this.pendingCompletionFallbacks.values()) {
			clearTimeout(timer)
		}
		this.pendingCompletionFallbacks.clear()
		this.bindingsByTaskId.clear()
		this.bindingsBySessionId.clear()
		this.relayRegistrationsByTaskId.clear()
	}

	public getBindingForTask(taskId: string): ActiveSubagentBinding | undefined {
		return this.bindingsByTaskId.get(taskId)
	}

	// kilocode_change start
	public registerTaskRelay(registration: TaskRelayRegistration): void {
		this.relayRegistrationsByTaskId.set(registration.taskId, registration)
	}

	public unregisterTaskRelay(taskId: string): void {
		this.relayRegistrationsByTaskId.delete(taskId)
	}

	public getTaskRelayRegistration(taskId: string): TaskRelayRegistration | undefined {
		return this.relayRegistrationsByTaskId.get(taskId)
	}

	public async relay(envelopeInput: TaskRelayInput): Promise<TaskRelayOutcome> {
		const source = this.relayRegistrationsByTaskId.get(envelopeInput.fromTaskId)
		const envelope = {
			...envelopeInput,
			timestamp: Date.now(),
			requiresParentVisibility: envelopeInput.kind === "parent",
		} as SubagentRelayEnvelope

		if (!source || source.rootTaskId !== envelope.rootTaskId) {
			return this.blockRelay(envelope, [], "source_root_mismatch")
		}

		const recipients = this.resolveRelayRecipients(source, envelope)
		if (recipients.status === "blocked") {
			return recipients
		}

		if (this.bridge.relay) {
			await this.bridge.relay({ envelope, recipientTaskIds: recipients.recipientTaskIds })
		}

		this.appendRelayActivity(
			recipients.recipientTaskIds[0] ?? source.taskId,
			envelope,
			"delivered",
			this.buildRelaySummary(envelope, recipients.recipientTaskIds),
		)
		return recipients
	}
	// kilocode_change end

	public hasCapacity(request: SubagentLaunchRequest): boolean {
		return this.bridge.hasCapacity(request)
	}

	public async launch(request: SubagentLaunchRequest): Promise<SubagentLaunchOutcome> {
		if (!this.hasCapacity(request)) {
			return {
				mode: "foreground",
				childTaskId: request.targetTaskId || request.parentTaskId,
				status: "running",
				fallbackReason: "capacity_exhausted",
			}
		}

		const launched = await this.bridge.launch(request)
		const timestamp = Date.now()
		const binding: ActiveSubagentBinding = {
			request,
			parentTaskId: request.parentTaskId,
			childTaskId: launched.taskId,
			sessionId: launched.sessionId,
			fallbackToForeground: false,
			status: launched.status,
			createdAt: timestamp,
			updatedAt: timestamp,
		}

		this.bindingsByTaskId.set(binding.childTaskId, binding)
		this.bindingsBySessionId.set(binding.sessionId, binding)
		this.completedSessionIds.delete(binding.sessionId)
		this.registerTaskRelay({
			taskId: binding.childTaskId,
			rootTaskId: request.rootTaskId,
			parentTaskId: request.parentTaskId,
			groupId: request.rootTaskId,
			relayPolicy: request.relayPolicy,
			sessionId: binding.sessionId,
		})
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			this.toActivityStatus(binding.status),
			binding.status === "queued" ? "Background subagent queued" : "Background subagent started",
			{
				stage: "delegation",
				reasonCode:
					request.routingReasonCode ?? request.recommendationReasonCode ?? "background_subagent_selected",
				...(request.routingSource ? { source: request.routingSource } : {}),
				mode: request.mode,
				execution: request.execution,
				...(request.profileClass ? { profileClass: request.profileClass } : {}),
				...(request.helperProfile ? { helperProfile: request.helperProfile } : {}),
				...(request.recommendationReasonCode
					? { recommendationReasonCode: request.recommendationReasonCode }
					: {}),
			},
		)

		return {
			mode: "background",
			childTaskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status === "running" ? "running" : "queued",
		}
	}

	public async cancel(taskId: string): Promise<SubagentControlOutcome | undefined> {
		const binding = this.bindingsByTaskId.get(taskId)
		if (!binding) {
			return undefined
		}

		await this.bridge.cancel(binding.sessionId)
		this.completedSessionIds.add(binding.sessionId)
		binding.status = "cancelled"
		binding.updatedAt = Date.now()
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			"cancelled",
			"Background subagent cancelled",
		)
		this.bindingsByTaskId.delete(binding.childTaskId)
		this.bindingsBySessionId.delete(binding.sessionId)
		this.unregisterTaskRelay(binding.childTaskId)

		return {
			taskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status,
		}
	}

	public async pause(taskId: string): Promise<SubagentControlOutcome | undefined> {
		const binding = this.bindingsByTaskId.get(taskId)
		if (!binding) {
			return undefined
		}

		if (this.bridge.pause) {
			await this.bridge.pause(binding.sessionId)
		}

		binding.status = "paused"
		binding.updatedAt = Date.now()
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			"paused",
			"Background subagent paused",
		)

		return {
			taskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status,
		}
	}

	public async resume(taskId: string): Promise<SubagentControlOutcome | undefined> {
		const binding = this.bindingsByTaskId.get(taskId)
		if (!binding) {
			return undefined
		}

		if (this.bridge.resume) {
			await this.bridge.resume(binding.sessionId)
		}

		binding.status = "running"
		binding.updatedAt = Date.now()
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			"running",
			"Background subagent resumed",
		)

		return {
			taskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status,
		}
	}

	private restoreBindingsFromBridge(): void {
		if (!this.bridge.listBindings) {
			return
		}

		for (const restored of this.bridge.listBindings()) {
			const binding: ActiveSubagentBinding = {
				request: restored.request,
				parentTaskId: restored.parentTaskId,
				childTaskId: restored.childTaskId,
				sessionId: restored.sessionId,
				fallbackToForeground: false,
				status: restored.status,
				createdAt: restored.updatedAt,
				updatedAt: restored.updatedAt,
			}

			this.bindingsByTaskId.set(binding.childTaskId, binding)
			this.bindingsBySessionId.set(binding.sessionId, binding)
			this.registerTaskRelay({
				taskId: binding.childTaskId,
				rootTaskId: restored.request.rootTaskId,
				parentTaskId: restored.request.parentTaskId,
				groupId: restored.request.rootTaskId,
				relayPolicy: restored.request.relayPolicy,
				sessionId: binding.sessionId,
			})

			if (restored.status === "completed") {
				this.scheduleCompletionFallback(
					binding,
					restored.updatedAt,
					this.buildCompletionFallbackSummary(binding),
				)
				continue
			}

			if (restored.status === "failed" || restored.status === "cancelled" || restored.status === "abstained") {
				const recoveredTerminalStatus = restored.status
				queueMicrotask(() => {
					void this.finalizeBindingOutcome(binding, {
						status: recoveredTerminalStatus,
						timestamp: restored.updatedAt,
						activitySummary: this.getDefaultSubagentSummary(recoveredTerminalStatus),
						parentSummary: this.getDefaultSubagentSummary(recoveredTerminalStatus),
						source: "recovery",
					})
				})
			}
		}
	}

	private async handleStatusEvent(event: SubagentStatusEvent): Promise<void> {
		if (this.completedSessionIds.has(event.sessionId)) {
			return
		}

		const binding = this.bindingsBySessionId.get(event.sessionId)
		if (!binding) {
			return
		}

		const statusSummary = event.message || this.getDefaultSubagentSummary(event.state)

		if (event.state === "completed") {
			binding.status = event.state
			binding.updatedAt = event.timestamp
			this.scheduleCompletionFallback(
				binding,
				event.timestamp,
				this.buildCompletionFallbackSummary(binding, statusSummary),
			)
			return
		}

		this.clearPendingCompletionFallback(event.sessionId)

		if (this.isTerminalStatusEventState(event.state)) {
			await this.finalizeBindingOutcome(binding, {
				status: event.state,
				timestamp: event.timestamp,
				activitySummary: statusSummary,
				parentSummary: statusSummary,
				source: "status",
			})
			return
		}

		binding.status = event.state
		binding.updatedAt = event.timestamp
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			this.toActivityStatus(event.state),
			statusSummary,
			{
				stage: "status",
				reasonCode: `subagent_${event.state}`,
				source: "status",
				mode: binding.request.mode,
				execution: binding.request.execution,
				...(binding.request.profileClass ? { profileClass: binding.request.profileClass } : {}),
				...(binding.request.helperProfile ? { helperProfile: binding.request.helperProfile } : {}),
				...(binding.request.recommendationReasonCode
					? { recommendationReasonCode: binding.request.recommendationReasonCode }
					: {}),
				outcomeSummary: statusSummary,
			},
		)
	}

	private async handleResultEvent(event: SubagentResultEvent): Promise<void> {
		if (this.completedSessionIds.has(event.sessionId)) {
			return
		}

		const binding = this.bindingsBySessionId.get(event.sessionId)
		if (!binding) {
			return
		}

		this.clearPendingCompletionFallback(event.sessionId)

		const outcomeSummary = this.getDefaultSubagentSummary(event.status)
		let completionResultSummary = event.summary || event.output || outcomeSummary
		let evaluatorVerdict: "pass" | "retry" | "clarify" | "conflict" | undefined
		let validatorPolicy: string | undefined

		if (event.status === "completed") {
			const evaluation = await this.maybeEvaluateStructuredDelegationOutcome(binding, completionResultSummary)
			completionResultSummary = evaluation.summary
			evaluatorVerdict = evaluation.verdict
			validatorPolicy = evaluation.validatorPolicy
		}

		await this.finalizeBindingOutcome(binding, {
			status: event.status,
			timestamp: event.timestamp,
			activitySummary: outcomeSummary,
			parentSummary: completionResultSummary,
			source: "result",
			...(evaluatorVerdict ? { evaluatorVerdict } : {}),
			...(validatorPolicy ? { validatorPolicy } : {}),
		})

		if (event.status === "completed") {
			await this.maybePromoteStructuredDelegationMemory(binding, {
				summary: completionResultSummary,
				evaluatorVerdict,
			})
		}
	}

	private isTerminalStatusEventState(
		state: SubagentStatusEvent["state"],
	): state is "failed" | "cancelled" | "abstained" {
		return state === "failed" || state === "cancelled" || state === "abstained"
	}

	private isTerminalBindingStatus(
		state: SubagentStatusEvent["state"],
	): state is "completed" | "failed" | "cancelled" | "abstained" {
		return state === "completed" || state === "failed" || state === "cancelled" || state === "abstained"
	}

	private scheduleCompletionFallback(
		binding: ActiveSubagentBinding,
		timestamp: number,
		parentSummary: string,
		delayMs: number = COMPLETION_RESULT_GRACE_MS,
	): void {
		this.clearPendingCompletionFallback(binding.sessionId)
		const timer = setTimeout(() => {
			this.pendingCompletionFallbacks.delete(binding.sessionId)
			const currentBinding = this.bindingsBySessionId.get(binding.sessionId)
			if (!currentBinding || this.completedSessionIds.has(binding.sessionId)) {
				return
			}

			void this.finalizeBindingOutcome(currentBinding, {
				status: "completed",
				timestamp: Math.max(timestamp, Date.now()),
				activitySummary: this.getDefaultSubagentSummary("completed"),
				parentSummary,
				source: "status",
			})
		}, delayMs)
		this.pendingCompletionFallbacks.set(binding.sessionId, timer)
	}

	private clearPendingCompletionFallback(sessionId: string): void {
		const timer = this.pendingCompletionFallbacks.get(sessionId)
		if (!timer) {
			return
		}

		clearTimeout(timer)
		this.pendingCompletionFallbacks.delete(sessionId)
	}

	private buildCompletionFallbackSummary(binding: ActiveSubagentBinding, statusSummary?: string): string {
		const baseSummary = statusSummary?.trim() || this.getDefaultSubagentSummary("completed")
		return `${baseSummary}. Explicit result payload was not received for ${binding.childTaskId}; inspect the child task history if more detail is required.`
	}

	private async releaseBinding(sessionId: string): Promise<void> {
		if (!this.bridge.release) {
			return
		}

		try {
			await this.bridge.release(sessionId)
		} catch (error) {
			this.provider.log(
				`[SubagentCoordinator] Failed to release background binding ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	private async finalizeBindingOutcome(
		binding: ActiveSubagentBinding,
		params: {
			status:
				| SubagentResultEvent["status"]
				| Extract<SubagentStatusEvent["state"], "failed" | "cancelled" | "abstained">
			timestamp: number
			activitySummary: string
			parentSummary: string
			source: "status" | "result" | "recovery"
			evaluatorVerdict?: "pass" | "retry" | "clarify" | "conflict"
			validatorPolicy?: string
		},
	): Promise<void> {
		if (this.completedSessionIds.has(binding.sessionId)) {
			return
		}

		this.completedSessionIds.add(binding.sessionId)
		this.clearPendingCompletionFallback(binding.sessionId)
		binding.status = params.status
		binding.updatedAt = params.timestamp
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			this.toActivityStatus(params.status),
			params.activitySummary,
			{
				stage: "outcome",
				reasonCode: `subagent_${params.status}`,
				source: params.source === "recovery" ? "status" : params.source,
				mode: binding.request.mode,
				execution: binding.request.execution,
				...(binding.request.profileClass ? { profileClass: binding.request.profileClass } : {}),
				...(binding.request.helperProfile ? { helperProfile: binding.request.helperProfile } : {}),
				...(binding.request.recommendationReasonCode
					? { recommendationReasonCode: binding.request.recommendationReasonCode }
					: {}),
				outcomeSummary: params.activitySummary,
				...(params.evaluatorVerdict ? { lastSubagentOutcome: params.evaluatorVerdict } : {}),
				...(params.validatorPolicy ? { validatorPolicy: params.validatorPolicy } : {}),
			},
		)

		if (params.status === "abstained" && TelemetryService.hasInstance()) {
			TelemetryService.instance.captureDelegationAbstained(
				binding.parentTaskId,
				binding.childTaskId,
				params.parentSummary,
			)
		}

		try {
			if (
				params.status === "completed" ||
				params.status === "abstained" ||
				params.status === "failed" ||
				params.status === "cancelled"
			) {
				await this.provider.reopenParentFromDelegation({
					parentTaskId: binding.parentTaskId,
					childTaskId: binding.childTaskId,
					completionResultSummary: params.parentSummary,
					preserveParentFocus: true,
					outcomeStatus: params.status,
					...(params.evaluatorVerdict ? { evaluatorVerdict: params.evaluatorVerdict } : {}),
				})
			}
		} catch (error) {
			this.provider.log(
				`[SubagentCoordinator] Failed to reconcile terminal subagent ${binding.childTaskId} (${params.status}): ${error instanceof Error ? error.message : String(error)}`,
			)
		} finally {
			this.bindingsByTaskId.delete(binding.childTaskId)
			this.bindingsBySessionId.delete(binding.sessionId)
			this.unregisterTaskRelay(binding.childTaskId)
			await this.releaseBinding(binding.sessionId)
		}
	}

	private async maybePromoteStructuredDelegationMemory(
		binding: ActiveSubagentBinding,
		params: {
			summary: string
			evaluatorVerdict?: "pass" | "retry" | "clarify" | "conflict"
		},
	): Promise<void> {
		let memoryPromotionEnabled = false
		try {
			memoryPromotionEnabled = (await this.provider.getState()).memoryPromotionEnabled === true
		} catch {
			memoryPromotionEnabled = false
		}

		if (
			!memoryPromotionEnabled ||
			binding.request.execution !== "background" ||
			binding.request.structuredDelegation !== true
		) {
			return
		}

		let workspacePath = this.provider.cwd
		try {
			const { historyItem } = await this.provider.getTaskWithId(binding.childTaskId, false)
			workspacePath = historyItem.workspace || this.provider.cwd
		} catch {
			workspacePath = this.provider.cwd
		}

		try {
			const result = await this.memoryPromotionService.promoteFromStructuredDelegation({
				taskId: binding.childTaskId,
				parentTaskId: binding.parentTaskId,
				workspacePath,
				summary: params.summary,
				evaluatorVerdict: params.evaluatorVerdict,
				acceptanceCriteria: binding.request.handoff.acceptanceCriteria,
				inputs: binding.request.handoff.inputs,
				evidenceNeeded: binding.request.handoff.evidenceNeeded,
				taskIntent: binding.request.taskIntent,
				retrievalMode: binding.request.retrievalMode,
			})
			const targetSuffix = result.targetPath ? ` -> ${result.targetPath}` : ""
			this.provider.log(
				`[MemoryPromotion] ${binding.childTaskId}: ${result.status}/${result.reason}${targetSuffix}`,
			)
		} catch (error) {
			this.provider.log(
				`[MemoryPromotion] Failed for ${binding.childTaskId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
	private async maybeEvaluateStructuredDelegationOutcome(
		binding: ActiveSubagentBinding,
		completionResultSummary: string,
	): Promise<{
		summary: string
		verdict?: "pass" | "retry" | "clarify" | "conflict"
		validatorPolicy?: string
	}> {
		let evaluatorEnabled = false
		try {
			evaluatorEnabled = (await this.provider.getState()).evaluatorPassEnabled === true
		} catch {
			evaluatorEnabled = false
		}

		if (
			!evaluatorEnabled ||
			binding.request.execution !== "background" ||
			binding.request.structuredDelegation !== true
		) {
			return { summary: completionResultSummary }
		}

		const acceptanceCriteria = binding.request.handoff.acceptanceCriteria?.filter(
			(item): item is string => item.trim().length > 0,
		)
		if (!acceptanceCriteria?.length) {
			return { summary: completionResultSummary }
		}

		const normalizedSummary = completionResultSummary.trim()
		const lowerSummary = normalizedSummary.toLowerCase()
		const missingCriteria = acceptanceCriteria.filter(
			(criterion) => !this.acceptanceCriterionIsSatisfied(lowerSummary, criterion),
		)
		const hasEvidence = this.hasEvidenceMarkers(normalizedSummary)
		const evidenceNeeded = binding.request.handoff.evidenceNeeded === true
		const conflictMarkers = [
			"conflict",
			"contradict",
			"incompatible",
			"mutually exclusive",
			"trade-off",
			"tradeoff",
		]
		const clarifyMarkers = [
			"clarify",
			"unclear",
			"ambiguous",
			"need more context",
			"missing context",
			"insufficient context",
			"need clarification",
		]

		let verdict: "pass" | "retry" | "clarify" | "conflict"
		if (conflictMarkers.some((marker) => lowerSummary.includes(marker))) {
			verdict = "conflict"
		} else if (
			clarifyMarkers.some((marker) => lowerSummary.includes(marker)) ||
			(normalizedSummary.length < 80 && missingCriteria.length === acceptanceCriteria.length)
		) {
			verdict = "clarify"
		} else if (missingCriteria.length > 0 || (evidenceNeeded && !hasEvidence)) {
			verdict = "retry"
		} else {
			verdict = "pass"
		}

		const evaluatorNote = this.buildEvaluatorNote({
			verdict,
			missingCriteria,
			evidenceNeeded,
			hasEvidence,
		})
		const evaluationLines = [`Evaluator verdict: ${verdict}`]
		if (evaluatorNote) {
			evaluationLines.push(`Evaluator note: ${evaluatorNote}`)
		}

		return {
			summary: normalizedSummary
				? `${normalizedSummary}\n\n${evaluationLines.join("\n")}`
				: evaluationLines.join("\n"),
			verdict,
			validatorPolicy: "structured_delegation_v1",
		}
	}

	private acceptanceCriterionIsSatisfied(summary: string, criterion: string): boolean {
		const normalizedCriterion = criterion.trim().toLowerCase()
		if (!normalizedCriterion) {
			return true
		}

		if (summary.includes(normalizedCriterion)) {
			return true
		}

		const tokens = this.extractCriterionTokens(normalizedCriterion)
		if (tokens.length === 0) {
			return false
		}

		const matchedCount = tokens.filter((token) => summary.includes(token)).length
		const requiredMatches = tokens.length <= 2 ? 1 : Math.min(2, Math.ceil(tokens.length / 2))
		return matchedCount >= requiredMatches
	}

	private extractCriterionTokens(text: string): string[] {
		const stopWords = new Set([
			"with",
			"that",
			"this",
			"from",
			"have",
			"into",
			"using",
			"need",
			"must",
			"should",
			"then",
			"them",
			"they",
			"your",
		])

		return Array.from(
			new Set(
				text
					.split(/[^a-z0-9_./-]+/i)
					.map((token) => token.trim())
					.filter((token) => token.length >= 4 || /\d/.test(token))
					.filter((token) => !stopWords.has(token)),
			),
		)
	}

	private hasEvidenceMarkers(summary: string): boolean {
		return /`[^`]+`/.test(summary) || /\b[\w./-]+\.[a-z0-9]+(?::\d+)?\b/i.test(summary) || /^[-*]\s/m.test(summary)
	}

	private buildEvaluatorNote(params: {
		verdict: "pass" | "retry" | "clarify" | "conflict"
		missingCriteria: string[]
		evidenceNeeded: boolean
		hasEvidence: boolean
	}): string | undefined {
		if (params.verdict === "pass") {
			return undefined
		}

		if (params.verdict === "conflict") {
			return "Child summary reported a conflict or incompatible constraint."
		}

		if (params.verdict === "clarify") {
			return "Child summary did not contain enough concrete detail to validate the acceptance criteria."
		}

		const fragments = []
		if (params.missingCriteria.length > 0) {
			fragments.push(`Missing acceptance coverage: ${params.missingCriteria.join("; ")}`)
		}
		if (params.evidenceNeeded && !params.hasEvidence) {
			fragments.push("Required evidence markers were not found in the child summary.")
		}
		return fragments.join(" ") || "Acceptance criteria were not fully satisfied."
	}

	private appendSubagentActivity(
		parentTaskId: string,
		childTaskId: string,
		sessionId: string,
		status: "queued" | "running" | "paused" | "completed" | "failed" | "cancelled" | "abstained",
		summary: string,
		explainability?: Extract<ActivityItem, { kind: "subagent" }>["explainability"],
	): void {
		const timestamp = Date.now()
		void this.publishActivity(parentTaskId, {
			kind: "subagent",
			id: `subagent-${childTaskId}-${timestamp}`,
			taskId: childTaskId,
			sessionId,
			status,
			summary,
			...(explainability ? { explainability } : {}),
			timestamp,
		})
	}

	private async publishActivity(taskId: string, activity: ActivityItem): Promise<void> {
		if (typeof (this.provider as any).recordTaskActivity === "function") {
			await (this.provider as any).recordTaskActivity(taskId, activity)
			return
		}

		await publishOrchestrationActivity({
			taskId,
			activity,
		})
	}

	// kilocode_change start
	private resolveRelayRecipients(source: TaskRelayRegistration, envelope: SubagentRelayEnvelope): TaskRelayOutcome {
		switch (envelope.kind) {
			case "parent": {
				const target = this.relayRegistrationsByTaskId.get(envelope.toTaskId)
				if (!target || target.rootTaskId !== source.rootTaskId) {
					return this.blockRelay(envelope, [], "cross_root_forbidden")
				}
				if (source.parentTaskId !== envelope.toTaskId || source.relayPolicy === "none") {
					return this.blockRelay(envelope, [], "parent_only_forbidden")
				}
				return this.deliverRelay(envelope, [envelope.toTaskId])
			}
			case "task": {
				const target = this.relayRegistrationsByTaskId.get(envelope.toTaskId)
				if (!target || target.rootTaskId !== source.rootTaskId) {
					return this.blockRelay(envelope, [], "cross_root_forbidden")
				}
				if (source.relayPolicy !== "group") {
					return this.blockRelay(envelope, [], "policy_forbidden")
				}
				return this.deliverRelay(envelope, [envelope.toTaskId])
			}
			case "group": {
				if (source.relayPolicy !== "group") {
					return this.blockRelay(envelope, [], "policy_forbidden")
				}
				const recipients = Array.from(this.relayRegistrationsByTaskId.values())
					.filter(
						(registration) =>
							registration.taskId !== envelope.fromTaskId &&
							registration.rootTaskId === source.rootTaskId &&
							registration.groupId === envelope.groupId,
					)
					.map((registration) => registration.taskId)
				return this.deliverRelay(envelope, recipients)
			}
			case "root": {
				if (source.relayPolicy !== "group") {
					return this.blockRelay(envelope, [], "policy_forbidden")
				}
				const recipients = Array.from(this.relayRegistrationsByTaskId.values())
					.filter(
						(registration) =>
							registration.taskId !== envelope.fromTaskId &&
							registration.rootTaskId === source.rootTaskId,
					)
					.map((registration) => registration.taskId)
				return this.deliverRelay(envelope, recipients)
			}
			default:
				return this.blockRelay(envelope, [], "unsupported_kind")
		}
	}

	private deliverRelay(envelope: SubagentRelayEnvelope, recipientTaskIds: string[]): TaskRelayOutcome {
		return {
			status: "delivered",
			envelope,
			recipientTaskIds,
		}
	}

	private blockRelay(envelope: SubagentRelayEnvelope, recipientTaskIds: string[], reason: string): TaskRelayOutcome {
		this.appendRelayActivity(envelope.fromTaskId, envelope, "blocked", `Relay blocked: ${reason}`)
		return {
			status: "blocked",
			envelope,
			recipientTaskIds,
			reason,
		}
	}

	private appendRelayActivity(
		taskId: string,
		envelope: SubagentRelayEnvelope,
		status: "delivered" | "blocked",
		summary: string,
	): void {
		void this.publishActivity(taskId, {
			kind: "relay",
			id: envelope.relayId ?? `relay-${envelope.fromTaskId}-${envelope.timestamp}`,
			taskId,
			rootTaskId: envelope.rootTaskId,
			status,
			envelope,
			summary,
			timestamp: envelope.timestamp,
		})
	}

	private buildRelaySummary(envelope: SubagentRelayEnvelope, recipientTaskIds: string[]): string {
		const targetSummary =
			envelope.kind === "parent"
				? `parent ${envelope.toTaskId}`
				: envelope.kind === "task"
					? `task ${envelope.toTaskId}`
					: envelope.kind === "group"
						? `group ${envelope.groupId}`
						: `root ${envelope.rootTaskId}`
		return `Relay delivered from ${envelope.fromTaskId} to ${targetSummary} (${recipientTaskIds.length} recipients).`
	}
	// kilocode_change end

	private getDefaultSubagentSummary(state: SubagentStatusEvent["state"] | SubagentResultEvent["status"]): string {
		switch (state) {
			case "queued":
			case "starting":
				return "Background subagent queued"
			case "running":
			case "waiting_input":
			case "waiting_approval":
				return "Background subagent running"
			case "paused":
				return "Background subagent paused"
			case "completed":
				return "Background subagent completed"
			case "cancelled":
				return "Background subagent cancelled"
			case "abstained":
				return "Background subagent abstained"
			case "failed":
			default:
				return "Background subagent failed"
		}
	}

	private toActivityStatus(
		state: SubagentStatusEvent["state"] | SubagentResultEvent["status"],
	): "queued" | "running" | "paused" | "completed" | "failed" | "cancelled" | "abstained" {
		switch (state) {
			case "queued":
			case "starting":
				return "queued"
			case "running":
			case "waiting_input":
			case "waiting_approval":
				return "running"
			case "paused":
				return "paused"
			case "completed":
				return "completed"
			case "cancelled":
				return "cancelled"
			case "abstained":
				return "abstained"
			case "failed":
			default:
				return "failed"
		}
	}
}
