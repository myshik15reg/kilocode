import fs from "fs"
import os from "os"
import path from "path"
import { threadId } from "worker_threads"
import { localPathOrUriToPath, localPathToUri } from "../util/pathToUri"

// Want this outside of the git repository so we can change branches in tests
// kilocode_change start
const resolveTestDirPath = () => {
	const osTempDir = os.tmpdir()
	const workerSuffix = `${process.pid}-${process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? "0"}`

	try {
		// Expand 8.3 temp paths like ECHERN~1 to a canonical path for Windows fs APIs.
		return path.join(fs.realpathSync.native(osTempDir), `testWorkspaceDir-${workerSuffix}`)
	} catch {
		return path.join(osTempDir, `testWorkspaceDir-${workerSuffix}`)
	}
}

const TEST_DIR_PATH = resolveTestDirPath()
// kilocode_change end
export const TEST_DIR = localPathToUri(TEST_DIR_PATH) // URI

export function setUpTestDir() {
	if (fs.existsSync(TEST_DIR_PATH)) {
		fs.rmSync(TEST_DIR_PATH, {
			recursive: true,
			force: true,
			maxRetries: 5,
			retryDelay: 50,
		})
	}
	fs.mkdirSync(TEST_DIR_PATH, { recursive: true })
}

export function tearDownTestDir() {
	if (fs.existsSync(TEST_DIR_PATH)) {
		fs.rmSync(TEST_DIR_PATH, {
			recursive: true,
			force: true,
			maxRetries: 5,
			retryDelay: 50,
		})
	}
}

/*
  accepts array of items in 3 formats, e.g.
  "index/" creates index directory
  "index/index.ts" creates an empty index/index.ts
  ["index/index.ts", "hello"] creates index/index.ts with contents "hello"
*/
export function addToTestDir(pathsOrUris: (string | [string, string])[]) {
	// Allow tests to use URIs or local paths
	const paths = pathsOrUris.map((val) => {
		if (Array.isArray(val)) {
			return [localPathOrUriToPath(val[0]), val[1]]
		} else {
			return localPathOrUriToPath(val)
		}
	})

	for (const p of paths) {
		const filepath = path.join(TEST_DIR_PATH, Array.isArray(p) ? p[0] : p)
		fs.mkdirSync(path.dirname(filepath), { recursive: true })

		if (Array.isArray(p)) {
			fs.writeFileSync(filepath, p[1])
		} else if (p.endsWith("/")) {
			fs.mkdirSync(filepath, { recursive: true })
		} else {
			fs.writeFileSync(filepath, "")
		}
	}
}
