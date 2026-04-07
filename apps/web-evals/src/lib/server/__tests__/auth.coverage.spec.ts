import { ZodError } from "zod"

const mocked = vi.hoisted(() => ({
	headersMock: vi.fn(),
}))

vi.mock("next/headers", () => ({
	headers: mocked.headersMock,
}))

import {
	WEB_EVALS_AUTH_REALM,
	getWebEvalsAuthCredentials,
	parseBasicAuthHeader,
	validateWebEvalsAuthorizationHeader,
} from "@/lib/auth-shared"
import { buildWebEvalsAuthFailureResponse, parseRunId, requireWebEvalsAuthorization } from "@/lib/server/auth"

describe("web-evals auth coverage", () => {
	const originalUsername = process.env.WEB_EVALS_AUTH_USERNAME
	const originalPassword = process.env.WEB_EVALS_AUTH_PASSWORD

	beforeEach(() => {
		process.env.WEB_EVALS_AUTH_USERNAME = " admin "
		process.env.WEB_EVALS_AUTH_PASSWORD = " secret "
		mocked.headersMock.mockReset()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
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

	it("reads trimmed credentials from the environment", () => {
		expect(getWebEvalsAuthCredentials()).toEqual({ username: "admin", password: "secret" })
	})

	it("returns null when either credential is missing", () => {
		delete process.env.WEB_EVALS_AUTH_PASSWORD
		expect(getWebEvalsAuthCredentials()).toBeNull()
	})

	it("parses valid basic auth headers and rejects malformed variants", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		const withoutSeparator = Buffer.from("noseparator", "utf8").toString("base64")

		expect(parseBasicAuthHeader(`Basic ${encoded}`)).toEqual({ username: "admin", password: "secret" })
		expect(parseBasicAuthHeader("Bearer token")).toBeNull()
		expect(parseBasicAuthHeader(`Basic ${withoutSeparator}`)).toBeNull()
		expect(parseBasicAuthHeader(null)).toBeNull()
	})

	it("falls back to Buffer when atob is unavailable", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		vi.stubGlobal("atob", undefined)

		expect(parseBasicAuthHeader(`Basic ${encoded}`)).toEqual({ username: "admin", password: "secret" })
	})

	it("returns null when no base64 decoder is available", () => {
		vi.stubGlobal("atob", undefined)
		vi.stubGlobal("Buffer", undefined)

		expect(parseBasicAuthHeader("Basic broken")).toBeNull()
	})

	it("returns null when base64 decoding fails", () => {
		vi.stubGlobal(
			"atob",
			vi.fn(() => {
				throw new Error("bad base64")
			}),
		)

		expect(parseBasicAuthHeader("Basic broken")).toBeNull()
	})

	it("distinguishes authorized, unauthorized, and misconfigured requests", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		const wrong = Buffer.from("admin:wrong", "utf8").toString("base64")

		expect(validateWebEvalsAuthorizationHeader(`Basic ${encoded}`)).toEqual({ status: "authorized" })
		expect(validateWebEvalsAuthorizationHeader(`Basic ${wrong}`)).toEqual({
			status: "unauthorized",
			message: "Authentication is required.",
		})

		delete process.env.WEB_EVALS_AUTH_USERNAME
		delete process.env.WEB_EVALS_AUTH_PASSWORD
		expect(validateWebEvalsAuthorizationHeader(null)).toEqual({
			status: "misconfigured",
			message:
				"Web evals authentication is not configured. Set WEB_EVALS_AUTH_USERNAME and WEB_EVALS_AUTH_PASSWORD.",
		})
	})

	it("builds challenge responses and skips them for authorized requests", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		expect(buildWebEvalsAuthFailureResponse(`Basic ${encoded}`)).toBeUndefined()

		const response = buildWebEvalsAuthFailureResponse(null)
		expect(response?.status).toBe(401)
		expect(response?.headers.get("WWW-Authenticate")).toBe(`Basic realm="${WEB_EVALS_AUTH_REALM}"`)
	})

	it("throws typed authorization errors from request headers", async () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		mocked.headersMock.mockResolvedValueOnce({ get: vi.fn().mockReturnValue(`Basic ${encoded}`) })
		await expect(requireWebEvalsAuthorization()).resolves.toBeUndefined()

		mocked.headersMock.mockResolvedValueOnce({ get: vi.fn().mockReturnValue(null) })
		await expect(requireWebEvalsAuthorization()).rejects.toMatchObject({
			name: "WebEvalsAuthorizationError",
			status: 401,
			message: "Authentication is required.",
		})

		delete process.env.WEB_EVALS_AUTH_USERNAME
		delete process.env.WEB_EVALS_AUTH_PASSWORD
		mocked.headersMock.mockResolvedValueOnce({ get: vi.fn().mockReturnValue(null) })
		await expect(requireWebEvalsAuthorization()).rejects.toMatchObject({
			name: "WebEvalsAuthorizationError",
			status: 503,
		})
	})

	it("parses only positive integer run identifiers", () => {
		expect(parseRunId(5)).toBe(5)
		expect(() => parseRunId(0)).toThrow(ZodError)
	})
})
