import { TechDebtService } from "../TechDebtService"

describe("TechDebtService", () => {
	it("extracts only valid tech debt items from JSON", () => {
		const items = TechDebtService.parseExtractionResponse(
			JSON.stringify({
				items: [
					{
						title: "Add tests for restart edge case",
						summary: "Restart flow lacks coverage for repeated failure recovery.",
						category: "test_gap",
						severity: "medium",
						evidence: ["Recovery fallback path has no spec", "Observed in completion summary"],
					},
				],
			}),
			{
				sourceTaskId: "task-1",
				rootTaskId: "root-1",
				task: "Fix restart flow",
				completionSummary: "Done",
			},
		)

		expect(items).toHaveLength(1)
		expect(items[0].status).toBe("suggested")
		expect(items[0].evidence).toEqual(["Recovery fallback path has no spec", "Observed in completion summary"])
	})

	it("suppresses basic duplicates", () => {
		const existing = [
			{
				id: "one",
				sourceTaskId: "task-1",
				rootTaskId: "root-1",
				title: "Add tests for restart edge case",
				summary: "Restart flow lacks coverage for repeated failure recovery.",
				category: "test_gap",
				severity: "medium",
				status: "suggested",
				evidence: ["Recovery fallback path has no spec"],
				createdAt: 1,
			},
		] as any

		const incoming = [
			{
				...existing[0],
				id: "two",
				createdAt: 2,
			},
		] as any

		expect(TechDebtService.dedupeItems(existing, incoming)).toEqual([])
	})
})
