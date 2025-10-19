import { EventEmitter } from "events"
import { createExtensionHost, ExtensionHost, ExtensionAPI, type ExtensionHostOptions } from "../host/ExtensionHost.js"
import { createMessageBridge, MessageBridge } from "../communication/ipc.js"
import { logs } from "./logs.js"
import { resolveExtensionPaths } from "../utils/extension-paths.js"
import type { ExtensionMessage, WebviewMessage, ExtensionState } from "../types/messages.js"
import type { IdentityInfo } from "../host/VSCode.js"

/**
 * Configuration options for ExtensionService
 */
export interface ExtensionServiceOptions {
	/** Workspace directory path */
	workspace?: string
	/** Initial mode to start with */
	mode?: string
	/** Custom extension bundle path (for testing) */
	extensionBundlePath?: string
	/** Custom extension root path (for testing) */
	extensionRootPath?: string
	/** Identity information for VSCode environment */
	identity?: IdentityInfo
}

/**
 * Events emitted by ExtensionService
 */
export interface ExtensionServiceEvents {
	/** Emitted when extension host is activated and ready */
	ready: (api: ExtensionAPI) => void
	/** Emitted when extension state changes */
	stateChange: (state: ExtensionState) => void
	/** Emitted when a message is received from extension */
	message: (message: ExtensionMessage) => void
	/** Emitted when an error occurs */
	error: (error: Error) => void
	/** Emitted when a recoverable warning occurs */
	warning: (warning: { context: string; error: Error }) => void
	/** Emitted when service is disposed */
	disposed: () => void
}

/**
 * Stateless service layer for managing ExtensionHost and MessageBridge.
 * This service handles the lifecycle of the extension host and provides
 * an event-driven interface for communication between the extension and UI.
 *
 * Key responsibilities:
 * - Initialize and manage ExtensionHost lifecycle
 * - Handle message bridging between extension and UI
 * - Emit events for state changes
 * - Provide methods for sending messages
 * - Remain completely stateless (no UI concerns)
 *
 * @example
 * ```typescript
 * const service = new ExtensionService({ workspace: '/path/to/workspace' })
 *
 * service.on('ready', (api) => {
 *   console.log('Extension ready')
 * })
 *
 * service.on('stateChange', (state) => {
 *   // Update UI state atoms
 * })
 *
 * await service.initialize()
 * await service.sendWebviewMessage({ type: 'askResponse', text: 'Hello' })
 * ```
 */
export class ExtensionService extends EventEmitter {
	private extensionHost: ExtensionHost
	private messageBridge: MessageBridge
	private options: Required<Omit<ExtensionServiceOptions, "identity">> & { identity?: IdentityInfo }
	private isInitialized = false
	private isDisposed = false

	constructor(options: ExtensionServiceOptions = {}) {
		super()

		// Resolve extension paths
		const extensionPaths = resolveExtensionPaths()

		// Set default options
		this.options = {
			workspace: options.workspace || process.cwd(),
			mode: options.mode || "code",
			extensionBundlePath: options.extensionBundlePath || extensionPaths.extensionBundlePath,
			extensionRootPath: options.extensionRootPath || extensionPaths.extensionRootPath,
			...(options.identity && { identity: options.identity }),
		}

		// Create extension host
		const hostOptions: ExtensionHostOptions = {
			workspacePath: this.options.workspace,
			extensionBundlePath: this.options.extensionBundlePath,
			extensionRootPath: this.options.extensionRootPath,
		}
		if (this.options.identity) {
			hostOptions.identity = this.options.identity
		}
		this.extensionHost = createExtensionHost(hostOptions)

		// Create message bridge
		this.messageBridge = createMessageBridge({
			enableLogging: false,
		})

		// Setup event handlers
		this.setupEventHandlers()
	}

	/**
	 * Setup all event handlers for extension host and message bridge
	 */
	private setupEventHandlers(): void {
		// Extension host events
		this.extensionHost.on("activated", (api: ExtensionAPI) => {
			logs.info("Extension host activated", "ExtensionService")
			this.emit("ready", api)
		})

		// Handle new extension-error events (non-fatal errors from extension)
		this.extensionHost.on("extension-error", (errorEvent: any) => {
			const { context, error, recoverable } = errorEvent

			if (recoverable) {
				logs.warn(`Recoverable extension error in ${context}`, "ExtensionService", { error })
				// Emit warning event instead of error to prevent crashes
				this.emit("warning", { context, error })
			} else {
				logs.error(`Critical extension error in ${context}`, "ExtensionService", { error })
				// Still emit error but don't crash
				this.emit("error", error)
			}
		})

		// Keep backward compatibility for "error" events but don't propagate to prevent crashes
		this.extensionHost.on("error", (error: Error) => {
			logs.error("Extension host error (legacy)", "ExtensionService", { error })
			// Don't re-emit to prevent crashes
		})

		// Forward extension messages to message bridge and emit as events
		this.extensionHost.on("message", (message: ExtensionMessage) => {
			// Send to message bridge for TUI consumption
			this.messageBridge.sendExtensionMessage(message)

			// Emit as event for direct consumption
			this.emit("message", message)

			// Emit state change events for state messages
			if (message.type === "state" && message.state) {
				this.emit("stateChange", message.state)
			}
		})

		// Setup proper message routing to avoid IPC timeouts
		this.messageBridge.getTUIChannel().on("message", async (ipcMessage) => {
			if (ipcMessage.type === "request") {
				try {
					const response = await this.handleTUIMessage(ipcMessage.data)
					this.messageBridge.getExtensionChannel().respond(ipcMessage.id, response)
				} catch (error) {
					this.messageBridge.getExtensionChannel().respond(ipcMessage.id, {
						error: error instanceof Error ? error.message : "Unknown error",
					})
				}
			}
		})
	}

