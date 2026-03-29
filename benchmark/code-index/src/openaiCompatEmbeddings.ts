import { performance } from "node:perf_hooks"
import { z } from "zod"

export type EmbeddingClientConfig = {
	baseUrl: string
	apiKey: string
	model: string
}

const EmbeddingsResponseSchema = z.object({
	data: z.array(z.object({ embedding: z.array(z.number()) })),
	model: z.string().optional(),
})

export async function embedTexts(
	cfg: EmbeddingClientConfig,
	texts: string[],
): Promise<{ vectors: number[][]; model: string | undefined; latencyMs: number }> {
	const url = new URL("/v1/embeddings", cfg.baseUrl)
	const started = performance.now()

	const resp = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${cfg.apiKey}`,
		},
		body: JSON.stringify({
			model: cfg.model,
			input: texts,
		}),
	})

	const latencyMs = performance.now() - started
	const bodyText = await resp.text()

	if (!resp.ok) {
		throw new Error(`Embeddings request failed: HTTP ${resp.status}. Body: ${bodyText.slice(0, 500)}`)
	}

	let json: unknown
	try {
		json = JSON.parse(bodyText)
	} catch {
		throw new Error(`Embeddings response is not JSON: ${bodyText.slice(0, 200)}`)
	}

	const parsed = EmbeddingsResponseSchema.parse(json)
	const vectors = parsed.data.map((d) => d.embedding)

	return { vectors, model: parsed.model, latencyMs }
}
