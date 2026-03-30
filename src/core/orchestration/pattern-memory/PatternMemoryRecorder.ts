// kilocode_change - new file
import type { OrchestrationPatternReasonCode, TaskPatternContext } from "@roo-code/types"

import { TelemetryService } from "@roo-code/telemetry"

import {
	OrchestrationPatternMemoryService,
	sanitizeTaskArchetype,
	type PatternObservation,
} from "./OrchestrationPatternMemoryService"
import { ProviderPatternMemoryRuntime } from "./ProviderPatternMemoryRuntime"
import type { PatternMemoryProviderLike, PatternMemoryTelemetryLike } from "./PatternMemoryTypes"

function capturePatternFailure(
	telemetry: PatternMemoryTelemetryLike,
	taskId: string,
	context: TaskPatternContext | undefined,
	reason: string,
	reasonCode?: OrchestrationPatternReasonCode,
): void {
	telemetry.captureTaskOutcomeError(taskId, {
		reason,
		source: "pattern_memory",
		...(context
			? {
					patternTaskArchetype: context.taskArchetype,
					patternMode: context.mode,
					patternExecutionType: context.executionType,
					patternProfileClass: context.profileClass,
					...(reasonCode ? { patternReasonCode: reasonCode } : {}),
				}
			: {}),
	})
}

export async function recordDelegationPatternOutcome(params: {
	provider: PatternMemoryProviderLike
	taskId: string
	message: string
	mode: string
	executionType: "foreground" | "background"
	profileClass: "strong" | "balanced" | "cheap" | "none"
	branchFromTaskId?: string
	branchStrategy?: "full" | "summary"
	todos?: string
	outcome: PatternObservation["outcome"]
	reasonCode?: OrchestrationPatternReasonCode
	telemetry?: PatternMemoryTelemetryLike
}): Promise<void> {
	const telemetry = params.telemetry ?? TelemetryService.instance
	let context: TaskPatternContext | undefined
	try {
		context = {
			taskArchetype: sanitizeTaskArchetype({
				mode: params.mode,
				message: params.message,
				branchFromTaskId: params.branchFromTaskId,
				branchStrategy: params.branchStrategy,
				todos: params.todos,
			}),
			mode: params.mode,
			executionType: params.executionType,
			profileClass: params.profileClass,
			...(params.branchStrategy ? { branchStrategy: params.branchStrategy } : {}),
			...(params.reasonCode ? { recommendationReasonCode: params.reasonCode } : {}),
		}
		const service = new OrchestrationPatternMemoryService(new ProviderPatternMemoryRuntime(params.provider))
		await service.recordObservation({
			context,
			outcome: params.outcome,
			reasonCode: params.reasonCode,
		})
	} catch (error) {
		capturePatternFailure(telemetry, params.taskId, context, "pattern_memory_record_failed", params.reasonCode)
		params.provider.log(
			`[PatternMemoryRecorder] Failed to record outcome for ${params.taskId}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		)
	}
}
