// kilocode_change - new file
import type { Payload, VectorStoreSearchResult } from "../code-index/interfaces"

export type RerankConfig = {
	enabled?: boolean
	baseUrl?: string
	apiKey?: string
	modelId?: string
	timeoutMs?: number
	candidateLimit?: number
	topK?: number
}

type RerankResponseItem = {
	index: number
	relevance_score?: number
	score?: number
}

type RerankResponse = {
	data?: RerankResponseItem[]
	results?: RerankResponseItem[]
}

type RerankCandidatePayload = Payload & {
	code_snippet?: string
	module?: string
	neo4j_id?: string
	vector_score?: number
	rerank_score?: number
}

const DEFAULT_RERANK_TIMEOUT_MS = 7000

export class BgeReranker {
	constructor(private readonly config: RerankConfig) {}

	public get isConfigured(): boolean {
		return Boolean(this.config.baseUrl && this.config.modelId)
	}

	public get isEnabled(): boolean {
		if (this.config.enabled === false) {
			return false
		}
		return this.isConfigured
	}

	public get availability(): {
		enabled: boolean
		configured: boolean
		modelId?: string
		baseUrl?: string
	} {
		return {
			enabled: this.isEnabled,
			configured: this.isConfigured,
			modelId: this.config.modelId,
			baseUrl: this.config.baseUrl,
		}
	}

	public async rerank(
		query: string,
		candidates: VectorStoreSearchResult[],
		topK: number,
	): Promise<VectorStoreSearchResult[]> {
		if (!this.isEnabled) {
			return candidates
		}

		if (candidates.length === 0 || topK <= 0) {
			return []
		}

		const baseUrl = this.config.baseUrl
		const modelId = this.config.modelId
		if (!baseUrl || !modelId) {
			return candidates
		}

		const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
		const endpoint = new URL(normalizedBaseUrl.endsWith("/v1/") ? "rerank" : "v1/rerank", normalizedBaseUrl)
		const documents = candidates.map(
			(candidate) => candidate.payload?.code_snippet ?? candidate.codeChunk ?? candidate.payload?.codeChunk ?? "",
		)

		const response = await fetch(endpoint, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({
				model: modelId,
				query,
				texts: documents,
				top_n: Math.min(topK, documents.length),
			}),
			signal: AbortSignal.timeout(this.config.timeoutMs ?? DEFAULT_RERANK_TIMEOUT_MS),
		})

		if (!response.ok) {
			throw new Error(`Rerank request failed with status ${response.status}`)
		}

		const data = (await response.json()) as RerankResponse
		const responseItems = Array.isArray(data?.data) ? data.data : Array.isArray(data?.results) ? data.results : null
		if (!responseItems) {
			throw new Error("Unexpected rerank response format: missing data/results array")
		}

		const rankedItems = responseItems
			.map((item) => ({
				index: item?.index,
				relevance_score: item?.relevance_score ?? item?.score,
			}))
			.filter((item) => Number.isFinite(item?.index) && Number.isFinite(item?.relevance_score))
			.map((item) => ({
				index: item.index,
				relevance_score: item.relevance_score as number,
			}))
			.filter((item) => item.index >= 0 && item.index < candidates.length)
			.sort((a, b) => b.relevance_score - a.relevance_score)
			.slice(0, Math.min(topK, candidates.length))

		if (rankedItems.length === 0) {
			throw new Error("Rerank response contained no usable scores")
		}

		return rankedItems.map((item) => {
			const candidate = candidates[item.index]!
			const payload = this.buildPayload(candidate, item.relevance_score)

			return {
				...candidate,
				score: item.relevance_score,
				payload,
			}
		})
	}

	private buildPayload(candidate: VectorStoreSearchResult, rerankScore: number): RerankCandidatePayload {
		const payload = (candidate.payload ?? {}) as Partial<Payload> & RerankCandidatePayload
		const filePath = candidate.filePath || payload.filePath || ""
		const codeChunk = candidate.codeChunk || payload.codeChunk || ""
		const startLine = candidate.startLine ?? payload.startLine ?? 0
		const endLine = candidate.endLine ?? payload.endLine ?? startLine

		return {
			...payload,
			filePath,
			codeChunk,
			startLine,
			endLine,
			vector_score: candidate.score,
			rerank_score: rerankScore,
		}
	}

	private getHeaders(): Record<string, string> {
		const apiKey = this.config.apiKey
		if (!apiKey) {
			return {
				"Content-Type": "application/json",
				Accept: "application/json",
			}
		}

		return {
			"Content-Type": "application/json",
			Accept: "application/json",
			"x-api-key": apiKey,
			Authorization: `Bearer ${apiKey}`,
		}
	}
}
