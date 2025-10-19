/**
 * Action atoms for service interaction
 * These atoms provide high-level actions for interacting with the ExtensionService
 */

import { atom } from "jotai"
import type { WebviewMessage } from "../../types/messages.js"
import { extensionServiceAtom, isServiceReadyAtom, setServiceErrorAtom } from "./service.js"
import { logs } from "../../services/logs.js"

/**
 * Action atom to send a webview message to the extension
 * This is the primary way to communicate with the extension
 */
export const sendWebviewMessageAtom = atom(null, async (get, set, message: WebviewMessage) => {
	const service = get(extensionServiceAtom)
	const isReady = get(isServiceReadyAtom)

	if (!service) {
		const error = new Error("ExtensionService not available")
		set(setServiceErrorAtom, error)
		throw error
	}

	if (!isReady) {
		const error = new Error("ExtensionService not ready")
		set(setServiceErrorAtom, error)
		throw error
	}

	try {
		logs.debug(`Sending webview message: ${message.type}`, "actions")
		await service.sendWebviewMessage(message)
	} catch (error) {
		logs.error("Failed to send webview message", "actions", { error })
		const err = error instanceof Error ? error : new Error(String(error))
		set(setServiceErrorAtom, err)
		throw err
	}
})

/**
 * Action atom to send a new task to the extension
 */
export const sendTaskAtom = atom(null, async (get, set, params: { text: string; images?: string[]; mode?: string }) => {
	const message: WebviewMessage = {
		type: "newTask",
		text: params.text,
	}

	if (params.images) {
		message.images = params.images
	}
	if (params.mode) {
		message.mode = params.mode
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to send an ask response to the extension
 */
export const sendAskResponseAtom = atom(
	null,
	async (get, set, params: { response?: string; action?: string; text?: string; images?: string[] }) => {
		const message: WebviewMessage = {
			type: "askResponse",
		}

		if (params.response) {
			message.askResponse = params.response
		}
		if (params.action) {
			message.action = params.action
		}
		if (params.text) {
			message.text = params.text
		}
		if (params.images) {
			message.images = params.images
		}

		await set(sendWebviewMessageAtom, message)
	},
)

/**
 * Action atom to request router models from the extension
 */
export const requestRouterModelsAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "requestRouterModels",
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to clear the current task
 */
export const clearTaskAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "clearTask",
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to cancel the current task
 */
export const cancelTaskAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "cancelTask",
	}

	try {
		await set(sendWebviewMessageAtom, message)
	} catch (error) {
		// Check if this is a task abortion error (expected when canceling)
		const isTaskAbortError =
			error instanceof Error &&
			error.message &&
			error.message.includes("task") &&
			error.message.includes("aborted")

		if (!isTaskAbortError) {
			// Only log/throw unexpected errors
			logs.error("Failed to cancel task", "actions", { error })
			throw error
		}
		// Silently handle expected task abortion errors
	}
})

/**
 * Action atom to resume a task
 */
export const resumeTaskAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "askResponse",
		askResponse: "messageResponse",
		text: "",
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to switch modes
 */
export const switchModeAtom = atom(null, async (get, set, mode: string) => {
	const message: WebviewMessage = {
		type: "mode",
		text: mode,
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to approve or reject a tool use
 */
export const respondToToolAtom = atom(
	null,
	async (get, set, params: { response: "yesButtonTapped" | "noButtonTapped"; text?: string; images?: string[] }) => {
		const message: WebviewMessage = {
			type: params.response,
			...(params.text && { text: params.text }),
			...(params.images && { images: params.images }),
		}

		await set(sendWebviewMessageAtom, message)
	},
)

/**
 * Action atom to send API configuration
 */
export const sendApiConfigurationAtom = atom(null, async (get, set, apiConfiguration: any) => {
	const message: WebviewMessage = {
		type: "apiConfiguration",
		apiConfiguration,
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to send custom instructions
 */
export const sendCustomInstructionsAtom = atom(null, async (get, set, instructions: string) => {
	const message: WebviewMessage = {
		type: "customInstructions",
		text: instructions,
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to send always allow settings
 */
export const sendAlwaysAllowAtom = atom(null, async (get, set, alwaysAllow: boolean) => {
	const message: WebviewMessage = {
		type: "alwaysAllow",
		bool: alwaysAllow,
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to open a file in the editor
 */
export const openFileAtom = atom(null, async (get, set, filePath: string) => {
	const message: WebviewMessage = {
		type: "openFile",
		text: filePath,
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to open the settings
 */
export const openSettingsAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "openSettings",
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to refresh the extension state
 */
export const refreshStateAtom = atom(null, async (get) => {
	const service = get(extensionServiceAtom)
	const isReady = get(isServiceReadyAtom)

	if (!service || !isReady) {
		logs.warn("Cannot refresh state: service not ready", "actions")
		return
	}

	try {
		const state = service.getState()
		if (state) {
			// The state will be updated through the message handler
			logs.debug("State refreshed", "actions")
		}
	} catch (error) {
		logs.error("Failed to refresh state", "actions", { error })
	}
})

/**
 * Action atom to send a primary button click
 */
export const sendPrimaryButtonClickAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "primaryButtonClick",
	}

	await set(sendWebviewMessageAtom, message)
})

/**
 * Action atom to send a secondary button click
 */
export const sendSecondaryButtonClickAtom = atom(null, async (get, set) => {
	const message: WebviewMessage = {
		type: "secondaryButtonClick",
	}

	await set(sendWebviewMessageAtom, message)
})
