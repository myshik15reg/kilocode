import { describe, expect, it } from "vitest"

import {
	buildStructuredDelegationMessage,
	getStructuredDelegationBackgroundRequirements,
	hasStructuredDelegationContent,
	inferTaskIntent,
	normalizeStructuredDelegation,
} from "../structuredDelegation"

describe("structuredDelegation", () => {
	it("normalizes legacy string inputs into structured handoff fields", () => {
		const normalized = normalizeStructuredDelegation({
			message: "Investigate helper routing regressions",
			deliverable: "incident report",
			constraints: "- no writes\n- no installs",
			acceptanceCriteria: "1. identify root cause\n2. cite files",
			inputs: "file: src/core/tools/NewTaskTool.ts\nworkflow: .kilocode/workflows/index.md\nplain reference",
			evidenceNeeded: "required",
			retryBudget: "3",
			permissions: "read\nsearch",
			retrievalPackId: "pack-17",
		})

		expect(normalized).toEqual({
			message: "Investigate helper routing regressions",
			deliverable: "incident report",
			constraints: ["no writes", "no installs"],
			acceptanceCriteria: ["identify root cause", "cite files"],
			inputs: [
				{ kind: "file", ref: "src/core/tools/NewTaskTool.ts" },
				{ kind: "workflow", ref: ".kilocode/workflows/index.md" },
				{ kind: "other", ref: "plain reference" },
			],
			evidenceNeeded: true,
			retryBudget: 3,
			permissions: ["read", "search"],
			retrievalPackId: "pack-17",
			taskIntent: "research",
		})
	})

	it("builds a delegation contract message only when structured content exists", () => {
		const normalized = normalizeStructuredDelegation({
			message: "Review the helper routing changes",
			acceptanceCriteria: ["cite files"],
			permissions: ["read"],
		})

		const rendered = buildStructuredDelegationMessage(normalized)
		expect(rendered).toContain("<delegation_contract>")
		expect(rendered).toContain("task_intent: review")
		expect(rendered).toContain("acceptance_criteria:")
		expect(rendered).toContain("permissions: read")
	})

	it("reports missing background requirements for incomplete structured delegation", () => {
		const missing = getStructuredDelegationBackgroundRequirements(
			normalizeStructuredDelegation({
				message: "   ",
				deliverable: "summary",
			}),
		)

		expect(missing).toEqual(["goal", "acceptanceCriteria"])
	})

	it("keeps plain messages untouched when there is no structured content", () => {
		const normalized = normalizeStructuredDelegation({ message: "Simple follow-up" })
		expect(hasStructuredDelegationContent(normalized)).toBe(false)
		expect(buildStructuredDelegationMessage(normalized)).toBe("Simple follow-up")
	})

	it("infers task intent conservatively from explicit and implicit cues", () => {
		expect(inferTaskIntent("Fix the failing retry logic")).toBe("debug")
		expect(inferTaskIntent("Add a new retrieval flow")).toBe("implementation")
		expect(inferTaskIntent("Whatever", "review")).toBe("review")
	})
})
