// kilocode_change - new file
import type {
	ExecutionDecision,
	RetrievalMode,
	SubagentLaunchRequest,
	ToolBatchRequest,
	ToolCallCandidate,
} from "@roo-code/types"

import {
	defaultRoleForTaskIntent,
	getStructuredDelegationBackgroundRequirements,
	hasStructuredDelegationContent,
	normalizeStructuredDelegation,
} from "../structuredDelegation"
import { enrichToolCallCandidate, isSafeReadOnlyBatchCandidate } from "./toolMetadata"

export interface OrchestrationPolicyInput {
	taskId?: string
	rootTaskId?: string
	userIntent: string
	candidateToolCalls: ToolCallCandidate[]
	hasBackgroundCapacity: boolean
	hasHelperRouting: boolean
	requireStructuredDelegation?: boolean
}

type SubagentLaunchOutcome = {
	request?: SubagentLaunchRequest
	missingRequirements?: string[]
}

const RETRIEVAL_MODES = new Set<RetrievalMode>(["adaptive", "semantic_only", "hybrid", "rerank_heavy"])

function looksLikeIndependentSubgoal(userIntent: string): boolean {
	return /(independent|independently|separately|delegate|background|parallel|subtask|subagent|research)/i.test(
		userIntent,
	)
}

function buildToolBatchRequest(
	input: OrchestrationPolicyInput,
	calls: ToolCallCandidate[],
): ToolBatchRequest | undefined {
	if (!input.taskId) {
		return undefined
	}

	return {
		requestId: `tool-batch-${input.taskId}-${Date.now()}`,
		taskId: input.taskId,
		intent: input.userIntent,
		calls,
	}
}

function normalizeChecklistContext(rawTodos: unknown): string[] | undefined {
	if (typeof rawTodos !== "string") {
		return undefined
	}

	const context = rawTodos
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean)

	return context.length > 0 ? context : undefined
}

function normalizeRetrievalMode(value: unknown): RetrievalMode | undefined {
	if (typeof value !== "string") {
		return undefined
	}
	return RETRIEVAL_MODES.has(value as RetrievalMode) ? (value as RetrievalMode) : undefined
}

function buildSubagentLaunchRequest(
	input: OrchestrationPolicyInput,
	calls: ToolCallCandidate[],
): SubagentLaunchOutcome {
	if (!input.taskId || calls.length !== 1) {
		return {}
	}

	const [candidate] = calls
	if (candidate.tool !== "new_task") {
		return {}
	}

	const argumentsRecord = candidate.arguments ?? {}
	const mode = typeof argumentsRecord.mode === "string" ? argumentsRecord.mode.trim() : ""
	const message = typeof argumentsRecord.message === "string" ? argumentsRecord.message.trim() : ""
	const execution = argumentsRecord.execution === "background" ? "background" : undefined
	const isolation =
		argumentsRecord.isolation === "shared" ||
		argumentsRecord.isolation === "worktree" ||
		argumentsRecord.isolation === "auto"
			? argumentsRecord.isolation
			: "auto"
	const helperProfile =
		typeof argumentsRecord.helperProfile === "string" && argumentsRecord.helperProfile.trim().length > 0
			? argumentsRecord.helperProfile.trim()
			: undefined

	if (!mode || !message || execution !== "background") {
		return {}
	}

	const structuredDelegation = normalizeStructuredDelegation({
		message,
		deliverable: argumentsRecord.deliverable as string | undefined,
		constraints: argumentsRecord.constraints as string | string[] | undefined,
		acceptanceCriteria: argumentsRecord.acceptanceCriteria as string | string[] | undefined,
		inputs: argumentsRecord.inputs as string | Array<{ kind?: string; ref?: string } | string> | undefined,
		evidenceNeeded: argumentsRecord.evidenceNeeded as boolean | string | undefined,
		expectedArtifact: argumentsRecord.expectedArtifact as string | undefined,
		role: argumentsRecord.role as string | undefined,
		retryBudget: argumentsRecord.retryBudget as number | string | undefined,
		retrievalPackId: argumentsRecord.retrievalPackId as string | undefined,
		taskIntent: argumentsRecord.taskIntent as string | undefined,
		permissions: argumentsRecord.permissions as string[] | string | undefined,
	})
	const missingRequirements = input.requireStructuredDelegation
		? getStructuredDelegationBackgroundRequirements(structuredDelegation)
		: []
	if (input.requireStructuredDelegation && missingRequirements.length > 0) {
		return { missingRequirements }
	}

	const role = structuredDelegation.role ?? defaultRoleForTaskIntent(structuredDelegation.taskIntent)
	const structuredDelegationUsed =
		input.requireStructuredDelegation || hasStructuredDelegationContent(structuredDelegation)

	return {
		request: {
			parentTaskId: input.taskId,
			rootTaskId: input.rootTaskId ?? input.taskId,
			mode,
			handoff: {
				summary: structuredDelegation.message,
				context: normalizeChecklistContext(argumentsRecord.todos),
				goal: structuredDelegation.message,
				...(structuredDelegation.deliverable ? { deliverable: structuredDelegation.deliverable } : {}),
				...(structuredDelegation.constraints ? { constraints: structuredDelegation.constraints } : {}),
				...(structuredDelegation.acceptanceCriteria
					? { acceptanceCriteria: structuredDelegation.acceptanceCriteria }
					: {}),
				...(structuredDelegation.inputs ? { inputs: structuredDelegation.inputs } : {}),
				...(structuredDelegation.evidenceNeeded !== undefined
					? { evidenceNeeded: structuredDelegation.evidenceNeeded }
					: {}),
			},
			execution,
			isolation,
			relayPolicy: "parent_only",
			...(helperProfile ? { helperProfile } : {}),
			...(role ? { role } : {}),
			...(structuredDelegation.permissions ? { permissions: structuredDelegation.permissions } : {}),
			...(structuredDelegation.expectedArtifact
				? { expectedArtifact: structuredDelegation.expectedArtifact }
				: {}),
			...(structuredDelegation.retryBudget !== undefined
				? { retryBudget: structuredDelegation.retryBudget }
				: {}),
			...(structuredDelegation.retrievalPackId ? { retrievalPackId: structuredDelegation.retrievalPackId } : {}),
			taskIntent: structuredDelegation.taskIntent,
			...(normalizeRetrievalMode(argumentsRecord.retrievalMode)
				? { retrievalMode: normalizeRetrievalMode(argumentsRecord.retrievalMode) }
				: {}),
			...(structuredDelegationUsed ? { structuredDelegation: true } : {}),
		},
	}
}

