describe("redisClient", () => {
	afterEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		delete process.env.REDIS_URL
	})

	it("creates and caches a redis client with the default url", async () => {
		const client = {
			on: vi.fn(),
			connect: vi.fn().mockResolvedValue(undefined),
		}
		const createClient = vi.fn(() => client)
		vi.doMock("redis", () => ({ createClient }))

		const { redisClient } = await import("@/lib/server/redis")
		await expect(redisClient()).resolves.toBe(client)
		await expect(redisClient()).resolves.toBe(client)

		expect(createClient).toHaveBeenCalledTimes(1)
		expect(createClient).toHaveBeenCalledWith({ url: "redis://localhost:6379" })
		expect(client.on).toHaveBeenCalledWith("error", expect.any(Function))
		expect(client.connect).toHaveBeenCalledTimes(1)
	})

	it("uses REDIS_URL when it is configured", async () => {
		process.env.REDIS_URL = "redis://example.test:6380"
		const client = {
			on: vi.fn(),
			connect: vi.fn().mockResolvedValue(undefined),
		}
		const createClient = vi.fn(() => client)
		vi.doMock("redis", () => ({ createClient }))

		const { redisClient } = await import("@/lib/server/redis")
		await expect(redisClient()).resolves.toBe(client)

		expect(createClient).toHaveBeenCalledWith({ url: "redis://example.test:6380" })
	})
})
