import { ApiHandlerOptions } from "../../../shared/api" // Adjust path if needed
import { EmbedderProvider } from "./manager"

/**
 * Configuration state for the code indexing feature
 */
export interface CodeIndexConfig {
	isConfigured: boolean
	embedderProvider: EmbedderProvider
	// kilocode_change start
	vectorStoreProvider?: "lancedb" | "qdrant"
	lancedbVectorStoreDirectoryPlaceholder?: string
	vectorStoreName: string
	// kilocode_change end
	modelId?: string
	modelDimension?: number // Generic dimension property for all providers
	openAiOptions?: ApiHandlerOptions
	ollamaOptions?: ApiHandlerOptions
	openAiCompatibleOptions?: { baseUrl: string; apiKey: string }
	geminiOptions?: { apiKey: string }
	mistralOptions?: { apiKey: string }
	vercelAiGatewayOptions?: { apiKey: string }
	bedrockOptions?: { region: string; profile?: string }
	openRouterOptions?: { apiKey: string; specificProvider?: string }
	qdrantUrl?: string
	qdrantApiKey?: string
	searchMinScore?: number
	searchMaxResults?: number
	// kilocode_change start
	rerankEnabled?: boolean
	rerankBaseUrl?: string
	rerankModelId?: string
	rerankTimeoutMs?: number
	rerankCandidateLimit?: number
	rerankTopK?: number
	rerankApiKey?: string
	rerankAvailable?: boolean
	// kilocode_change end
	// kilocode_change start
	embeddingBatchSize?: number
	scannerMaxBatchRetries?: number
	embedderRequestsPerMinute?: number
	// kilocode_change end
}

/**
 * Snapshot of previous configuration used to determine if a restart is required
 */
export type PreviousConfigSnapshot = {
	enabled: boolean
	configured: boolean
	embedderProvider: EmbedderProvider
	// kilocode_change start
	vectorStoreProvider?: "lancedb" | "qdrant"
	lancedbVectorStoreDirectory?: string
	vectorStoreName: string
	// kilocode_change end
	modelId?: string
	modelDimension?: number // Generic dimension property
	openAiKey?: string
	ollamaBaseUrl?: string
	openAiCompatibleBaseUrl?: string
	openAiCompatibleApiKey?: string
	geminiApiKey?: string
	mistralApiKey?: string
	vercelAiGatewayApiKey?: string
	bedrockRegion?: string
	bedrockProfile?: string
	openRouterApiKey?: string
	openRouterSpecificProvider?: string
	qdrantUrl?: string
	qdrantApiKey?: string
	// kilocode_change start
	rerankBaseUrl?: string
	rerankApiKey?: string
	rerankModelId?: string
	rerankTimeoutMs?: number
	rerankCandidateLimit?: number
	rerankTopK?: number
	rerankEnabled?: boolean
	// kilocode_change end
}
