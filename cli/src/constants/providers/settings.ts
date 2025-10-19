import type { ProviderName, ProviderSettings } from "../../types/messages.js"

/**
 * Provider setting configuration interface
 */
export interface ProviderSettingConfig {
	field: string
	label: string
	value: string
	actualValue: string
	type: "text" | "password" | "boolean"
}

/**
 * Field metadata interface for centralized field registry
 */
export interface FieldMetadata {
	label: string
	type: "text" | "password" | "boolean"
	placeholder?: string
	isOptional?: boolean
}

/**
 * Centralized field metadata registry
 * Contains labels, types, placeholders, and optional flags for all provider fields
 */
export const FIELD_REGISTRY: Record<string, FieldMetadata> = {
	// Kilocode fields
	kilocodeToken: {
		label: "Kilo Code Token",
		type: "password",
		placeholder: "Enter your Kilo Code token...",
	},
	kilocodeOrganizationId: {
		label: "Organization ID",
		type: "text",
		placeholder: "Enter organization ID (or leave empty for personal)...",
		isOptional: true,
	},
	kilocodeModel: {
		label: "Model",
		type: "text",
		placeholder: "Enter model name...",
	},

	// Anthropic fields
	apiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter API key...",
	},
	apiModelId: {
		label: "Model",
		type: "text",
		placeholder: "Enter model name...",
	},
	anthropicBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter base URL (or leave empty for default)...",
		isOptional: true,
	},

	// OpenRouter fields
	openRouterApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter OpenRouter API key...",
	},
	openRouterModelId: {
		label: "Model",
		type: "text",
		placeholder: "Enter model name...",
	},
	openRouterBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter base URL (or leave empty for default)...",
		isOptional: true,
	},

	// OpenAI Native fields
	openAiNativeApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter OpenAI API key...",
	},
	openAiNativeBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter base URL (or leave empty for default)...",
		isOptional: true,
	},

	// AWS Bedrock fields
	awsAccessKey: {
		label: "AWS Access Key",
		type: "password",
		placeholder: "Enter AWS access key...",
	},
	awsSecretKey: {
		label: "AWS Secret Key",
		type: "password",
		placeholder: "Enter AWS secret key...",
	},
	awsSessionToken: {
		label: "AWS Session Token",
		type: "password",
		placeholder: "Enter AWS session token...",
		isOptional: true,
	},
	awsRegion: {
		label: "AWS Region",
		type: "text",
		placeholder: "Enter AWS region...",
	},
	awsUseCrossRegionInference: {
		label: "Use Cross-Region Inference",
		type: "boolean",
	},

	// Gemini fields
	geminiApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Gemini API key...",
	},
	googleGeminiBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter base URL (or leave empty for default)...",
		isOptional: true,
	},

	// Vertex fields
	vertexJsonCredentials: {
		label: "JSON Credentials",
		type: "password",
		placeholder: "Enter JSON credentials...",
	},
	vertexKeyFile: {
		label: "Key File Path",
		type: "text",
		placeholder: "Enter key file path...",
	},
	vertexProjectId: {
		label: "Project ID",
		type: "text",
		placeholder: "Enter project ID...",
	},
	vertexRegion: {
		label: "Region",
		type: "text",
		placeholder: "Enter region...",
	},

	// Claude Code fields
	claudeCodePath: {
		label: "Claude Code Path",
		type: "text",
		placeholder: "Enter Claude Code path...",
	},
	claudeCodeMaxOutputTokens: {
		label: "Max Output Tokens",
		type: "text",
		placeholder: "Enter max output tokens...",
	},

	// Mistral fields
	mistralApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Mistral API key...",
	},
	mistralCodestralUrl: {
		label: "Codestral Base URL",
		type: "text",
		placeholder: "Enter Codestral base URL (or leave empty for default)...",
		isOptional: true,
	},

	// Groq fields
	groqApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Groq API key...",
	},

	// DeepSeek fields
	deepSeekApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter DeepSeek API key...",
	},

	// xAI fields
	xaiApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter xAI API key...",
	},

	// Cerebras fields
	cerebrasApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Cerebras API key...",
	},

	// Ollama fields
	ollamaBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter Ollama base URL...",
	},
	ollamaModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},
	ollamaApiKey: {
		label: "API Key (Optional)",
		type: "password",
		placeholder: "Enter API key (optional)...",
		isOptional: true,
	},

	// LM Studio fields
	lmStudioBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter LM Studio base URL...",
	},
	lmStudioModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},
	lmStudioSpeculativeDecodingEnabled: {
		label: "Speculative Decoding",
		type: "boolean",
	},

	// VSCode LM fields
	vsCodeLmModelSelector: {
		label: "Model Selector",
		type: "text",
		placeholder: "Enter model selector...",
	},

	// OpenAI fields
	openAiApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter OpenAI API key...",
	},
	openAiBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter base URL (or leave empty for default)...",
		isOptional: true,
	},

	// Glama fields
	glamaApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Glama API key...",
	},
	glamaModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// HuggingFace fields
	huggingFaceApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter HuggingFace API key...",
	},
	huggingFaceModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},
	huggingFaceInferenceProvider: {
		label: "Inference Provider",
		type: "text",
		placeholder: "Enter inference provider...",
	},

	// LiteLLM fields
	litellmBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter LiteLLM base URL...",
	},
	litellmApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter API key...",
	},
	litellmModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// Moonshot fields
	moonshotBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter Moonshot base URL...",
	},
	moonshotApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Moonshot API key...",
	},

	// Doubao fields
	doubaoApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Doubao API key...",
	},

	// Chutes fields
	chutesApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Chutes API key...",
	},

	// SambaNova fields
	sambaNovaApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter SambaNova API key...",
	},

	// Fireworks fields
	fireworksApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Fireworks API key...",
	},

	// Featherless fields
	featherlessApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Featherless API key...",
	},

	// DeepInfra fields
	deepInfraApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter DeepInfra API key...",
	},
	deepInfraModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// IO Intelligence fields
	ioIntelligenceApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter IO Intelligence API key...",
	},
	ioIntelligenceModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// Qwen Code fields
	qwenCodeOauthPath: {
		label: "OAuth Credentials Path",
		type: "text",
		placeholder: "Enter OAuth credentials path...",
	},

	// Gemini CLI fields
	geminiCliOAuthPath: {
		label: "OAuth Credentials Path",
		type: "text",
		placeholder: "Enter OAuth credentials path...",
	},
	geminiCliProjectId: {
		label: "Project ID",
		type: "text",
		placeholder: "Enter project ID...",
	},

	// ZAI fields
	zaiApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter ZAI API key...",
	},
	zaiApiLine: {
		label: "API Line",
		type: "text",
		placeholder: "Enter API line...",
	},

	// Unbound fields
	unboundApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Unbound API key...",
	},
	unboundModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// Requesty fields
	requestyApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Requesty API key...",
	},
	requestyBaseUrl: {
		label: "Base URL",
		type: "text",
		placeholder: "Enter base URL (or leave empty for default)...",
		isOptional: true,
	},
	requestyModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// Vercel AI Gateway fields
	vercelAiGatewayApiKey: {
		label: "API Key",
		type: "password",
		placeholder: "Enter Vercel AI Gateway API key...",
	},
	vercelAiGatewayModelId: {
		label: "Model ID",
		type: "text",
		placeholder: "Enter model ID...",
	},

	// Virtual Quota Fallback fields
	profiles: {
		label: "Profiles Configuration",
		type: "text",
		placeholder: "Enter profiles configuration...",
	},
}

