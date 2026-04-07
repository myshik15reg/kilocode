import { z } from "zod"

import { normalizedTaskControlSchema } from "./task-control.js"

export const executionModeSchema = z.enum(["direct", "subtooling", "subagent"])
export const executionConfidenceSchema = z.enum(["low", "medium", "high"])
export const taskExecutionPreferenceSchema = z.enum(["auto", "foreground", "background"])
export const taskIsolationModeSchema = z.enum(["auto", "shared", "worktree"])
export const subagentExecutionSchema = z.enum(["foreground", "background"])
export const subagentRelayPolicySchema = z.enum(["none", "parent_only", "group"])
export const branchStrategySchema = z.enum(["full", "summary"])
export const taskLifecycleStateSchema = z.enum(["running", "paused", "completed", "cancelled"])
export const routingProfileClassSchema = z.enum(["strong", "balanced", "cheap", "none"])
export const orchestrationExplainabilityStageSchema = z.enum(["delegation", "status", "outcome"])
export const orchestrationExplainabilitySourceSchema = z.enum([
	"explicit",
	"recommended",
	"default",
	"status",
	"result",
])
export const subagentHandoffStrategySchema = z.enum(["direct", "sequential"])
export const taskIntentSchema = z.enum(["research", "debug", "implementation", "review", "general"])
export const retrievalModeSchema = z.enum(["adaptive", "semantic_only", "hybrid", "rerank_heavy"])
export const evaluatorVerdictSchema = z.enum(["pass", "retry", "clarify", "conflict"])
export const subagentInputKindSchema = z.enum(["file", "task", "search", "doc", "workflow", "artifact", "other"])
export const subagentInputReferenceSchema = z.object({
	kind: subagentInputKindSchema,
	ref: z.string().min(1),
})

export const toolCallCandidateSchema = z.object({
	callId: z.string().optional(),
	tool: z.string(),
	arguments: z.record(z.string(), z.unknown()).optional(),
	readOnly: z.boolean().optional(),
	// kilocode_change start
	batchable: z.boolean().optional(),
	parallelSafe: z.boolean().optional(),
	// kilocode_change end
})

export const plannedToolCallSchema = z.object({
	callId: z.string().optional(),
	tool: z.string(),
	arguments: z.record(z.string(), z.unknown()).optional(),
	readOnly: z.boolean().optional(),
	batchable: z.boolean().optional(),
	// kilocode_change
	parallelSafe: z.boolean().optional(),
})

export const rejectedToolCallSchema = z.object({
	tool: z.string(),
	reason: z.string(),
})

export const toolCallResultSchema = z.object({
	callId: z.string().optional(),
	tool: z.string(),
	content: z.string(),
	success: z.boolean(),
})

export const toolCallErrorSchema = z.object({
	callId: z.string().optional(),
	tool: z.string(),
	message: z.string(),
})

export const toolBatchRequestSchema = z.object({
	requestId: z.string().optional(),
	taskId: z.string(),
	intent: z.string(),
	calls: z.array(toolCallCandidateSchema),
})

export const toolBatchPlanSchema = z.object({
	requestId: z.string(),
	parallelGroups: z.array(z.array(plannedToolCallSchema)),
	sequentialCalls: z.array(plannedToolCallSchema),
	rejectedCalls: z.array(rejectedToolCallSchema),
})

export const toolBatchResultSchema = z.object({
	requestId: z.string(),
	status: z.enum(["completed", "partial", "failed", "cancelled", "timed_out"]),
	results: z.array(toolCallResultSchema),
	errors: z.array(toolCallErrorSchema),
	summary: z.string(),
})

export const subagentBudgetSchema = z.object({
	maxTokens: z.number().int().positive().optional(),
	maxSteps: z.number().int().positive().optional(),
	maxCostUsd: z.number().positive().optional(),
})

export const subagentHandoffSchema = z.object({
	summary: z.string(),
	context: z.array(z.string()).optional(),
	goal: z.string().optional(),
	doneWhen: z.string().optional(),
	constraints: z.array(z.string()).optional(),
	deliverable: z.string().optional(),
	acceptanceCriteria: z.array(z.string()).optional(),
	inputs: z.array(subagentInputReferenceSchema).optional(),
	evidenceNeeded: z.boolean().optional(),
	budget: subagentBudgetSchema.optional(),
	canAbstain: z.boolean().optional(),
	priorResultSummary: z.string().optional(),
	strategy: subagentHandoffStrategySchema.optional(),
})

