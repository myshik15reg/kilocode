// kilocode_change - new file
type UndiciLikeModule = {
	fetch: typeof fetch
	Agent: new (options?: Record<string, unknown>) => unknown
}

type RequestInitWithDispatcher = RequestInit & {
	dispatcher?: unknown
}

function getRequestOrigin(input: RequestInfo | URL): string | null {
	try {
		if (typeof input === "string") {
			return new URL(input).origin
		}

		if (input instanceof URL) {
			return input.origin
		}

		return new URL(input.url).origin
	} catch {
		return null
	}
}

export function createMcpHttpFetch(
	loadUndici: () => Promise<UndiciLikeModule> = async () => (await import("undici")) as unknown as UndiciLikeModule,
	fallbackFetch: typeof fetch = fetch,
): typeof fetch {
	const dispatcherByOrigin = new Map<string, unknown>()
	let undiciModulePromise: Promise<UndiciLikeModule> | undefined // kilocode_change
	let undiciUnavailable = false // kilocode_change

	return (async (input: RequestInfo | URL, init?: RequestInit) => {
		const origin = getRequestOrigin(input)
		if (!origin) {
			return fallbackFetch(input, init)
		}

		if (undiciUnavailable) {
			return fallbackFetch(input, init)
		}

		try {
			undiciModulePromise ??= loadUndici()
			const { fetch: undiciFetch, Agent } = await undiciModulePromise
			let dispatcher = dispatcherByOrigin.get(origin)
			if (!dispatcher) {
				dispatcher = new Agent({ allowH2: true })
				dispatcherByOrigin.set(origin, dispatcher)
			}

			const requestInit: RequestInitWithDispatcher = { ...(init ?? {}) }
			if (requestInit.dispatcher === undefined) {
				requestInit.dispatcher = dispatcher
			}

			return await undiciFetch(input, requestInit)
		} catch {
			undiciUnavailable = true
			undiciModulePromise = undefined
			return fallbackFetch(input, init)
		}
	}) as typeof fetch
}

export const mcpHttpFetch = createMcpHttpFetch()
