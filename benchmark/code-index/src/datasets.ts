import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"
import type { DatasetManifest } from "./types.js"

const DatasetSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	repoPath: z.string().min(1),
	optional: z.boolean().optional(),
	includeExtensions: z.array(z.string()).optional(),
	excludeDirs: z.array(z.string()).optional(),
})

const DatasetListSchema = z.array(DatasetSchema)

export function loadDatasets(manifestPath: string): DatasetManifest[] {
	const abs = path.resolve(manifestPath)
	const raw = fs.readFileSync(abs, "utf8")
	const json = JSON.parse(raw)
	return DatasetListSchema.parse(json)
}
