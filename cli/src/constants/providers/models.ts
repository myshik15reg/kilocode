import type { ProviderName } from "../../types/messages.js"
import type { ProviderConfig } from "../../config/types.js"

/**
 * RouterName type - mirrors the one from src/shared/api.ts
 */
export type RouterName =
	| "openrouter"
	| "requesty"
	| "glama"
	| "unbound"
	| "litellm"
	| "kilocode-openrouter"
	| "ollama"
	| "lmstudio"
	| "io-intelligence"
	| "deepinfra"
	| "vercel-ai-gateway"

/**
 * ModelInfo interface - mirrors the one from packages/types/src/model.ts
 */
export interface ModelInfo {
	maxTokens?: number | null
	maxThinkingTokens?: number | null
	contextWindow: number
	supportsImages?: boolean
	supportsComputerUse?: boolean
	supportsPromptCache: boolean
	supportsVerbosity?: boolean
	supportsReasoningBudget?: boolean
	supportsTemperature?: boolean
	requiredReasoningBudget?: boolean
	supportsReasoningEffort?: boolean
	inputPrice?: number
	outputPrice?: number
	cacheWritesPrice?: number
	cacheReadsPrice?: number
	description?: string
	displayName?: string | null
	preferredIndex?: number | null
}

export type ModelRecord = Record<string, ModelInfo>
export type RouterModels = Record<RouterName, ModelRecord>

/**
 * Mapping from ProviderName to RouterName for model fetching
 */
export const PROVIDER_TO_ROUTER_NAME: Record<ProviderName, RouterName | null> = {
	kilocode: "kilocode-openrouter",
	openrouter: "openrouter",
	ollama: "ollama",
	lmstudio: "lmstudio",
	litellm: "litellm",
	glama: "glama",
	unbound: "unbound",
	requesty: "requesty",
	deepinfra: "deepinfra",
	"io-intelligence": "io-intelligence",
	"vercel-ai-gateway": "vercel-ai-gateway",
	// Providers without dynamic model support
	anthropic: null,
	bedrock: null,
	vertex: null,
	openai: null,
	"vscode-lm": null,
	gemini: null,
	"openai-native": null,
	mistral: null,
	moonshot: null,
	deepseek: null,
	doubao: null,
	"qwen-code": null,
	"human-relay": null,
	"fake-ai": null,
	xai: null,
	groq: null,
	chutes: null,
	cerebras: null,
	sambanova: null,
	zai: null,
	fireworks: null,
	featherless: null,
	roo: null,
	"claude-code": null,
	"gemini-cli": null,
	"virtual-quota-fallback": null,
	huggingface: null,
}

/**
 * Mapping from ProviderName to the field name that stores the model ID
 */
export const PROVIDER_MODEL_FIELD: Record<ProviderName, string | null> = {
	kilocode: "kilocodeModel",
	openrouter: "openRouterModelId",
	ollama: "ollamaModelId",
	lmstudio: "lmStudioModelId",
	litellm: "litellmModelId",
	glama: "glamaModelId",
	unbound: "unboundModelId",
	requesty: "requestyModelId",
	deepinfra: "deepInfraModelId",
	"io-intelligence": "ioIntelligenceModelId",
	"vercel-ai-gateway": "vercelAiGatewayModelId",
	// Providers without dynamic model support
	anthropic: null,
	bedrock: null,
	vertex: null,
	openai: null,
	"vscode-lm": "vsCodeLmModelSelector",
	gemini: null,
	"openai-native": null,
	mistral: null,
	moonshot: null,
	deepseek: null,
	doubao: null,
	"qwen-code": null,
	"human-relay": null,
	"fake-ai": null,
	xai: null,
	groq: null,
	chutes: null,
	cerebras: null,
	sambanova: null,
	zai: null,
	fireworks: null,
	featherless: null,
	roo: null,
	"claude-code": null,
	"gemini-cli": null,
	"virtual-quota-fallback": null,
	huggingface: null,
}

/**
 * Check if a provider supports dynamic model lists
 */
export const providerSupportsModelList = (provider: ProviderName): boolean => {
	return PROVIDER_TO_ROUTER_NAME[provider] !== null
}

/**
 * Check if a field is a model selection field
 */
export const isModelField = (field: string): boolean => {
	return Object.values(PROVIDER_MODEL_FIELD).includes(field)
}

