import * as vscode from "vscode"
import { ContextProxy } from "../../core/config/ContextProxy"
import { CodeIndexStructuredSearchResult, VectorStoreSearchResult } from "./interfaces"
import type { IVectorStore } from "./interfaces/vector-store"
import { type CodeIndexSearchRequest, IndexingState } from "./interfaces/manager"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager } from "./state-manager"
import { CodeIndexServiceFactory } from "./service-factory"
import { CodeIndexSearchService } from "./search-service"
import { CodeIndexOrchestrator } from "./orchestrator"
import { CacheManager } from "./cache-manager"
import { RooIgnoreController } from "../../core/ignore/RooIgnoreController"
import fs from "fs/promises"
import ignore from "ignore"
import path from "path"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"

import { ArtifactSearchService } from "./ArtifactSearchService"
import type { RetrievalSource } from "./interfaces"

export class CodeIndexManager {
	// --- Singleton Implementation ---
	private static instances = new Map<string, CodeIndexManager>() // Map workspace path to instance

	// Specialized class instances
	private _configManager: CodeIndexConfigManager | undefined
	private readonly _stateManager: CodeIndexStateManager
	private _serviceFactory: CodeIndexServiceFactory | undefined
	private _orchestrator: CodeIndexOrchestrator | undefined
	private _searchService: CodeIndexSearchService | undefined
	private _vectorStore: IVectorStore | undefined
	private _cacheManager: CacheManager | undefined
	private _artifactSearchService: ArtifactSearchService | undefined

	// Flag to prevent race conditions during error recovery
	private _isRecoveringFromError = false

	// FIX: task_id (TestAnalyzer)
	// Root cause: в тестах _orchestrator может быть частично мокнут без метода stopWatcher.
	private hasStopWatcher(
		orchestrator: CodeIndexOrchestrator | undefined,
	): orchestrator is CodeIndexOrchestrator & { stopWatcher: () => void } {
		return !!orchestrator && typeof (orchestrator as { stopWatcher?: unknown }).stopWatcher === "function"
	}

	public static getInstance(context: vscode.ExtensionContext, workspacePath?: string): CodeIndexManager | undefined {
		// If workspacePath is not provided, try to get it from the active editor or first workspace folder
		if (!workspacePath) {
			const activeEditor = vscode.window.activeTextEditor
			if (activeEditor) {
				const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
				workspacePath = workspaceFolder?.uri.fsPath
			}

			if (!workspacePath) {
				const workspaceFolders = vscode.workspace.workspaceFolders
				if (!workspaceFolders || workspaceFolders.length === 0) {
					return undefined
				}
				// Use the first workspace folder as fallback
				workspacePath = workspaceFolders[0].uri.fsPath
			}
		}

		if (!CodeIndexManager.instances.has(workspacePath)) {
			CodeIndexManager.instances.set(workspacePath, new CodeIndexManager(workspacePath, context))
		}
		return CodeIndexManager.instances.get(workspacePath)!
	}

	public static async disposeAll(): Promise<void> {
		for (const instance of CodeIndexManager.instances.values()) {
			await instance.dispose()
		}
		CodeIndexManager.instances.clear()
	}

	public readonly workspacePath: string // kilocode_change
	private readonly context: vscode.ExtensionContext

	// Private constructor for singleton pattern
	private constructor(workspacePath: string, context: vscode.ExtensionContext) {
		this.workspacePath = workspacePath
		this.context = context
		this._stateManager = new CodeIndexStateManager()
	}

	// --- Public API ---

	public get onProgressUpdate() {
		return this._stateManager.onProgressUpdate
	}

	private assertInitialized() {
		if (!this._configManager || !this._orchestrator || !this._searchService || !this._cacheManager) {
			throw new Error("CodeIndexManager not initialized. Call initialize() first.")
		}
	}

	public get state(): IndexingState {
		if (!this.isFeatureEnabled) {
			return "Standby"
		}
		this.assertInitialized()
		return this._orchestrator!.state
	}

	public get isFeatureEnabled(): boolean {
		return this._configManager?.isFeatureEnabled ?? false
	}

