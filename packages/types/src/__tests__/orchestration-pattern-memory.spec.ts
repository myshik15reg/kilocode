import { describe, expect, it } from "vitest"

import {
	orchestrationPatternMemoryStateSchema,
	orchestrationPatternRecordSchema,
	taskPatternContextSchema,
} from "../orchestration-pattern-memory.js"

describe("orchestration pattern memory schemas", () => {
	it("accepts sanitized pattern records", () => {
		const parsed = orchestrationPatternRecordSchema.parse({
			key: "research_analysis:code:background:cheap",
			taskArchetype: "research_analysis",
			mode: "code",
			executionType: "background",
			profileClass: "cheap",
			counters: {
				delegatedCount: 2,
				completedCount: 2,
				errorCount: 0,
				lastRecordedAt: 100,
			},
			recommendationReasonCode: "historical_background_win",
			createdAt: 90,
			updatedAt: 100,
		})

		expect(parsed.taskArchetype).toBe("research_analysis")
	})

	it("rejects unsanitized labels and free-form text payloads", () => {
		expect(() =>
			taskPatternContextSchema.parse({
				taskArchetype: "research this parser issue now",
				mode: "code",
				executionType: "background",
				profileClass: "cheap",
			}),
		).toThrow()
	})

	it("caps persisted state size", () => {
		const records = Array.from({ length: 201 }, (_, index) => ({
			key: `general_followup:code:foreground:none:${index}`,
			taskArchetype: "general_followup",
			mode: "code",
			executionType: "foreground",
			profileClass: "none",
			counters: {
				delegatedCount: 0,
				completedCount: 1,
				errorCount: 0,
				lastRecordedAt: index,
			},
			createdAt: index,
			updatedAt: index,
		}))

		expect(() =>
			orchestrationPatternMemoryStateSchema.parse({
				version: 1,
				records,
			}),
		).toThrow()
	})
})
