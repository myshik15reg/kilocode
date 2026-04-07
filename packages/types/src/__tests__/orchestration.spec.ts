// kilocode_change - new file
import { describe, expect, it } from "vitest"

import {
	normalizeSubagentLaunchRequest,
	orchestrationExplainabilitySchema,
	subagentResultEventSchema,
	subagentStatusEventSchema,
} from "../orchestration.js"

describe("orchestration contracts", () => {
	it("normalizes enriched sequential handoff requests", () => {
		const request = normalizeSubagentLaunchRequest({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			handoff: {
				summary: "Research",
				goal: "Check impact",
				doneWhen: "Return source-backed summary",
				constraints: ["read only"],
				budget: { maxSteps: 3, maxCostUsd: 0.5 },
				canAbstain: true,
				priorResultSummary: "semantic search already tried",
				strategy: "sequential",
			},
		})

		expect(request.execution).toBe("foreground")
		expect(request.isolation).toBe("auto")
		expect(request.relayPolicy).toBe("parent_only")
		expect(request.handoff).toEqual(
			expect.objectContaining({
				strategy: "sequential",
				canAbstain: true,
				budget: { maxSteps: 3, maxCostUsd: 0.5 },
			}),
		)
	})

	it("accepts abstained subagent status events", () => {
		expect(
			subagentStatusEventSchema.parse({
				taskId: "child-1",
				sessionId: "sess-1",
				state: "abstained",
				message: "Need more context",
				timestamp: 123,
			}),
		).toMatchObject({ state: "abstained" })
	})

	it("accepts abstained subagent result events", () => {
		expect(
			subagentResultEventSchema.parse({
				taskId: "child-1",
				sessionId: "sess-1",
				status: "abstained",
				output: "Need parent clarification",
				summary: "Need parent clarification",
				timestamp: 124,
			}),
		).toMatchObject({ status: "abstained" })
	})

	it("accepts explainability metadata for strategy, abstain, and budget", () => {
		expect(
			orchestrationExplainabilitySchema.parse({
				stage: "delegation",
				reasonCode: "background_subagent_selected",
				execution: "background",
				strategy: "sequential",
				canAbstain: true,
				budgetSummary: "steps:3,cost:0.5",
				taskIntent: "research",
				retrievalMode: "adaptive",
			}),
		).toMatchObject({
			strategy: "sequential",
			canAbstain: true,
			budgetSummary: "steps:3,cost:0.5",
		})
	})
})
