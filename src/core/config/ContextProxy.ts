import * as vscode from "vscode"
import { ZodError } from "zod"
import { EventEmitter } from "events"
import crypto from "crypto"

import {
	PROVIDER_SETTINGS_KEYS,
	GLOBAL_SETTINGS_KEYS,
	SECRET_STATE_KEYS,
	GLOBAL_STATE_KEYS,
	GLOBAL_SECRET_KEYS,
	type ProviderSettings,
	type GlobalSettings,
	type SecretState,
	type GlobalState,
	type RooCodeSettings,
	providerSettingsSchema,
	globalSettingsSchema,
	isSecretStateKey,
	isProviderName,
} from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { logger } from "../../utils/logging"

// kilocode_change start: Configuration change event types
export interface ManagedIndexerConfig {
	kilocodeToken: string | null
	kilocodeOrganizationId: string | null
	kilocodeTesterWarningsDisabledUntil: number | null
}
// kilocode_change end

type GlobalStateKey = keyof GlobalState
type SecretStateKey = keyof SecretState
type RooCodeSettingsKey = keyof RooCodeSettings

const PASS_THROUGH_STATE_KEYS = ["taskHistory"]

export const isPassThroughStateKey = (key: string) => PASS_THROUGH_STATE_KEYS.includes(key)

const globalSettingsExportSchema = globalSettingsSchema.omit({
	taskHistory: true,
	listApiConfigMeta: true,
	currentApiConfigName: true,
})

export class ContextProxy {
	private readonly originalContext: vscode.ExtensionContext

	private stateCache: GlobalState
	private secretCache: SecretState
	private _isInitialized = false
	// kilocode_change start: Event emitter for configuration changes
	private readonly configEmitter = new EventEmitter()
	// kilocode_change end

	constructor(context: vscode.ExtensionContext) {
		this.originalContext = context
		this.stateCache = {}
		this.secretCache = {}
		this._isInitialized = false
	}

	public get isInitialized() {
		return this._isInitialized
	}

	public get rawContext(): vscode.ExtensionContext {
		return this.originalContext
	}

