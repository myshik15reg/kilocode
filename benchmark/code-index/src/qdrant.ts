import { QdrantClient } from "@qdrant/js-client-rest"

export type QdrantInitConfig = {
	url: string
	apiKey?: string
	collection: string
	vectorSize: number
	distance: "Cosine" | "Dot" | "Euclid"
	vectorsOnDisk: boolean
	hnsw: {
		m: number
		ef_construct: number
		on_disk: boolean
	}
}

export function createQdrantClient(url: string, apiKey?: string): QdrantClient {
	// QdrantClient умеет url; для простоты используем url.
	return new QdrantClient({
		url,
		apiKey: apiKey && apiKey.trim() !== "" ? apiKey : undefined,
		headers: {
			"User-Agent": "code-index-benchmark",
		},
	})
}

export async function ensureCollection(
	client: QdrantClient,
	cfg: QdrantInitConfig,
): Promise<{
	created: boolean
	existingVectorSize?: number
}> {
	const name = cfg.collection

	let info: any | null = null
	try {
		info = await client.getCollection(name)
	} catch {
		info = null
	}

	if (!info) {
		await client.createCollection(name, {
			vectors: {
				size: cfg.vectorSize,
				distance: cfg.distance,
				on_disk: cfg.vectorsOnDisk,
			},
			hnsw_config: {
				m: cfg.hnsw.m,
				ef_construct: cfg.hnsw.ef_construct,
				on_disk: cfg.hnsw.on_disk,
			},
		})

		// payload indexes for filtering
		await safeCreatePayloadIndexes(client, name)

		return { created: true }
	}

	const vectorsConfig = info?.config?.params?.vectors
	let existingVectorSize: number | undefined
	if (typeof vectorsConfig === "number") {
		existingVectorSize = vectorsConfig
	} else if (vectorsConfig && typeof vectorsConfig === "object" && typeof vectorsConfig.size === "number") {
		existingVectorSize = vectorsConfig.size
	}

	if (existingVectorSize !== cfg.vectorSize) {
		// recreate (deterministic benchmark expects correct dims)
		await client.deleteCollection(name)
		await client.createCollection(name, {
			vectors: {
				size: cfg.vectorSize,
				distance: cfg.distance,
				on_disk: cfg.vectorsOnDisk,
			},
			hnsw_config: {
				m: cfg.hnsw.m,
				ef_construct: cfg.hnsw.ef_construct,
				on_disk: cfg.hnsw.on_disk,
			},
		})
		await safeCreatePayloadIndexes(client, name)
		return { created: true, existingVectorSize }
	}

	await safeCreatePayloadIndexes(client, name)
	return { created: false, existingVectorSize }
}

async function safeCreatePayloadIndexes(client: QdrantClient, collection: string): Promise<void> {
	const safe = async (fn: () => Promise<any>) => {
		try {
			await fn()
		} catch {
			// ignore "already exists" and other non-fatal issues
		}
	}

	await safe(() =>
		client.createPayloadIndex(collection, {
			field_name: "type",
			field_schema: "keyword",
		}),
	)

	for (let i = 0; i <= 4; i++) {
		await safe(() =>
			client.createPayloadIndex(collection, {
				field_name: `pathSegments.${i}`,
				field_schema: "keyword",
			}),
		)
	}
}

export type PointPayload = {
	filePath: string
	codeChunk: string
	startLine: number
	endLine: number
	segmentHash: string
	type?: string
	pathSegments?: Record<string, string>
}

export function buildPathSegments(filePath: string): Record<string, string> {
	const normalized = filePath.replace(/\\/g, "/")
	const parts = normalized.split("/").filter(Boolean)
	const out: Record<string, string> = {}
	for (let i = 0; i < Math.min(parts.length, 16); i++) {
		out[String(i)] = parts[i]!
	}
	return out
}

export async function upsertPoints(
	client: QdrantClient,
	collection: string,
	points: Array<{ id: string; vector: number[]; payload: PointPayload }>,
): Promise<void> {
	const processed = points.map((p) => ({
		...p,
		payload: {
			...p.payload,
			pathSegments: p.payload.pathSegments ?? buildPathSegments(p.payload.filePath),
		},
	}))

	await client.upsert(collection, {
		points: processed,
		wait: true,
	})
}

export async function deleteByFilePaths(client: QdrantClient, collection: string, filePaths: string[]): Promise<void> {
	if (filePaths.length === 0) return

	const filters = filePaths.map((filePath) => {
		const segs = buildPathSegments(filePath)
		const must = Object.entries(segs).map(([idx, value]) => ({
			key: `pathSegments.${idx}`,
			match: { value },
		}))
		return { must }
	})

	const filter = filters.length === 1 ? filters[0]! : { should: filters }
	await client.delete(collection, {
		filter,
		wait: true,
	})
}

export async function query(
	client: QdrantClient,
	collection: string,
	vector: number[],
	opts: {
		limit: number
		minScore: number
		directoryPrefix?: string
		hnsw_ef: number
		exact: boolean
	},
): Promise<
	Array<{
		id: string | number
		score: number
		payload: any
	}>
> {
	let filter: any | undefined

	if (opts.directoryPrefix) {
		const cleaned = opts.directoryPrefix.replace(/\\/g, "/").replace(/^\.\//, "")
		const segs = cleaned.split("/").filter(Boolean)
		if (segs.length > 0) {
			filter = { must: segs.map((seg, i) => ({ key: `pathSegments.${i}`, match: { value: seg } })) }
		}
	}

	const metadataExclusion = { must_not: [{ key: "type", match: { value: "metadata" } }] }
	const merged = filter
		? { ...filter, must_not: [...(filter.must_not ?? []), ...metadataExclusion.must_not] }
		: metadataExclusion

	const res: any = await client.query(collection, {
		query: vector,
		filter: merged,
		score_threshold: opts.minScore,
		limit: opts.limit,
		params: {
			hnsw_ef: opts.hnsw_ef,
			exact: opts.exact,
		},
		with_payload: true,
	})

	const pts = Array.isArray(res?.points) ? res.points : []
	return pts
		.filter((p: any) => p?.payload?.filePath && p?.payload?.codeChunk)
		.map((p: any) => ({ id: p.id, score: p.score ?? 0, payload: p.payload }))
}

export async function collectionInfo(client: QdrantClient, collection: string): Promise<any> {
	return client.getCollection(collection)
}