/**
 * Get field display information
 * @param field - Field name
 * @returns Object with label, placeholder, and type
 */
export const getFieldInfo = (field: string) => {
	const metadata = FIELD_REGISTRY[field]
	if (metadata) {
		return {
			label: metadata.label,
			placeholder: metadata.placeholder || `Enter ${field}...`,
			type: metadata.type,
		}
	}

	return {
		label: field,
		placeholder: `Enter ${field}...`,
		type: "text" as const,
	}
}

/**
 * Check if a field is a sensitive field (password/token)
 * @param field - Field name
 * @returns True if field contains sensitive data
 */
export const isSensitiveField = (field: string): boolean => {
	const metadata = FIELD_REGISTRY[field]
	if (metadata) {
		return metadata.type === "password"
	}

	// Fallback logic for fields not in registry
	return (
		field.toLowerCase().includes("key") ||
		field.toLowerCase().includes("token") ||
		field.toLowerCase().includes("secret") ||
		field.toLowerCase().includes("credentials")
	)
}

/**
 * Check if a field is optional (can be empty)
 * @param field - Field name
 * @returns True if field is optional
 */
export const isOptionalField = (field: string): boolean => {
	const metadata = FIELD_REGISTRY[field]
	if (metadata) {
		return metadata.isOptional === true
	}

	// Fallback logic for fields not in registry
	return field.includes("BaseUrl") || field === "kilocodeOrganizationId"
}

