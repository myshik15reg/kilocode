import * as path from "path"
import * as vscode from "vscode"
import * as crypto from "crypto"
import { OpenAiEmbedder } from "./embedders/openai"
import { CodeIndexOllamaEmbedder } from "./embedders/ollama"
import { OpenAICompatibleEmbedder } from "./embedders/openai-compatible"
import { GeminiEmbedder } from "./embedders/gemini"
import { MistralEmbedder } from "./embedders/mistral"
import { VercelAiGatewayEmbedder } from "./embedders/vercel-ai-gateway"
import { OpenRouterEmbedder } from "./embedders/openrouter"
import { EmbedderProvider, getDefaultModelId, getModelDimension } from "../../shared/embeddingModels"
import { QdrantVectorStore } from "./vector-store/qdrant-client"
import { codeParser, DirectoryScanner, FileWatcher } from "./processors"
import { ICodeParser, IEmbedder, IFileWatcher, IVectorStore } from "./interfaces"
import { CodeIndexConfigManager } from "./config-manager"
import { CacheManager } from "./cache-manager"
import { RooIgnoreController } from "../../core/ignore/RooIgnoreController"
import { Ignore } from "ignore"
import { t } from "../../i18n"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import { Package } from "../../shared/package"
import { BATCH_SEGMENT_THRESHOLD } from "./constants"
import { GraphProcessor } from "./processors/graph-processor"
import { Neo4jGraphService } from "./graph-service"

/**
 * Factory class responsible for creating and configuring code indexing service dependencies.
 */
