import * as fs from "node:fs/promises"
import * as path from "node:path"
import { performance } from "node:perf_hooks"

import type { PipelineConfig } from "../config.js"
import type { Logger } from "../logger.js"

import { walkFiles } from "../fswalk.js"
import { chunkTextByLines, isLikelyCodeFile } from "../chunking.js"
import { embedTexts } from "../openaiCompatEmbeddings.js"

import { collectionInfo, createQdrantClient, ensureCollection, upsertPoints, type PointPayload } from "../qdrant.js"
import { bulkUpsert, clearAll, connectNeo4j, initSchema, stats } from "../neo4j.js"
import { extractGraphForFile } from "../graphExtract.js"
import { MetricsCollector } from "../metrics.js"
import { relativeTo } from "../util/pathUtil.js"
import { writeJson } from "../util/writeArtifacts.js"

// Deterministic point id for benchmark runs.
// NOTE: we use the chunk's segmentHash (sha256 hex) directly because Qdrant supports string point IDs.

export async function runIndex(params: {
	cfg: PipelineConfig
	logger: Logger
	outDir: string
	reset: boolean
	maxFiles?: number
}): Promise<void> {
	const { cfg, logger } = params
	const runDir = path.join(params.outDir, cfg.runId)
	const metrics = new MetricsCollector(cfg.runId, cfg)

	const qdrant = createQdrantClient(cfg.qdrant.url, cfg.qdrant.apiKey)
	const neo = await connectNeo4j(cfg.neo4j)
	await initSchema(neo, cfg.neo4j)

	try {
		if (params.reset) {
			logger.info(
				{ collection: cfg.qdrant.collection },
				"Reset requested: deleting Qdrant collection + clearing Neo4j",
			)
			try {
				await qdrant.deleteCollection(cfg.qdrant.collection)
			} catch {
				// ignore
			}
			await clearAll(neo, cfg.neo4j)
		}

		// NOTE: if vector size mismatches, ensureCollection recreates the collection.
		// We use a safe default (1024) for bge-m3; if the endpoint returns other dims,
		// recreate will happen on next run (or you can bump this).
		await ensureCollection(qdrant, {
			url: cfg.qdrant.url,
			apiKey: cfg.qdrant.apiKey,
			collection: cfg.qdrant.collection,
			vectorSize: 1024,
			distance: cfg.qdrant.distance,
			vectorsOnDisk: cfg.qdrant.vectorsOnDisk,
			hnsw: cfg.qdrant.hnsw,
		})

		const filesAbs = await walkFiles(cfg.repoPath, {
			maxFiles: params.maxFiles,
			excludeDirs: new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".turbo"]),
		})

		const files = filesAbs.filter((f) => isLikelyCodeFile(f))
		metrics.inc("files.discovered", filesAbs.length)
		metrics.inc("files.selected", files.length)

		const startedTotal = performance.now()

		for (const fullPath of files) {
			const rel = relativeTo(cfg.repoPath, fullPath)
			let content: string
			try {
				content = await fs.readFile(fullPath, "utf8")
			} catch {
				metrics.inc("files.read.failed", 1)
				continue
			}
			metrics.inc("files.read.ok", 1)
			metrics.inc("bytes.read", Buffer.byteLength(content, "utf8"))

			const blocks = chunkTextByLines(rel, content, cfg.chunking)
			metrics.inc("chunks.total", blocks.length)
			if (blocks.length === 0) continue

			// embeddings in batches
			for (let i = 0; i < blocks.length; i += cfg.batch.embeddingBatchSize) {
				const batch = blocks.slice(i, i + cfg.batch.embeddingBatchSize)
				const texts = batch.map((b) => b.content)

				const { vectors, latencyMs } = await embedTexts(
					{ baseUrl: cfg.embeddings.baseUrl, apiKey: cfg.embeddings.apiKey, model: cfg.embeddings.model },
					texts,
				)
				metrics.observeMs("embedding.batch", latencyMs)
				metrics.inc("embedding.texts", texts.length)

				const points = batch.map((b, idx) => {
					const id = b.segmentHash
					const payload: PointPayload = {
						filePath: b.filePath,
						codeChunk: b.content,
						startLine: b.startLine,
						endLine: b.endLine,
						segmentHash: b.segmentHash,
						type: "code",
					}
					return { id, vector: vectors[idx]!, payload }
				})

				const upsertStarted = performance.now()
				await upsertPoints(qdrant, cfg.qdrant.collection, points)
				metrics.observeMs("qdrant.upsert.batch", performance.now() - upsertStarted)
				metrics.inc("qdrant.points.upserted", points.length)
			}

			// graph extraction + upsert
			const graphStarted = performance.now()
			const { entities, rels } = await extractGraphForFile({
				filePath: rel,
				content,
				languageId: cfg.languageHint ?? "",
			})
			metrics.observeMs("graph.extract.file", performance.now() - graphStarted)
			metrics.inc("neo4j.entities", entities.length)
			metrics.inc("neo4j.rels", rels.length)

			const neoWriteStarted = performance.now()
			await bulkUpsert(neo, cfg.neo4j, entities, rels)
			metrics.observeMs("neo4j.write.file", performance.now() - neoWriteStarted)
		}

		metrics.observeMs("index.total", performance.now() - startedTotal)
		metrics.finish()

		const qInfo = await collectionInfo(qdrant, cfg.qdrant.collection)
		const gStats = await stats(neo, cfg.neo4j)

		await writeJson(runDir, "metrics.json", metrics.state)
		await writeJson(runDir, "qdrant.collection.json", qInfo)
		await writeJson(runDir, "neo4j.stats.json", gStats)

		logger.info({ runDir, totalMs: performance.now() - startedTotal }, "Index run finished")
	} finally {
		await neo.close()
	}
}
