import {
	getModelId,
	type LocalAiDiagnosticsCheckResult,
	type LocalAiDiagnosticsResultPayload,
	type ProviderSettings,
	type ProviderSettingsEntry,
} from "@roo-code/types"

import { getModels } from "../../api/providers/fetchers/modelCache"
import { HelperModelRouter } from "../helper-routing/HelperModelRouter"
import { singleCompletionHandler } from "../../utils/single-completion-handler"

// kilocode_change - new file

type DiagnosticsRuntime = {
	getState(): Promise<{
		apiConfiguration?: ProviderSettings
		enhancementApiConfigId?: string
		condensingApiConfigId?: string
		listApiConfigMeta?: ProviderSettingsEntry[]
		helperLocalityPreference?: "off" | "prefer" | "require"
		orchestrationEscalationSensitivity?: "conservative" | "balanced" | "aggressive"
		orchestrationTelemetryEnabled?: boolean
		codebaseIndexConfig?: {
			codebaseIndexEmbedderProvider?: string
			codebaseIndexEmbedderBaseUrl?: string
			codebaseIndexEmbedderModelId?: string
			codebaseIndexRerankEnabled?: boolean
			codebaseIndexRerankBaseUrl?: string
			codebaseIndexRerankModelId?: string
		}
	}>
	providerSettingsManager: {
		getProfile(
			params: { id: string } | { name: string },
		): Promise<(ProviderSettings & { name: string; id?: string }) | undefined>
	}
	contextProxy?: {
		getSecret?(key: string): string | undefined
	}
	log(message: string): void
}

const LOCAL_PROVIDER_NAMES = new Set(["ollama", "lmstudio"])

function ok(checkId: string, title: string, message: string, details?: string[]): LocalAiDiagnosticsCheckResult {
	return { checkId, status: "ok", title, message, details }
}

function warning(checkId: string, title: string, message: string, details?: string[]): LocalAiDiagnosticsCheckResult {
	return { checkId, status: "warning", title, message, details }
}

function failed(checkId: string, title: string, message: string, details?: string[]): LocalAiDiagnosticsCheckResult {
	return { checkId, status: "failed", title, message, details }
}

function isConfigured(provider: ProviderSettings | undefined, providerName: string): boolean {
	return provider?.apiProvider === providerName
}

async function getProfilesByProvider(
	runtime: DiagnosticsRuntime,
	entries: ProviderSettingsEntry[],
	providerName: string,
): Promise<Array<ProviderSettings & { name: string; id?: string }>> {
	const matches = entries.filter((entry) => entry.apiProvider === providerName)
	const profiles = await Promise.all(
		matches.map((entry) => runtime.providerSettingsManager.getProfile({ id: entry.id })),
	)
	return profiles.filter((profile): profile is ProviderSettings & { name: string; id?: string } =>
		Boolean(profile?.apiProvider),
	)
}

async function resolveLocalHelperRoute(
	runtime: DiagnosticsRuntime,
	state: Awaited<ReturnType<DiagnosticsRuntime["getState"]>>,
) {
	if (!state.apiConfiguration?.apiProvider) {
		return undefined
	}

	try {
		const route = await HelperModelRouter.selectConfig({
			job: "search_assist",
			state: {
				apiConfiguration: state.apiConfiguration,
				enhancementApiConfigId: state.enhancementApiConfigId,
				condensingApiConfigId: state.condensingApiConfigId,
				listApiConfigMeta: state.listApiConfigMeta,
				helperLocalityPreference: state.helperLocalityPreference,
				orchestrationEscalationSensitivity: state.orchestrationEscalationSensitivity,
				orchestrationTelemetryEnabled: state.orchestrationTelemetryEnabled,
			},
			providerSettingsManager: runtime.providerSettingsManager as any,
		})

		return LOCAL_PROVIDER_NAMES.has(route.provider) ? route : undefined
	} catch (error) {
		runtime.log(
			`[localAiDiagnostics] Helper routing lookup failed: ${error instanceof Error ? error.message : String(error)}`,
		)
		return undefined
	}
}

