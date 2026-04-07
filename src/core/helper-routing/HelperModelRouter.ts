// kilocode_change - new file
import { getModelId, type ProviderSettings } from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { getModels } from "../../api/providers/fetchers/modelCache"
import type { ProviderSettingsManager } from "../config/ProviderSettingsManager"

export const HELPER_JOBS = [
	"condense",
	"search_assist",
	"summarize_branch",
	"tech_debt_extract",
	"relay_compact",
] as const

export type HelperJob = (typeof HELPER_JOBS)[number]
export type HelperLocalityPreference = "off" | "prefer" | "require"
export type OrchestrationEscalationSensitivity = "conservative" | "balanced" | "aggressive"
export type HelperCapabilityClass = "cheap_helper" | "recovery_condense" | "retrieval_assist"

export interface HelperJobCatalogEntry {
	status: "active" | "deferred"
	productionEntrypoints: readonly string[]
	fallbackBehavior: string
	deferredReason?: string
}

export const HELPER_JOB_CATALOG = {
	condense: {
		status: "active",
		productionEntrypoints: [
			"src/core/task/Task.ts:1783",
			"src/core/task/Task.ts:1800",
			"src/core/task/Task.ts:4341",
		],
		fallbackBehavior: "Uses the primary task API handler when helper routing selects the primary model or throws.",
	},
	search_assist: {
		status: "active",
		productionEntrypoints: [
			"src/core/webview/webviewMessageHandler.ts:4898",
			"src/core/webview/webviewSingleCompletion.ts:29",
		],
		fallbackBehavior:
			"Uses the primary model on the routed webview singleCompletion path when helper routing selects the primary model or throws.",
	},
	summarize_branch: {
		status: "active",
		productionEntrypoints: ["src/core/webview/ClineProvider.ts:4344", "src/core/webview/branchTask.ts:28"],
		fallbackBehavior: "Falls back to the raw branch summary when helper routing or summarization fails.",
	},
	tech_debt_extract: {
		status: "active",
		productionEntrypoints: ["src/core/webview/ClineProvider.ts:3139", "src/core/webview/ClineProvider.ts:3147"],
		fallbackBehavior: "Uses the primary config when helper routing selects the main profile.",
	},
	relay_compact: {
		status: "active",
		productionEntrypoints: ["src/core/webview/ClineProvider.ts:3772", "src/core/webview/ClineProvider.ts:3787"],
		fallbackBehavior: "Falls back to the heuristic restart summary when helper routing or helper completion fails.",
	},
} satisfies Record<HelperJob, HelperJobCatalogEntry>

export interface HelperRouterStateLike {
	apiConfiguration: ProviderSettings
	enhancementApiConfigId?: string
	condensingApiConfigId?: string
	listApiConfigMeta?: Array<{ id: string; name?: string }>
	helperLocalityPreference?: HelperLocalityPreference
	orchestrationEscalationSensitivity?: OrchestrationEscalationSensitivity
	orchestrationTelemetryEnabled?: boolean
}

export interface HelperRoutingDecisionContext {
	taskId?: string
	contextWindowSize?: number
	retrievalConfidence?: number
	retryCount?: number
	toolDenialCount?: number
}

export interface HelperRouteSelection {
	job: HelperJob
	config: ProviderSettings
	source: "primary" | "configured_helper" | "local_profile" | "primary_local"
	provider: string
	modelId?: string
	capabilityClass?: HelperCapabilityClass
	escalated?: boolean
}

type HelperRouteCandidate = {
	source: HelperRouteSelection["source"]
	config: ProviderSettings
	priority: number
}

type LocalAvailabilityCacheEntry = {
	available: boolean
	expiresAt: number
}

const LOCAL_PROVIDER_CACHE_TTL_MS = 30_000
const LOCAL_PROVIDER_NAMES = new Set(["ollama", "lmstudio"])
const getProviderName = (config: ProviderSettings): string => config.apiProvider ?? "unknown"

function getCapabilityClass(job: HelperJob): HelperCapabilityClass {
	switch (job) {
		case "search_assist":
			return "retrieval_assist"
		case "condense":
		case "relay_compact":
			return "recovery_condense"
		default:
			return "cheap_helper"
	}
}

function isLocalProvider(provider?: string): boolean {
	return provider !== undefined && LOCAL_PROVIDER_NAMES.has(provider)
}

export class HelperModelRouter {
	private static readonly localAvailabilityCache = new Map<string, LocalAvailabilityCacheEntry>()

