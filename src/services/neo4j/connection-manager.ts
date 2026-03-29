/**
 * Neo4j Connection Manager
 *
 * Singleton class that manages Neo4j driver connections.
 * Ensures only one driver instance exists across the application.
 */

import neo4j, { Driver, Session, auth } from "neo4j-driver"
import type { Neo4jConfig } from "./interfaces"

// kilocode_change start
function redactNeo4jUriForLogs(uri: string): string {
	if (!uri || typeof uri !== "string") {
		return "(not set)"
	}

	try {
		const url = new URL(uri)
		url.username = ""
		url.password = ""
		url.search = ""
		url.hash = ""
		// Log only scheme + host:port to avoid leaking userinfo/query params.
		return `${url.protocol}//${url.host}`
	} catch {
		// Fallback for invalid URLs: redact basic auth if present and strip query/hash.
		return uri
			.replace(/\/\/[^@/]+@/g, "//REDACTED@")
			.replace(/\?.*$/, "?[REDACTED_QUERY]")
			.replace(/#.*$/, "#[REDACTED_FRAGMENT]")
	}
}

function isMissingNeo4jDatabaseError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false
	}

	const maybeCode = "code" in error ? (error as { code?: unknown }).code : undefined
	const maybeMessage = "message" in error ? (error as { message?: unknown }).message : undefined

	if (maybeCode === "Neo.ClientError.Database.DatabaseNotFound") {
		return true
	}

	if (typeof maybeMessage !== "string") {
		return false
	}

	return /database.*not found/i.test(maybeMessage) || /does not exist/i.test(maybeMessage)
}
// kilocode_change end

export class Neo4jConnectionManager {
	private static instance: Neo4jConnectionManager
	private driver: Driver | null = null
	private config: Neo4jConfig | null = null
	private isConnecting = false

	/**
	 * Private constructor to prevent direct instantiation
	 */
	private constructor() {}

	/**
	 * Get the singleton instance
	 */
	public static getInstance(): Neo4jConnectionManager {
		if (!Neo4jConnectionManager.instance) {
			Neo4jConnectionManager.instance = new Neo4jConnectionManager()
		}
		return Neo4jConnectionManager.instance
	}

	/**
	 * Connect to Neo4j database
	 *
	 * Establishes a connection to Neo4j using the provided configuration.
	 * If already connected with the same config, this is a no-op.
	 * If another connection is in progress, waits for it to complete.
	 *
	 * @param config - Neo4j connection configuration
	 * @param config.uri - Neo4j connection URI (e.g., "bolt://localhost:7687")
	 * @param config.username - Authentication username
	 * @param config.password - Authentication password
	 * @param config.database - Optional database name (default: "neo4j")
	 * @param config.connectionTimeout - Optional connection timeout in milliseconds
	 *
	 * @throws {Error} If connection fails or credentials are invalid
	 *
	 * @example
	 * ```typescript
	 * const manager = Neo4jConnectionManager.getInstance()
	 * await manager.connect({
	 *   uri: 'bolt://localhost:7687',
	 *   username: 'neo4j',
	 *   password: 'password',
	 *   database: 'neo4j'
	 * })
	 * ```
	 */
	public async connect(config: Neo4jConfig): Promise<void> {
		// If already connected with same config, do nothing
		if (this.driver && this.configEquals(config)) {
			return
		}

		// Wait if another connection is in progress
		if (this.isConnecting) {
			await this.waitForConnection()
			return
		}

		this.isConnecting = true

		try {
			// Close existing connection if any
			if (this.driver) {
				await this.disconnect()
			}

			// Create new driver
			this.driver = neo4j.driver(config.uri, auth.basic(config.username, config.password), {
				maxConnectionLifetime: 3600000, // 1 hour
				maxConnectionPoolSize: 50,
				connectionAcquisitionTimeout: config.connectionTimeout || 60000,
				disableLosslessIntegers: true, // Use native JavaScript numbers
			})

			// Verify connectivity
			await this.driver.verifyConnectivity()

			// kilocode_change start
			await this.ensureDatabaseExists(config)
			// kilocode_change end

			this.config = config
			// FIX: 2026-02-19-reviewer-neo4j-uri-log-redaction (TestAnalyzer)
			// Root cause: логирование raw `config.uri` могло раскрывать userinfo/query (credentials/tokens).
			// Решение: редактируем URI перед логированием (scheme + host:port).
			console.log(`[Neo4j] Connected to ${redactNeo4jUriForLogs(config.uri)}`)
		} catch (error) {
			this.driver = null
			this.config = null
			throw new Error(`Failed to connect to Neo4j: ${error instanceof Error ? error.message : String(error)}`)
		} finally {
			this.isConnecting = false
		}
	}

	/**
	 * Disconnect from Neo4j database
	 */
	public async disconnect(): Promise<void> {
		if (this.driver) {
			await this.driver.close()
			this.driver = null
			this.config = null
			console.log("[Neo4j] Disconnected")
		}
	}

	/**
	 * Get a new session
	 * @param database Optional database name (defaults to config database or "neo4j")
	 * @returns Neo4j session
	 * @throws Error if not connected
	 */
	public getSession(database?: string): Session {
		if (!this.driver) {
			throw new Error("Neo4j driver is not connected. Call connect() first.")
		}

		const dbName = database || this.config?.database || "neo4j"
		return this.driver.session({ database: dbName })
	}