	public get isFeatureConfigured(): boolean {
		return this._configManager?.isFeatureConfigured ?? false
	}

	public get isInitialized(): boolean {
		try {
			this.assertInitialized()
			return true
		} catch (error) {
			return false
		}
	}

	/**
	 * Initializes the manager with configuration and dependent services.
	 * Must be called before using any other methods.
	 * @returns Object indicating if a restart is needed
	 */
	public async initialize(contextProxy: ContextProxy): Promise<{ requiresRestart: boolean }> {
		// 1. ConfigManager Initialization and Configuration Loading
		if (!this._configManager) {
			this._configManager = new CodeIndexConfigManager(contextProxy)
		}

		// Load configuration once to get current state and restart requirements
		const { requiresRestart } = await this._configManager.loadConfiguration()

		// 2. Check if feature is enabled
		if (!this.isFeatureEnabled) {
			if (this.hasStopWatcher(this._orchestrator)) {
				this._orchestrator.stopWatcher()
			}
			return { requiresRestart }
		}

		// 3. Check if workspace is available
		const workspacePath = this.workspacePath
		if (!workspacePath) {
			this._stateManager.setSystemState("Standby", "No workspace folder open")
			return { requiresRestart }
		}

		// 4. CacheManager Initialization
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(this.context, this.workspacePath)
			await this._cacheManager.initialize()
		}

		// 4. Determine if Core Services Need Recreation
		const needsServiceRecreation = !this._serviceFactory || requiresRestart

		if (needsServiceRecreation) {
			// kilocode_change start: add additional logging
			try {
				await this._recreateServices()
			} catch (error) {
				// Log the error and set error state
				console.error("[CodeIndexManager] Failed to recreate services:", error)
				this._stateManager.setSystemState(
					"Error",
					`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`,
				)
				// Re-throw to prevent further initialization
				throw error
			}
			// kilocode_change end
		}

		// 5. Handle Indexing Start/Restart
		// The enhanced vectorStore.initialize() in startIndexing() now handles dimension changes automatically
		// by detecting incompatible collections and recreating them, so we rely on that for dimension changes
		const shouldStartOrRestartIndexing =
			requiresRestart ||
			(needsServiceRecreation && (!this._orchestrator || this._orchestrator.state !== "Indexing"))

		if (shouldStartOrRestartIndexing) {
			this._orchestrator?.startIndexing() // This method is async, but we don't await it here
		}

