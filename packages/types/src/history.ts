import { z } from "zod"
import {
	activityItemSchema,
	branchStrategySchema,
	taskExecutionPreferenceSchema,
	taskIsolationModeSchema,
	taskLifecycleStateSchema,
	techDebtItemSchema,
} from "./orchestration.js"
import { taskPatternContextSchema } from "./orchestration-pattern-memory.js"
import { taskHistoryStatusSchema, taskStopReasonSchema } from "./task-control.js"

/**
 * HistoryItem
 */

export const historyItemSchema = z.object({
	id: z.string(),
	rootTaskId: z.string().optional(),
	parentTaskId: z.string().optional(),
	delegationDepth: z.number().int().nonnegative().optional(), // kilocode_change
	number: z.number(),
	ts: z.number(),
	task: z.string(),
	tokensIn: z.number(),
	tokensOut: z.number(),
	cacheWrites: z.number().optional(),
	cacheReads: z.number().optional(),
	totalCost: z.number(),
	size: z.number().optional(),
	workspace: z.string().optional(),
	isFavorited: z.boolean().optional(), // kilocode_change
	mode: z.string().optional(),
	/**
	 * The tool protocol used by this task. Once a task uses tools with a specific
	 * protocol (XML or Native), it is permanently locked to that protocol.
	 *
	 * - "xml": Tool calls are parsed from XML text (no tool IDs)
	 * - "native": Tool calls come as tool_call chunks with IDs
	 *
	 * This ensures task resumption works correctly even when NTC settings change.
	 */
	toolProtocol: z.enum(["xml", "native"]).optional(),
	apiConfigName: z.string().optional(), // Provider profile name for sticky profile feature
	status: taskHistoryStatusSchema.optional(), // kilocode_change
	delegatedToId: z.string().optional(), // Last child this parent delegated to
	childIds: z.array(z.string()).optional(), // All children spawned by this task
	awaitingChildId: z.string().optional(), // Child currently awaited (set when delegated)
	completedByChildId: z.string().optional(), // Child that completed and resumed this parent
	completionResultSummary: z.string().optional(), // Summary from completed child
	lastStopReason: taskStopReasonSchema.optional(), // kilocode_change
	lastStopSummary: z.string().optional(), // kilocode_change
	restartCount: z.number().int().nonnegative().optional(), // kilocode_change
	restartSourceTaskId: z.string().optional(), // kilocode_change
	statusUpdatedAt: z.number().int().nonnegative().optional(), // kilocode_change
	lastStatusViewedAt: z.number().int().nonnegative().optional(), // kilocode_change
	execution: taskExecutionPreferenceSchema.optional(),
	isolation: taskIsolationModeSchema.optional(),
	lifecycleState: taskLifecycleStateSchema.optional(),
	pauseReason: z.string().optional(),
	pausedAt: z.number().int().nonnegative().optional(),
	resumeContextSummary: z.string().optional(),
	branchFromTaskId: z.string().optional(),
	branchFromMessageTs: z.number().int().nonnegative().optional(),
	branchSummary: z.string().optional(),
	branchStrategy: branchStrategySchema.optional(),
	patternContext: taskPatternContextSchema.optional(),
	activity: z.array(activityItemSchema).optional(),
	techDebtItems: z.array(techDebtItemSchema).optional(),
	// kilocode_change start
	sessionAutoRestartEnabled: z.boolean().optional(),
	// kilocode_change end
})

export type HistoryItem = z.infer<typeof historyItemSchema>
