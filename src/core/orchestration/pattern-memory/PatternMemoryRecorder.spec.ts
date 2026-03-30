import { describe, expect, it, vi } from "vitest"

import { recordDelegationPatternOutcome } from "./PatternMemoryRecorder"

describe("PatternMemoryRecorder", () => {
	it("records sanitized delegation outcomes into provider state", async () => {
		let savedState: any
		const provider = {
			getValue: vi.fn(() => savedState),
			setValue: vi.fn(async (_key, value) => {
				savedState = value
			}),
			log: vi.fn(),
		}
		const telemetry = {
			captureTaskOutcomeError: vi.fn(),
		}

		await recordDelegationPatternOutcome({
			provider,
			taskId: "task-1",
			message: "Investigate parser failure with sk-live-secret",
			mode: "code",
			executionType: "background",
			profileClass: "cheap",
			outcome: "delegated",
			reasonCode: "historical_background_win",
			telemetry,
		})

		expect(provider.setValue).toHaveBeenCalled()
		expect(JSON.stringify(savedState)).not.toContain("sk-live-secret")
		expect(savedState.records[0]).toMatchObject({
			taskArchetype: "research_analysis",
			executionType: "background",
			profileClass: "cheap",
			recommendationReasonCode: "historical_background_win",
		})
		expect(telemetry.captureTaskOutcomeError).not.toHaveBeenCalled()
	})

	it("reports telemetry when persistence fails", async () => {
		const provider = {
			getValue: vi.fn(() => undefined),
			setValue: vi.fn().mockRejectedValue(new Error("persist failed")),
			log: vi.fn(),
		}
		const telemetry = {
			captureTaskOutcomeError: vi.fn(),
		}

		await recordDelegationPatternOutcome({
			provider,
			taskId: "task-2",
			message: "Review architecture",
			mode: "code",
			executionType: "foreground",
			profileClass: "none",
			outcome: "delegated",
			telemetry,
		})

		expect(telemetry.captureTaskOutcomeError).toHaveBeenCalledWith("task-2", {
			reason: "pattern_memory_record_failed",
			source: "pattern_memory",
			patternTaskArchetype: "review_analysis",
			patternMode: "code",
			patternExecutionType: "foreground",
			patternProfileClass: "none",
		})
		expect(provider.log).toHaveBeenCalled()
	})
})
