import { NextResponse, type NextRequest } from "next/server"

import { WEB_EVALS_AUTH_REALM, validateWebEvalsAuthorizationHeader } from "@/lib/auth-shared"

export function middleware(request: NextRequest) {
	if (request.nextUrl.pathname === "/api/health") {
		return NextResponse.next()
	}

	const result = validateWebEvalsAuthorizationHeader(request.headers.get("authorization"))
	if (result.status === "authorized") {
		return NextResponse.next()
	}

	const responseHeaders = new Headers({
		"Content-Type": "text/plain; charset=utf-8",
	})

	if (result.status === "unauthorized") {
		responseHeaders.set("WWW-Authenticate", `Basic realm="${WEB_EVALS_AUTH_REALM}"`)
	}

	return new NextResponse(result.message, {
		status: result.status === "misconfigured" ? 503 : 401,
		headers: responseHeaders,
	})
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