	public async initialize() {
		for (const key of GLOBAL_STATE_KEYS) {
			try {
				// Revert to original assignment
				this.stateCache[key] = this.originalContext.globalState.get(key)
			} catch (error) {
				logger.error(`Error loading global ${key}: ${error instanceof Error ? error.message : String(error)}`)
			}
		}

		const promises = [
			...SECRET_STATE_KEYS.map(async (key) => {
				try {
					this.secretCache[key] = await this.getSecretFromStorageWithChunking(key)
				} catch (error) {
					logger.error(
						`Error loading secret ${key}: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}),
			...GLOBAL_SECRET_KEYS.map(async (key) => {
				try {
					this.secretCache[key] = await this.getSecretFromStorageWithChunking(key)
				} catch (error) {
					logger.error(
						`Error loading global secret ${key}: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}),
		]

		await Promise.all(promises)

		// Migration: Check for old nested image generation settings and migrate them
		await this.migrateImageGenerationSettings()

		// Migration: Sanitize invalid/removed API providers
		await this.migrateInvalidApiProvider()

		this._isInitialized = true
	}

	/**
	 * Migrates invalid/removed apiProvider values by clearing them from storage.
	 * This handles cases where a user had a provider selected that was later removed
	 * from the extension (e.g., "glama").
	 */
	private async migrateInvalidApiProvider() {
		try {
			const apiProvider = this.stateCache.apiProvider
			if (apiProvider !== undefined && !isProviderName(apiProvider)) {
				logger.info(`[ContextProxy] Found invalid provider "${apiProvider}" in storage - clearing it`)
				// Clear the invalid provider from both cache and storage
				this.stateCache.apiProvider = undefined
				await this.originalContext.globalState.update("apiProvider", undefined)
			}
		} catch (error) {
			logger.error(
				`Error during invalid API provider migration: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Migrates old nested openRouterImageGenerationSettings to the new flattened structure
	 */
	private async migrateImageGenerationSettings() {
		try {
			// Check if there's an old nested structure
			const oldNestedSettings = this.originalContext.globalState.get<any>("openRouterImageGenerationSettings")

			if (oldNestedSettings && typeof oldNestedSettings === "object") {
				logger.info("Migrating old nested image generation settings to flattened structure")

				// Migrate the API key if it exists and we don't already have one
				if (oldNestedSettings.openRouterApiKey && !this.secretCache.openRouterImageApiKey) {
					await this.storeSecret("openRouterImageApiKey", oldNestedSettings.openRouterApiKey)
					logger.info("Migrated openRouterImageApiKey to secrets")
				}

				// Migrate the selected model if it exists and we don't already have one
				if (oldNestedSettings.selectedModel && !this.stateCache.openRouterImageGenerationSelectedModel) {
					await this.originalContext.globalState.update(
						"openRouterImageGenerationSelectedModel",
						oldNestedSettings.selectedModel,
					)
					this.stateCache.openRouterImageGenerationSelectedModel = oldNestedSettings.selectedModel
					logger.info("Migrated openRouterImageGenerationSelectedModel to global state")
				}

				// Clean up the old nested structure
				await this.originalContext.globalState.update("openRouterImageGenerationSettings", undefined)
				logger.info("Removed old nested openRouterImageGenerationSettings")
			}
		} catch (error) {
			logger.error(
				`Error during image generation settings migration: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	public get extensionUri() {
		return this.originalContext.extensionUri
	}

	public get extensionPath() {
		return this.originalContext.extensionPath
	}

	public get globalStorageUri() {
		return this.originalContext.globalStorageUri
	}

	public get logUri() {
		return this.originalContext.logUri
	}

	public get extension() {
		return this.originalContext.extension
	}

	public get extensionMode() {
		return this.originalContext.extensionMode
	}

	/**
	 * ExtensionContext.globalState
	 * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext.globalState
	 */

	getGlobalState<K extends GlobalStateKey>(key: K): GlobalState[K]
	getGlobalState<K extends GlobalStateKey>(key: K, defaultValue: GlobalState[K]): GlobalState[K]
	getGlobalState<K extends GlobalStateKey>(key: K, defaultValue?: GlobalState[K]): GlobalState[K] {
		if (isPassThroughStateKey(key)) {
			const value = this.originalContext.globalState.get<GlobalState[K]>(key)
			return value === undefined || value === null ? defaultValue : value
		}

		const value = this.stateCache[key]
		return value !== undefined ? value : defaultValue
	}

	updateGlobalState<K extends GlobalStateKey>(key: K, value: GlobalState[K]) {
		if (isPassThroughStateKey(key)) {
			return this.originalContext.globalState.update(key, value)
		}

		this.stateCache[key] = value
		return this.originalContext.globalState.update(key, value)
	}

	private getAllGlobalState(): GlobalState {
		return Object.fromEntries(GLOBAL_STATE_KEYS.map((key) => [key, this.getGlobalState(key)]))
	}

	/**
	 * ExtensionContext.secrets
	 * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext.secrets
	 */

	getSecret(key: SecretStateKey) {
		return this.secretCache[key]
	}

	// kilocode_change start: long-secret chunking wrapper for VS Code SecretStorage
	/**
	 * Safe chunk size to stay well under OS/SecretStorage per-entry limits.
	 * This is in UTF-16 code units (JS string length).
	 */
	private static readonly SAFE_SECRET_CHUNK_SIZE = 8_000

	private static readonly CHUNKED_SECRET_PREFIX = "__kilocode_chunked_secret_v1__:"
	private static readonly CHUNK_KEY_INFIX = "__kc_chunk_v1__"

	private static buildChunkKey(baseKey: string, nonce: string, index: number): string {
		return `${baseKey}${ContextProxy.CHUNK_KEY_INFIX}${nonce}__${index}`
	}

	private static serializeChunkedMetadata(meta: {
		v: 1
		nonce: string
		chunkSize: number
		chunkCount: number
		totalLength: number
	}): string {
		return `${ContextProxy.CHUNKED_SECRET_PREFIX}${JSON.stringify(meta)}`
	}

	private static parseChunkedMetadata(value: string): {
		v: 1
		nonce: string
		chunkSize: number
		chunkCount: number
		totalLength: number
	} | null {
		if (!value.startsWith(ContextProxy.CHUNKED_SECRET_PREFIX)) {
			return null
		}

		const json = value.slice(ContextProxy.CHUNKED_SECRET_PREFIX.length)
		try {
			const parsed = JSON.parse(json) as unknown
			if (typeof parsed !== "object" || parsed === null) return null
			const meta = parsed as Record<string, unknown>
			if (meta.v !== 1) return null
			if (typeof meta.nonce !== "string" || meta.nonce.length === 0) return null
			if (typeof meta.chunkSize !== "number" || meta.chunkSize <= 0) return null
			if (typeof meta.chunkCount !== "number" || meta.chunkCount <= 0) return null
			if (typeof meta.totalLength !== "number" || meta.totalLength < 0) return null

			return {
				v: 1,
				nonce: meta.nonce,
				chunkSize: meta.chunkSize,
				chunkCount: meta.chunkCount,
				totalLength: meta.totalLength,
			}
		} catch {
			return null
		}
	}

	private async getChunkedMetadataFromStorage(
		key: string,
	): Promise<ReturnType<typeof ContextProxy.parseChunkedMetadata>> {
		const stored = await this.originalContext.secrets.get(key)
		if (!stored) return null
		return ContextProxy.parseChunkedMetadata(stored)
	}

	private async getSecretFromStorageWithChunking(key: string): Promise<string | undefined> {
		const stored = await this.originalContext.secrets.get(key)
		if (stored === undefined) return undefined

		const meta = ContextProxy.parseChunkedMetadata(stored)
		if (!meta) {
			return stored
		}

		const chunkPromises = Array.from({ length: meta.chunkCount }, async (_, index) => {
			const chunkKey = ContextProxy.buildChunkKey(key, meta.nonce, index)
			const chunk = await this.originalContext.secrets.get(chunkKey)
			if (chunk === undefined) {
				throw new Error(`Missing secret chunk for key ${key} (chunk ${index + 1}/${meta.chunkCount})`)
			}
			return chunk
		})

		const chunks = await Promise.all(chunkPromises)
		const reconstructed = chunks.join("")
		if (reconstructed.length !== meta.totalLength) {
			throw new Error(
				`Chunked secret length mismatch for key ${key} (expected ${meta.totalLength}, got ${reconstructed.length})`,
			)
		}
		return reconstructed
	}

	async storeSecret(key: SecretStateKey, value?: string) {
		const previousValue = this.secretCache[key]
		this.secretCache[key] = value

		try {
			const oldMeta = await this.getChunkedMetadataFromStorage(key)

			if (value === undefined) {
				if (oldMeta) {
					await Promise.all(
						Array.from({ length: oldMeta.chunkCount }, (_, index) =>
							this.originalContext.secrets.delete(ContextProxy.buildChunkKey(key, oldMeta.nonce, index)),
						),
					)
				}

				await this.originalContext.secrets.delete(key)
				return
			}

			if (value.length <= ContextProxy.SAFE_SECRET_CHUNK_SIZE) {
				await this.originalContext.secrets.store(key, value)

				// Cleanup old chunks if we are replacing a previously-chunked secret.
				if (oldMeta) {
					await Promise.all(
						Array.from({ length: oldMeta.chunkCount }, (_, index) =>
							this.originalContext.secrets.delete(ContextProxy.buildChunkKey(key, oldMeta.nonce, index)),
						),
					)
				}
				return
			}

			// Chunked storage path
			const nonce = crypto.randomBytes(8).toString("hex")
			const chunkSize = ContextProxy.SAFE_SECRET_CHUNK_SIZE
			const chunkCount = Math.ceil(value.length / chunkSize)
			const totalLength = value.length
			const metaValue = ContextProxy.serializeChunkedMetadata({ v: 1, nonce, chunkSize, chunkCount, totalLength })

			const createdChunkKeys: string[] = []
			try {
				await Promise.all(
					Array.from({ length: chunkCount }, async (_, index) => {
						const start = index * chunkSize
						const end = Math.min(start + chunkSize, value.length)
						const chunk = value.slice(start, end)
						const chunkKey = ContextProxy.buildChunkKey(key, nonce, index)
						createdChunkKeys.push(chunkKey)
						await this.originalContext.secrets.store(chunkKey, chunk)
					}),
				)

				// Store metadata last so partial chunk writes don't look like a valid secret.
				await this.originalContext.secrets.store(key, metaValue)
			} catch (error) {
				// Best-effort cleanup of partially-written chunk keys.
				await Promise.all(createdChunkKeys.map((chunkKey) => this.originalContext.secrets.delete(chunkKey)))

				logger.error(
					`Failed to store chunked secret ${key} (length=${value.length}): ${
						error instanceof Error ? error.message : String(error)
					}`,
				)
				throw error
			}

			// Cleanup old chunks after successful write.
			if (oldMeta) {
				await Promise.all(
					Array.from({ length: oldMeta.chunkCount }, (_, index) =>
						this.originalContext.secrets.delete(ContextProxy.buildChunkKey(key, oldMeta.nonce, index)),
					),
				)
			}
		} catch (error) {
			// Revert cache on failure.
			this.secretCache[key] = previousValue
			throw error
		}
	}
	// kilocode_change end: long-secret chunking wrapper for VS Code SecretStorage

	/**
	 * Refresh secrets from storage and update cache
	 * This is useful when you need to ensure the cache has the latest values
	 */
	async refreshSecrets(): Promise<void> {
		const promises = [
			...SECRET_STATE_KEYS.map(async (key) => {
				try {
					this.secretCache[key] = await this.getSecretFromStorageWithChunking(key)
				} catch (error) {
					logger.error(
						`Error refreshing secret ${key}: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}),
			...GLOBAL_SECRET_KEYS.map(async (key) => {
				try {
					this.secretCache[key] = await this.getSecretFromStorageWithChunking(key)
				} catch (error) {
					logger.error(
						`Error refreshing global secret ${key}: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}),
		]
		await Promise.all(promises)
	}

	private getAllSecretState(): SecretState {
		return Object.fromEntries([
			...SECRET_STATE_KEYS.map((key) => [key, this.getSecret(key as SecretStateKey)]),
			...GLOBAL_SECRET_KEYS.map((key) => [key, this.getSecret(key as SecretStateKey)]),
		])
	}

	// kilocode_change start
	/**
	 * WorkspaceState
	 */
	async updateWorkspaceState(key: string, value: any) {
		if (!this.originalContext.workspaceState) {
			return
		}
		return this.originalContext.workspaceState.update(key, value)
	}

	async getWorkspaceState(key: string) {
		if (!this.originalContext.workspaceState) {
			return undefined
		}
		return await this.originalContext.workspaceState.get(key)
	}
	// kilocode_change end

	/**
	 * GlobalSettings
	 */

	public getGlobalSettings(): GlobalSettings {
		const values = this.getValues()

		try {
			return globalSettingsSchema.parse(values)
		} catch (error) {
			if (error instanceof ZodError) {
				TelemetryService.instance.captureSchemaValidationError({ schemaName: "GlobalSettings", error })
			}

			return GLOBAL_SETTINGS_KEYS.reduce((acc, key) => ({ ...acc, [key]: values[key] }), {} as GlobalSettings)
		}
	}

	/**
	 * ProviderSettings
	 */

	public getProviderSettings(): ProviderSettings {
		const values = this.getValues()

		// Sanitize invalid/removed apiProvider values before parsing
		// This handles cases where a user had a provider selected that was later removed
		// from the extension (e.g., "glama"). We sanitize here to avoid repeated
		// schema validation errors that can cause infinite loops in telemetry.
		const sanitizedValues = this.sanitizeProviderValues(values)

		try {
			return providerSettingsSchema.parse(sanitizedValues)
		} catch (error) {
			if (error instanceof ZodError) {
				TelemetryService.instance.captureSchemaValidationError({ schemaName: "ProviderSettings", error })
			}

			return PROVIDER_SETTINGS_KEYS.reduce(
				(acc, key) => ({ ...acc, [key]: sanitizedValues[key] }),
				{} as ProviderSettings,
			)
		}
	}

	/**
	 * Sanitizes provider values by resetting invalid/removed apiProvider values.
	 * This prevents schema validation errors for removed providers.
	 */
	private sanitizeProviderValues(values: RooCodeSettings): RooCodeSettings {
		// Remove legacy Claude Code CLI wrapper keys that may still exist in global state.
		// These keys were used by a removed local CLI runner and are no longer part of ProviderSettings.
		const legacyKeys = ["claudeCodePath", "claudeCodeMaxOutputTokens"] as const

		let sanitizedValues = values
		for (const key of legacyKeys) {
			if (key in sanitizedValues) {
				const copy = { ...sanitizedValues } as Record<string, unknown>
				delete copy[key as string]
				sanitizedValues = copy as RooCodeSettings
			}
		}

		if (values.apiProvider !== undefined && !isProviderName(values.apiProvider)) {
			logger.info(`[ContextProxy] Sanitizing invalid provider "${values.apiProvider}" - resetting to undefined`)
			// Return a new values object without the invalid apiProvider
			const { apiProvider, ...restValues } = sanitizedValues
			return restValues as RooCodeSettings
		}
		return sanitizedValues
	}

	public async setProviderSettings(values: ProviderSettings) {
		// kilocode_change start: Capture old values for change detection
		const oldToken = this.secretCache.kilocodeToken
		const oldOrgId = this.stateCache.kilocodeOrganizationId
		const oldTesterWarnings = this.stateCache.kilocodeTesterWarningsDisabledUntil
		// kilocode_change end

		// Explicitly clear out any old API configuration values before that
		// might not be present in the new configuration.
		// If a value is not present in the new configuration, then it is assumed
		// that the setting's value should be `undefined` and therefore we
		// need to remove it from the state cache if it exists.

		// Ensure openAiHeaders is always an object even when empty
		// This is critical for proper serialization/deserialization through IPC
		if (values.openAiHeaders !== undefined) {
			// Check if it's empty or null
			if (!values.openAiHeaders || Object.keys(values.openAiHeaders).length === 0) {
				values.openAiHeaders = {}
			}
		}

		await this.setValues({
			...PROVIDER_SETTINGS_KEYS.filter((key) => !isSecretStateKey(key))
				.filter((key) => !!this.stateCache[key])
				.reduce((acc, key) => ({ ...acc, [key]: undefined }), {} as ProviderSettings),
			...values,
		})

		// kilocode_change start: Emit event if managed indexer config changed
		const newToken = this.secretCache.kilocodeToken
		const newOrgId = this.stateCache.kilocodeOrganizationId
		const newTesterWarnings = this.stateCache.kilocodeTesterWarningsDisabledUntil

		if (oldToken !== newToken || oldOrgId !== newOrgId || oldTesterWarnings !== newTesterWarnings) {
			this.configEmitter.emit("managed-indexer-config-changed", {
				kilocodeToken: newToken ?? null,
				kilocodeOrganizationId: newOrgId ?? null,
				kilocodeTesterWarningsDisabledUntil: newTesterWarnings ?? null,
			} as ManagedIndexerConfig)
		}
		// kilocode_change end
	}

	/**
	 * RooCodeSettings
	 */

	public async setValue<K extends RooCodeSettingsKey>(key: K, value: RooCodeSettings[K]) {
		return isSecretStateKey(key)
			? this.storeSecret(key as SecretStateKey, value as string)
			: this.updateGlobalState(key as GlobalStateKey, value)
	}

	public getValue<K extends RooCodeSettingsKey>(key: K): RooCodeSettings[K] {
		return isSecretStateKey(key)
			? (this.getSecret(key as SecretStateKey) as RooCodeSettings[K])
			: (this.getGlobalState(key as GlobalStateKey) as RooCodeSettings[K])
	}

	public getValues(): RooCodeSettings {
		const globalState = this.getAllGlobalState()
		const secretState = this.getAllSecretState()

		// Simply merge all states - no nested secrets to handle
		return { ...globalState, ...secretState }
	}

	public async setValues(values: RooCodeSettings) {
		const entries = Object.entries(values) as [RooCodeSettingsKey, unknown][]
		await Promise.all(entries.map(([key, value]) => this.setValue(key, value)))
	}

	/**
	 * Import / Export
	 */

	public async export(): Promise<GlobalSettings | undefined> {
		try {
			const globalSettings = globalSettingsExportSchema.parse(this.getValues())

			// Exports should only contain global settings, so this skips project custom modes (those exist in the .roomode folder)
			globalSettings.customModes = globalSettings.customModes?.filter((mode) => mode.source === "global")

			return Object.fromEntries(Object.entries(globalSettings).filter(([_, value]) => value !== undefined))
		} catch (error) {
			if (error instanceof ZodError) {
				TelemetryService.instance.captureSchemaValidationError({ schemaName: "GlobalSettings", error })
			}

			return undefined
		}
	}

	/**
	 * Resets all global state, secrets, and in-memory caches.
	 * This clears all data from both the in-memory caches and the VSCode storage.
	 * @returns A promise that resolves when all reset operations are complete
	 */
	public async resetAllState() {
		// Clear in-memory caches
		this.stateCache = {}
		this.secretCache = {}

		await Promise.all([
			...GLOBAL_STATE_KEYS.map((key) => this.originalContext.globalState.update(key, undefined)),
			...SECRET_STATE_KEYS.map((key) => this.storeSecret(key, undefined)),
			...GLOBAL_SECRET_KEYS.map((key) => this.storeSecret(key as SecretStateKey, undefined)),
		])

		await this.initialize()
	}

	// kilocode_change start: Public API for managed indexer configuration changes
	/**
	 * Subscribe to managed indexer configuration changes
	 * @param listener Callback function that receives the new configuration
	 * @returns Disposable to unsubscribe from the event
	 */
	public onManagedIndexerConfigChange(listener: (config: ManagedIndexerConfig) => void): vscode.Disposable {
		this.configEmitter.on("managed-indexer-config-changed", listener)
		return {
			dispose: () => this.configEmitter.off("managed-indexer-config-changed", listener),
		}
	}
	// kilocode_change end

	private static _instance: ContextProxy | null = null

	static get instance() {
		if (!this._instance) {
			throw new Error("ContextProxy not initialized")
		}

		return this._instance
	}

	static async getInstance(context: vscode.ExtensionContext) {
		if (this._instance) {
			return this._instance
		}

		this._instance = new ContextProxy(context)
		await this._instance.initialize()

		return this._instance
	}
}
