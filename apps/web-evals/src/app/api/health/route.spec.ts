import { GET } from "./route"

describe("health route", () => {
	it("returns ok response", async () => {
		const response = await GET()
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ status: "ok" })
	})
})