/**
 * Get the RouterName for a provider
 */
export const getRouterNameForProvider = (provider: ProviderName): RouterName | null => {
	return PROVIDER_TO_ROUTER_NAME[provider]
}

/**
 * Get the model field name for a provider
 */
export const getModelFieldForProvider = (provider: ProviderName): string | null => {
	return PROVIDER_MODEL_FIELD[provider]
}

/**
 * Default model IDs for each provider
 * For providers without router support, these are fallback defaults
 */
export const DEFAULT_MODEL_IDS: Partial<Record<ProviderName, string>> = {
	anthropic: "claude-sonnet-4.5",
	bedrock: "anthropic.claude-sonnet-4-5-20250929-v1:0",
	vertex: "claude-4.5-sonnet",
	gemini: "gemini-2.5-flash-preview-04-17",
	deepseek: "deepseek-chat",
	"openai-native": "gpt-5-chat-latest",
	mistral: "magistral-medium-latest",
	xai: "grok-code-fast-1",
	groq: "llama-3.3-70b-versatile",
	chutes: "deepseek-ai/DeepSeek-R1-0528",
	cerebras: "qwen-3-coder-480b-free",
	"vscode-lm": "gpt-3.5-turbo",
	openrouter: "anthropic/claude-sonnet-4.5",
	requesty: "anthropic/claude-sonnet-4.5",
	glama: "anthropic/claude-sonnet-4.5",
	unbound: "anthropic/claude-sonnet-4.5",
	litellm: "gpt-4",
	"qwen-code": "qwen3-coder-plus",
	"claude-code": "claude-sonnet-4-5",
	doubao: "doubao-seed-1-6-250615",
	fireworks: "accounts/fireworks/models/kimi-k2-instruct-0905",
	"io-intelligence": "deepseek-ai/DeepSeek-R1-0528",
	moonshot: "kimi-k2-0711-preview",
	sambanova: "Meta-Llama-3.1-8B-Instruct",
	featherless: "deepseek-ai/DeepSeek-V3-0324",
	deepinfra: "deepseek-ai/DeepSeek-R1-0528",
}

/**
 * Get models for a specific provider
 * Mirrors the logic from webview-ui/src/components/kilocode/hooks/useProviderModels.ts
 *
 * Note: For CLI, we only support router-based providers. Static providers (anthropic, gemini, etc.)
 * would require importing from @roo-code/types which causes runtime issues. Users should configure
 * these providers through the extension UI.
 */
export function getModelsByProvider(params: {
	provider: ProviderName
	routerModels: RouterModels | null
	kilocodeDefaultModel: string
}): { models: ModelRecord; defaultModel: string } {
	const { provider, routerModels, kilocodeDefaultModel } = params

	// Handle router-based providers
	const routerName = PROVIDER_TO_ROUTER_NAME[provider]
	if (routerName && routerModels && routerModels[routerName]) {
		const defaultModelId = DEFAULT_MODEL_IDS[provider] || ""
		return {
			models: routerModels[routerName],
			defaultModel: provider === "kilocode" ? kilocodeDefaultModel : defaultModelId,
		}
	}

	// For providers without router support, return empty
	// These providers should be configured through the extension UI
	return {
		models: {},
		defaultModel: DEFAULT_MODEL_IDS[provider] || "",
	}
}

/**
 * Get the model ID key for a provider
 * Mirrors the logic from webview-ui/src/components/kilocode/hooks/useSelectedModel.ts
 */
export function getModelIdKey(provider: ProviderName): string {
	switch (provider) {
		case "openrouter":
			return "openRouterModelId"
		case "requesty":
			return "requestyModelId"
		case "glama":
			return "glamaModelId"
		case "unbound":
			return "unboundModelId"
		case "litellm":
			return "litellmModelId"
		case "openai":
			return "openAiModelId"
		case "ollama":
			return "ollamaModelId"
		case "lmstudio":
			return "lmStudioModelId"
		case "vscode-lm":
			return "vsCodeLmModelSelector"
		case "kilocode":
			return "kilocodeModel"
		case "deepinfra":
			return "deepInfraModelId"
		case "io-intelligence":
			return "ioIntelligenceModelId"
		case "vercel-ai-gateway":
			return "vercelAiGatewayModelId"
		default:
			return "apiModelId"
	}
}

/**
 * Get the current model ID from provider config
 */
