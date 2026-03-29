import * as path from "node:path"

import type { PipelineConfig } from "../config.js"
import type { Logger } from "../logger.js"

import { embedTexts } from "../openaiCompatEmbeddings.js"
import { createQdrantClient, query as qdrantQuery } from "../qdrant.js"
import { loadQueryPack } from "../queryPacks.js"
import { MetricsCollector } from "../metrics.js"
import { writeJson } from "../util/writeArtifacts.js"

type EvalResult = {
	queryPackPath: string
	topK: number
	metrics: {
		recallAtK: number
		ndcgAtK: number
		mrr: number
	}
	perCase: Array<{
		id: string
		reciprocalRank: number
		foundRank?: number
		expected: Array<{ filePath: string; line?: number }>
	}>
}

function isRelevant(result: any, expected: Array<{ filePath: string; line?: number }>): boolean {
	const fp = result?.payload?.filePath
	if (!fp) return false
	for (const e of expected) {
		if (fp !== e.filePath) continue
		if (!e.line) return true
		const s = result?.payload?.startLine
		const end = result?.payload?.endLine
		if (typeof s === "number" && typeof end === "number" && s <= e.line && e.line <= end) return true
	}
	return false
}

export async function runEval(params: {
	cfg: PipelineConfig
	logger: Logger
	outDir: string
	queryPackPath: string
}): Promise<void> {
	const { cfg, logger } = params
	const runDir = path.join(params.outDir, cfg.runId)
	const qdrant = createQdrantClient(cfg.qdrant.url, cfg.qdrant.apiKey)
	const pack = loadQueryPack(params.queryPackPath)

	const metrics = new MetricsCollector(cfg.runId, { cfg, queryPack: pack })

	let sumRecall = 0
	let sumNdcg = 0
	let sumMrr = 0

	const perCase: EvalResult["perCase"] = []

	for (const c of pack.cases) {
		const { vectors, latencyMs } = await embedTexts(
			{ baseUrl: cfg.embeddings.baseUrl, apiKey: cfg.embeddings.apiKey, model: cfg.embeddings.model },
			[c.query],
		)
		metrics.observeMs("embedding.query", latencyMs)

		const res = await qdrantQuery(qdrant, cfg.qdrant.collection, vectors[0]!, {
			limit: cfg.search.topK,
			minScore: cfg.search.minScore,
			hnsw_ef: cfg.qdrant.query.hnsw_ef,
			exact: cfg.qdrant.query.exact,
		})

		let foundRank: number | undefined
		for (let i = 0; i < res.length; i++) {
			if (isRelevant(res[i], c.expected)) {
				foundRank = i + 1
				break
			}
		}

		const hit = foundRank !== undefined
		const rr = hit ? 1 / foundRank! : 0
		const ndcg = hit ? 1 / Math.log2(foundRank! + 1) : 0

		sumRecall += hit ? 1 : 0
		sumMrr += rr
		sumNdcg += ndcg

		perCase.push({ id: c.id, reciprocalRank: rr, foundRank, expected: c.expected })
	}

	const n = pack.cases.length || 1
	const result: EvalResult = {
		queryPackPath: params.queryPackPath,
		topK: cfg.search.topK,
		metrics: {
			recallAtK: sumRecall / n,
			ndcgAtK: sumNdcg / n,
			mrr: sumMrr / n,
		},
		perCase,
	}

	metrics.finish()
	await writeJson(runDir, "eval.json", result)
	await writeJson(runDir, "metrics.eval.json", metrics.state)
	logger.info({ runDir, ...result.metrics }, "Eval finished")
}
