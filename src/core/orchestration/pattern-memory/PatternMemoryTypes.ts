// kilocode_change - new file
import type {
	OrchestrationPatternMemoryState,
	OrchestrationPatternReasonCode,
	TaskPatternContext,
} from "@roo-code/types"

export interface PatternMemoryTaskContext extends TaskPatternContext {
	message?: string
	todos?: string
	branchFromTaskId?: string
}

export interface PatternMemoryProviderLike {
	getValue(key: "orchestrationPatternMemoryState"): OrchestrationPatternMemoryState | undefined
	setValue(key: "orchestrationPatternMemoryState", value: OrchestrationPatternMemoryState): Promise<void>
	log(message: string): void
}

export interface PatternMemoryTelemetryLike {
	captureTaskOutcomeError(
		taskId: string,
		properties: {
			reason: string
			source: string
			patternTaskArchetype?: string
			patternMode?: string
			patternExecutionType?: "foreground" | "background"
			patternProfileClass?: "strong" | "balanced" | "cheap" | "none"
			patternReasonCode?: OrchestrationPatternReasonCode
		},
	): void
}
