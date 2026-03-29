// kilocode_change: file added
import { describe, expect, it, vi } from "vitest"

import { Neo4jGraphService } from "../graph-service"

describe("Neo4jGraphService (cypher numeric normalization)", () => {
	it("clamps/normalizes depth/maxDepth and limit before embedding into Cypher", async () => {
		// FIX: 2026-02-19-reviewer-neo4j-cypher-numeric-normalization (TestAnalyzer)
		const executeRead = vi.fn().mockResolvedValue([])
		const mockConnectionManager = {
			executeRead,
			executeWrite: vi.fn(),
			isConnected: vi.fn().mockReturnValue(true),
		} as any

		const service = new Neo4jGraphService(mockConnectionManager)

		await service.getDependencies("e1", "2.9" as any)
		expect(executeRead).toHaveBeenCalledTimes(1)
		expect(executeRead.mock.calls[0][0]).toContain("[*1..2]")

		executeRead.mockClear()
		await service.getDependents("e1", "0" as any)
		expect(executeRead).toHaveBeenCalledTimes(1)
		expect(executeRead.mock.calls[0][0]).toContain("[*1..1]")

		executeRead.mockClear()
		await service.findPath("from", "to", 999 as any)
		expect(executeRead).toHaveBeenCalledTimes(1)
		expect(executeRead.mock.calls[0][0]).toContain("[*1..25]")

		executeRead.mockClear()
		await service.searchEntities({ name: "x" }, { limit: "10000" as any })
		expect(executeRead).toHaveBeenCalledTimes(1)
		expect(executeRead.mock.calls[0][0]).toContain("LIMIT 1000")
	})
})