	static async selectConfig(params: {
		job: HelperJob
		state: HelperRouterStateLike
		providerSettingsManager: ProviderSettingsManager
		decisionContext?: HelperRoutingDecisionContext
	}): Promise<HelperRouteSelection> {
		const { job, state, providerSettingsManager, decisionContext } = params
		const primaryConfig = state.apiConfiguration
		const localityPreference = state.helperLocalityPreference ?? "prefer"
		const escalationSensitivity = state.orchestrationEscalationSensitivity ?? "balanced"
		const escalated = this.shouldEscalate(decisionContext, escalationSensitivity)
		const capabilityClass = getCapabilityClass(job)

		const primaryLocal = await this.resolvePrimaryLocal(primaryConfig)
		const configuredHelper = await this.getConfiguredHelperProfile(job, state, providerSettingsManager)
		const localConfiguredHelper =
			configuredHelper && (await this.isAvailableLocalConfig(configuredHelper)) ? configuredHelper : undefined
		const discoveredLocalProfile = await this.findDiscoveredLocalProfile(
			localConfiguredHelper,
			state,
			providerSettingsManager,
		)

		const candidates: Array<HelperRouteCandidate | undefined> = [
			primaryLocal
				? {
						source: "primary_local",
						config: primaryLocal,
						priority: this.getPriority("primary_local", localityPreference, escalated, true),
					}
				: undefined,
			localConfiguredHelper
				? {
						source: "local_profile",
						config: localConfiguredHelper,
						priority: this.getPriority("local_profile", localityPreference, escalated, true),
					}
				: undefined,
			discoveredLocalProfile
				? {
						source: "local_profile",
						config: discoveredLocalProfile,
						priority: this.getPriority("local_profile", localityPreference, escalated, true),
					}
				: undefined,
			configuredHelper
				? {
						source: "configured_helper",
						config: configuredHelper,
						priority: this.getPriority(
							"configured_helper",
							localityPreference,
							escalated,
							isLocalProvider(configuredHelper.apiProvider),
						),
					}
				: undefined,
			{
				source: "primary",
				config: primaryConfig,
				priority: this.getPriority(
					"primary",
					localityPreference,
					escalated,
					isLocalProvider(primaryConfig.apiProvider),
				),
			},
		].filter((candidate): candidate is HelperRouteCandidate => Boolean(candidate))

		const selected = [...candidates].sort(
			(left, right) => (right?.priority ?? -Infinity) - (left?.priority ?? -Infinity),
		)[0]!

		const route: HelperRouteSelection = {
			job,
			config: selected.config,
			source: selected.source,
			provider: getProviderName(selected.config),
			modelId: getModelId(selected.config),
			capabilityClass,
			escalated,
		}

		if (state.orchestrationTelemetryEnabled) {
			TelemetryService.instance.captureHelperModelRouted({
				taskId: decisionContext?.taskId,
				helperJob: job,
				helperSource: route.source,
				helperLocalityPreference: localityPreference,
				orchestrationEscalationSensitivity: escalationSensitivity,
				contextWindowSize: decisionContext?.contextWindowSize,
				retrievalConfidence: decisionContext?.retrievalConfidence,
				retryCount: decisionContext?.retryCount,
				toolDenialCount: decisionContext?.toolDenialCount,
				selectedProvider: route.provider,
				selectedModelId: route.modelId,
				isLocalProvider: isLocalProvider(route.provider),
				escalated,
			})
		}

		return route
	}

	private static shouldEscalate(
		decisionContext: HelperRoutingDecisionContext | undefined,
		sensitivity: OrchestrationEscalationSensitivity,
	): boolean {
		if (!decisionContext) {
			return false
		}

		const thresholds = {
			conservative: { confidence: 0.25, retries: 2, denials: 3 },
			balanced: { confidence: 0.45, retries: 1, denials: 2 },
			aggressive: { confidence: 0.6, retries: 1, denials: 1 },
		}[sensitivity]

		if (
			typeof decisionContext.retrievalConfidence === "number" &&
			decisionContext.retrievalConfidence < thresholds.confidence
		) {
			return true
		}

		if ((decisionContext.retryCount ?? 0) >= thresholds.retries) {
			return true
		}

		if ((decisionContext.toolDenialCount ?? 0) >= thresholds.denials) {
			return true
		}

		return false
	}

