import * as vscode from "vscode"
import * as path from "path"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager, IndexingState } from "./state-manager"
import { IFileWatcher, IVectorStore, BatchProcessingSummary } from "./interfaces"
import { DirectoryScanner } from "./processors"
import { CacheManager } from "./cache-manager"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import { t } from "../../i18n"
import { RelationshipIndexer } from "../neo4j/relationship-indexer"
import { Neo4jConnectionManager } from "../neo4j/connection-manager"
import { Neo4jGraphService } from "../neo4j/graph-service"
import { canonicalizeNeo4jFilePath } from "../neo4j/canonical-file-path"
import { resolveLanguageConfig } from "../tree-sitter/languageParser"
import { stat } from "fs/promises"
import { createHash } from "crypto"
import { isGraphIndexEligiblePath, resolveFileTypeByPath } from "../file-types/file-type-registry"

/**
 * Manages code indexing workflow, coordinating between different services and managers.
 */
export class CodeIndexOrchestrator {
	private _fileWatcherSubscriptions: vscode.Disposable[] = []
	private _isProcessing: boolean = false
	private _cancelRequested: boolean = false // kilocode_change
	private relationshipIndexer: RelationshipIndexer | null = null

	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly stateManager: CodeIndexStateManager,
		private readonly workspacePath: string,
		private readonly cacheManager: CacheManager,
		private readonly vectorStore: IVectorStore,
		private readonly scanner: DirectoryScanner,
		private readonly fileWatcher: IFileWatcher,
	) {}

	// kilocode_change start
	/**
	 * Updates batch segment threshold for both scanner and file watcher
	 * @param newThreshold New batch segment threshold value
	 */
	public updateBatchSegmentThreshold(newThreshold: number): void {
		this.scanner.updateBatchSegmentThreshold(newThreshold)
		this.fileWatcher.updateBatchSegmentThreshold(newThreshold)
	}
	// kilocode_change end

	/**
	 * Starts file watcher if not already running.
	 */
	private async _startWatcher(): Promise<void> {
		if (!this.configManager.isFeatureConfigured) {
			throw new Error("Cannot start watcher: Service not configured.")
		}

		this.stateManager.setSystemState("Indexing", "Initializing file watcher...")

		try {
			await this.fileWatcher.initialize()

			this._fileWatcherSubscriptions = [
				this.fileWatcher.onDidStartBatchProcessing((filePaths: string[]) => {}),
				this.fileWatcher.onBatchProgressUpdate(({ processedInBatch, totalInBatch, currentFile }) => {
					if (totalInBatch > 0 && this.stateManager.state !== "Indexing") {
						this.stateManager.setSystemState("Indexing", "Processing file changes...")
					}
					this.stateManager.reportFileQueueProgress(
						processedInBatch,
						totalInBatch,
						currentFile ? path.basename(currentFile) : undefined,
					)
					if (processedInBatch === totalInBatch) {
						// Covers (N/N) and (0/0)
						if (totalInBatch > 0) {
							// Batch with items completed
							this.stateManager.setSystemState("Indexed", "File changes processed. Index up-to-date.")
						} else {
							if (this.stateManager.state === "Indexing") {
								// Only transition if it was "Indexing"
								this.stateManager.setSystemState("Indexed", "Index up-to-date. File queue empty.")
							}
						}
					}
				}),
				this.fileWatcher.onDidFinishBatchProcessing((summary: BatchProcessingSummary) => {
					void this.handleNeo4jBatchSummary(summary)

					if (summary.batchError) {
						console.error(`[CodeIndexOrchestrator] Batch processing failed:`, summary.batchError)
					} else {
						const successCount = summary.processedFiles.filter(
							(f: { status: string }) => f.status === "success",
						).length
						const errorCount = summary.processedFiles.filter(
							(f: { status: string }) => f.status === "error" || f.status === "local_error",
						).length
					}
				}),
			]
		} catch (error) {
			console.error("[CodeIndexOrchestrator] Failed to start file watcher:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_startWatcher",
			})
			throw error
		}
	}

	/**
	 * Updates status of a file in state manager.
	 */

	/**
	 * Initiates indexing process (initial scan and starts watcher).
	 */
	public async startIndexing(): Promise<void> {
		// Check if workspace is available first
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
			this.stateManager.setSystemState("Error", t("embeddings:orchestrator.indexingRequiresWorkspace"))
			console.warn("[CodeIndexOrchestrator] Start rejected: No workspace folder open.")
			return
		}

		if (!this.configManager.isFeatureConfigured) {
			this.stateManager.setSystemState("Standby", "Missing configuration. Save your settings to start indexing.")
			console.warn("[CodeIndexOrchestrator] Start rejected: Missing configuration.")
			return
		}

		if (
			this._isProcessing ||
			(this.stateManager.state !== "Standby" &&
				this.stateManager.state !== "Error" &&
				this.stateManager.state !== "Indexed")
		) {
			console.warn(
				`[CodeIndexOrchestrator] Start rejected: Already processing or in state ${this.stateManager.state}.`,
			)
			return
		}

		this._cancelRequested = false // kilocode_change
		this._isProcessing = true
		this.stateManager.setSystemState("Indexing", "Initializing services...")

		// Track whether we successfully connected to Qdrant and started indexing
		// This helps us decide whether to preserve cache on error
		let indexingStarted = false

		try {
			const collectionCreated = await this.vectorStore.initialize()

			// Successfully connected to Qdrant
			indexingStarted = true

			if (collectionCreated) {
				await this.cacheManager.clearCacheFile()
				await this.cacheManager.clearNeo4jCacheFile()
			}

			// Check if collection already has indexed data
			// If it does, we can skip full scan and just start watcher
			const hasExistingData = await this.vectorStore.hasIndexedData()

			if (hasExistingData && !collectionCreated) {
				// Collection exists with data - run incremental scan to catch any new/changed files
				// This handles files added while workspace was closed or Qdrant was inactive
				console.log(
					"[CodeIndexOrchestrator] Collection already has indexed data. Running incremental scan for new/changed files...",
				)

				// kilocode_change start
				if (this._cancelRequested) {
					this._isProcessing = false
					this.stateManager.setSystemState("Standby", t("embeddings:orchestrator.indexingCancelled"))
					return
				}
				// kilocode_change end

				this.stateManager.setSystemState("Indexing", "Checking for new or modified files...")

				// Mark as incomplete at start of incremental scan
				await this.vectorStore.markIndexingIncomplete()

				let cumulativeBlocksIndexed = 0
				let cumulativeBlocksFoundSoFar = 0
				let batchErrors: Error[] = []

				const handleFileParsed = (fileBlockCount: number) => {
					cumulativeBlocksFoundSoFar += fileBlockCount
					this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
				}

				const handleBlocksIndexed = (indexedCount: number) => {
					cumulativeBlocksIndexed += indexedCount
					this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
				}

				// Run incremental scan - scanner will skip unchanged files using cache
				const result = await this.scanner.scanDirectory(
					this.workspacePath,
					(batchError: Error) => {
						console.error(
							`[CodeIndexOrchestrator] Error during incremental scan batch: ${batchError.message}`,
							batchError,
						)
						batchErrors.push(batchError)
					},
					handleBlocksIndexed,
					handleFileParsed,
				)

				if (!result) {
					throw new Error("Incremental scan failed, is scanner initialized?")
				}

				// kilocode_change start
				if (this._cancelRequested || this.scanner.isCancelled) {
					this._isProcessing = false
					if (this.stateManager.state !== "Error") {
						this.stateManager.setSystemState("Standby", t("embeddings:orchestrator.indexingCancelled"))
					}
					return
				}
				// kilocode_change end

				// If new files were found and indexed, log results
				if (cumulativeBlocksFoundSoFar > 0) {
					console.log(
						`[CodeIndexOrchestrator] Incremental scan completed: ${cumulativeBlocksIndexed} blocks indexed from new/changed files`,
					)
				} else {
					console.log("[CodeIndexOrchestrator] No new or changed files found")
				}

				if (this.configManager.isNeo4jEnabled) {
					// FIX: neo4j-enable-later-catchup (TestAnalyzer)
					// Root cause: incremental branch never synchronized Neo4j state when only vector cache had indexed files
					await this.syncNeo4jWithCurrentIndex()
				}

				await this._startWatcher()

				// Mark indexing as complete after successful incremental scan
				await this.vectorStore.markIndexingComplete()

				this.stateManager.setSystemState("Indexed", t("embeddings:orchestrator.fileWatcherStarted"))
			} else {
				// No existing data or collection was just created - do a full scan
				this.stateManager.setSystemState("Indexing", "Services ready. Starting workspace scan...")

				// Mark as incomplete at start of full scan
				await this.vectorStore.markIndexingIncomplete()

				let cumulativeBlocksIndexed = 0
				let cumulativeBlocksFoundSoFar = 0
				let batchErrors: Error[] = []

				const handleFileParsed = (fileBlockCount: number) => {
					cumulativeBlocksFoundSoFar += fileBlockCount
					this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
				}

				const handleBlocksIndexed = (indexedCount: number) => {
					cumulativeBlocksIndexed += indexedCount
					this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
				}

				const result = await this.scanner.scanDirectory(
					this.workspacePath,
					(batchError: Error) => {
						console.error(
							`[CodeIndexOrchestrator] Error during initial scan batch: ${batchError.message}`,
							batchError,
						)
						batchErrors.push(batchError)
					},
					handleBlocksIndexed,
					handleFileParsed,
				)

				if (!result) {
					throw new Error("Scan failed, is scanner initialized?")
				}

				const supportedPathsForNeo4j = Array.isArray(result.supportedPaths) ? result.supportedPaths : []

				// Check if any blocks were actually indexed successfully
				// If no blocks were indexed but blocks were found, it means all batches failed
				if (cumulativeBlocksIndexed === 0 && cumulativeBlocksFoundSoFar > 0) {
					if (batchErrors.length > 0) {
						// Use first batch error as it's likely representative of main issue
						const firstError = batchErrors[0]
						throw new Error(`Indexing failed: ${firstError.message}`)
					} else {
						throw new Error(t("embeddings:orchestrator.indexingFailedNoBlocks"))
					}
				}

				// Check for partial failures - if a significant portion of blocks failed
				const failureRate = (cumulativeBlocksFoundSoFar - cumulativeBlocksIndexed) / cumulativeBlocksFoundSoFar
				if (batchErrors.length > 0 && failureRate > 0.1) {
					// More than 10% of blocks failed to index
					const firstError = batchErrors[0]
					throw new Error(
						`Indexing partially failed: Only ${cumulativeBlocksIndexed} of ${cumulativeBlocksFoundSoFar} blocks were indexed. ${firstError.message}`,
					)
				}

				// CRITICAL: If there were ANY batch errors and NO blocks were successfully indexed,
				// this is a complete failure regardless of failure rate calculation
				if (batchErrors.length > 0 && cumulativeBlocksIndexed === 0) {
					const firstError = batchErrors[0]
					throw new Error(`Indexing failed completely: ${firstError.message}`)
				}

				// Final sanity check: If we found blocks but indexed none and somehow no errors were reported,
				// this is still a failure
				if (cumulativeBlocksFoundSoFar > 0 && cumulativeBlocksIndexed === 0) {
					throw new Error(t("embeddings:orchestrator.indexingFailedCritical"))
				}

				if (this._cancelRequested || this.scanner.isCancelled) {
					this._isProcessing = false
					if (this.stateManager.state !== "Error") {
						this.stateManager.setSystemState("Standby", t("embeddings:orchestrator.indexingCancelled"))
					}
					return
				}

				// Neo4j indexing after successful Qdrant full scan
				if (this.configManager.isNeo4jEnabled) {
					// FIX: neo4j-fullscan-indexing (TestAnalyzer)
					// Root cause: full scan branch never invoked relationship indexing despite having supportedPaths from scanner
					console.log("[CodeIndexOrchestrator] Starting Neo4j relationship indexing for full scan...")
					await this.indexRelationshipsForChangedFiles(supportedPathsForNeo4j)
				}

				await this._startWatcher()

				// Mark indexing as complete after successful full scan
				await this.vectorStore.markIndexingComplete()

				this.stateManager.setSystemState("Indexed", t("embeddings:orchestrator.fileWatcherStarted"))
			}
		} catch (error: any) {
			console.error("[CodeIndexOrchestrator] Error during indexing:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "startIndexing",
			})
			if (indexingStarted) {
				try {
					await this.vectorStore.clearCollection()
				} catch (cleanupError) {
					console.error("[CodeIndexOrchestrator] Failed to clean up after error:", cleanupError)
					TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
						error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
						stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
						location: "startIndexing.cleanup",
					})
				}
			}

			// Only clear cache if indexing had started (Qdrant connection succeeded)
			// If we never connected to Qdrant, preserve cache for incremental scan when it comes back
			if (indexingStarted) {
				// Indexing started but failed mid-way - clear cache to avoid cache-Qdrant mismatch
				await this.cacheManager.clearCacheFile()
				await this.cacheManager.clearNeo4jCacheFile()
				console.log(
					"[CodeIndexOrchestrator] Indexing failed after starting. Clearing cache to avoid inconsistency.",
				)
			} else {
				// Never connected to Qdrant - preserve cache for future incremental scan
				console.log(
					"[CodeIndexOrchestrator] Failed to connect to Qdrant. Preserving cache for future incremental scan.",
				)
			}

			this.stateManager.setSystemState(
				"Error",
				t("embeddings:orchestrator.failedDuringInitialScan", {
					errorMessage: error.message || t("embeddings:orchestrator.unknownError"),
				}),
			)
			this.stopWatcher()
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Stops file watcher and cleans up resources.
	 */
	public stopWatcher(): void {
		this.fileWatcher.dispose()
		this._fileWatcherSubscriptions.forEach((sub) => sub.dispose())
		this._fileWatcherSubscriptions = []

		if (this.stateManager.state !== "Error") {
			this.stateManager.setSystemState("Standby", t("embeddings:orchestrator.fileWatcherStopped"))
		}
		this._isProcessing = false
	}

	// kilocode_change start
	/**
	 * Gracefully cancels any ongoing indexing work.
	 * - Stops watcher if active
	 * - Signals scanner to cancel pending/ongoing work
	 * - Updates UI state to reflect cancellation
	 */
	public cancelIndexing(): void {
		// Mark cancellation so progress callbacks and subsequent steps are ignored
		this._cancelRequested = true

		// Best-effort cancel of any ongoing initial scan/batch work
		// (DirectoryScanner will no-op quickly on next checks)
		this.scanner.cancel()

		// Ensure watcher is stopped if it had started
		this.stopWatcher()

		// Reflect cancellation to UI
		this.stateManager.setSystemState("Standby", t("embeddings:orchestrator.indexingCancelled"))

		// Clear processing flag
		this._isProcessing = false
	}
	// kilocode_change end

	/**
	 * Clears all index data by stopping watcher, clearing vector store,
	 * and resetting cache file.
	 */
	public async clearIndexData(): Promise<void> {
		this._isProcessing = true

		try {
			await this.stopWatcher()

			try {
				if (this.configManager.isFeatureConfigured) {
					await this.vectorStore.deleteCollection()
				} else {
					console.warn("[CodeIndexOrchestrator] Service not configured, skipping vector collection clear.")
				}
			} catch (error: any) {
				console.error("[CodeIndexOrchestrator] Failed to clear vector collection:", error)
				TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					location: "clearIndexData",
				})
				this.stateManager.setSystemState("Error", `Failed to clear vector collection: ${error.message}`)
			}

			await this.cacheManager.clearCacheFile()
			await this.cacheManager.clearNeo4jCacheFile()

			if (this.stateManager.state !== "Error") {
				this.stateManager.setSystemState("Standby", "Index data cleared successfully.")
			}
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Gets current state of indexing system.
	 */
	public get state(): IndexingState {
		return this.stateManager.state
	}

	/**
	 * Index code relationships into Neo4j for given files
	 * @param filePaths Array of file paths to index
	 */
	private async ensureNeo4jConnectedAndInitialized(): Promise<boolean> {
		// FIX: neo4j-connect-initialize (TestAnalyzer)
		// Root cause: relationship indexing called Neo4j read/write/isInitialized() without ensuring an active connection,
		// causing SHOW CONSTRAINTS to fail (especially for remote Neo4j) and leaving UI stuck in an Indexing state.
		const neo4jConfig = this.configManager.neo4jConfig
		const uri = neo4jConfig?.uri
		const username = neo4jConfig?.username
		const password = neo4jConfig?.password
		const database = neo4jConfig?.database

		if (!uri || !username || !password) {
			this.stateManager.setSystemState(
				"Standby",
				"Neo4j is enabled but not fully configured (missing uri/username/password). Relationship indexing skipped.",
			)
			return false
		}

		const connectionManager = Neo4jConnectionManager.getInstance()
		try {
			await connectionManager.connect({ uri, username, password, database })
		} catch (error) {
			console.warn("[CodeIndexOrchestrator] Failed to connect to Neo4j. Relationship indexing skipped.")
			this.stateManager.setSystemState(
				"Error",
				`Neo4j connection failed. Relationship indexing skipped: ${error instanceof Error ? error.message : String(error)}`,
			)
			return false
		}

		try {
			const graphService = new Neo4jGraphService(connectionManager)
			await graphService.initialize()
		} catch (error) {
			console.warn(
				"[CodeIndexOrchestrator] Failed to initialize Neo4j graph store. Relationship indexing skipped.",
			)
			this.stateManager.setSystemState(
				"Error",
				`Neo4j initialization failed. Relationship indexing skipped: ${error instanceof Error ? error.message : String(error)}`,
			)
			return false
		}

		return true
	}

	private async indexRelationshipsForChangedFiles(filePaths: string[]): Promise<void> {
		const relationshipIndexer = this.getOrCreateRelationshipIndexer()
		if (!relationshipIndexer || !this.configManager.isNeo4jEnabled) {
			return
		}

		const previousStatus = this.stateManager.getCurrentStatus()

		const supportedFiles = filePaths.filter((filePath) => isGraphIndexEligiblePath(filePath))
		if (supportedFiles.length === 0) {
			// FIX: neo4j-empty-eligible-files (TestAnalyzer)
			// Root cause: when Neo4j is enabled but no graph-eligible files exist, relationship indexing becomes a no-op
			// and users can observe "schema exists but no data" without any explicit status.
			const base = previousStatus.message ? `${previousStatus.message} ` : ""
			this.stateManager.setSystemState(
				previousStatus.systemStatus,
				`${base}(Neo4j) No graph-eligible files found; relationship indexing skipped.`,
			)
			return
		}

		if (this._cancelRequested) {
			return
		}

		try {
			const neo4jReady = await this.ensureNeo4jConnectedAndInitialized()
			if (!neo4jReady) {
				return
			}

			// FIX: 2026-02-17-neo4j-index-fixes (TestAnalyzer)
			// Root cause: Neo4j schema may exist while graph is empty, but neo4j-cache skip can prevent recovery indexing.
			try {
				const graphService = new Neo4jGraphService(Neo4jConnectionManager.getInstance())
				const totalEntities = await graphService.getCodeEntityCount()
				if (totalEntities === 0) {
					await this.cacheManager.clearNeo4jCacheFile()
					console.log(
						"[CodeIndexOrchestrator] Neo4j graph is empty. Clearing neo4j-cache to bypass cache skip.",
					)
				}
			} catch (countError) {
				// Non-fatal: if we cannot query count, keep existing caching behavior.
				console.warn(
					"[CodeIndexOrchestrator] Failed to query Neo4j graph entity count. Proceeding without neo4j-cache recovery.",
					countError,
				)
			}

			this.stateManager.setSystemState("Indexing", "Indexing code relationships into Neo4j...")

			// kilocode_change: 2026-01-24 - unified Neo4j indexing across languages
			const isReady = await relationshipIndexer.isReady()
			if (!isReady) {
				console.warn("[CodeIndexOrchestrator] Neo4j indexer not ready, skipping relationship indexing")
				this.stateManager.setSystemState("Error", "Neo4j indexer is not ready. Relationship indexing skipped.")
				return
			}

			let processedCount = 0
			let skippedByCacheCount = 0
			const totalFiles = supportedFiles.length

			// Process files in batches
			for (const filePath of supportedFiles) {
				if (this._cancelRequested) {
					break
				}

				try {
					const vectorHash = this.cacheManager.getHash(filePath)
					const cachedNeo4jHash = this.cacheManager.getNeo4jHash(filePath)
					if (vectorHash && cachedNeo4jHash === vectorHash) {
						skippedByCacheCount++
						continue
					}

					// Check file size
					const stats = await stat(filePath)
					const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
					if (stats.size > MAX_FILE_SIZE) {
						continue
					}

					// Read file content
					const content = await vscode.workspace.fs
						.readFile(vscode.Uri.file(filePath))
						.then((buffer) => Buffer.from(buffer).toString("utf-8"))

					const fileType = resolveFileTypeByPath(filePath)
					if (!fileType || !fileType.indexing.graph) {
						continue
					}

					const dummyAst = {} as unknown as import("web-tree-sitter").Node
					let languageId = fileType.languageId
					if (fileType.contentKind === "treeSitter") {
						const ext = path.extname(filePath).toLowerCase().slice(1)
						const resolution = resolveLanguageConfig(ext)
						if (resolution && !("skip" in resolution)) {
							languageId = resolution.languageId
						} else {
							// Graceful fallback when tree-sitter resolution is unavailable/misaligned.
							languageId = languageId ?? "plainText"
						}
					} else if (fileType.contentKind === "xml") {
						languageId = "xml"
					} else {
						languageId = "plainText"
					}

					const neo4jFilePath = canonicalizeNeo4jFilePath(filePath, this.workspacePath)
					await relationshipIndexer.indexFile(neo4jFilePath, content, dummyAst, languageId ?? "plainText")
					const contentHash = vectorHash ?? createHash("sha256").update(content).digest("hex")
					this.cacheManager.updateNeo4jHash(filePath, contentHash)

					processedCount++
					if (processedCount % 10 === 0) {
						this.stateManager.setSystemState(
							"Indexing",
							`Indexing relationships: ${processedCount}/${totalFiles} files...`,
						)
					}
				} catch (fileError) {
					console.error(
						`[CodeIndexOrchestrator] Error indexing Neo4j relationships for ${filePath}:`,
						fileError,
					)
					// Continue with other files
				}
			}

			console.log(
				`[CodeIndexOrchestrator] Neo4j relationship indexing completed: ${processedCount}/${totalFiles} files`,
			)
			// FIX: neo4j-cache-all-skipped (TestAnalyzer)
			// Root cause: when all files are skipped due to cache, Neo4j DB may remain empty with no explicit status.
			const restoredMessage =
				processedCount === 0 && skippedByCacheCount === totalFiles
					? `${previousStatus.message ? `${previousStatus.message} ` : ""}(Neo4j) 0/${totalFiles} files indexed (all skipped by cache).`
					: previousStatus.message
			// Ensure UI isn't left in Neo4j-specific Indexing state when invoked from watcher batch callbacks.
			this.stateManager.setSystemState(previousStatus.systemStatus, restoredMessage)
		} catch (error) {
			console.error("[CodeIndexOrchestrator] Error during Neo4j relationship indexing:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "indexRelationshipsForChangedFiles",
			})
			this.stateManager.setSystemState(
				"Error",
				`Neo4j relationship indexing failed: ${error instanceof Error ? error.message : String(error)}`,
			)
			// Non-fatal: relationship indexing should not abort Qdrant indexing or leave UI stuck.
			return
		}
	}

	private getOrCreateRelationshipIndexer(): RelationshipIndexer | null {
		if (!this.configManager.isNeo4jEnabled) {
			return null
		}

		if (!this.relationshipIndexer) {
			this.relationshipIndexer = new RelationshipIndexer()
		}

		return this.relationshipIndexer
	}

	private async deleteRelationshipsForRemovedFiles(filePaths: string[]): Promise<void> {
		const relationshipIndexer = this.getOrCreateRelationshipIndexer()
		if (!relationshipIndexer || !this.configManager.isNeo4jEnabled || filePaths.length === 0) {
			return
		}

		try {
			const neo4jReady = await this.ensureNeo4jConnectedAndInitialized()
			if (!neo4jReady) {
				return
			}

			const isReady = await relationshipIndexer.isReady()
			if (!isReady) {
				return
			}

			const neo4jFilePaths = filePaths.map((filePath) => canonicalizeNeo4jFilePath(filePath, this.workspacePath))
			await relationshipIndexer.deleteFiles(neo4jFilePaths)
			for (const filePath of filePaths) {
				this.cacheManager.deleteNeo4jHash(filePath)
			}
		} catch (error) {
			console.error("[CodeIndexOrchestrator] Error deleting Neo4j relationships for removed files:", error)
		}
	}

	private async handleNeo4jBatchSummary(summary: BatchProcessingSummary): Promise<void> {
		if (!this.configManager.isNeo4jEnabled || summary.batchError) {
			return
		}

		const deletedPaths = Array.isArray(summary.deletedPaths) ? summary.deletedPaths : []
		const upsertedPaths = Array.isArray(summary.upsertedPaths) ? summary.upsertedPaths : []

		if (deletedPaths.length > 0) {
			await this.deleteRelationshipsForRemovedFiles(deletedPaths)
		}

		if (upsertedPaths.length > 0) {
			// FIX: neo4j-watcher-incremental (TestAnalyzer)
			// Root cause: watcher batch events were not propagating incremental Neo4j indexing for changed files
			await this.indexRelationshipsForChangedFiles(upsertedPaths)
		}
	}

	public async syncNeo4jWithCurrentIndex(): Promise<void> {
		if (!this.configManager.isNeo4jEnabled) {
			return
		}

		const vectorHashes = this.cacheManager.getAllHashes()
		const vectorPaths = Object.keys(vectorHashes)

		if (vectorPaths.length === 0) {
			return
		}

		const neo4jHashes = this.cacheManager.getAllNeo4jHashes()
		const staleNeo4jPaths = Object.keys(neo4jHashes).filter((filePath) => !vectorHashes[filePath])
		if (staleNeo4jPaths.length > 0) {
			await this.deleteRelationshipsForRemovedFiles(staleNeo4jPaths)
		}

		await this.indexRelationshipsForChangedFiles(vectorPaths)
	}
}
