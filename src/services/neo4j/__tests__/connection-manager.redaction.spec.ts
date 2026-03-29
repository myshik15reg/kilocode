// kilocode_change: file added
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Neo4jConnectionManager } from "../connection-manager"

vi.mock("neo4j-driver", () => {
	const mockDriver = {
		verifyConnectivity: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
	}

	const mockAuth = {
		basic: vi.fn(),
	}

	return {
		__esModule: true,
		default: {
			driver: vi.fn().mockReturnValue(mockDriver),
			auth: mockAuth,
		},
		auth: mockAuth,
	}
})

describe("Neo4jConnectionManager (URI redaction)", () => {
	beforeEach(async () => {
		// Reset singleton state between tests
		const manager = Neo4jConnectionManager.getInstance() as any
		await manager.disconnect?.().catch(() => {})
		// FIX: 2026-02-19-reviewer-neo4j-uri-log-redaction (TestAnalyzer)
		// Root cause: `vi.restoreAllMocks()` сбрасывал `vi.fn()`-мок `neo4j.driver()` к дефолту (return undefined),
		// из-за чего `Neo4jConnectionManager.connect()` падал на `this.driver.verifyConnectivity()`.
		vi.clearAllMocks()
	})

	it("logs a redacted URI (scheme + host:port) without userinfo/query", async () => {
		// FIX: 2026-02-19-reviewer-neo4j-uri-log-redaction (TestAnalyzer)
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

		try {
			const manager = Neo4jConnectionManager.getInstance()
			await manager.connect({
				uri: "bolt://neo4j:password@db.example.com:7687/?token=abc#frag",
				username: "neo4j",
				password: "password",
			})

			const logged = logSpy.mock.calls.map((call) => String(call[0])).join("\n")
			expect(logged).toContain("bolt://db.example.com:7687")
			expect(logged).not.toContain("neo4j:password")
			expect(logged).not.toContain("token=abc")
		} finally {
			logSpy.mockRestore()
		}
	})
})
