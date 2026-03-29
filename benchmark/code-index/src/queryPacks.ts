import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"
import type { QueryPack } from "./types.js"

const QueryCaseSchema = z.object({
	id: z.string().min(1),
	query: z.string().min(1),
	expected: z.array(
		z.object({
			filePath: z.string().min(1),
			line: z.number().int().positive().optional(),
		}),
	),
})

const QueryPackSchema = z.object({
	id: z.string().min(1),
	datasetId: z.string().min(1),
	seed: z.number().int(),
	cases: z.array(QueryCaseSchema),
})

export function loadQueryPack(packPath: string): QueryPack {
	const abs = path.resolve(packPath)
	const raw = fs.readFileSync(abs, "utf8")
	return QueryPackSchema.parse(JSON.parse(raw))
}
