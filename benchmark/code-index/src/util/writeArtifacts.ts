import * as fs from "node:fs/promises"
import * as path from "node:path"

export async function writeJson(dir: string, filename: string, data: unknown): Promise<string> {
	await fs.mkdir(dir, { recursive: true })
	const filePath = path.join(dir, filename)
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
	return filePath
}
