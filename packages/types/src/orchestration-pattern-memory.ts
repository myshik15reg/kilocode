import { z } from "zod"

export const ORCHESTRATION_PATTERN_MEMORY_VERSION = 1

export const sanitizedPatternLabelSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u)

export const orchestrationPatternKeySchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(/^[a-z0-9:_-]+$/u)

export const orchestrationPatternExecutionTypeSchema = z.enum(["foreground", "background"])
export const orchestrationPatternProfileClassSchema = z.enum(["strong", "balanced", "cheap", "none"])
export const orchestrationPatternReasonCodeSchema = sanitizedPatternLabelSchema

export const taskPatternContextSchema = z
	.object({
		taskArchetype: sanitizedPatternLabelSchema,
		mode: sanitizedPatternLabelSchema,
		executionType: orchestrationPatternExecutionTypeSchema,
		profileClass: orchestrationPatternProfileClassSchema,
		branchStrategy: z.enum(["full", "summary"]).optional(),
		helperProfileUsed: z.boolean().optional(),
		recommendationReasonCode: orchestrationPatternReasonCodeSchema.optional(),
	})
	.strict()

export const orchestrationPatternCountersSchema = z
	.object({
		delegatedCount: z.number().int().nonnegative(),
		completedCount: z.number().int().nonnegative(),
		errorCount: z.number().int().nonnegative(),
		lastRecordedAt: z.number().int().nonnegative(),
	})
	.strict()

export const orchestrationPatternRecordSchema = z
	.object({
		key: orchestrationPatternKeySchema,
		taskArchetype: sanitizedPatternLabelSchema,
		mode: sanitizedPatternLabelSchema,
		executionType: orchestrationPatternExecutionTypeSchema,
		profileClass: orchestrationPatternProfileClassSchema,
		counters: orchestrationPatternCountersSchema,
		recommendationReasonCode: orchestrationPatternReasonCodeSchema.optional(),
		createdAt: z.number().int().nonnegative(),
		updatedAt: z.number().int().nonnegative(),
	})
	.strict()

export const orchestrationPatternMemoryStateSchema = z
	.object({
		version: z.literal(ORCHESTRATION_PATTERN_MEMORY_VERSION),
		records: z.array(orchestrationPatternRecordSchema).max(200),
	})
	.strict()

export type TaskPatternContext = z.infer<typeof taskPatternContextSchema>
export type OrchestrationPatternExecutionType = z.infer<typeof orchestrationPatternExecutionTypeSchema>
export type OrchestrationPatternProfileClass = z.infer<typeof orchestrationPatternProfileClassSchema>
export type OrchestrationPatternCounters = z.infer<typeof orchestrationPatternCountersSchema>
export type OrchestrationPatternRecord = z.infer<typeof orchestrationPatternRecordSchema>
export type OrchestrationPatternMemoryState = z.infer<typeof orchestrationPatternMemoryStateSchema>
export type OrchestrationPatternReasonCode = z.infer<typeof orchestrationPatternReasonCodeSchema>
