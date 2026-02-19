import { z } from "zod"

/**
 * Codebase Index Constants
 */
export const CODEBASE_INDEX_DEFAULTS = {
	MIN_SEARCH_RESULTS: 10,
	MAX_SEARCH_RESULTS: 200,
	DEFAULT_SEARCH_RESULTS: 50,
	SEARCH_RESULTS_STEP: 10,
	MIN_SEARCH_SCORE: 0,
	MAX_SEARCH_SCORE: 1,
	DEFAULT_SEARCH_MIN_SCORE: 0.4,
	SEARCH_SCORE_STEP: 0.05,
	// kilocode_change start
	MIN_EMBEDDING_BATCH_SIZE: 10,
	MAX_EMBEDDING_BATCH_SIZE: 2000,
	DEFAULT_EMBEDDING_BATCH_SIZE: 60,
	EMBEDDING_BATCH_SIZE_STEP: 10,
	MIN_SCANNER_MAX_BATCH_RETRIES: 1,
	MAX_SCANNER_MAX_BATCH_RETRIES: 10,
	DEFAULT_SCANNER_MAX_BATCH_RETRIES: 3,
	SCANNER_MAX_BATCH_RETRIES_STEP: 1,
	DEFAULT_RERANK_CANDIDATE_LIMIT: 50,
	DEFAULT_RERANK_TOP_K: 10,
	DEFAULT_RERANK_TIMEOUT_MS: 7000,
	DEFAULT_RERANK_MODEL_ID: "bge-reranker-v2-m3",
	// RPM (Requests Per Minute) for embedder rate limiting
	MIN_EMBEDDER_RPM: 1,
	MAX_EMBEDDER_RPM: 1000,
	DEFAULT_EMBEDDER_RPM: 60,
	EMBEDDER_RPM_STEP: 10,
	// kilocode_change end
} as const

/**
 * CodebaseIndexConfig
 */

export const codebaseIndexConfigSchema = z.object({
	codebaseIndexEnabled: z.boolean().optional(),
	codebaseIndexQdrantUrl: z.string().optional(),
	codebaseIndexEmbedderProvider: z
		.enum([
			"openai",
			"ollama",
			"openai-compatible",
			"gemini",
			"mistral",
			"vercel-ai-gateway",
			"bedrock",
			"openrouter",
		])
		.optional(),
	// kilocode_change start
	codebaseIndexVectorStoreProvider: z.enum(["lancedb", "qdrant"]).optional(),
	codebaseIndexLancedbVectorStoreDirectory: z.string().optional(),
	codebaseIndexVectorStoreName: z.string().optional(),
	// kilocode_change end
	codebaseIndexEmbedderBaseUrl: z.string().optional(),
	codebaseIndexEmbedderModelId: z.string().optional(),
	codebaseIndexEmbedderModelDimension: z.number().optional(),
	codebaseIndexSearchMinScore: z.number().min(0).max(1).optional(),
	codebaseIndexSearchMaxResults: z
		.number()
		.min(CODEBASE_INDEX_DEFAULTS.MIN_SEARCH_RESULTS)
		.max(CODEBASE_INDEX_DEFAULTS.MAX_SEARCH_RESULTS)
		.optional(),
	// kilocode_change start
	codebaseIndexRerankEnabled: z.boolean().optional(),
	codebaseIndexRerankBaseUrl: z.string().optional(),
	codebaseIndexRerankModelId: z.string().optional(),
	codebaseIndexRerankTimeoutMs: z.number().min(1).optional(),
	codebaseIndexRerankCandidateLimit: z.number().min(1).optional(),
	codebaseIndexRerankTopK: z.number().min(1).optional(),
	// kilocode_change end
	// kilocode_change start
	codebaseIndexEmbeddingBatchSize: z
		.number()
		.min(CODEBASE_INDEX_DEFAULTS.MIN_EMBEDDING_BATCH_SIZE)
		.max(CODEBASE_INDEX_DEFAULTS.MAX_EMBEDDING_BATCH_SIZE)
		.optional(),
	codebaseIndexScannerMaxBatchRetries: z
		.number()
		.min(CODEBASE_INDEX_DEFAULTS.MIN_SCANNER_MAX_BATCH_RETRIES)
		.max(CODEBASE_INDEX_DEFAULTS.MAX_SCANNER_MAX_BATCH_RETRIES)
		.optional(),
	codebaseIndexEmbedderRequestsPerMinute: z
		.number()
		.min(CODEBASE_INDEX_DEFAULTS.MIN_EMBEDDER_RPM)
		.max(CODEBASE_INDEX_DEFAULTS.MAX_EMBEDDER_RPM)
		.optional(),
	// kilocode_change end
	// OpenAI Compatible specific fields
	codebaseIndexOpenAiCompatibleBaseUrl: z.string().optional(),
	codebaseIndexOpenAiCompatibleModelDimension: z.number().optional(),
	// Bedrock specific fields
	codebaseIndexBedrockRegion: z.string().optional(),
	codebaseIndexBedrockProfile: z.string().optional(),
	// OpenRouter specific fields
	codebaseIndexOpenRouterSpecificProvider: z.string().optional(),
	// Neo4j specific fields
	codebaseIndexNeo4jEnabled: z.boolean().optional(),
	codebaseIndexNeo4jUri: z.string().optional(),
	codebaseIndexNeo4jUsername: z.string().optional(),
	codebaseIndexNeo4jDatabase: z.string().optional(),
	// Neo4j password is NOT stored in config, only in SecretStorage
})

export type CodebaseIndexConfig = z.infer<typeof codebaseIndexConfigSchema>

/**
 * CodebaseIndexModels
 */

export const codebaseIndexModelsSchema = z.object({
	openai: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	ollama: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	"openai-compatible": z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	gemini: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	mistral: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	"vercel-ai-gateway": z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	openrouter: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	bedrock: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
})

export type CodebaseIndexModels = z.infer<typeof codebaseIndexModelsSchema>

/**
 * CdebaseIndexProvider
 */

export const codebaseIndexProviderSchema = z.object({
	codeIndexOpenAiKey: z.string().optional(),
	codeIndexQdrantApiKey: z.string().optional(),
	codebaseIndexOpenAiCompatibleBaseUrl: z.string().optional(),
	codebaseIndexOpenAiCompatibleApiKey: z.string().optional(),
	codebaseIndexOpenAiCompatibleModelDimension: z.number().optional(),
	codebaseIndexGeminiApiKey: z.string().optional(),
	codebaseIndexMistralApiKey: z.string().optional(),
	codebaseIndexVercelAiGatewayApiKey: z.string().optional(),
	codebaseIndexOpenRouterApiKey: z.string().optional(),
	codebaseIndexNeo4jPassword: z.string().optional(),
	// kilocode_change start
	codebaseIndexRerankApiKey: z.string().optional(),
	// kilocode_change end
})

export type CodebaseIndexProvider = z.infer<typeof codebaseIndexProviderSchema>