/**
 * Helper function to create a field configuration using centralized metadata
 * @param field - Field name
 * @param config - Provider configuration object
 * @param defaultValue - Default value to display when field is empty
 * @returns ProviderSettingConfig object
 */
const createFieldConfig = (field: string, config: ProviderSettings, defaultValue?: string): ProviderSettingConfig => {
	const fieldInfo = getFieldInfo(field)
	const actualValue = (config as any)[field] || ""

	let displayValue: string
	if (fieldInfo.type === "password") {
		displayValue = actualValue ? "••••••••" : "Not set"
	} else if (fieldInfo.type === "boolean") {
		displayValue = actualValue ? "Enabled" : "Disabled"
	} else {
		displayValue = actualValue || defaultValue || "Not set"
	}

	return {
		field,
		label: fieldInfo.label,
		value: displayValue,
		actualValue: fieldInfo.type === "boolean" ? (actualValue ? "true" : "false") : actualValue,
		type: fieldInfo.type,
	}
}

/**
 * Get provider-specific settings configuration
 * @param provider - Provider name
 * @param config - Provider configuration object
 * @returns Array of setting configurations
 */
export const getProviderSettings = (provider: ProviderName, config: ProviderSettings): ProviderSettingConfig[] => {
	switch (provider) {
		case "kilocode":
			return [
				createFieldConfig("kilocodeToken", config),
				createFieldConfig("kilocodeOrganizationId", config, "personal"),
				createFieldConfig("kilocodeModel", config, "anthropic/claude-sonnet-4"),
			]

		case "anthropic":
			return [
				createFieldConfig("apiKey", config),
				createFieldConfig("apiModelId", config, "claude-3-5-sonnet-20241022"),
				createFieldConfig("anthropicBaseUrl", config, "Default"),
			]

		case "openrouter":
			return [
				createFieldConfig("openRouterApiKey", config),
				createFieldConfig("openRouterModelId", config, "anthropic/claude-3-5-sonnet"),
				createFieldConfig("openRouterBaseUrl", config, "Default"),
			]

		case "openai-native":
			return [
				createFieldConfig("openAiNativeApiKey", config),
				createFieldConfig("apiModelId", config, "gpt-4o"),
				createFieldConfig("openAiNativeBaseUrl", config, "Default"),
			]

		case "bedrock":
			return [
				createFieldConfig("awsAccessKey", config),
				createFieldConfig("awsSecretKey", config),
				createFieldConfig("awsSessionToken", config),
				createFieldConfig("awsRegion", config, "us-east-1"),
				createFieldConfig("awsUseCrossRegionInference", config),
			]

		case "gemini":
			return [
				createFieldConfig("geminiApiKey", config),
				createFieldConfig("googleGeminiBaseUrl", config, "Default"),
			]

		case "vertex":
			return [
				createFieldConfig("vertexJsonCredentials", config),
				createFieldConfig("vertexKeyFile", config),
				createFieldConfig("vertexProjectId", config),
				createFieldConfig("vertexRegion", config, "us-central1"),
			]

		case "claude-code":
			return [
				createFieldConfig("claudeCodePath", config),
				createFieldConfig("claudeCodeMaxOutputTokens", config, "8000"),
			]

		case "mistral":
			return [
				createFieldConfig("mistralApiKey", config),
				createFieldConfig("mistralCodestralUrl", config, "Default"),
			]

		case "groq":
			return [createFieldConfig("groqApiKey", config)]

		case "deepseek":
			return [createFieldConfig("deepSeekApiKey", config)]

		case "xai":
			return [createFieldConfig("xaiApiKey", config)]

		case "cerebras":
			return [createFieldConfig("cerebrasApiKey", config)]

		case "ollama":
			return [
				createFieldConfig("ollamaBaseUrl", config, "http://localhost:11434"),
				createFieldConfig("ollamaModelId", config, "llama3.2"),
				createFieldConfig("ollamaApiKey", config),
			]

		case "lmstudio":
			return [
				createFieldConfig("lmStudioBaseUrl", config, "http://localhost:1234/v1"),
				createFieldConfig("lmStudioModelId", config, "local-model"),
				createFieldConfig("lmStudioSpeculativeDecodingEnabled", config),
			]

		case "vscode-lm":
			return [
				{
					field: "vsCodeLmModelSelector",
					label: "Model Selector",
					value: config.vsCodeLmModelSelector
						? `${config.vsCodeLmModelSelector.vendor}/${config.vsCodeLmModelSelector.family}`
						: "Not set",
					actualValue: config.vsCodeLmModelSelector ? JSON.stringify(config.vsCodeLmModelSelector) : "",
					type: "text",
				},
			]

		case "openai":
			return [createFieldConfig("openAiApiKey", config), createFieldConfig("openAiBaseUrl", config, "Default")]

		case "glama":
			return [
				createFieldConfig("glamaApiKey", config),
				createFieldConfig("glamaModelId", config, "llama-3.1-70b-versatile"),
			]

		case "huggingface":
			return [
				createFieldConfig("huggingFaceApiKey", config),
				createFieldConfig("huggingFaceModelId", config, "meta-llama/Llama-2-70b-chat-hf"),
				createFieldConfig("huggingFaceInferenceProvider", config, "auto"),
			]

		case "litellm":
			return [
				createFieldConfig("litellmBaseUrl", config),
				createFieldConfig("litellmApiKey", config),
				createFieldConfig("litellmModelId", config, "gpt-4o"),
			]

		case "moonshot":
			return [
				createFieldConfig("moonshotBaseUrl", config, "https://api.moonshot.ai/v1"),
				createFieldConfig("moonshotApiKey", config),
			]

		case "doubao":
			return [createFieldConfig("doubaoApiKey", config)]

		case "chutes":
			return [createFieldConfig("chutesApiKey", config)]

		case "sambanova":
			return [createFieldConfig("sambaNovaApiKey", config)]

		case "fireworks":
			return [createFieldConfig("fireworksApiKey", config)]

		case "featherless":
			return [createFieldConfig("featherlessApiKey", config)]

		case "deepinfra":
			return [
				createFieldConfig("deepInfraApiKey", config),
				createFieldConfig("deepInfraModelId", config, "meta-llama/Meta-Llama-3.1-70B-Instruct"),
			]

		case "io-intelligence":
			return [
				createFieldConfig("ioIntelligenceApiKey", config),
				createFieldConfig("ioIntelligenceModelId", config, "gpt-4o"),
			]

		case "qwen-code":
			return [createFieldConfig("qwenCodeOauthPath", config, "~/.qwen/oauth_creds.json")]

		case "gemini-cli":
			return [
				createFieldConfig("geminiCliOAuthPath", config, "~/.gemini/oauth_creds.json"),
				createFieldConfig("geminiCliProjectId", config),
			]

		case "zai":
			return [
				createFieldConfig("zaiApiKey", config),
				createFieldConfig("zaiApiLine", config, "international_coding"),
			]

		case "unbound":
			return [createFieldConfig("unboundApiKey", config), createFieldConfig("unboundModelId", config, "gpt-4o")]

		case "requesty":
			return [
				createFieldConfig("requestyApiKey", config),
				createFieldConfig("requestyBaseUrl", config, "Default"),
				createFieldConfig("requestyModelId", config, "gpt-4o"),
			]

		case "roo":
			return [createFieldConfig("apiModelId", config, "gpt-4o")]

		case "vercel-ai-gateway":
			return [
				createFieldConfig("vercelAiGatewayApiKey", config),
				createFieldConfig("vercelAiGatewayModelId", config, "gpt-4o"),
			]

		case "virtual-quota-fallback":
			return [
				{
					field: "profiles",
					label: "Profiles Configuration",
					value: config.profiles ? `${config.profiles.length} profile(s)` : "Not configured",
					actualValue: config.profiles ? JSON.stringify(config.profiles) : "",
					type: "text",
				},
			]

		case "human-relay":
			return [
				{
					field: "apiModelId",
					label: "Model",
					value: "human",
					actualValue: "human",
					type: "text",
				},
			]

		case "fake-ai":
			return [
				{
					field: "apiModelId",
					label: "Model",
					value: "fake-model",
					actualValue: "fake-model",
					type: "text",
				},
			]

		default:
			return []
	}
}