	private static getPriority(
		source: HelperRouteSelection["source"],
		localityPreference: HelperLocalityPreference,
		escalated: boolean,
		candidateIsLocal: boolean,
	): number {
		const baseline = {
			primary_local: 50,
			local_profile: 40,
			configured_helper: 30,
			primary: 10,
		}[source]

		const localityAdjustment = {
			off: { primary_local: 0, local_profile: -30, configured_helper: 12, primary: 4 },
			prefer: { primary_local: 20, local_profile: 16, configured_helper: 8, primary: 0 },
			require: {
				primary_local: 24,
				local_profile: 22,
				configured_helper: candidateIsLocal ? 10 : -24,
				primary: candidateIsLocal ? 4 : -8,
			},
		}[localityPreference][source]

		const escalationAdjustment = escalated
			? { primary_local: -10, local_profile: -6, configured_helper: 22, primary: 14 }[source]
			: 0

		return baseline + localityAdjustment + escalationAdjustment
	}

	private static async getConfiguredHelperProfile(
		job: HelperJob,
		state: HelperRouterStateLike,
		providerSettingsManager: ProviderSettingsManager,
	): Promise<ProviderSettings | undefined> {
		const helperConfigId = this.getConfiguredHelperProfileId(job, state)
		if (!helperConfigId || !Array.isArray(state.listApiConfigMeta)) {
			return undefined
		}

		const matchingConfig = state.listApiConfigMeta.find((config) => config.id === helperConfigId)
		if (!matchingConfig) {
			return undefined
		}

		const profile = await providerSettingsManager.getProfile({ id: helperConfigId })
		return profile?.apiProvider ? profile : undefined
	}

	private static async resolvePrimaryLocal(primaryConfig: ProviderSettings): Promise<ProviderSettings | undefined> {
		if (!isLocalProvider(primaryConfig.apiProvider)) {
			return undefined
		}

		return (await this.isAvailableLocalConfig(primaryConfig)) ? primaryConfig : undefined
	}

	private static async findDiscoveredLocalProfile(
		existingLocalProfile: ProviderSettings | undefined,
		state: HelperRouterStateLike,
		providerSettingsManager: ProviderSettingsManager,
	): Promise<ProviderSettings | undefined> {
		if (existingLocalProfile) {
			return undefined
		}

		if (!Array.isArray(state.listApiConfigMeta)) {
			return undefined
		}

		for (const providerName of ["ollama", "lmstudio"] as const) {
			for (const entry of state.listApiConfigMeta) {
				const profile = await providerSettingsManager.getProfile({ id: entry.id })
				if (profile?.apiProvider !== providerName) {
					continue
				}

				if (await this.isAvailableLocalConfig(profile)) {
					return profile
				}
			}
		}

		return undefined
	}

	private static getConfiguredHelperProfileId(job: HelperJob, state: HelperRouterStateLike): string | undefined {
		switch (job) {
			case "search_assist":
				return state.enhancementApiConfigId
			case "condense":
			case "summarize_branch":
			case "tech_debt_extract":
			case "relay_compact":
				return state.condensingApiConfigId
		}
	}

	private static async isAvailableLocalConfig(config?: ProviderSettings): Promise<boolean> {
		if (!config || !isLocalProvider(config.apiProvider)) {
			return false
		}

		const cacheKey = this.getAvailabilityCacheKey(config)
		const cached = this.localAvailabilityCache.get(cacheKey)
		if (cached && cached.expiresAt > Date.now()) {
			return cached.available
		}

		const available = await this.checkLocalAvailability(config)
		this.localAvailabilityCache.set(cacheKey, { available, expiresAt: Date.now() + LOCAL_PROVIDER_CACHE_TTL_MS })
		return available
	}

	private static getAvailabilityCacheKey(config: ProviderSettings): string {
		return [
			config.apiProvider,
			getModelId(config) ?? "",
			config.ollamaBaseUrl ?? "",
			config.lmStudioBaseUrl ?? "",
		].join("::")
	}

	private static async checkLocalAvailability(config: ProviderSettings): Promise<boolean> {
		const selectedModelId = getModelId(config)
		if (!selectedModelId) {
			return false
		}

		try {
			if (config.apiProvider === "ollama") {
				const models = await getModels({
					provider: "ollama",
					baseUrl: config.ollamaBaseUrl,
					apiKey: config.ollamaApiKey,
					numCtx: config.ollamaNumCtx,
				})
				return Object.keys(models).includes(selectedModelId) || Object.keys(models).length > 0
			}

			const models = await getModels({
				provider: "lmstudio",
				baseUrl: config.lmStudioBaseUrl,
			})
			return Object.keys(models).includes(selectedModelId) || Object.keys(models).length > 0
		} catch (error) {
			return false
		}
	}
}
