import { describe, expect, it, vi } from "vitest"

import {
	buildPatternKey,
	OrchestrationPatternMemoryService,
	sanitizeTaskArchetype,
} from "./OrchestrationPatternMemoryService"

describe("OrchestrationPatternMemoryService", () => {
	it("returns no recommendation when data is missing or insufficient", async () => {
		const setState = vi.fn().mockResolvedValue(undefined)
		const service = new OrchestrationPatternMemoryService({
			getState: () => undefined,
			setState,
		})

		expect(service.getRecommendation({ taskArchetype: "research_analysis", mode: "code" })).toBeUndefined()
		expect(setState).not.toHaveBeenCalled()
	})

	it("records observations and recommends the strongest deterministic winner", async () => {
		let state: any = undefined
		const service = new OrchestrationPatternMemoryService({
			getState: () => state,
			setState: vi.fn(async (next) => {
				state = next
			}),
		})

		await service.recordObservation({
			context: {
				taskArchetype: "research_analysis",
				mode: "code",
				executionType: "background",
				profileClass: "cheap",
				recommendationReasonCode: "historical_background_win",
			},
			outcome: "completed",
			timestamp: 10,
		})
		await service.recordObservation({
			context: {
				taskArchetype: "research_analysis",
				mode: "code",
				executionType: "background",
				profileClass: "cheap",
				recommendationReasonCode: "historical_background_win",
			},
			outcome: "completed",
			timestamp: 20,
		})
		await service.recordObservation({
			context: {
				taskArchetype: "research_analysis",
				mode: "code",
				executionType: "foreground",
				profileClass: "none",
			},
			outcome: "error",
			timestamp: 30,
		})
		await service.recordObservation({
			context: {
				taskArchetype: "research_analysis",
				mode: "code",
				executionType: "foreground",
				profileClass: "none",
			},
			outcome: "error",
			timestamp: 40,
		})

		const recommendation = service.getRecommendation({ taskArchetype: "research_analysis", mode: "code" })

		expect(recommendation).toMatchObject({
			suggestion: {
				executionType: "background",
				profileClass: "cheap",
				mode: "code",
			},
			reasonCode: "historical_background_win",
			sampleSize: 2,
		})
		expect(recommendation?.confidence).toBeGreaterThanOrEqual(0.5)
	})

	it("ignores invalid persisted state and recovers safely", async () => {
		const log = vi.fn()
		const service = new OrchestrationPatternMemoryService({
			getState: () => ({ version: 99, records: ["bad"] }) as any,
			setState: vi.fn().mockResolvedValue(undefined),
			log,
		})

		expect(service.snapshot()).toEqual({ version: 1, records: [] })
		expect(log).toHaveBeenCalled()
	})
})

describe("pattern helpers", () => {
	it("builds stable keys", () => {
		expect(
			buildPatternKey({
				taskArchetype: "research_analysis",
				mode: "code",
				executionType: "background",
				profileClass: "cheap",
			}),
		).toBe("research_analysis:code:background:cheap")
	})

	it("sanitizes task archetypes without persisting raw chat text", () => {
		expect(sanitizeTaskArchetype({ mode: "code", message: "Investigate parser failure with sk-live-123" })).toBe(
			"research_analysis",
		)
		expect(sanitizeTaskArchetype({ branchFromTaskId: "task-1", branchStrategy: "summary" })).toBe(
			"branch_summary_followup",
		)
	})
})
