import * as vscode from "vscode"
import { McpHub } from "./McpHub"
import { ClineProvider } from "../../core/webview/ClineProvider"

/**
 * Singleton manager for MCP server instances.
 * Ensures only one set of MCP servers runs across all webviews.
 */
export class McpServerManager {
	private static instance: McpHub | null = null
	private static readonly GLOBAL_STATE_KEY = "mcpHubInstanceId"
	private static initializationPromise: Promise<McpHub> | null = null

	/**
	 * Get the singleton McpHub instance.
	 * Creates a new instance if one doesn't exist.
	 * Thread-safe implementation using a promise-based lock.
	 */
	static async getInstance(context: vscode.ExtensionContext, provider: ClineProvider): Promise<McpHub> {
		McpHub.registerProvider(provider)

		if (this.instance) {
			return this.instance
		}

		if (this.initializationPromise) {
			return this.initializationPromise
		}

		this.initializationPromise = (async () => {
			try {
				if (!this.instance) {
					this.instance = new McpHub(provider)
					await context.globalState.update(this.GLOBAL_STATE_KEY, Date.now().toString())
				}
				return this.instance
			} finally {
				this.initializationPromise = null
			}
		})()

		return this.initializationPromise
	}

	/**
	 * Remove a provider from the tracked set.
	 * This is called when a webview is disposed.
	 */
	static unregisterProvider(provider: ClineProvider): void {
		McpHub.unregisterProvider(provider)
	}

	/**
	 * Notify all registered providers of server state changes.
	 */
	static notifyProviders(message: any): void {
		void McpHub.notifyProviders(message)
	}

	/**
	 * Clean up the singleton instance and all its resources.
	 */
	static async cleanup(context: vscode.ExtensionContext): Promise<void> {
		if (this.instance) {
			await this.instance.dispose()
			this.instance = null
			await context.globalState.update(this.GLOBAL_STATE_KEY, undefined)
		}
		McpHub.clearRegisteredProviders()
	}
}
