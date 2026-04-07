import { ZodError } from "zod"

vi.mock("next/headers", () => ({
	headers: vi.fn(),
}))

import { buildWebEvalsAuthFailureResponse, parseRunId } from "@/lib/server/auth"
import { parseBasicAuthHeader, validateWebEvalsAuthorizationHeader } from "@/lib/auth-shared"

describe("web-evals auth helpers", () => {
	const originalUsername = process.env.WEB_EVALS_AUTH_USERNAME
	const originalPassword = process.env.WEB_EVALS_AUTH_PASSWORD

	beforeEach(() => {
		process.env.WEB_EVALS_AUTH_USERNAME = "admin"
		process.env.WEB_EVALS_AUTH_PASSWORD = "secret"
	})

	afterEach(() => {
		if (originalUsername === undefined) {
			delete process.env.WEB_EVALS_AUTH_USERNAME
		} else {
			process.env.WEB_EVALS_AUTH_USERNAME = originalUsername
		}

		if (originalPassword === undefined) {
			delete process.env.WEB_EVALS_AUTH_PASSWORD
		} else {
			process.env.WEB_EVALS_AUTH_PASSWORD = originalPassword
		}
	})

	it("parses a valid Basic authorization header", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		expect(parseBasicAuthHeader(`Basic ${encoded}`)).toEqual({
			username: "admin",
			password: "secret",
		})
	})

	it("authorizes only matching configured credentials", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		expect(validateWebEvalsAuthorizationHeader(`Basic ${encoded}`)).toEqual({ status: "authorized" })
		expect(validateWebEvalsAuthorizationHeader(null)).toEqual({
			status: "unauthorized",
			message: "Authentication is required.",
		})
	})

	it("returns 401 with WWW-Authenticate when credentials are missing or invalid", () => {
		const response = buildWebEvalsAuthFailureResponse(null)
		expect(response?.status).toBe(401)
		expect(response?.headers.get("WWW-Authenticate")).toContain("Basic realm=")
	})

	it("returns 503 when auth is not configured", () => {
		delete process.env.WEB_EVALS_AUTH_USERNAME
		delete process.env.WEB_EVALS_AUTH_PASSWORD

		const response = buildWebEvalsAuthFailureResponse(null)
		expect(response?.status).toBe(503)
		expect(response?.headers.get("WWW-Authenticate")).toBeNull()
	})

	it("rejects non-positive run identifiers", () => {
		expect(() => parseRunId(0)).toThrow(ZodError)
	})
})
