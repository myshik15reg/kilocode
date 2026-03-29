import * as fs from "node:fs/promises"
import * as path from "node:path"

export type WalkOptions = {
	maxFiles?: number
	includeExtensions?: string[]
	excludeDirs?: Set<string>
}

export async function walkFiles(root: string, options: WalkOptions = {}): Promise<string[]> {
	const maxFiles = options.maxFiles ?? Number.POSITIVE_INFINITY
	const includeExt = options.includeExtensions?.map((e) => e.toLowerCase())
	const excludeDirs = options.excludeDirs ?? new Set(["node_modules", ".git", "dist", "build", "out", ".next"])

	const results: string[] = []
	const queue: string[] = [root]

	while (queue.length > 0 && results.length < maxFiles) {
		const dir = queue.shift()!
		let entries: Array<import("node:fs").Dirent>
		try {
			entries = await fs.readdir(dir, { withFileTypes: true })
		} catch {
			continue
		}

		for (const e of entries) {
			if (results.length >= maxFiles) break
			const full = path.join(dir, e.name)
			if (e.isDirectory()) {
				if (excludeDirs.has(e.name)) continue
				queue.push(full)
				continue
			}
			if (!e.isFile()) continue
			if (includeExt) {
				const ext = path.extname(e.name).toLowerCase()
				if (!includeExt.includes(ext)) continue
			}
			results.push(full)
		}
	}

	return results
}
