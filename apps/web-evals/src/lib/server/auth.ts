import { headers } from "next/headers"
import { z } from "zod"

import {
	WEB_EVALS_AUTH_REALM,
	validateWebEvalsAuthorizationHeader,
	type WebEvalsAuthorizationCheck,
} from "@/lib/auth-shared"

export const runIdSchema = z.number().int().positive()
export const nullableDescriptionSchema = z.string().nullable()

export class WebEvalsAuthorizationError extends Error {
	constructor(
		message: string,
		public readonly status: 401 | 503,
	) {
		super(message)
		this.name = "WebEvalsAuthorizationError"
	}
}

function buildAuthorizationError(result: Exclude<WebEvalsAuthorizationCheck, { status: "authorized" }>) {
	return new WebEvalsAuthorizationError(result.message, result.status === "misconfigured" ? 503 : 401)
}

export function buildWebEvalsAuthFailureResponse(authorizationHeader: string | null | undefined): Response | undefined {
	const result = validateWebEvalsAuthorizationHeader(authorizationHeader)
	if (result.status === "authorized") {
		return undefined
	}

	const responseHeaders = new Headers({
		"Content-Type": "text/plain; charset=utf-8",
	})

	if (result.status === "unauthorized") {
		responseHeaders.set("WWW-Authenticate", `Basic realm="${WEB_EVALS_AUTH_REALM}"`)
	}

	const error = buildAuthorizationError(result)
	return new Response(error.message, {
		status: error.status,
		headers: responseHeaders,
	})
}

export async function requireWebEvalsAuthorization(): Promise<void> {
	const requestHeaders = await headers()
	const result = validateWebEvalsAuthorizationHeader(requestHeaders.get("authorization"))
	if (result.status === "authorized") {
		return
	}

	throw buildAuthorizationError(result)
}

export function parseRunId(input: unknown): number {
	return runIdSchema.parse(input)
}
