// kilocode_change - new file
import type { ExecutionDecision, SubagentLaunchRequest, ToolBatchRequest, ToolCallCandidate } from "@roo-code/types"

import { enrichToolCallCandidate, isSafeReadOnlyBatchCandidate } from "./toolMetadata"

export interface OrchestrationPolicyInput {
	taskId?: string
	rootTaskId?: string
	userIntent: string
	candidateToolCalls: ToolCallCandidate[]
	hasBackgroundCapacity: boolean
	hasHelperRouting: boolean
}

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

// kilocode_change start
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

function buildSubagentLaunchRequest(
	input: OrchestrationPolicyInput,
	calls: ToolCallCandidate[],
): SubagentLaunchRequest | undefined {
	if (!input.taskId || calls.length !== 1) {
		return undefined
	}

	const [candidate] = calls
	if (candidate.tool !== "new_task") {
		return undefined
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
		return undefined
	}

	return {
		parentTaskId: input.taskId,
		rootTaskId: input.rootTaskId ?? input.taskId,
		mode,
		handoff: {
			summary: message,
			context: normalizeChecklistContext(argumentsRecord.todos),
		},
		execution,
		isolation,
		relayPolicy: "parent_only",
		...(helperProfile ? { helperProfile } : {}),
	}
}
// kilocode_change end

export class OrchestrationPolicy {
	decide(input: OrchestrationPolicyInput): ExecutionDecision {
		const candidates = input.candidateToolCalls.map(enrichToolCallCandidate)
		const candidateCount = candidates.length
		const hasExplicitSubagentCall = candidates.some((candidate) => candidate.tool === "new_task")
		const independentSubgoal = hasExplicitSubagentCall || looksLikeIndependentSubgoal(input.userIntent)
		const safeReadOnlyBatch = candidateCount > 1 && candidates.every(isSafeReadOnlyBatchCandidate)
		const subagentPayload =
			independentSubgoal && input.hasBackgroundCapacity
				? buildSubagentLaunchRequest(input, candidates)
				: undefined

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
