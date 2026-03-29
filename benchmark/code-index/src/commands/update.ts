import * as fs from "node:fs/promises"
import * as path from "node:path"

import type { PipelineConfig } from "../config.js"
import type { Logger } from "../logger.js"

import { walkFiles } from "../fswalk.js"
import { chunkTextByLines, isLikelyCodeFile } from "../chunking.js"
import { embedTexts } from "../openaiCompatEmbeddings.js"

import { createQdrantClient, ensureCollection, upsertPoints, deleteByFilePaths as qdrantDelete } from "../qdrant.js"
import { connectNeo4j, initSchema, deleteByFilePaths as neoDelete, bulkUpsert } from "../neo4j.js"
import { extractGraphForFile } from "../graphExtract.js"
import { MetricsCollector } from "../metrics.js"
import { relativeTo } from "../util/pathUtil.js"
import { sha256Hex } from "../util/fileHash.js"
import { writeJson } from "../util/writeArtifacts.js"

// Deterministic point id for benchmark runs.
// NOTE: we use the chunk's segmentHash (sha256 hex) directly because Qdrant supports string point IDs.

type State = {
	repoPath: string
	files: Record<string, { hash: string }>
}

async function loadState(p: string): Promise<State | null> {
	try {
		const raw = await fs.readFile(p, "utf8")
		return JSON.parse(raw) as State
	} catch {
		return null
	}
}

async function saveState(p: string, s: State): Promise<void> {
	await fs.mkdir(path.dirname(p), { recursive: true })
	await fs.writeFile(p, JSON.stringify(s, null, 2), "utf8")
}

export async function runUpdate(params: {
	cfg: PipelineConfig
	logger: Logger
	outDir: string
	statePath: string
	maxFiles?: number
}): Promise<void> {
	const { cfg, logger } = params
	const runDir = path.join(params.outDir, cfg.runId)
	const metrics = new MetricsCollector(cfg.runId, cfg)

	const prev = await loadState(params.statePath)
	const prevFiles = prev?.files ?? {}

	const qdrant = createQdrantClient(cfg.qdrant.url, cfg.qdrant.apiKey)
	await ensureCollection(qdrant, {
		url: cfg.qdrant.url,
		apiKey: cfg.qdrant.apiKey,
		collection: cfg.qdrant.collection,
		vectorSize: 1024,
		distance: cfg.qdrant.distance,
		vectorsOnDisk: cfg.qdrant.vectorsOnDisk,
		hnsw: cfg.qdrant.hnsw,
	})

	const neo = await connectNeo4j(cfg.neo4j)
	await initSchema(neo, cfg.neo4j)

	try {
		const filesAbs = await walkFiles(cfg.repoPath, {
			maxFiles: params.maxFiles,
			excludeDirs: new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".turbo"]),
		})
		const files = filesAbs.filter((f) => isLikelyCodeFile(f))

		const nextFiles: Record<string, { hash: string }> = {}

		for (const fullPath of files) {
			const rel = relativeTo(cfg.repoPath, fullPath)
			let content: string
			try {
				content = await fs.readFile(fullPath, "utf8")
			} catch {
				continue
			}
			nextFiles[rel] = { hash: sha256Hex(content) }
		}

		const added: string[] = []
		const modified: string[] = []
		const deleted: string[] = []

		for (const [filePath, meta] of Object.entries(nextFiles)) {
			const prevMeta = prevFiles[filePath]
			if (!prevMeta) added.push(filePath)
			else if (prevMeta.hash !== meta.hash) modified.push(filePath)
		}
		for (const filePath of Object.keys(prevFiles)) {
			if (!nextFiles[filePath]) deleted.push(filePath)
		}

		// Rename detection: match deleted<->added by identical content hash
		const deletedByHash = new Map<string, string>()
		for (const d of deleted) deletedByHash.set(prevFiles[d]!.hash, d)
		const renames: Array<{ from: string; to: string }> = []
		const addedRemaining: string[] = []
		for (const a of added) {
			const h = nextFiles[a]!.hash
			const from = deletedByHash.get(h)
			if (from) {
				renames.push({ from, to: a })
				deletedByHash.delete(h)
			} else {
				addedRemaining.push(a)
			}
		}
		const deletedRemaining = [...deletedByHash.values()]

		metrics.inc("update.added", addedRemaining.length)
		metrics.inc("update.modified", modified.length)
		metrics.inc("update.deleted", deletedRemaining.length)
		metrics.inc("update.renamed", renames.length)

		const toDelete = [...deletedRemaining, ...modified, ...renames.map((r) => r.from)]
		if (toDelete.length > 0) {
			await qdrantDelete(qdrant, cfg.qdrant.collection, toDelete)
			await neoDelete(neo, cfg.neo4j, toDelete)
			metrics.inc("update.deleted.files", toDelete.length)
		}

		const toAdd = [...addedRemaining, ...modified, ...renames.map((r) => r.to)]
		for (const rel of toAdd) {
			const fullPath = path.join(cfg.repoPath, rel)
			let content: string
			try {
				content = await fs.readFile(fullPath, "utf8")
			} catch {
				continue
			}

			const blocks = chunkTextByLines(rel, content, cfg.chunking)
			metrics.inc("chunks.total", blocks.length)
			for (let i = 0; i < blocks.length; i += cfg.batch.embeddingBatchSize) {
				const batch = blocks.slice(i, i + cfg.batch.embeddingBatchSize)
				const texts = batch.map((b) => b.content)
				const { vectors, latencyMs } = await embedTexts(
					{ baseUrl: cfg.embeddings.baseUrl, apiKey: cfg.embeddings.apiKey, model: cfg.embeddings.model },
					texts,
				)
				metrics.observeMs("embedding.batch", latencyMs)

				await upsertPoints(
					qdrant,
					cfg.qdrant.collection,
					batch.map((b, idx) => ({
						id: b.segmentHash,
						vector: vectors[idx]!,
						payload: {
							filePath: b.filePath,
							codeChunk: b.content,
							startLine: b.startLine,
							endLine: b.endLine,
							segmentHash: b.segmentHash,
							type: "code",
						},
					})),
				)
				metrics.inc("qdrant.points.upserted", batch.length)
			}

			const { entities, rels } = await extractGraphForFile({
				filePath: rel,
				content,
				languageId: cfg.languageHint ?? "",
			})
			await bulkUpsert(neo, cfg.neo4j, entities, rels)
			metrics.inc("neo4j.entities", entities.length)
			metrics.inc("neo4j.rels", rels.length)
		}

		metrics.finish()
		await writeJson(runDir, "metrics.json", metrics.state)
		await saveState(params.statePath, { repoPath: cfg.repoPath, files: nextFiles })
		logger.info({ runDir, statePath: params.statePath }, "Update run finished")
	} finally {
		await neo.close()
	}
}