export const subagentLaunchRequestSchema = z.object({
	parentTaskId: z.string(),
	rootTaskId: z.string(),
	targetTaskId: z.string().optional(),
	mode: z.string(),
	handoff: subagentHandoffSchema,
	execution: subagentExecutionSchema.default("foreground"),
	isolation: taskIsolationModeSchema.default("auto"),
	relayPolicy: subagentRelayPolicySchema.default("parent_only"),
	helperProfile: z.string().min(1).optional(),
	profileClass: routingProfileClassSchema.optional(),
	routingSource: orchestrationExplainabilitySourceSchema.optional(),
	routingReasonCode: z.string().min(1).optional(),
	recommendationReasonCode: z.string().min(1).optional(),
	role: z.string().min(1).optional(),
	permissions: z.array(z.string().min(1)).optional(),
	expectedArtifact: z.string().min(1).optional(),
	retryBudget: z.number().int().nonnegative().optional(),
	retrievalPackId: z.string().min(1).optional(),
	taskIntent: taskIntentSchema.optional(),
	retrievalMode: retrievalModeSchema.optional(),
	structuredDelegation: z.boolean().optional(),
})

export function normalizeSubagentLaunchRequest(
	request: z.input<typeof subagentLaunchRequestSchema>,
): SubagentLaunchRequest {
	return subagentLaunchRequestSchema.parse(request)
}

export function resolveSubagentLaunchTargetTaskId(
	request: Pick<SubagentLaunchRequest, "parentTaskId" | "targetTaskId">,
): string {
	return request.targetTaskId ?? request.parentTaskId
}

export const executionDecisionSchema = z.object({
	kind: executionModeSchema,
	reason: z.string(),
	confidence: executionConfidenceSchema.optional(),
	payload: z.union([toolBatchRequestSchema, subagentLaunchRequestSchema]).optional(),
})

export const subagentStatusEventSchema = z.object({
	taskId: z.string(),
	sessionId: z.string(),
	state: z.enum([
		"queued",
		"starting",
		"running",
		"waiting_input",
		"waiting_approval",
		"paused",
		"completed",
		"failed",
		"cancelled",
		"abstained",
	]),
	message: z.string().optional(),
	timestamp: z.number(),
})

export const subagentResultEventSchema = z.object({
	taskId: z.string(),
	sessionId: z.string(),
	status: z.enum(["completed", "failed", "cancelled", "abstained"]),
	output: z.string(),
	summary: z.string().optional(),
	timestamp: z.number(),
})

// kilocode_change start
export const subagentRelayKindSchema = z.enum(["parent", "task", "group", "root"])

const subagentRelayEnvelopeBaseSchema = z.object({
	relayId: z.string().optional(),
	fromTaskId: z.string(),
	rootTaskId: z.string(),
	content: z.string(),
	requiresParentVisibility: z.boolean(),
	timestamp: z.number(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export const subagentRelayEnvelopeSchema = z.discriminatedUnion("kind", [
	subagentRelayEnvelopeBaseSchema.extend({
		kind: z.literal("parent"),
		toTaskId: z.string(),
	}),
	subagentRelayEnvelopeBaseSchema.extend({
		kind: z.literal("task"),
		toTaskId: z.string(),
	}),
	subagentRelayEnvelopeBaseSchema.extend({
		kind: z.literal("group"),
		groupId: z.string(),
	}),
	subagentRelayEnvelopeBaseSchema.extend({
		kind: z.literal("root"),
	}),
])
// kilocode_change end

export const techDebtCategorySchema = z.enum([
	"hardcode",
	"performance",
	"architecture",
	"cleanup",
	"test_gap",
	"docs_gap",
	"other",
])
export const techDebtSeveritySchema = z.enum(["low", "medium", "high"])
export const techDebtStatusSchema = z.enum(["suggested", "accepted", "dismissed", "converted_to_task"])

export const techDebtItemSchema = z.object({
	id: z.string(),
	sourceTaskId: z.string(),
	rootTaskId: z.string(),
	title: z.string(),
	summary: z.string(),
	category: techDebtCategorySchema,
	severity: techDebtSeveritySchema,
	status: techDebtStatusSchema,
	evidence: z.array(z.string()).optional(),
	createdAt: z.number(),
})

export const orchestrationExplainabilitySchema = z.object({
	stage: orchestrationExplainabilityStageSchema,
	reasonCode: z.string().min(1),
	source: orchestrationExplainabilitySourceSchema.optional(),
	mode: z.string().min(1).optional(),
	execution: subagentExecutionSchema.optional(),
	profileClass: routingProfileClassSchema.optional(),
	helperProfile: z.string().min(1).optional(),
	recommendationReasonCode: z.string().min(1).optional(),
	outcomeSummary: z.string().min(1).optional(),
	strategy: subagentHandoffStrategySchema.optional(),
	canAbstain: z.boolean().optional(),
	budgetSummary: z.string().min(1).optional(),
	taskIntent: taskIntentSchema.optional(),
	retrievalMode: retrievalModeSchema.optional(),
	retrievalConfidence: z.number().min(0).max(1).optional(),
	queuePressure: z.string().min(1).optional(),
	lastSubagentOutcome: evaluatorVerdictSchema.optional(),
	structuredDelegation: z.boolean().optional(),
	validatorPolicy: z.string().min(1).optional(),
})

export const activityItemSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("toolBatch"),
		id: z.string(),
		requestId: z.string(),
		taskId: z.string(),
		status: z.enum(["started", "progress", "completed", "failed"]),
		summary: z.string(),
		timestamp: z.number(),
	}),
	z.object({
		kind: z.literal("subagent"),
		id: z.string(),
		taskId: z.string(),
		sessionId: z.string().optional(),
		status: z.enum(["queued", "running", "paused", "completed", "failed", "cancelled", "abstained"]),
		summary: z.string(),
		explainability: orchestrationExplainabilitySchema.optional(),
		timestamp: z.number(),
	}),
	z.object({
		kind: z.literal("taskControl"),
		id: z.string(),
		taskId: z.string(),
		// kilocode_change
		control: normalizedTaskControlSchema,
		summary: z.string(),
		timestamp: z.number(),
	}),
	// kilocode_change start
	z.object({
		kind: z.literal("relay"),
		id: z.string(),
		taskId: z.string(),
		rootTaskId: z.string(),
		status: z.enum(["delivered", "blocked"]),
		envelope: subagentRelayEnvelopeSchema,
		summary: z.string(),
		timestamp: z.number(),
	}),
	// kilocode_change end
	z.object({
		kind: z.literal("techDebt"),
		id: z.string(),
		taskId: z.string(),
		itemId: z.string(),
		status: techDebtStatusSchema,
		summary: z.string(),
		timestamp: z.number(),
	}),
])