		return { requiresRestart }
	}

	/**
	 * Initiates the indexing process (initial scan and starts watcher).
	 * Automatically recovers from error state if needed before starting.
	 *
	 * @important This method should NEVER be awaited as it starts a long-running background process.
	 * The indexing will continue asynchronously and progress will be reported through events.
	 */
	public async startIndexing(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}

		// Check if we're in error state and recover if needed
		const currentStatus = this.getCurrentStatus()
		if (currentStatus.systemStatus === "Error") {
			await this.recoverFromError()

			// After recovery, we need to reinitialize since recoverFromError clears all services
			// This will be handled by the caller (webviewMessageHandler) checking isInitialized
			return
		}

		this.assertInitialized()
		await this._orchestrator!.startIndexing()
	}

	/**
	 * Stops the file watcher and potentially cleans up resources.
	 */
	public stopWatcher(): void {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this.hasStopWatcher(this._orchestrator)) {
			this._orchestrator.stopWatcher()
		}
	}

	// kilocode_change start
	/**
	 * Cancel any active indexing activity immediately.
	 */
	public cancelIndexing(): void {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this._orchestrator) {
			this._orchestrator.cancelIndexing()
		}
	}

	/**
	 * Updates the batch segment threshold for indexing operations
	 * @param newThreshold New batch segment threshold value
	 */
	public updateBatchSegmentThreshold(newThreshold: number): void {
		if (this._orchestrator) {
			this._orchestrator.updateBatchSegmentThreshold(newThreshold)
		}
	}
	// kilocode_change end

	/**
	 * Recovers from error state by clearing the error and resetting internal state.
	 * This allows the manager to be re-initialized after a recoverable error.
	 *
	 * This method clears all service instances (configManager, serviceFactory, orchestrator, searchService)
	 * to force a complete re-initialization on the next operation. This ensures a clean slate
	 * after recovering from errors such as network failures or configuration issues.
	 *
	 * @remarks
	 * - Safe to call even when not in error state (idempotent)
	 * - Does not restart indexing automatically - call initialize() after recovery
	 * - Service instances will be recreated on next initialize() call
	 * - Prevents race conditions from multiple concurrent recovery attempts
	 */
	public async recoverFromError(): Promise<void> {
		// Prevent race conditions from multiple rapid recovery attempts
		if (this._isRecoveringFromError) {
			return
		}

		this._isRecoveringFromError = true
		try {
			// Clear error state
			this._stateManager.setSystemState("Standby", "")
		} catch (error) {
			// Log error but continue with recovery - clearing service instances is more important
			console.error("Failed to clear error state during recovery:", error)
		} finally {
			// Force re-initialization by clearing service instances
			// This ensures a clean slate even if state update failed
			this._configManager = undefined
			this._serviceFactory = undefined
			this._orchestrator = undefined
			this._searchService = undefined

			// Reset the flag after recovery is complete
			this._isRecoveringFromError = false
		}
	}

	/**
	 * Cleans up the manager instance.
	 */
	public async dispose(): Promise<void> {
		await this.disposeOperationalServices()
		this._stateManager.dispose()
		CodeIndexManager.instances.delete(this.workspacePath)
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the Qdrant collection,
	 * and deleting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		this.assertInitialized()
		await this._orchestrator!.clearIndexData()
		await this._cacheManager!.clearCacheFile()
		await this._cacheManager!.clearNeo4jCacheFile()
	}

	// kilocode_change start
	public async clearSemanticCache(): Promise<void> {
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(this.context, this.workspacePath)
			await this._cacheManager.initialize()
		}
		await this._cacheManager.clearCacheFile()
	}
	// kilocode_change end

	// FIX: neo4j-cache-invalidate-on-config-change (TestAnalyzer)
	// Root cause: Neo4j relationship indexing skips files when neo4j-cache hashes match vector hashes.
	// If the user changes Neo4j connection settings (uri/username/database), the cache must be invalidated
	// in-memory to avoid a "schema exists, but no data" scenario in a fresh/changed Neo4j database.
	public async clearNeo4jCache(): Promise<void> {
		// Even if the feature is disabled right now, we still clear the cache when requested.
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(this.context, this.workspacePath)
			await this._cacheManager.initialize()
		}
		await this._cacheManager.clearNeo4jCacheFile()
	}

	// kilocode_change start
	public clearErrorState(): void {
		this._stateManager.setSystemState("Standby", "")
	}
	// kilocode_change end

	// --- Private Helpers ---

	public getCurrentStatus() {
		const status = this._stateManager.getCurrentStatus()
		return {
			...status,
			workspacePath: this.workspacePath,
		}
	}

	public async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]>
	public async searchIndex(request: CodeIndexSearchRequest): Promise<VectorStoreSearchResult[]>
	public async searchIndex(
		queryOrRequest: string | CodeIndexSearchRequest,
		directoryPrefix?: string,
	): Promise<VectorStoreSearchResult[]> {
		if (!this.isFeatureEnabled) {
			return []
		}
		this.assertInitialized()
		return this._searchService!.searchIndex(this.normalizeSearchRequest(queryOrRequest, directoryPrefix))
	}

	public async searchIndexDetailed(query: string, directoryPrefix?: string): Promise<CodeIndexStructuredSearchResult>
	public async searchIndexDetailed(request: CodeIndexSearchRequest): Promise<CodeIndexStructuredSearchResult>
	public async searchIndexDetailed(
		queryOrRequest: string | CodeIndexSearchRequest,
		directoryPrefix?: string,
	): Promise<CodeIndexStructuredSearchResult> {
		const request = this.normalizeSearchRequest(queryOrRequest, directoryPrefix)
		const artifactResult = await this.searchArtifactsIfRelevant(request)
		const hasArtifactResults = Boolean(artifactResult && artifactResult.results.length > 0)

		if (!this.isFeatureEnabled) {
			if (artifactResult && hasArtifactResults) {
				return this.withSearchWarnings(artifactResult, [
					"Code indexing is disabled; returned artifact matches only.",
				])
			}
			return {
				query: request.query,
				queryClass: "broad_repo_research",
				retrievalMode: request.retrievalMode ?? "adaptive",
				retrievalConfidence: 0,
				results: [],
				keyPoints: [],
				sources: [],
				warnings: ["Code indexing is disabled."],
				postprocessUsed: false,
				compressionApplied: false,
			}
		}

		if (!this.isInitialized) {
			if (artifactResult && hasArtifactResults) {
				return this.withSearchWarnings(artifactResult, [
					"Code indexing is not initialized; returned artifact matches only.",
				])
			}
			const fallbackResult = await this.tryCodeFallback(
				request,
				"Code indexing is not initialized; returned degraded lexical code matches.",
			)
			if (fallbackResult) {
				return fallbackResult
			}
			this.assertInitialized()
		}

		const status = this.getCurrentStatus()
		if (status.systemStatus !== "Indexed") {
			if (artifactResult && hasArtifactResults) {
				return this.withSearchWarnings(artifactResult, [this.buildArtifactFallbackWarning(status.systemStatus)])
			}
			const fallbackResult = await this.tryCodeFallback(
				request,
				this.buildCodeFallbackWarning(status.systemStatus),
			)
			if (fallbackResult) {
				return fallbackResult
			}
		}

		this.assertInitialized()

		try {
			const codeResult = await this._searchService!.searchIndexDetailed(request)
			if (!artifactResult || !hasArtifactResults) {
				return codeResult
			}
			return this.mergeArtifactAndCodeResults(artifactResult, codeResult)
		} catch (error) {
			if (artifactResult && hasArtifactResults) {
				return this.withSearchWarnings(artifactResult, [
					"Code index retrieval failed; returned artifact matches only.",
				])
			}

			const fallbackResult = await this.tryCodeFallback(
				request,
				"Code index retrieval failed; returned degraded lexical code matches.",
			)
			if (fallbackResult) {
				return fallbackResult
			}

			throw error
		}
	}

	private async tryCodeFallback(
		request: CodeIndexSearchRequest,
		warning: string,
	): Promise<CodeIndexStructuredSearchResult | undefined> {
		try {
			const fallbackResult = await this.getArtifactSearchService().searchCodeFallbackDetailed(request)
			if (fallbackResult.results.length > 0) {
				return this.withSearchWarnings(fallbackResult, [warning])
			}
		} catch (fallbackError) {
			console.warn("[CodeIndexManager] Degraded code fallback failed:", fallbackError)
		}
		return undefined
	}

	private normalizeSearchRequest(
		queryOrRequest: string | CodeIndexSearchRequest,
		directoryPrefix?: string,
	): CodeIndexSearchRequest {
		if (typeof queryOrRequest === "string") {
			return { query: queryOrRequest, directoryPrefix }
		}

		return queryOrRequest
	}

	private getArtifactSearchService(): ArtifactSearchService {
		if (!this._artifactSearchService) {
			this._artifactSearchService = new ArtifactSearchService(this.workspacePath)
		}
		return this._artifactSearchService
	}

	private async searchArtifactsIfRelevant(
		request: CodeIndexSearchRequest,
	): Promise<CodeIndexStructuredSearchResult | undefined> {
		if (!ArtifactSearchService.shouldSearchArtifacts(request.query, request.directoryPrefix)) {
			return undefined
		}
		try {
			return await this.getArtifactSearchService().searchDetailed(request)
		} catch (error) {
			console.warn("[CodeIndexManager] Artifact retrieval failed:", error)
			return undefined
		}
	}

	private withSearchWarnings(
		result: CodeIndexStructuredSearchResult,
		warnings: string[],
	): CodeIndexStructuredSearchResult {
		return {
			...result,
			warnings: [...new Set([...result.warnings, ...warnings])],
		}
	}

	private mergeArtifactAndCodeResults(
		artifactResult: CodeIndexStructuredSearchResult,
		codeResult: CodeIndexStructuredSearchResult,
	): CodeIndexStructuredSearchResult {
		const maxResults =
			this._configManager?.currentSearchMaxResults ??
			Math.max(codeResult.results.length, artifactResult.results.length, 5)
		const results = this.dedupeResults([...artifactResult.results, ...codeResult.results]).slice(0, maxResults)
		return {
			...codeResult,
			queryClass: artifactResult.queryClass,
			results,
			keyPoints: results
				.slice(0, 3)
				.map((entry) => entry.citationLabel ?? `${entry.filePath}:${entry.startLine}-${entry.endLine}`),
			sources: this.dedupeSources([...artifactResult.sources, ...codeResult.sources]),
			warnings: [...new Set([...artifactResult.warnings, ...codeResult.warnings])],
			postprocessUsed: artifactResult.postprocessUsed || codeResult.postprocessUsed,
			retrievalConfidence: this.aggregateConfidence(results),
		}
	}

	private async disposeOperationalServices(): Promise<void> {
		if (this.hasStopWatcher(this._orchestrator)) {
			this._orchestrator.stopWatcher()
		}

		const vectorStore = this._vectorStore
		this._orchestrator = undefined
		this._searchService = undefined
		this._vectorStore = undefined

		if (vectorStore?.dispose) {
			try {
				await vectorStore.dispose()
			} catch (error) {
				console.warn("[CodeIndexManager] Failed to dispose vector store:", error)
			}
		}
	}

	private dedupeResults(results: VectorStoreSearchResult[]): VectorStoreSearchResult[] {
		const seen = new Set<string>()
		return results.filter((entry) => {
			const key = entry.citationLabel ?? `${entry.filePath}:${entry.startLine}-${entry.endLine}`
			if (seen.has(key)) {
				return false
			}
			seen.add(key)
			return true
		})
	}

	private dedupeSources(sources: RetrievalSource[]): RetrievalSource[] {
		const seen = new Set<string>()
		return sources.filter((source) => {
			const key = `${source.type}:${source.label}:${source.details ?? ""}`
			if (seen.has(key)) {
				return false
			}
			seen.add(key)
			return true
		})
	}

	private aggregateConfidence(results: VectorStoreSearchResult[]): number {
		if (results.length === 0) {
			return 0
		}
		const sample = results.slice(0, 3)
		return Math.max(
			0,
			Math.min(
				1,
				sample.reduce((sum, entry) => sum + (entry.confidence ?? entry.retrievalConfidence ?? entry.score), 0) /
					sample.length,
			),
		)
	}

	private buildArtifactFallbackWarning(state: IndexingState): string {
		switch (state) {
			case "Indexing":
				return "Code indexing is still running; returned artifact matches only."
			case "Standby":
				return "Code indexing has not started; returned artifact matches only."
			case "Error":
				return "Code indexing is in an error state; returned artifact matches only."
			default:
				return "Code indexing is not ready; returned artifact matches only."
		}
	}

	private buildCodeFallbackWarning(state: IndexingState): string {
		switch (state) {
			case "Indexing":
				return "Code indexing is still running; returned degraded lexical code matches."
			case "Standby":
				return "Code indexing has not started; returned degraded lexical code matches."
			case "Error":
				return "Code indexing is in an error state; returned degraded lexical code matches."
			default:
				return "Code indexing is not ready; returned degraded lexical code matches."
		}
	}
	/**
	 * Private helper method to recreate services with current configuration.
	 * Used by both initialize() and handleSettingsChange().
	 */
	private async _recreateServices(): Promise<void> {
		await this.disposeOperationalServices()

		// (Re)Initialize service factory
		this._serviceFactory = new CodeIndexServiceFactory(
			this._configManager!,
			this.workspacePath,
			this._cacheManager!,
		)

		const ignoreInstance = ignore()
		const workspacePath = this.workspacePath

		if (!workspacePath) {
			this._stateManager.setSystemState("Standby", "")
			return
		}

		// Create .gitignore instance
		const ignorePath = path.join(workspacePath, ".gitignore")
		try {
			const content = await fs.readFile(ignorePath, "utf8")
			ignoreInstance.add(content)
			ignoreInstance.add(".gitignore")
		} catch (error) {
			// Should never happen: reading file failed even though it exists
			console.error("Unexpected error loading .gitignore:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_recreateServices",
			})
		}

		// Create RooIgnoreController instance
		const rooIgnoreController = new RooIgnoreController(workspacePath)
		await rooIgnoreController.initialize()

		// (Re)Create shared service instances
		const { embedder, vectorStore, scanner, fileWatcher } = this._serviceFactory.createServices(
			this.context,
			this._cacheManager!,
			ignoreInstance,
			rooIgnoreController,
		)

		// kilocode_change start: Handle Kilo org mode (no embedder/vector store validation needed)
		const isKiloOrgMode = this._configManager!.isKiloOrgMode

		if (!isKiloOrgMode) {
			// Only validate the embedder if it matches the currently configured provider
			const config = this._configManager!.getConfig()
			const shouldValidate = embedder && embedder.embedderInfo.name === config.embedderProvider

			if (shouldValidate) {
				const validationResult = await this._serviceFactory.validateEmbedder(embedder)
				if (!validationResult.valid) {
					const errorMessage = validationResult.error || "Embedder configuration validation failed"
					this._stateManager.setSystemState("Error", errorMessage)
					throw new Error(errorMessage)
				}
			}
		}
		// kilocode_change end

		this._vectorStore = vectorStore

		// (Re)Initialize orchestrator
		this._orchestrator = new CodeIndexOrchestrator(
			this._configManager!,
			this._stateManager,
			this.workspacePath,
			this._cacheManager!,
			vectorStore,
			scanner,
			fileWatcher,
		)

		// kilocode_change start: Always create search service (it handles both local and Kilo org mode)
		// In Kilo org mode, embedder and vectorStore ill be null, but search service handles this
		this._searchService = new CodeIndexSearchService(
			this._configManager!,
			this._stateManager,
			embedder,
			vectorStore,
		)
		// kilocode_change end

		// Clear any error state after successful recwreation
		this._stateManager.setSystemState("Standby", "")
	}

	/**
	 * Handle code index settings changes.
	 * This method should be called when code index settings are updated
	 * to ensure the CodeIndexConfigManager picks up the new configuration.
	 * If the configuration changes require a restart, the service will be restarted.
	 */
	public async handleSettingsChange(): Promise<void> {
		if (this._configManager) {
			const { requiresRestart } = await this._configManager.loadConfiguration()
			const rerankConfig = this._configManager.currentRerankConfig

			const isFeatureEnabled = this.isFeatureEnabled
			const isFeatureConfigured = this.isFeatureConfigured

			// If feature is disabled, stop the service
			if (!isFeatureEnabled) {
				// Stop the orchestrator if it exists
				if (this.hasStopWatcher(this._orchestrator)) {
					this._orchestrator.stopWatcher()
				}
				// Set state to indicate service is disabled
				this._stateManager.setSystemState("Standby", "Code indexing is disabled")
				return
			}

			if (requiresRestart && isFeatureEnabled && isFeatureConfigured) {
				try {
					// Ensure cacheManager is initialized before recreating services
					if (!this._cacheManager) {
						this._cacheManager = new CacheManager(this.context, this.workspacePath)
						await this._cacheManager.initialize()
					}

					// Recreate services with new configuration
					await this._recreateServices()
					if (this._configManager?.isNeo4jEnabled) {
						await this._orchestrator?.syncNeo4jWithCurrentIndex?.()
					}
				} catch (error) {
					// Error state already set in _recreateServices
					console.error("Failed to recreate services:", error)
					TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
						location: "handleSettingsChange",
					})
					// Re-throw the error so the caller knows validation failed
					throw error
				}
			} else if (this._searchService) {
				this._searchService.updateRerankConfig(rerankConfig)
				if (this._configManager?.isNeo4jEnabled) {
					await this._orchestrator?.syncNeo4jWithCurrentIndex?.()
				}
			}
		}
	}
}