export async function runLocalAiDiagnostics(runtime: DiagnosticsRuntime): Promise<LocalAiDiagnosticsResultPayload> {
	const state = await runtime.getState()
	const entries = state.listApiConfigMeta ?? []
	const checks: LocalAiDiagnosticsCheckResult[] = []

	const activeOllama = isConfigured(state.apiConfiguration, "ollama")
	const activeLiteLLM = isConfigured(state.apiConfiguration, "litellm")
	const ollamaProfiles = await getProfilesByProvider(runtime, entries, "ollama")
	const liteLLMProfiles = await getProfilesByProvider(runtime, entries, "litellm")
	const localHelperRoute = await resolveLocalHelperRoute(runtime, state)

	if (ollamaProfiles.length === 0 && !activeOllama) {
		checks.push(warning("ollama-service", "Ollama", "No Ollama profile is configured."))
	} else {
		const ollamaProfile = ollamaProfiles[0] ?? state.apiConfiguration
		try {
			const models = await getModels({
				provider: "ollama",
				baseUrl: ollamaProfile?.ollamaBaseUrl,
				apiKey: ollamaProfile?.ollamaApiKey,
				numCtx: ollamaProfile?.ollamaNumCtx,
			})
			const modelId = getModelId(ollamaProfile as ProviderSettings)
			if (modelId && !Object.prototype.hasOwnProperty.call(models, modelId)) {
				checks.push(
					failed(
						"ollama-service",
						"Ollama",
						`Ollama is reachable, but model '${modelId}' is missing from the local catalog.`,
						[`Discovered models: ${Object.keys(models).slice(0, 10).join(", ") || "none"}`],
					),
				)
			} else {
				checks.push(
					ok(
						"ollama-service",
						"Ollama",
						`Ollama is reachable${modelId ? ` and model '${modelId}' is available` : ""}.`,
						[`Profiles: ${(ollamaProfiles.length || (activeOllama ? 1 : 0)).toString()}`],
					),
				)
			}
		} catch (error) {
			checks.push(
				failed(
					"ollama-service",
					"Ollama",
					`Failed to reach Ollama: ${error instanceof Error ? error.message : String(error)}`,
				),
			)
		}
	}

	if (liteLLMProfiles.length === 0 && !activeLiteLLM) {
		checks.push(warning("litellm-service", "LiteLLM", "No LiteLLM profile is configured."))
	} else {
		const liteLLMProfile = liteLLMProfiles[0] ?? state.apiConfiguration
		try {
			const models = await getModels({
				provider: "litellm",
				baseUrl: liteLLMProfile?.litellmBaseUrl,
				apiKey: liteLLMProfile?.litellmApiKey,
			})
			const modelId = getModelId(liteLLMProfile as ProviderSettings)
			if (modelId && !Object.prototype.hasOwnProperty.call(models, modelId)) {
				checks.push(
					failed(
						"litellm-service",
						"LiteLLM",
						`LiteLLM is reachable, but model '${modelId}' is not exposed by its model list.`,
						[`Discovered models: ${Object.keys(models).slice(0, 10).join(", ") || "none"}`],
					),
				)
			} else {
				checks.push(
					ok(
						"litellm-service",
						"LiteLLM",
						`LiteLLM baseUrl/auth smoke test passed${modelId ? ` for '${modelId}'` : ""}.`,
					),
				)
			}
		} catch (error) {
			checks.push(
				failed(
					"litellm-service",
					"LiteLLM",
					`LiteLLM smoke test failed: ${error instanceof Error ? error.message : String(error)}`,
				),
			)
		}
	}

	const localProfiles = entries.filter((entry) => entry.apiProvider && LOCAL_PROVIDER_NAMES.has(entry.apiProvider))
	if (localProfiles.length === 0) {
		checks.push(warning("local-helper-discovery", "Local helper profiles", "No local helper profiles were found."))
	} else {
		checks.push(
			ok(
				"local-helper-discovery",
				"Local helper profiles",
				`Discovered ${localProfiles.length} local helper profile(s).`,
				localProfiles.map((profile) => `${profile.name} (${profile.apiProvider})`),
			),
		)
	}

	if (!localHelperRoute?.config?.apiProvider) {
		checks.push(
			warning(
				"local-helper-runtime",
				"Local helper runtime",
				"No runnable local helper route is currently available for helper jobs.",
			),
		)
	} else {
		try {
			const completion = await singleCompletionHandler(localHelperRoute.config, "Reply with OK")
			const compact = completion.replace(/\s+/g, " ").trim()
			checks.push(
				ok(
					"local-helper-runtime",
					"Local helper runtime",
					`Helper singleCompletion smoke passed via ${localHelperRoute.provider}.`,
					[`Response: ${compact.slice(0, 80) || "<empty>"}`],
				),
			)
		} catch (error) {
			checks.push(
				failed(
					"local-helper-runtime",
					"Local helper runtime",
					`Helper singleCompletion smoke failed: ${error instanceof Error ? error.message : String(error)}`,
				),
			)
		}
	}

	const codebaseIndexConfig = state.codebaseIndexConfig
	if (
		codebaseIndexConfig?.codebaseIndexEmbedderProvider === "ollama" &&
		codebaseIndexConfig.codebaseIndexEmbedderModelId
	) {
		try {
			const models = await getModels({
				provider: "ollama",
				baseUrl: codebaseIndexConfig.codebaseIndexEmbedderBaseUrl,
			})
			const modelId = codebaseIndexConfig.codebaseIndexEmbedderModelId
			checks.push(
				Object.prototype.hasOwnProperty.call(models, modelId)
					? ok("local-embedder", "Local embedder", `Embedding model '${modelId}' is reachable via Ollama.`)
					: failed(
							"local-embedder",
							"Local embedder",
							`Embedding model '${modelId}' is missing from the Ollama catalog.`,
						),
			)
		} catch (error) {
			checks.push(
				failed(
					"local-embedder",
					"Local embedder",
					`Embedding smoke failed: ${error instanceof Error ? error.message : String(error)}`,
				),
			)
		}
	} else {
		checks.push(warning("local-embedder", "Local embedder", "No local embedding model is configured."))
	}

	if (codebaseIndexConfig?.codebaseIndexRerankEnabled && codebaseIndexConfig.codebaseIndexRerankBaseUrl) {
		const baseUrl = codebaseIndexConfig.codebaseIndexRerankBaseUrl.replace(/\/+$/, "")
		const modelId = codebaseIndexConfig.codebaseIndexRerankModelId || "unknown"
		const apiKey = runtime.contextProxy?.getSecret?.("codebaseIndexRerankApiKey")
		try {
			const response = await fetch(`${baseUrl}/v1/models`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
			})
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`)
			}
			const payload = (await response.json()) as { data?: Array<{ id?: string }> }
			const modelFound = payload.data?.some((item) => item.id === modelId)
			checks.push(
				modelFound
					? ok("local-reranker", "Local reranker", `Reranker model '${modelId}' is reachable.`)
					: warning(
							"local-reranker",
							"Local reranker",
							`Reranker endpoint responded, but model '${modelId}' was not listed.`,
						),
			)
		} catch (error) {
			checks.push(
				failed(
					"local-reranker",
					"Local reranker",
					`Reranker smoke failed: ${error instanceof Error ? error.message : String(error)}`,
				),
			)
		}
	} else {
		checks.push(warning("local-reranker", "Local reranker", "No local reranker is configured."))
	}

	return {
		ranAt: new Date().toISOString(),
		checks,
	}
}