export class CodeIndexServiceFactory {
	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly workspacePath: string,
		private readonly cacheManager: CacheManager,
	) {}

	// + Чернявский Е.И.
	/**
	 * Generates a default collection name based on workspace path hash
	 * @returns Default collection name
	 */
	private generateDefaultCollectionName(): string {
		const workspaceName = path.basename(this.workspacePath)
		// Sanitize for Qdrant: lowercase, letters, numbers, and underscores
		const sanitized = workspaceName
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, "_") // Replace invalid chars with underscore
			.replace(/_+/g, "_") // Collapse multiple underscores
			.replace(/^_|_$/g, "") // Remove leading/trailing underscores

		if (!sanitized) {
			// Fallback to a hash-based name if sanitization results in an empty string
			const hash = crypto.createHash("sha256").update(this.workspacePath).digest("hex")
			return `ws-${hash.substring(0, 16)}`
		}

		return sanitized
	}
	// - Чернявский Е.И.

	public getDefaultCollectionName(): string {
		return this.generateDefaultCollectionName()
	}

	/**
	 * Creates an embedder instance based on the current configuration.
	 */
	public createEmbedder(): IEmbedder {
		const config = this.configManager.getConfig()

		const provider = config.embedderProvider as EmbedderProvider

		if (provider === "openai") {
			const apiKey = config.openAiOptions?.openAiNativeApiKey

			if (!apiKey) {
				throw new Error(t("embeddings:serviceFactory.openAiConfigMissing"))
			}
			return new OpenAiEmbedder({
				...config.openAiOptions,
				openAiEmbeddingModelId: config.modelId,
			})
		} else if (provider === "ollama") {
			if (!config.ollamaOptions?.ollamaBaseUrl) {
				throw new Error(t("embeddings:serviceFactory.ollamaConfigMissing"))
			}
			return new CodeIndexOllamaEmbedder({
				...config.ollamaOptions,
				ollamaModelId: config.modelId,
			})
		} else if (provider === "openai-compatible") {
			if (!config.openAiCompatibleOptions?.baseUrl || !config.openAiCompatibleOptions?.apiKey) {
				throw new Error(t("embeddings:serviceFactory.openAiCompatibleConfigMissing"))
			}
			return new OpenAICompatibleEmbedder(
				config.openAiCompatibleOptions.baseUrl,
				config.openAiCompatibleOptions.apiKey,
				config.modelId,
			)
		} else if (provider === "gemini") {
			if (!config.geminiOptions?.apiKey) {
				throw new Error(t("embeddings:serviceFactory.geminiConfigMissing"))
			}
			return new GeminiEmbedder(config.geminiOptions.apiKey, config.modelId)
		} else if (provider === "mistral") {
			if (!config.mistralOptions?.apiKey) {
				throw new Error(t("embeddings:serviceFactory.mistralConfigMissing"))
			}
			return new MistralEmbedder(config.mistralOptions.apiKey, config.modelId)
		} else if (provider === "vercel-ai-gateway") {
			if (!config.vercelAiGatewayOptions?.apiKey) {
				throw new Error(t("embeddings:serviceFactory.vercelAiGatewayConfigMissing"))
			}
			return new VercelAiGatewayEmbedder(config.vercelAiGatewayOptions.apiKey, config.modelId)
		} else if (provider === "openrouter") {
			if (!config.openRouterOptions?.apiKey) {
				throw new Error(t("embeddings:serviceFactory.openRouterConfigMissing"))
			}
			return new OpenRouterEmbedder(config.openRouterOptions.apiKey, config.modelId)
		}

		throw new Error(
			t("embeddings:serviceFactory.invalidEmbedderType", { embedderProvider: config.embedderProvider }),
		)
	}

	/**
	 * Validates an embedder instance to ensure it's properly configured.
	 * @param embedder The embedder instance to validate
	 * @returns Promise resolving to validation result
	 */
	public async validateEmbedder(embedder: IEmbedder): Promise<{ valid: boolean; error?: string }> {
		try {
			return await embedder.validateConfiguration()
		} catch (error) {
			// Capture telemetry for the error
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "validateEmbedder",
			})

			// If validation throws an exception, preserve the original error message
			return {
				valid: false,
				error: error instanceof Error ? error.message : "embeddings:validation.configurationError",
			}
		}
	}

	/**
	 * Creates a vector store instance using the current configuration.
	 */
	public createVectorStore(): IVectorStore {
		const config = this.configManager.getConfig()

		const provider = config.embedderProvider as EmbedderProvider
		const defaultModel = getDefaultModelId(provider)
		// Use the embedding model ID from config, not the chat model IDs
		const modelId = config.modelId ?? defaultModel

		let vectorSize: number | undefined

		// First try to get the model-specific dimension from profiles
		vectorSize = getModelDimension(provider, modelId)

		// Only use manual dimension if model doesn't have a built-in dimension
		if (!vectorSize && config.modelDimension && config.modelDimension > 0) {
			vectorSize = config.modelDimension
		}

		if (vectorSize === undefined || vectorSize <= 0) {
			if (provider === "openai-compatible") {
				throw new Error(
					t("embeddings:serviceFactory.vectorDimensionNotDeterminedOpenAiCompatible", { modelId, provider }),
				)
			} else {
				throw new Error(t("embeddings:serviceFactory.vectorDimensionNotDetermined", { modelId, provider }))
			}
		}

		if (!config.qdrantUrl) {
			throw new Error(t("embeddings:serviceFactory.qdrantUrlMissing"))
		}

		// + Чернявский Е.И.
		//// Assuming constructor is updated: new QdrantVectorStore(workspacePath, url, vectorSize, apiKey?)
		//return new QdrantVectorStore(this.workspacePath, config.qdrantUrl, vectorSize, config.qdrantApiKey)

		// Generate collection name if not provided
		const collectionName = config.CollectionName || this.generateDefaultCollectionName()

		// Assuming constructor is updated: new QdrantVectorStore(workspacePath, url, vectorSize, collectionName, apiKey?)
		return new QdrantVectorStore(
			this.workspacePath,
			config.qdrantUrl,
			vectorSize,
			collectionName,
			config.qdrantApiKey,
		)
		// - Чернявский Е.И.
	}

	/**
	 * Creates a Neo4j graph service instance.
	 */
	public createNeo4jService(): Neo4jGraphService {
		const config = this.configManager.getConfig()
		const collectionName = config.CollectionName || this.generateDefaultCollectionName()

		const { neo4jUri, neo4jUser, neo4jPassword } = config

		if (!neo4jUri || !neo4jUser || !neo4jPassword) {
			throw new Error("Neo4j configuration is missing (URI, user, or password).")
		}

		if (!collectionName) {
			throw new Error("Qdrant collection name is not configured, cannot generate Neo4j database name.")
		}

		return new Neo4jGraphService({
			uri: neo4jUri,
			user: neo4jUser,
			password: neo4jPassword,
			database: `${collectionName}_graph`, // Генерируем имя БД
		})
	}

	/**
	 * Creates a graph processor instance.
	 */
	public createGraphProcessor(graphService: Neo4jGraphService, cacheManager: CacheManager): GraphProcessor {
		const parser = codeParser
		return new GraphProcessor(graphService, parser as any, cacheManager)
	}

	/**
	 * Creates a directory scanner instance with its required dependencies.
	 */
	public createDirectoryScanner(
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		parser: ICodeParser,
		ignoreInstance: Ignore,
	): DirectoryScanner {
		// Get the configurable batch size from VSCode settings
		let batchSize: number
		try {
			batchSize = vscode.workspace
				.getConfiguration(Package.name)
				.get<number>("codeIndex.embeddingBatchSize", BATCH_SEGMENT_THRESHOLD)
		} catch {
			// In test environment, vscode.workspace might not be available
			batchSize = BATCH_SEGMENT_THRESHOLD
		}
		return new DirectoryScanner(embedder, vectorStore, parser, this.cacheManager, ignoreInstance, batchSize)
	}

	/**
	 * Creates a file watcher instance with its required dependencies.
	 */
	public createFileWatcher(
		context: vscode.ExtensionContext,
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		cacheManager: CacheManager,
		ignoreInstance: Ignore,
		rooIgnoreController?: RooIgnoreController,
	): IFileWatcher {
		// Get the configurable batch size from VSCode settings
		let batchSize: number
		try {
			batchSize = vscode.workspace
				.getConfiguration(Package.name)
				.get<number>("codeIndex.embeddingBatchSize", BATCH_SEGMENT_THRESHOLD)
		} catch {
			// In test environment, vscode.workspace might not be available
			batchSize = BATCH_SEGMENT_THRESHOLD
		}
		return new FileWatcher(
			this.workspacePath,
			context,
			cacheManager,
			embedder,
			vectorStore,
			ignoreInstance,
			rooIgnoreController,
			batchSize,
		)
	}

	/**
	 * Creates all required service dependencies if the service is properly configured.
	 * @throws Error if the service is not properly configured
	 */
	public createServices(
		context: vscode.ExtensionContext,
		cacheManager: CacheManager,
		ignoreInstance: Ignore,
		rooIgnoreController?: RooIgnoreController,
	): {
		embedder: IEmbedder
		vectorStore: IVectorStore
		parser: ICodeParser
		scanner: DirectoryScanner
		fileWatcher: IFileWatcher
		graphProcessor: GraphProcessor
		neo4jService: Neo4jGraphService
	} {
		if (!this.configManager.isFeatureConfigured) {
			throw new Error(t("embeddings:serviceFactory.codeIndexingNotConfigured"))
		}

		const embedder = this.createEmbedder()
		const vectorStore = this.createVectorStore()
		const neo4jService = this.createNeo4jService()
		const parser = codeParser
		const scanner = this.createDirectoryScanner(embedder, vectorStore, parser, ignoreInstance)
		const fileWatcher = this.createFileWatcher(
			context,
			embedder,
			vectorStore,
			cacheManager,
			ignoreInstance,
			rooIgnoreController,
		)
		const graphProcessor = this.createGraphProcessor(neo4jService, cacheManager)

		return {
			embedder,
			vectorStore,
			parser,
			scanner,
			fileWatcher,
			graphProcessor,
			neo4jService,
		}
	}
}
