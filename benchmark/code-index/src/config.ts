import * as fs from "node:fs"
import { z } from "zod"

export const EmbeddingProviderSchema = z.object({
	baseUrl: z.string().url(),
	apiKey: z.string().min(1),
	model: z.string().min(1),
})

export const QdrantConfigSchema = z.object({
	url: z.string().url(),
	apiKey: z.string().optional().default(""),
	collection: z.string().min(1),
	distance: z.enum(["Cosine", "Dot", "Euclid"]).default("Cosine"),
	hnsw: z
		.object({
			m: z.number().int().positive().default(64),
			ef_construct: z.number().int().positive().default(512),
			on_disk: z.boolean().default(true),
		})
		.default({ m: 64, ef_construct: 512, on_disk: true }),
	vectorsOnDisk: z.boolean().default(true),
	query: z
		.object({
			hnsw_ef: z.number().int().positive().default(128),
			exact: z.boolean().default(false),
		})
		.default({ hnsw_ef: 128, exact: false }),
})

export const Neo4jConfigSchema = z.object({
	uri: z.string().min(1),
	username: z.string().min(1),
	password: z.string().min(1),
	database: z.string().min(1).default("neo4j"),
})

export const ChunkingConfigSchema = z.object({
	maxBlockChars: z.number().int().positive().default(1000),
	minBlockChars: z.number().int().nonnegative().default(50),
	maxCharsToleranceFactor: z.number().positive().default(1.15),
	minChunkRemainderChars: z.number().int().nonnegative().default(200),
})

export const PipelineConfigSchema = z.object({
	runId: z.string().min(1),
	seed: z.number().int().default(42),
	repoPath: z.string().min(1),
	languageHint: z.string().optional(),

	embeddings: EmbeddingProviderSchema,
	qdrant: QdrantConfigSchema,
	neo4j: Neo4jConfigSchema,
	chunking: ChunkingConfigSchema.default({
		maxBlockChars: 1000,
		minBlockChars: 50,
		maxCharsToleranceFactor: 1.15,
		minChunkRemainderChars: 200,
	}),

	batch: z
		.object({
			embeddingBatchSize: z.number().int().positive().default(60),
		})
		.default({ embeddingBatchSize: 60 }),

	search: z
		.object({
			topK: z.number().int().positive().default(10),
			minScore: z.number().min(0).max(1).default(0.0),
			hybrid: z.boolean().default(true),
			rerank: z
				.object({
					enabled: z.boolean().default(false),
					baseUrl: z.string().url().optional(),
					apiKey: z.string().optional(),
					model: z.string().optional(),
					topK: z.number().int().positive().default(10),
					candidateLimit: z.number().int().positive().default(50),
					timeoutMs: z.number().int().positive().default(7000),
				})
				.optional(),
		})
		.default({ topK: 10, minScore: 0.0, hybrid: true }),
})

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>

export function loadConfigFromFile(path: string): PipelineConfig {
	const raw = fs.readFileSync(path, "utf8")
	const json = resolveEnvPlaceholders(JSON.parse(raw))
	return PipelineConfigSchema.parse(json)
}

function resolveEnvPlaceholders(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(resolveEnvPlaceholders)
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveEnvPlaceholders(v)]))
	}
	if (typeof value === "string") {
		const match = value.match(/^\$\{([A-Z0-9_]+)\}$/)
		if (match) {
			const envKey = match[1]!
			const envVal = process.env[envKey]
			if (!envVal) {
				throw new Error(`Missing required env var: ${envKey}`)
			}
			return envVal
		}
	}
	return value
}
