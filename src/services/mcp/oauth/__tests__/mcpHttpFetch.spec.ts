// kilocode_change - new file
import { createMcpHttpFetch } from "../mcpHttpFetch"

describe("mcpHttpFetch", () => {
	it("uses undici fetch with HTTP/2-capable dispatcher when available", async () => {
		const dispatcherInstances: unknown[] = []
		const undiciFetch = vi.fn().mockResolvedValue({ ok: true })
		const loadUndici = vi.fn().mockResolvedValue({
			fetch: undiciFetch,
			Agent: class {
				constructor(options?: unknown) {
					dispatcherInstances.push(options)
				}
			},
		})
		const fallbackFetch = vi.fn()

		const mcpFetch = createMcpHttpFetch(loadUndici as any, fallbackFetch as any)
		await mcpFetch("https://example.com/mcp", { method: "GET" })

		expect(loadUndici).toHaveBeenCalled()
		expect(undiciFetch).toHaveBeenCalledWith(
			"https://example.com/mcp",
			expect.objectContaining({
				method: "GET",
				dispatcher: expect.any(Object),
			}),
		)
		expect(dispatcherInstances).toEqual([{ allowH2: true }])
		expect(fallbackFetch).not.toHaveBeenCalled()
	})

	it("falls back to regular fetch when undici setup fails", async () => {
		const fallbackFetch = vi.fn().mockResolvedValue({ ok: true })
		const mcpFetch = createMcpHttpFetch(async () => {
			throw new Error("undici unavailable")
		}, fallbackFetch as any)

		await mcpFetch("https://example.com/mcp", { method: "POST" })

		expect(fallbackFetch).toHaveBeenCalledWith("https://example.com/mcp", { method: "POST" })
	})

	it("stops retrying undici initialization after the first setup failure", async () => {
		const loadUndici = vi.fn(async () => {
			throw new Error("undici unavailable")
		})
		const fallbackFetch = vi.fn().mockResolvedValue({ ok: true })
		const mcpFetch = createMcpHttpFetch(loadUndici as any, fallbackFetch as any)

		await mcpFetch("https://example.com/mcp", { method: "GET" })
		await mcpFetch("https://example.com/mcp", { method: "POST" })

		expect(loadUndici).toHaveBeenCalledTimes(1)
		expect(fallbackFetch).toHaveBeenCalledTimes(2)
	})
})