export type ExecutionMode = z.infer<typeof executionModeSchema>
export type ExecutionConfidence = z.infer<typeof executionConfidenceSchema>
export type TaskExecutionPreference = z.infer<typeof taskExecutionPreferenceSchema>
export type TaskIsolationMode = z.infer<typeof taskIsolationModeSchema>
export type SubagentExecution = z.infer<typeof subagentExecutionSchema>
export type SubagentRelayPolicy = z.infer<typeof subagentRelayPolicySchema>
export type BranchStrategy = z.infer<typeof branchStrategySchema>
export type TaskLifecycleState = z.infer<typeof taskLifecycleStateSchema>
export type RoutingProfileClass = z.infer<typeof routingProfileClassSchema>
export type OrchestrationExplainabilityStage = z.infer<typeof orchestrationExplainabilityStageSchema>
export type OrchestrationExplainabilitySource = z.infer<typeof orchestrationExplainabilitySourceSchema>
export type SubagentHandoffStrategy = z.infer<typeof subagentHandoffStrategySchema>
export type TaskIntent = z.infer<typeof taskIntentSchema>
export type RetrievalMode = z.infer<typeof retrievalModeSchema>
export type EvaluatorVerdict = z.infer<typeof evaluatorVerdictSchema>
export type SubagentInputKind = z.infer<typeof subagentInputKindSchema>
export type SubagentInputReference = z.infer<typeof subagentInputReferenceSchema>
export type ToolCallCandidate = z.infer<typeof toolCallCandidateSchema>
export type PlannedToolCall = z.infer<typeof plannedToolCallSchema>
export type RejectedToolCall = z.infer<typeof rejectedToolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type ToolCallError = z.infer<typeof toolCallErrorSchema>
export type ToolBatchRequest = z.infer<typeof toolBatchRequestSchema>
export type ToolBatchPlan = z.infer<typeof toolBatchPlanSchema>
export type ToolBatchResult = z.infer<typeof toolBatchResultSchema>
export type SubagentBudget = z.infer<typeof subagentBudgetSchema>
export type SubagentHandoff = z.infer<typeof subagentHandoffSchema>
export type SubagentLaunchRequest = z.infer<typeof subagentLaunchRequestSchema>
export type ExecutionDecision = z.infer<typeof executionDecisionSchema>
export type SubagentStatusEvent = z.infer<typeof subagentStatusEventSchema>
export type SubagentResultEvent = z.infer<typeof subagentResultEventSchema>
// kilocode_change start
export type SubagentRelayKind = z.infer<typeof subagentRelayKindSchema>
export type SubagentRelayEnvelope = z.infer<typeof subagentRelayEnvelopeSchema>
// kilocode_change end
export type TechDebtStatus = z.infer<typeof techDebtStatusSchema>
export type TechDebtItem = z.infer<typeof techDebtItemSchema>
export type OrchestrationExplainability = z.infer<typeof orchestrationExplainabilitySchema>
export type ActivityItem = z.infer<typeof activityItemSchema>
