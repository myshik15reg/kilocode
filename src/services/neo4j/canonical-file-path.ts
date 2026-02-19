import path from "path"

/**
 * Canonicalize file paths used for Neo4j graph entities.
 *
 * Canonical format:
 * - workspace-relative (when workspaceRoot is provided and filePath is absolute)
 * - POSIX separators (`/`)
 * - normalized segments (no `.` / `..` where possible)
 */
export function canonicalizeNeo4jFilePath(filePath: string, workspaceRoot?: string): string {
	const raw = String(filePath)

	const candidate = workspaceRoot && path.isAbsolute(raw) ? path.relative(workspaceRoot, raw) : raw

	// Normalize separators first, then normalize segments using POSIX rules.
	const withPosixSeparators = candidate.replace(/\\/g, "/")
	const normalized = path.posix.normalize(withPosixSeparators)

	// `path.posix.normalize("")` returns "."; keep it stable.
	return normalized
}