export class OrchestrationPolicy {
	decide(input: OrchestrationPolicyInput): ExecutionDecision {
		const candidates = input.candidateToolCalls.map(enrichToolCallCandidate)
		const candidateCount = candidates.length
		const hasExplicitSubagentCall = candidates.some((candidate) => candidate.tool === "new_task")
		const independentSubgoal = hasExplicitSubagentCall || looksLikeIndependentSubgoal(input.userIntent)
		const safeReadOnlyBatch = candidateCount > 1 && candidates.every(isSafeReadOnlyBatchCandidate)
		const subagentOutcome =
			independentSubgoal && input.hasBackgroundCapacity
				? buildSubagentLaunchRequest(input, candidates)
				: undefined
		const subagentPayload = subagentOutcome?.request
		const missingStructuredRequirements = subagentOutcome?.missingRequirements ?? []

		if (safeReadOnlyBatch) {
			return {
				kind: "subtooling",
				reason: "Multiple read-only context calls can be grouped into one batch step.",
				confidence: candidateCount >= 3 ? "high" : "medium",
				payload: buildToolBatchRequest(input, candidates),
			}
		}

		if (subagentPayload) {
			return {
				kind: "subagent",
				reason: "Background new_task delegation can run through the subagent path.",
				confidence: "high",
				payload: subagentPayload,
			}
		}

		if (hasExplicitSubagentCall && input.requireStructuredDelegation && missingStructuredRequirements.length > 0) {
			return {
				kind: "direct",
				reason: `Background subagent routing requires structured delegation fields: ${missingStructuredRequirements.join(", ")}.`,
				confidence: "high",
			}
		}

		if (independentSubgoal && !input.hasBackgroundCapacity) {
			return {
				kind: "direct",
				reason: "Background subagent routing is unavailable without launch capacity.",
				confidence: "high",
			}
		}

		if (hasExplicitSubagentCall) {
			return {
				kind: "direct",
				reason: "Subagent routing requires a single runnable background new_task payload.",
				confidence: "medium",
			}
		}

		if (candidateCount <= 1) {
			return {
				kind: "direct",
				reason: candidateCount === 0 ? "No tool calls proposed." : "Single tool call is best handled directly.",
				confidence: "high",
			}
		}

		return {
			kind: "direct",
			reason: "Unsafe or mixed tool sequence should stay on the direct path.",
			confidence: "medium",
		}
	}
}
