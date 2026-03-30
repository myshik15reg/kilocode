// kilocode_change - new file
import {
	type OrchestrationPatternMemoryState,
	type OrchestrationPatternProfileClass,
	type OrchestrationPatternRecord,
	type OrchestrationPatternReasonCode,
	ORCHESTRATION_PATTERN_MEMORY_VERSION,
	orchestrationPatternMemoryStateSchema,
	orchestrationPatternRecordSchema,
	taskPatternContextSchema,
	type TaskPatternContext,
} from "@roo-code/types"

export interface PatternObservation {
	context: TaskPatternContext
	outcome: "delegated" | "completed" | "error"
	timestamp?: number
	reasonCode?: OrchestrationPatternReasonCode
}

export interface PatternRecommendation {
	suggestion: {
		mode: string
		executionType: "foreground" | "background"
		profileClass: OrchestrationPatternProfileClass
	}
	confidence: number
	reasonCode?: OrchestrationPatternReasonCode
	sampleSize: number
	record: OrchestrationPatternRecord
}

export interface OrchestrationPatternMemoryRuntime {
	getState(): OrchestrationPatternMemoryState | undefined
	setState(state: OrchestrationPatternMemoryState): Promise<void>
	log?(message: string): void
}

const MIN_RECOMMENDATION_SAMPLE_SIZE = 2
const MIN_RECOMMENDATION_SUCCESS_RATE = 0.6
const MIN_RECOMMENDATION_CONFIDENCE = 0.5

function defaultState(): OrchestrationPatternMemoryState {
	return {
		version: ORCHESTRATION_PATTERN_MEMORY_VERSION,
		records: [],
	}
}

export function buildPatternKey(context: TaskPatternContext): string {
	return [context.taskArchetype, context.mode, context.executionType, context.profileClass].join(":")
}

export function sanitizeTaskArchetype(input: {
	mode?: string
	message?: string
	branchFromTaskId?: string
	branchStrategy?: "full" | "summary"
	todos?: string
}): string {
	if (input.branchFromTaskId) {
		return input.branchStrategy === "full" ? "branch_full_followup" : "branch_summary_followup"
	}

	const text = `${input.mode ?? ""} ${input.message ?? ""} ${input.todos ?? ""}`.toLowerCase()
	if (/(debug|trace|stack|error|bug|fix)/u.test(text)) {
		return "debug_fix"
	}
	if (/(review|audit|inspect)/u.test(text)) {
		return "review_analysis"
	}
	if (/(research|investigate|analy[sz]e|explore)/u.test(text)) {
		return "research_analysis"
	}
	if (/(test|spec|coverage|assert)/u.test(text)) {
		return "test_work"
	}

	return "general_followup"
}

export class OrchestrationPatternMemoryService {
	constructor(private readonly runtime: OrchestrationPatternMemoryRuntime) {}

	public async recordObservation(input: PatternObservation): Promise<void> {
		const context = taskPatternContextSchema.parse(input.context)
		const now = input.timestamp ?? Date.now()
		const currentState = this.safeLoadState()
		const key = buildPatternKey(context)
		const existing = currentState.records.find((record) => record.key === key)

		const recommendationReasonCode = input.reasonCode ?? context.recommendationReasonCode
		const nextRecord = orchestrationPatternRecordSchema.parse(
			existing
				? {
						...existing,
						counters: {
							delegatedCount: existing.counters.delegatedCount + (input.outcome === "delegated" ? 1 : 0),
							completedCount: existing.counters.completedCount + (input.outcome === "completed" ? 1 : 0),
							errorCount: existing.counters.errorCount + (input.outcome === "error" ? 1 : 0),
							lastRecordedAt: now,
						},
						updatedAt: now,
						...(recommendationReasonCode ? { recommendationReasonCode } : {}),
					}
				: {
						key,
						taskArchetype: context.taskArchetype,
						mode: context.mode,
						executionType: context.executionType,
						profileClass: context.profileClass,
						counters: {
							delegatedCount: input.outcome === "delegated" ? 1 : 0,
							completedCount: input.outcome === "completed" ? 1 : 0,
							errorCount: input.outcome === "error" ? 1 : 0,
							lastRecordedAt: now,
						},
						createdAt: now,
						updatedAt: now,
						...(recommendationReasonCode ? { recommendationReasonCode } : {}),
					},
		)

		const nextRecords = existing
			? currentState.records.map((record) => (record.key === key ? nextRecord : record))
			: [...currentState.records, nextRecord]

		await this.runtime.setState(
			orchestrationPatternMemoryStateSchema.parse({
				version: ORCHESTRATION_PATTERN_MEMORY_VERSION,
				records: nextRecords
					.slice()
					.sort((left, right) => right.updatedAt - left.updatedAt || left.key.localeCompare(right.key))
					.slice(0, 200),
			}),
		)
	}

	public getRecommendation(input: {
		taskArchetype: string
		mode: string
		minimumSampleSize?: number
	}): PatternRecommendation | undefined {
		const state = this.safeLoadState()
		const minimumSampleSize = input.minimumSampleSize ?? MIN_RECOMMENDATION_SAMPLE_SIZE
		const candidates = state.records.filter(
			(record) => record.taskArchetype === input.taskArchetype && record.mode === input.mode,
		)
		if (candidates.length === 0) {
			return undefined
		}

		const ranked = candidates
			.map((record) => {
				const sampleSize = record.counters.completedCount + record.counters.errorCount
				if (sampleSize < minimumSampleSize) {
					return undefined
				}
				const successRate = record.counters.completedCount / sampleSize
				const confidence = successRate * Math.min(sampleSize / 4, 1)
				if (successRate < MIN_RECOMMENDATION_SUCCESS_RATE || confidence < MIN_RECOMMENDATION_CONFIDENCE) {
					return undefined
				}
				return {
					record,
					sampleSize,
					confidence,
				}
			})
			.filter((entry): entry is { record: OrchestrationPatternRecord; sampleSize: number; confidence: number } =>
				Boolean(entry),
			)
			.sort(
				(left, right) =>
					right.confidence - left.confidence ||
					right.sampleSize - left.sampleSize ||
					right.record.updatedAt - left.record.updatedAt,
			)

		const winner = ranked[0]
		if (!winner) {
			return undefined
		}

		return {
			suggestion: {
				mode: winner.record.mode,
				executionType: winner.record.executionType,
				profileClass: winner.record.profileClass,
			},
			confidence: Number(winner.confidence.toFixed(2)),
			reasonCode: winner.record.recommendationReasonCode,
			sampleSize: winner.sampleSize,
			record: winner.record,
		}
	}

	public snapshot(): OrchestrationPatternMemoryState {
		return this.safeLoadState()
	}

	private safeLoadState(): OrchestrationPatternMemoryState {
		try {
			return orchestrationPatternMemoryStateSchema.parse(this.runtime.getState() ?? defaultState())
		} catch (error) {
			this.runtime.log?.(
				`[OrchestrationPatternMemoryService] Invalid persisted state ignored: ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
			return defaultState()
		}
	}
}
