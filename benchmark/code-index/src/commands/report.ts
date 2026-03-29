import * as fs from "node:fs/promises"
import * as path from "node:path"

import type { Logger } from "../logger.js"
import { summarizeHistogram } from "../metrics.js"

type RunRow = {
	runId: string
	model: string
	repoPath: string
	collection: string
	files: number
	chunks: number
	embP50: number
	embP95: number
	qdrantUpsertP50: number
	qdrantUpsertP95: number
	recallAtK?: number
	ndcgAtK?: number
	mrr?: number
	qdrantPoints?: number
	neoEntities?: number
	neoRels?: number
}

async function readJsonIfExists(p: string): Promise<any | null> {
	try {
		const raw = await fs.readFile(p, "utf8")
		return JSON.parse(raw)
	} catch {
		return null
	}
}

export async function runReport(params: {
	logger: Logger
	runsDir: string
	outMd: string
	outJson: string
}): Promise<void> {
	const { logger } = params
	const runIds = await fs.readdir(params.runsDir)
	const rows: RunRow[] = []

	for (const runId of runIds) {
		const dir = path.join(params.runsDir, runId)
		const st = await fs.stat(dir).catch(() => null)
		if (!st?.isDirectory()) continue

		const metrics = await readJsonIfExists(path.join(dir, "metrics.json"))
		if (!metrics) continue

		const qdrant = await readJsonIfExists(path.join(dir, "qdrant.collection.json"))
		const neo = await readJsonIfExists(path.join(dir, "neo4j.stats.json"))
		const evalRes = await readJsonIfExists(path.join(dir, "eval.json"))

		const embHist = metrics.histograms?.["embedding.batch"]
		const upsertHist = metrics.histograms?.["qdrant.upsert.batch"]
		const embSummary = embHist ? summarizeHistogram(embHist) : null
		const upsertSummary = upsertHist ? summarizeHistogram(upsertHist) : null

		rows.push({
			runId,
			model: metrics.config?.embeddings?.model ?? "",
			repoPath: metrics.config?.repoPath ?? "",
			collection: metrics.config?.qdrant?.collection ?? "",
			files: metrics.counters?.["files.read.ok"] ?? 0,
			chunks: metrics.counters?.["chunks.total"] ?? 0,
			embP50: embSummary?.p50Ms ?? 0,
			embP95: embSummary?.p95Ms ?? 0,
			qdrantUpsertP50: upsertSummary?.p50Ms ?? 0,
			qdrantUpsertP95: upsertSummary?.p95Ms ?? 0,
			recallAtK: evalRes?.metrics?.recallAtK,
			ndcgAtK: evalRes?.metrics?.ndcgAtK,
			mrr: evalRes?.metrics?.mrr,
			qdrantPoints: qdrant?.points_count ?? qdrant?.pointsCount,
			neoEntities: neo?.totalEntities,
			neoRels: neo?.totalRelationships,
		})
	}

	rows.sort((a, b) => a.runId.localeCompare(b.runId))

	const md = renderMarkdown(rows)
	await fs.mkdir(path.dirname(params.outMd), { recursive: true })
	await fs.writeFile(params.outMd, md, "utf8")
	await fs.writeFile(params.outJson, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2), "utf8")

	logger.info({ outMd: params.outMd, outJson: params.outJson, runs: rows.length }, "Report generated")
}

function renderMarkdown(rows: RunRow[]): string {
	const header =
		"| runId | model | repoPath | files | chunks | emb p50/p95 (ms) | qdrant upsert p50/p95 (ms) | Recall@k | nDCG@k | MRR | qdrant points | neo4j entities | neo4j rels |\n" +
		"|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n"

	const body = rows
		.map((r) => {
			const emb = `${r.embP50.toFixed(1)}/${r.embP95.toFixed(1)}`
			const ups = `${r.qdrantUpsertP50.toFixed(1)}/${r.qdrantUpsertP95.toFixed(1)}`
			return `| ${r.runId} | ${r.model} | ${r.repoPath} | ${r.files} | ${r.chunks} | ${emb} | ${ups} | ${fmt(r.recallAtK)} | ${fmt(r.ndcgAtK)} | ${fmt(r.mrr)} | ${r.qdrantPoints ?? ""} | ${r.neoEntities ?? ""} | ${r.neoRels ?? ""} |`
		})
		.join("\n")

	return `# Code Index Benchmark Report\n\n${header}${body}\n`
}

function fmt(v: any): string {
	return typeof v === "number" ? v.toFixed(4) : ""
}
