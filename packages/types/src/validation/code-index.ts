import { z } from "zod"

/**
 * Shared validation schema for codebase index settings
 * Used in both UI (CodeIndexPopover) and backend (webviewMessageHandler)
 */

export type EmbedderProvider =
	| "openai"
	| "ollama"
	| "openai-compatible"
	| "gemini"
	| "mistral"
	| "vercel-ai-gateway"
	| "bedrock"
	| "openrouter"

export interface ValidationMessages {
	qdrantUrlRequired: string
	invalidQdrantUrl: string
	vectorStoreNameRequired: string
	openaiApiKeyRequired: string
	modelSelectionRequired: string
	ollamaBaseUrlRequired: string
	invalidOllamaUrl: string
	modelIdRequired: string
	modelDimensionRequired: string
	baseUrlRequired: string
	invalidBaseUrl: string
	apiKeyRequired: string
	geminiApiKeyRequired: string
	mistralApiKeyRequired: string
	vercelAiGatewayApiKeyRequired: string
	bedrockRegionRequired: string
	openRouterApiKeyRequired: string
}

/**
 * Factory function to create validation schema based on embedder provider
 * @param provider - The embedder provider type
 * @param messages - Translated validation messages
 * @returns Zod schema for the given provider
 */
export function createCodeIndexValidationSchema(provider: EmbedderProvider, messages: ValidationMessages) {
	const baseSchema = z.object({
		codebaseIndexEnabled: z.boolean(),
		codebaseIndexQdrantUrl: z.string().min(1, messages.qdrantUrlRequired).url(messages.invalidQdrantUrl),
		codeIndexQdrantApiKey: z.string().optional(),
		codebaseIndexVectorStoreName: z.string().min(1, messages.vectorStoreNameRequired),
	})

	switch (provider) {
		case "openai":
			return baseSchema.extend({
				codeIndexOpenAiKey: z.string().min(1, messages.openaiApiKeyRequired),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelSelectionRequired),
			})

		case "ollama":
			return baseSchema.extend({
				codebaseIndexEmbedderBaseUrl: z
					.string()
					.min(1, messages.ollamaBaseUrlRequired)
					.url(messages.invalidOllamaUrl),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelIdRequired),
				codebaseIndexEmbedderModelDimension: z.number().min(1, messages.modelDimensionRequired).optional(),
			})

		case "openai-compatible":
			return baseSchema.extend({
				codebaseIndexOpenAiCompatibleBaseUrl: z
					.string()
					.min(1, messages.baseUrlRequired)
					.url(messages.invalidBaseUrl),
				codebaseIndexOpenAiCompatibleApiKey: z.string().min(1, messages.apiKeyRequired),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelIdRequired),
				codebaseIndexEmbedderModelDimension: z.number().min(1, messages.modelDimensionRequired),
			})

		case "gemini":
			return baseSchema.extend({
				codebaseIndexGeminiApiKey: z.string().min(1, messages.geminiApiKeyRequired),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelSelectionRequired),
			})

		case "mistral":
			return baseSchema.extend({
				codebaseIndexMistralApiKey: z.string().min(1, messages.mistralApiKeyRequired),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelSelectionRequired),
			})

		case "vercel-ai-gateway":
			return baseSchema.extend({
				codebaseIndexVercelAiGatewayApiKey: z.string().min(1, messages.vercelAiGatewayApiKeyRequired),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelSelectionRequired),
			})

		case "bedrock":
			return baseSchema.extend({
				codebaseIndexBedrockRegion: z.string().min(1, messages.bedrockRegionRequired),
				codebaseIndexBedrockProfile: z.string().optional(),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelSelectionRequired),
			})

		case "openrouter":
			return baseSchema.extend({
				codebaseIndexOpenRouterApiKey: z.string().min(1, messages.openRouterApiKeyRequired),
				codebaseIndexEmbedderModelId: z.string().min(1, messages.modelSelectionRequired),
			})

		default:
			return baseSchema
	}
}

/**
 * Input type for code index settings validation
 */
export type CodeIndexSettingsInput = z.input<ReturnType<typeof createCodeIndexValidationSchema>>

/**
 * Output type for code index settings validation
 */
export type CodeIndexSettingsOutput = z.output<ReturnType<typeof createCodeIndexValidationSchema>>