	/**
	 * Handle TUI messages and return response
	 */
	private async handleTUIMessage(data: any): Promise<any> {
		try {
			if (data.type === "webviewMessage") {
				const message = data.payload
				await this.extensionHost.sendWebviewMessage(message)
				return { success: true }
			}

			return { success: true }
		} catch (error) {
			logs.error("Error handling TUI message", "ExtensionService", { error })
			return { error: error instanceof Error ? error.message : "Unknown error" }
		}
	}

	/**
	 * Initialize the extension service
	 * This activates the extension host and prepares the service for use
	 *
	 * @throws {Error} If initialization fails
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			logs.warn("Extension service already initialized", "ExtensionService")
			return
		}

		if (this.isDisposed) {
			throw new Error("Cannot initialize disposed ExtensionService")
		}

		try {
			logs.info("Initializing Extension Service...", "ExtensionService")

			// Activate extension host
			await this.extensionHost.activate()

			this.isInitialized = true
			logs.info("Extension Service initialized successfully", "ExtensionService")
		} catch (error) {
			logs.error("Failed to initialize Extension Service", "ExtensionService", { error })
			throw error
		}
	}

	/**
	 * Send a webview message to the extension
	 *
	 * @param message - The webview message to send
	 * @throws {Error} If service is not initialized or disposed
	 */
	async sendWebviewMessage(message: WebviewMessage): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("ExtensionService not initialized. Call initialize() first.")
		}

		if (this.isDisposed) {
			throw new Error("Cannot send message on disposed ExtensionService")
		}

		try {
			await this.messageBridge.sendWebviewMessage(message)
		} catch (error) {
			logs.error("Error sending webview message", "ExtensionService", { error })
			throw error
		}
	}

	/**
	 * Get the current extension state
	 *
	 * @returns The current extension state or null if not available
	 */
	getState(): ExtensionState | null {
		if (!this.isInitialized) {
			return null
		}

		const api = this.extensionHost.getAPI()
		return api.getState()
	}

	/**
	 * Get the message bridge instance
	 * This is useful for direct access to IPC channels
	 *
	 * @returns The message bridge instance
	 */
	getMessageBridge(): MessageBridge {
		return this.messageBridge
	}

	/**
	 * Get the extension host instance
	 * This is useful for advanced operations
	 *
	 * @returns The extension host instance
	 */
	getExtensionHost(): ExtensionHost {
		return this.extensionHost
	}

	/**
	 * Get the extension API
	 *
	 * @returns The extension API or null if not initialized
	 */
	getExtensionAPI(): ExtensionAPI | null {
		if (!this.isInitialized) {
			return null
		}

		return this.extensionHost.getAPI()
	}

	/**
	 * Get the health status of the extension
	 *
	 * @returns The extension health status or null if not available
	 */
	getExtensionHealth(): { isHealthy: boolean; errorCount: number; lastError: Error | null } | null {
		if (!this.extensionHost) {
			return null
		}
		return (this.extensionHost as any).extensionHealth || null
	}

	/**
	 * Check if the service is initialized
	 */
	isReady(): boolean {
		return this.isInitialized && !this.isDisposed
	}

	/**
	 * Dispose the extension service and clean up resources
	 * This deactivates the extension host and removes all listeners
	 */
	async dispose(): Promise<void> {
		if (this.isDisposed) {
			logs.warn("Extension service already disposed", "ExtensionService")
			return
		}

		try {
			logs.info("Disposing Extension Service...", "ExtensionService")

			// Dispose message bridge
			this.messageBridge.dispose()

			// Deactivate extension host
			await this.extensionHost.deactivate()

			// Remove all listeners
			this.removeAllListeners()

			this.isDisposed = true
			this.isInitialized = false

			// Emit disposed event
			this.emit("disposed")

			logs.info("Extension Service disposed", "ExtensionService")
		} catch (error) {
			logs.error("Error disposing Extension Service", "ExtensionService", { error })
			throw error
		}
	}

	/**
	 * Type-safe event emitter methods
	 */
	override on<K extends keyof ExtensionServiceEvents>(event: K, listener: ExtensionServiceEvents[K]): this {
		return super.on(event, listener as any)
	}

	override once<K extends keyof ExtensionServiceEvents>(event: K, listener: ExtensionServiceEvents[K]): this {
		return super.once(event, listener as any)
	}

	override emit<K extends keyof ExtensionServiceEvents>(
		event: K,
		...args: Parameters<ExtensionServiceEvents[K]>
	): boolean {
		return super.emit(event, ...args)
	}

	override off<K extends keyof ExtensionServiceEvents>(event: K, listener: ExtensionServiceEvents[K]): this {
		return super.off(event, listener as any)
	}
}

/**
 * Factory function to create an ExtensionService instance
 *
 * @param options - Configuration options for the service
 * @returns A new ExtensionService instance
 */
export function createExtensionService(options: ExtensionServiceOptions = {}): ExtensionService {
	return new ExtensionService(options)
}
