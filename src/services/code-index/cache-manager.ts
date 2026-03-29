import * as vscode from "vscode"
import { createHash } from "crypto"
import { ICacheManager } from "./interfaces/cache"
import debounce from "lodash.debounce"
import { safeWriteJson } from "../../utils/safeWriteJson"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"

const utf8Decoder = new TextDecoder("utf-8") // kilocode_change

/**
 * Manages the cache for code indexing
 */
export class CacheManager implements ICacheManager {
	private cachePath: vscode.Uri
	private neo4jCachePath: vscode.Uri
	private fileHashes: Record<string, string> = {}
	private neo4jFileHashes: Record<string, string> = {}
	private _debouncedSaveCache: () => void
	private _debouncedSaveNeo4jCache: () => void

	/**
	 * Creates a new cache manager
	 * @param context VS Code extension context
	 * @param workspacePath Path to the workspace
	 */
	constructor(
		private context: vscode.ExtensionContext,
		private workspacePath: string,
	) {
		const workspaceHash = createHash("sha256").update(workspacePath).digest("hex")
		this.cachePath = vscode.Uri.joinPath(context.globalStorageUri, `roo-index-cache-${workspaceHash}.json`)
		this.neo4jCachePath = vscode.Uri.joinPath(
			context.globalStorageUri,
			`roo-neo4j-index-cache-${workspaceHash}.json`,
		)
		this._debouncedSaveCache = debounce(async () => {
			await this._performSave()
		}, 1500)
		this._debouncedSaveNeo4jCache = debounce(async () => {
			await this._performNeo4jSave()
		}, 1500)
	}

	/**
	 * Initializes the cache manager by loading the cache file
	 */
	async initialize(): Promise<void> {
		try {
			const cacheData = await vscode.workspace.fs.readFile(this.cachePath)
			this.fileHashes = JSON.parse(utf8Decoder.decode(cacheData)) // kilocode_change
		} catch (error) {
			this.fileHashes = {}
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "initialize",
			})
		}

		try {
			const neo4jCacheData = await vscode.workspace.fs.readFile(this.neo4jCachePath)
			this.neo4jFileHashes = JSON.parse(utf8Decoder.decode(neo4jCacheData)) // kilocode_change
		} catch (error) {
			this.neo4jFileHashes = {}
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "initialize.neo4jCache",
			})
		}
	}

	/**
	 * Saves the cache to disk
	 */
	private async _performSave(): Promise<void> {
		try {
			await safeWriteJson(this.cachePath.fsPath, this.fileHashes)
		} catch (error) {
			console.error("Failed to save cache:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_performSave",
			})
		}
	}

	private async _performNeo4jSave(): Promise<void> {
		try {
			await safeWriteJson(this.neo4jCachePath.fsPath, this.neo4jFileHashes)
		} catch (error) {
			console.error("Failed to save Neo4j cache:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_performNeo4jSave",
			})
		}
	}

	/**
	 * Clears the cache file by writing an empty object to it
	 */
	async clearCacheFile(): Promise<void> {
		try {
			await safeWriteJson(this.cachePath.fsPath, {})
			this.fileHashes = {}
		} catch (error) {
			console.error("Failed to clear cache file:", error, this.cachePath)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "clearCacheFile",
			})
		}
	}

	public async clearNeo4jCacheFile(): Promise<void> {
		try {
			await safeWriteJson(this.neo4jCachePath.fsPath, {})
			this.neo4jFileHashes = {}
		} catch (error) {
			console.error("Failed to clear Neo4j cache file:", error, this.neo4jCachePath)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "clearNeo4jCacheFile",
			})
		}
	}

	/**
	 * Gets the hash for a file path
	 * @param filePath Path to the file
	 * @returns The hash for the file or undefined if not found
	 */
	getHash(filePath: string): string | undefined {
		return this.fileHashes[filePath]
	}

	/**
	 * Updates the hash for a file path
	 * @param filePath Path to the file
	 * @param hash New hash value
	 */
	updateHash(filePath: string, hash: string): void {
		this.fileHashes[filePath] = hash
		this._debouncedSaveCache()
	}

	/**
	 * Deletes the hash for a file path
	 * @param filePath Path to the file
	 */
	deleteHash(filePath: string): void {
		delete this.fileHashes[filePath]
		this._debouncedSaveCache()
	}

	/**
	 * Gets a copy of all file hashes
	 * @returns A copy of the file hashes record
	 */
	getAllHashes(): Record<string, string> {
		return { ...this.fileHashes }
	}

	public getNeo4jHash(filePath: string): string | undefined {
		return this.neo4jFileHashes[filePath]
	}

	public updateNeo4jHash(filePath: string, hash: string): void {
		this.neo4jFileHashes[filePath] = hash
		this._debouncedSaveNeo4jCache()
	}

	public deleteNeo4jHash(filePath: string): void {
		delete this.neo4jFileHashes[filePath]
		this._debouncedSaveNeo4jCache()
	}

	public getAllNeo4jHashes(): Record<string, string> {
		return { ...this.neo4jFileHashes }
	}
}
