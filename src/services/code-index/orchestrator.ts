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
import { loadRequiredLanguageParsers, resolveLanguageConfig } from "../tree-sitter/languageParser"
import { stat } from "fs/promises"

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
	) {
		// Initialize Neo4j indexer if enabled
		if (this.configManager.isNeo4jEnabled) {
			this.relationshipIndexer = new RelationshipIndexer()
		}
	}

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

				// Neo4j indexing after successful Qdrant incremental scan
				// Note: Incremental scan doesn't track individual files, so we skip Neo4j indexing here
				// Full scan will handle Neo4j indexing for all files
				if (this.configManager.isNeo4jEnabled && this.relationshipIndexer) {
					console.log("[CodeIndexOrchestrator] Skipping Neo4j indexing for incremental scan (will be done on full scan)")
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

				const { stats } = result

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

				// Neo4j indexing after successful Qdrant full scan
				// Note: Full scan doesn't track individual files in a list, so we skip Neo4j indexing here
				// Neo4j indexing should be triggered separately through file watcher events
				if (this.configManager.isNeo4jEnabled && this.relationshipIndexer) {
					console.log("[CodeIndexOrchestrator] Skipping Neo4j indexing for full scan (will be done through file watcher)")
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
	private async indexRelationshipsForChangedFiles(filePaths: string[]): Promise<void> {
		if (!this.relationshipIndexer || !this.configManager.isNeo4jEnabled) {
			return
		}

		if (this._cancelRequested) {
			return
		}

		this.stateManager.setSystemState("Indexing", "Indexing code relationships into Neo4j...")

		try {
			// kilocode_change: 2026-01-24 - unified Neo4j indexing across languages
			// Initialize Neo4j connection
			const isReady = await this.relationshipIndexer.isReady()
			if (!isReady) {
				console.warn("[CodeIndexOrchestrator] Neo4j indexer not ready, skipping relationship indexing")
				return
			}

			const supportedFiles = filePaths.filter((filePath) => {
				const ext = path.extname(filePath).toLowerCase().slice(1)
				const resolution = resolveLanguageConfig(ext)
				return Boolean(resolution && !("skip" in resolution))
			})

			if (supportedFiles.length === 0) {
				return
			}

			// Load language parsers
			const languageParsers = await loadRequiredLanguageParsers(supportedFiles)

			let processedCount = 0
			const totalFiles = supportedFiles.length

			// Process files in batches
			for (const filePath of supportedFiles) {
				if (this._cancelRequested) {
					break
				}

				try {
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

					// Get file extension
					const ext = path.extname(filePath).toLowerCase().slice(1)
					const resolution = resolveLanguageConfig(ext)
					if (!resolution || "skip" in resolution) {
						continue
					}

					const parserEntry = languageParsers[resolution.parserKey]
					if (!parserEntry) {
						continue
					}

					// Parse with tree-sitter to get AST
					const tree = parserEntry.parser.parse(content)
					if (tree) {
						await this.relationshipIndexer.indexFile(
							filePath,
							content,
							tree.rootNode,
							resolution.languageId
						)
					}
	
					processedCount++
					if (processedCount % 10 === 0) {
						this.stateManager.setSystemState(
							"Indexing",
							`Indexing relationships: ${processedCount}/${totalFiles} files...`
						)
					}
				} catch (fileError) {
					console.error(`[CodeIndexOrchestrator] Error indexing Neo4j relationships for ${filePath}:`, fileError)
					// Continue with other files
				}
			}

			console.log(`[CodeIndexOrchestrator] Neo4j relationship indexing completed: ${processedCount}/${totalFiles} files`)
		} catch (error) {
			console.error("[CodeIndexOrchestrator] Error during Neo4j relationship indexing:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "indexRelationshipsForChangedFiles",
			})
			throw error
		}
	}
}
