export const WEB_EVALS_AUTH_REALM = "AlfaCode Evals"

export type WebEvalsAuthCredentials = {
	username: string
	password: string
}

export type WebEvalsAuthorizationCheck =
	| { status: "authorized" }
	| { status: "unauthorized"; message: string }
	| { status: "misconfigured"; message: string }

function decodeBase64(value: string): string {
	if (typeof globalThis.atob === "function") {
		return globalThis.atob(value)
	}

	if (typeof Buffer !== "undefined") {
		return Buffer.from(value, "base64").toString("utf8")
	}

	throw new Error("No base64 decoder is available in this runtime")
}

export function getWebEvalsAuthCredentials(env: NodeJS.ProcessEnv = process.env): WebEvalsAuthCredentials | null {
	const username = env.WEB_EVALS_AUTH_USERNAME?.trim()
	const password = env.WEB_EVALS_AUTH_PASSWORD?.trim()

	if (!username || !password) {
		return null
	}

	return { username, password }
}

export function parseBasicAuthHeader(authorizationHeader: string | null | undefined): WebEvalsAuthCredentials | null {
	if (!authorizationHeader) {
		return null
	}

	const [scheme, encoded] = authorizationHeader.split(/\s+/, 2)
	if (!scheme || !encoded || scheme.toLowerCase() !== "basic") {
		return null
	}

	try {
		const decoded = decodeBase64(encoded)
		const separatorIndex = decoded.indexOf(":")
		if (separatorIndex < 0) {
			return null
		}

		return {
			username: decoded.slice(0, separatorIndex),
			password: decoded.slice(separatorIndex + 1),
		}
	} catch {
		return null
	}
}

export function validateWebEvalsAuthorizationHeader(
	authorizationHeader: string | null | undefined,
	env: NodeJS.ProcessEnv = process.env,
): WebEvalsAuthorizationCheck {
	const configuredCredentials = getWebEvalsAuthCredentials(env)
	if (!configuredCredentials) {
		return {
			status: "misconfigured",
			message:
				"Web evals authentication is not configured. Set WEB_EVALS_AUTH_USERNAME and WEB_EVALS_AUTH_PASSWORD.",
		}
	}

	const providedCredentials = parseBasicAuthHeader(authorizationHeader)
	if (!providedCredentials) {
		return {
			status: "unauthorized",
			message: "Authentication is required.",
		}
	}

	if (
		providedCredentials.username !== configuredCredentials.username ||
		providedCredentials.password !== configuredCredentials.password
	) {
		return {
			status: "unauthorized",
			message: "Authentication is required.",
		}
	}

	return { status: "authorized" }
}
