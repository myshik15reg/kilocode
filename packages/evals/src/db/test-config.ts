import path from "node:path"
import { fileURLToPath } from "node:url"

const LOOPBACK_TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const TEST_DB_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.tmp/pglite-evals-test")

const isLoopbackTestDatabaseUrl = (connectionString: string) => {
	const url = new URL(connectionString)
	return url.pathname.includes("test") && LOOPBACK_TEST_HOSTS.has(url.hostname)
}

export { TEST_DB_DATA_DIR, isLoopbackTestDatabaseUrl }
