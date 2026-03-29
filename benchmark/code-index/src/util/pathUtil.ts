import * as path from "node:path"

export function toPosix(p: string): string {
	return p.replace(/\\/g, "/")
}

export function relativeTo(root: string, fullPath: string): string {
	return toPosix(path.relative(root, fullPath))
}
