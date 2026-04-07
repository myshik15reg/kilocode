import type { PGlite } from "@electric-sql/pglite"
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite"
import { drizzle as drizzlePostgresJs, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema.js"
import { TEST_DB_DATA_DIR, isLoopbackTestDatabaseUrl } from "./test-config.js"

type AppSchema = typeof schema
type TestDatabase = PgliteDatabase<AppSchema> & { $client: PGlite }
type AppDatabase = TestDatabase | PostgresJsDatabase<AppSchema>

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set")
}

const createPgClient = (connectionString: string) =>
	postgres(connectionString, {
		prepare: false,
	})

const isTestEnvironment = process.env.NODE_ENV === "test"

if (isTestEnvironment && !isLoopbackTestDatabaseUrl(databaseUrl)) {
	throw new Error("DATABASE_URL is not a loopback test database")
}

const createTestDb = (): TestDatabase => drizzlePglite(TEST_DB_DATA_DIR, { schema })

const pgClient = isTestEnvironment ? undefined : createPgClient(databaseUrl)
const testDb: TestDatabase | undefined = isTestEnvironment ? createTestDb() : undefined
const client: AppDatabase = testDb ?? drizzlePostgresJs({ client: pgClient!, schema })

let _productionPgClient: ReturnType<typeof postgres> | undefined = undefined
let _productionClient: PostgresJsDatabase<AppSchema> | undefined = undefined

const getProductionClient = (): PostgresJsDatabase<AppSchema> => {
	if (!process.env.PRODUCTION_DATABASE_URL) {
		throw new Error("PRODUCTION_DATABASE_URL is not set")
	}

	if (!_productionClient) {
		_productionPgClient = createPgClient(process.env.PRODUCTION_DATABASE_URL)
		_productionClient = drizzlePostgresJs({ client: _productionPgClient, schema })
	}

	return _productionClient
}

const disconnect = async () => {
	if (testDb) {
		await testDb.$client.close()
		return
	}

	await pgClient?.end()

	if (_productionPgClient) {
		await _productionPgClient.end()
	}
}

type DatabaseOrTransaction = typeof client

export { client, testDb, getProductionClient, disconnect, type DatabaseOrTransaction }