/**
 * Provider-specific default models
 */
export const PROVIDER_DEFAULT_MODELS: Record<ProviderName, string> = {
	kilocode: "anthropic/claude-sonnet-4",
	anthropic: "claude-3-5-sonnet-20241022",
	"openai-native": "gpt-4o",
	openrouter: "anthropic/claude-3-5-sonnet",
	bedrock: "anthropic.claude-3-5-sonnet-20241022-v2:0",
	gemini: "gemini-1.5-pro-latest",
	vertex: "claude-3-5-sonnet@20241022",
	"claude-code": "claude-3-5-sonnet-20241022",
	mistral: "mistral-large-latest",
	groq: "llama-3.1-70b-versatile",
	deepseek: "deepseek-chat",
	xai: "grok-beta",
	cerebras: "llama3.1-8b",
	ollama: "llama3.2",
	lmstudio: "local-model",
	"vscode-lm": "copilot-gpt-4o",
	openai: "gpt-4o",
	glama: "llama-3.1-70b-versatile",
	huggingface: "meta-llama/Llama-2-70b-chat-hf",
	litellm: "gpt-4o",
	moonshot: "moonshot-v1-8k",
	doubao: "ep-20241022-******",
	chutes: "gpt-4o",
	sambanova: "Meta-Llama-3.1-70B-Instruct",
	fireworks: "accounts/fireworks/models/llama-v3p1-70b-instruct",
	featherless: "meta-llama/Llama-3.1-70B-Instruct",
	deepinfra: "meta-llama/Meta-Llama-3.1-70B-Instruct",
	"io-intelligence": "gpt-4o",
	"qwen-code": "qwen-coder-plus-latest",
	"gemini-cli": "gemini-1.5-pro-latest",
	zai: "gpt-4o",
	unbound: "gpt-4o",
	requesty: "gpt-4o",
	roo: "gpt-4o",
	"vercel-ai-gateway": "gpt-4o",
	"virtual-quota-fallback": "gpt-4o",
	"human-relay": "human",
	"fake-ai": "fake-model",
}

/**
 * Get default model for a provider
 * @param provider - Provider name
 * @returns Default model string
 */
export const getProviderDefaultModel = (provider: ProviderName): string => {
	return PROVIDER_DEFAULT_MODELS[provider] || "default-model"
}