export function getCurrentModelId(params: {
	providerConfig: ProviderConfig
	routerModels: RouterModels | null
	kilocodeDefaultModel: string
}): string {
	const { providerConfig, routerModels, kilocodeDefaultModel } = params
	const provider = providerConfig.provider
	const modelIdKey = getModelIdKey(provider)

	// Special handling for vscode-lm
	if (provider === "vscode-lm" && providerConfig.vsCodeLmModelSelector) {
		const selector = providerConfig.vsCodeLmModelSelector as any
		return `${selector.vendor}/${selector.family}`
	}

	// Get model ID from config
	const modelId = providerConfig[modelIdKey] as string | undefined

	// If model ID exists, return it
	if (modelId) {
		return modelId
	}

	// Otherwise, get default model
	const { defaultModel } = getModelsByProvider({
		provider,
		routerModels,
		kilocodeDefaultModel,
	})

	return defaultModel
}

/**
 * Sort models by preferred index
 * Mirrors the logic from webview-ui/src/components/ui/hooks/kilocode/usePreferredModels.ts
 */
export function sortModelsByPreference(models: ModelRecord): string[] {
	const preferredModelIds: string[] = []
	const restModelIds: string[] = []

	// First add the preferred models
	for (const [key, model] of Object.entries(models)) {
		if (Number.isInteger(model.preferredIndex)) {
			preferredModelIds.push(key)
		}
	}

	// Sort preferred by index
	preferredModelIds.sort((a, b) => {
		const modelA = models[a]
		const modelB = models[b]
		if (!modelA || !modelB) return 0
		return (modelA.preferredIndex ?? 0) - (modelB.preferredIndex ?? 0)
	})

	// Then add the rest
	for (const [key] of Object.entries(models)) {
		if (!preferredModelIds.includes(key)) {
			restModelIds.push(key)
		}
	}

	// Sort rest alphabetically
	restModelIds.sort((a, b) => a.localeCompare(b))

	return [...preferredModelIds, ...restModelIds]
}

/**
 * Format price for display
 */
export function formatPrice(price?: number): string {
	if (price === undefined || price === null) {
		return "N/A"
	}
	return `$${price.toFixed(2)}`
}

/**
 * Format model info for display
 */
export function formatModelInfo(modelId: string, model: ModelInfo): string {
	const parts: string[] = []

	// Context window
	if (model.contextWindow) {
		const contextK = Math.floor(model.contextWindow / 1000)
		parts.push(`${contextK}K context`)
	}

	// Pricing
	if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
		parts.push(`${formatPrice(model.inputPrice)}/${formatPrice(model.outputPrice)} per 1M`)
	}

	// Capabilities
	const capabilities: string[] = []
	if (model.supportsImages) capabilities.push("Images")
	if (model.supportsComputerUse) capabilities.push("Computer Use")
	if (model.supportsPromptCache) capabilities.push("Cache")
	if (model.supportsVerbosity) capabilities.push("Verbosity")
	if (model.supportsReasoningEffort) capabilities.push("Reasoning")

	if (capabilities.length > 0) {
		parts.push(capabilities.join(", "))
	}

	return parts.join(" | ")
}

/**
 * Fuzzy filter models by name
 * Simple fuzzy matching: checks if all characters in filter appear in order in the model ID
 */
export function fuzzyFilterModels(models: ModelRecord, filter: string): string[] {
	if (!filter) {
		return Object.keys(models)
	}

	const lowerFilter = filter.toLowerCase()
	const filtered: string[] = []

	for (const modelId of Object.keys(models)) {
		const lowerModelId = modelId.toLowerCase()
		const model = models[modelId]
		const displayName = model?.displayName?.toLowerCase() || ""

		// Check if filter matches model ID or display name
		if (lowerModelId.includes(lowerFilter) || displayName.includes(lowerFilter)) {
			filtered.push(modelId)
		}
	}

	return filtered
}

/**
 * Get a pretty name for a model
 */
export function prettyModelName(modelId: string): string {
	// Remove common prefixes
	let name = modelId
		.replace(/^anthropic\./, "")
		.replace(/^accounts\/fireworks\/models\//, "")
		.replace(/^deepseek-ai\//, "")
		.replace(/^meta-llama\//, "")

	// Convert dashes and underscores to spaces
	name = name.replace(/[-_]/g, " ")

	// Capitalize words
	name = name
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	return name
}
