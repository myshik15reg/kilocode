// kilocode_change - new file
import { getModelId, type ProviderSettings } from "@roo-code/types"

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
}

export interface HelperRouteSelection {
	job: HelperJob
	config: ProviderSettings
	source: "primary" | "configured_helper" | "local_profile" | "primary_local"
	provider: string
	modelId?: string
}

type LocalAvailabilityCacheEntry = {
	available: boolean
	expiresAt: number
}

const LOCAL_PROVIDER_CACHE_TTL_MS = 30_000
const getProviderName = (config: ProviderSettings): string => config.apiProvider ?? "unknown"

export class HelperModelRouter {
	private static readonly localAvailabilityCache = new Map<string, LocalAvailabilityCacheEntry>()

	static async selectConfig(params: {
		job: HelperJob
		state: HelperRouterStateLike
		providerSettingsManager: ProviderSettingsManager
	}): Promise<HelperRouteSelection> {
		const { job, state, providerSettingsManager } = params
		const primaryConfig = state.apiConfiguration

		if (await this.isAvailableLocalConfig(primaryConfig)) {
			return {
				job,
				config: primaryConfig,
				source: "primary_local",
				provider: getProviderName(primaryConfig),
				modelId: getModelId(primaryConfig),
			}
		}

		const localProfile = await this.findConfiguredLocalProfile(job, state, providerSettingsManager)
		if (localProfile) {
			return {
				job,
				config: localProfile,
				source: "local_profile",
				provider: getProviderName(localProfile),
				modelId: getModelId(localProfile),
			}
		}

		const configuredHelper = await this.getConfiguredHelperProfile(job, state, providerSettingsManager)
		if (configuredHelper?.apiProvider) {
			return {
				job,
				config: configuredHelper,
				source: "configured_helper",
				provider: getProviderName(configuredHelper),
				modelId: getModelId(configuredHelper),
			}
		}

		return {
			job,
			config: primaryConfig,
			source: "primary",
			provider: getProviderName(primaryConfig),
			modelId: getModelId(primaryConfig),
		}
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

	private static async findConfiguredLocalProfile(
		job: HelperJob,
		state: HelperRouterStateLike,
		providerSettingsManager: ProviderSettingsManager,
	): Promise<ProviderSettings | undefined> {
		const explicitHelper = await this.getConfiguredHelperProfile(job, state, providerSettingsManager)
		if (explicitHelper && (await this.isAvailableLocalConfig(explicitHelper))) {
			return explicitHelper
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
		if (!config || (config.apiProvider !== "ollama" && config.apiProvider !== "lmstudio")) {
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
		} catch {
			return false
		}
	}
}