	/**
	 * Verify connectivity to Neo4j
	 * @returns True if connected and responsive
	 */
	public async verifyConnectivity(): Promise<boolean> {
		if (!this.driver) {
			return false
		}

		try {
			await this.driver.verifyConnectivity()
			return true
		} catch (error) {
			console.error("[Neo4j] Connectivity check failed:", error)
			return false
		}
	}

	/**
	 * Check if currently connected
	 */
	public isConnected(): boolean {
		return this.driver !== null
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): Neo4jConfig | null {
		return this.config
	}

	/**
	 * Execute a query with automatic session management
	 * @param query Cypher query string
	 * @param params Query parameters
	 * @param database Optional database name
	 * @returns Query result
	 * @throws Error if query execution fails
	 */
	public async executeQuery<T = Record<string, unknown>>(
		query: string,
		params: Record<string, unknown> = {},
		database?: string,
	): Promise<T[]> {
		const session = this.getSession(database)
		try {
			const result = await session.run(query, params)
			return result.records.map((record) => record.toObject() as T)
		} catch (error) {
			console.error("[Neo4j] Query execution failed:", error)
			throw new Error(`Neo4j query failed: ${error instanceof Error ? error.message : String(error)}`)
		} finally {
			await session.close()
		}
	}

	/**
	 * Execute a write transaction
	 * @param query Cypher query string
	 * @param params Query parameters
	 * @param database Optional database name
	 * @throws Error if write transaction fails
	 */
	public async executeWrite(query: string, params: Record<string, unknown> = {}, database?: string): Promise<void> {
		const session = this.getSession(database)
		try {
			await session.executeWrite((tx) => tx.run(query, params))
		} catch (error) {
			console.error("[Neo4j] Write transaction failed:", error)
			throw new Error(`Neo4j write failed: ${error instanceof Error ? error.message : String(error)}`)
		} finally {
			await session.close()
		}
	}

	/**
	 * Execute a read transaction
	 * @param query Cypher query string
	 * @param params Query parameters
	 * @param database Optional database name
	 * @returns Query result
	 * @throws Error if read transaction fails
	 */
	public async executeRead<T = Record<string, unknown>>(
		query: string,
		params: Record<string, unknown> = {},
		database?: string,
	): Promise<T[]> {
		const session = this.getSession(database)
		try {
			const result = await session.executeRead((tx) => tx.run(query, params))
			return result.records.map((record) => record.toObject() as T)
		} catch (error) {
			console.error("[Neo4j] Read transaction failed:", error)
			throw new Error(`Neo4j read failed: ${error instanceof Error ? error.message : String(error)}`)
		} finally {
			await session.close()
		}
	}

	/**
	 * Compare two configs for equality
	 */
	private configEquals(config: Neo4jConfig): boolean {
		if (!this.config) return false

		return (
			this.config.uri === config.uri &&
			this.config.username === config.username &&
			this.config.password === config.password &&
			(this.config.database || "neo4j") === (config.database || "neo4j")
		)
	}

	/**
	 * Wait for ongoing connection to complete
	 */
	private async waitForConnection(maxWaitMs = 30000): Promise<void> {
		const startTime = Date.now()
		while (this.isConnecting && Date.now() - startTime < maxWaitMs) {
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		if (this.isConnecting) {
			throw new Error("Connection timeout: Another connection is taking too long")
		}
	}

	// kilocode_change start
	private async ensureDatabaseExists(config: Neo4jConfig): Promise<void> {
		const requestedDatabase = config.database?.trim()

		if (!this.driver || !requestedDatabase || requestedDatabase === "neo4j") {
			return
		}

		const session = this.driver.session({ database: requestedDatabase })
		try {
			await session.run("RETURN 1 AS n")
			return
		} catch (error) {
			if (!isMissingNeo4jDatabaseError(error)) {
				throw error
			}
		} finally {
			await session.close()
		}

		const systemSession = this.driver.session({ database: "system" })
		try {
			await systemSession.run(`CREATE DATABASE \`${requestedDatabase.replace(/`/g, "``")}\` IF NOT EXISTS`)
			console.log(`[Neo4j] Created database ${requestedDatabase}`)
		} finally {
			await systemSession.close()
		}

		await this.waitForDatabaseAvailability(requestedDatabase)
	}

	private async waitForDatabaseAvailability(database: string, timeoutMs = 10000): Promise<void> {
		const deadline = Date.now() + timeoutMs

		while (Date.now() < deadline) {
			const session = this.driver?.session({ database })
			try {
				if (!session) {
					throw new Error("Neo4j driver is not connected. Call connect() first.")
				}

				await session.run("RETURN 1 AS n")
				return
			} catch (error) {
				if (!isMissingNeo4jDatabaseError(error)) {
					throw error
				}

				await new Promise((resolve) => setTimeout(resolve, 250))
			} finally {
				await session?.close()
			}
		}

		throw new Error(`Timed out waiting for Neo4j database ${database} to become available`)
	}
	// kilocode_change end
}
