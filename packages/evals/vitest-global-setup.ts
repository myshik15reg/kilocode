import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { sql } from "drizzle-orm"
import { migrate } from "drizzle-orm/pglite/migrator"

import { TEST_DB_DATA_DIR } from "./src/db/test-config.js"

const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations"
const MIGRATIONS_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/db/migrations")

const migrateTestDatabase = async () => {
	const { testDb } = await import("./src/db/db.js")

	if (!testDb) {
		return
	}

	await testDb.$client.waitReady
	await migrate(testDb, { migrationsFolder: MIGRATIONS_FOLDER })
}

const resetTestDatabase = async () => {
	const { testDb } = await import("./src/db/db.js")

	if (!testDb) {
		console.log("No database connection available, skipping database reset")
		return
	}

	try {
		const { rows } = await testDb.execute<{ table_name: string }>(sql`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			AND table_type = 'BASE TABLE'
			AND table_name <> ${DRIZZLE_MIGRATIONS_TABLE};
		`)

		const tableNames = rows.map((table) => table.table_name)

		for (const tableName of tableNames) {
			await testDb.execute(sql`TRUNCATE TABLE "${sql.raw(tableName)}" CASCADE;`)
		}

		console.log(`[${process.env.DATABASE_URL}] TRUNCATE ${tableNames.join(", ")}`)
	} catch (error) {
		console.error("Error resetting database:", error)
		throw error
	}
}

export default async function () {
	await rm(TEST_DB_DATA_DIR, { recursive: true, force: true })
	await mkdir(path.dirname(TEST_DB_DATA_DIR), { recursive: true })
	await migrateTestDatabase()
	await resetTestDatabase()

	const { disconnect } = await import("./src/db/db.js")
	await disconnect()

	return async () => {}
}
