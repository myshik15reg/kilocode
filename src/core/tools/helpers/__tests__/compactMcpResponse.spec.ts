import { compactMcpResponse } from "../compactMcpResponse"

describe("compactMcpResponse", () => {
	it("returns short responses unchanged", () => {
		const text = "short MCP response"

		expect(compactMcpResponse(text, { maxChars: 256, headChars: 20, tailChars: 20 })).toBe(text)
	})

	it("truncates long responses and keeps both ends", () => {
		const text = `${"A".repeat(80)}${"B".repeat(80)}${"C".repeat(80)}`

		const result = compactMcpResponse(text, { maxChars: 200, headChars: 40, tailChars: 30 })

		expect(result).toContain("[NOTE] MCP response truncated")
		expect(result.startsWith("A".repeat(40))).toBe(true)
		expect(result).toContain("C".repeat(5))
		expect(result.length).toBeLessThanOrEqual(200)
	})
})
