vi.mock("next/server", () => {
	class MockNextResponse extends Response {
		static next() {
			return new MockNextResponse(null, {
				status: 200,
				headers: { "x-middleware-next": "1" },
			})
		}
	}

	return {
		NextResponse: MockNextResponse,
	}
})

import { WEB_EVALS_AUTH_REALM } from "@/lib/auth-shared"
import { config, middleware } from "@/middleware"

function createRequest(pathname: string, authorizationHeader?: string | null) {
	return {
		nextUrl: { pathname },
		headers: {
			get: vi.fn().mockReturnValue(authorizationHeader ?? null),
		},
	}
}

describe("web-evals middleware", () => {
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

	it("allows health checks without authentication", () => {
		const response = middleware(createRequest("/api/health") as never)
		expect(response.headers.get("x-middleware-next")).toBe("1")
	})

	it("allows authenticated requests to continue", () => {
		const encoded = Buffer.from("admin:secret", "utf8").toString("base64")
		const response = middleware(createRequest("/runs/1", `Basic ${encoded}`) as never)
		expect(response.headers.get("x-middleware-next")).toBe("1")
	})

	it("returns a 401 challenge for missing credentials", async () => {
		const response = middleware(createRequest("/runs/1") as never)
		expect(response.status).toBe(401)
		expect(await response.text()).toBe("Authentication is required.")
		expect(response.headers.get("WWW-Authenticate")).toBe(`Basic realm="${WEB_EVALS_AUTH_REALM}"`)
	})

	it("returns 503 when auth credentials are not configured", async () => {
		delete process.env.WEB_EVALS_AUTH_USERNAME
		delete process.env.WEB_EVALS_AUTH_PASSWORD

		const response = middleware(createRequest("/runs/1") as never)
		expect(response.status).toBe(503)
		expect(await response.text()).toContain("Web evals authentication is not configured")
		expect(response.headers.get("WWW-Authenticate")).toBeNull()
	})

	it("exports the expected matcher configuration", () => {
		expect(config).toEqual({
			matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
		})
	})
})
