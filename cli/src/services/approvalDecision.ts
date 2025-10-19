/**
 * Approval Decision Service
 *
 * Pure function service that determines what action to take for approval requests.
 * This centralizes all approval decision logic that was previously scattered across
 * multiple components and hooks.
 *
 * @module approvalDecision
 */

import type { ExtensionChatMessage } from "../types/messages.js"
import type { AutoApprovalConfig } from "../config/types.js"
import { CI_MODE_MESSAGES } from "../constants/ci.js"
import { logs } from "./logs.js"

/**
 * Result of an approval decision
 */
export interface ApprovalDecision {
	/** The action to take */
	action: "auto-approve" | "auto-reject" | "manual"
	/** Delay in milliseconds before executing (for retries) */
	delay?: number
	/** Message to send with the response (for CI mode rejections) */
	message?: string
}

/**
 * Helper function to check if a command matches allowed/denied patterns
 */
function matchesCommandPattern(command: string, patterns: string[]): boolean {
	if (patterns.length === 0) return false

	return patterns.some((pattern) => {
		// Simple pattern matching - can be enhanced with regex if needed
		if (pattern === "*") return true
		if (pattern === command) return true
		// Check if command starts with pattern (for partial matches like "npm")
		if (command.startsWith(pattern)) return true
		return false
	})
}

/**
 * Determines the approval decision for a tool request
 */
function getToolApprovalDecision(
	message: ExtensionChatMessage,
	config: AutoApprovalConfig,
	isCIMode: boolean,
): ApprovalDecision {
	try {
		const toolData = JSON.parse(message.text || "{}")
		const tool = toolData.tool

		// Read operations
		if (
			tool === "readFile" ||
			tool === "listFiles" ||
			tool === "listFilesTopLevel" ||
			tool === "listFilesRecursive" ||
			tool === "searchFiles" ||
			tool === "codebaseSearch" ||
			tool === "listCodeDefinitionNames"
		) {
			const isOutsideWorkspace = toolData.isOutsideWorkspace === true
			const shouldApprove = isOutsideWorkspace ? (config.read?.outside ?? false) : (config.read?.enabled ?? false)

			if (shouldApprove) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}

		// Write operations
		if (
			tool === "editedExistingFile" ||
			tool === "appliedDiff" ||
			tool === "newFileCreated" ||
			tool === "insertContent" ||
			tool === "searchAndReplace"
		) {
			const isOutsideWorkspace = toolData.isOutsideWorkspace === true
			const isProtected = toolData.isProtected === true

			let shouldApprove = false
			if (isProtected) {
				shouldApprove = config.write?.protected ?? false
			} else if (isOutsideWorkspace) {
				shouldApprove = config.write?.outside ?? false
			} else {
				shouldApprove = config.write?.enabled ?? false
			}

			if (shouldApprove) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}

		// Browser operations
		if (tool === "browser_action") {
			if (config.browser?.enabled) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}

		// MCP operations
		if (tool === "use_mcp_tool" || tool === "access_mcp_resource") {
			if (config.mcp?.enabled) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}

		// Mode switching
		if (tool === "switchMode") {
			if (config.mode?.enabled) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}

		// Subtasks
		if (tool === "newTask") {
			if (config.subtasks?.enabled) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}

		// Todo list updates
		if (tool === "updateTodoList") {
			if (config.todo?.enabled) {
				return { action: "auto-approve" }
			}
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
		}
	} catch {
		// If we can't parse the message, don't auto-approve
		return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
	}

	// Unknown tool
	return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
}

/**
 * Determines the approval decision for a command execution request
 */
function getCommandApprovalDecision(
	message: ExtensionChatMessage,
	config: AutoApprovalConfig,
	isCIMode: boolean,
): ApprovalDecision {
	if (!config.execute?.enabled) {
		logs.debug("Command execution not enabled in config", "approvalDecision", {
			executeEnabled: config.execute?.enabled,
		})
		return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
	}

	// Parse command from message - it's stored as JSON with a "command" field
	let command = ""
	try {
		const commandData = JSON.parse(message.text || "{}")
		command = commandData.command || message.text || ""
	} catch {
		// If parsing fails, use text directly
		command = message.text || ""
	}

	const allowedCommands = config.execute?.allowed ?? []
	const deniedCommands = config.execute?.denied ?? []

	logs.debug("Checking command approval", "approvalDecision", {
		command,
		rawText: message.text,
		allowedCommands,
		deniedCommands,
		executeEnabled: config.execute?.enabled,
	})

	// Check denied list first (takes precedence)
	if (matchesCommandPattern(command, deniedCommands)) {
		logs.debug("Command matches denied pattern", "approvalDecision", { command })
		return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
	}

	// If allowed list is empty, don't allow any commands
	if (allowedCommands.length === 0) {
		logs.debug("Allowed commands list is empty", "approvalDecision")
		return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
	}

	// Check if command matches allowed patterns
	if (matchesCommandPattern(command, allowedCommands)) {
		logs.debug("Command matches allowed pattern - auto-approving", "approvalDecision", { command })
		return { action: "auto-approve" }
	}

	logs.debug("Command does not match any allowed pattern", "approvalDecision", { command, allowedCommands })
	return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
}

/**
 * Determines the approval decision for a followup question
 *
 * NOTE: Follow-up questions should NOT require approval in normal operation.
 * They are handled by useFollowupCIResponse hook which sends a response (not approval).
 * This function is kept for backward compatibility and config-based auto-approval.
 */
function getFollowupApprovalDecision(
	message: ExtensionChatMessage,
	config: AutoApprovalConfig,
	isCIMode: boolean,
): ApprovalDecision {
	// In CI mode, always auto-approve followup questions with special message
	// This is handled by useFollowupCIResponse hook, but kept here for consistency
	if (isCIMode) {
		return {
			action: "auto-approve",
			message: CI_MODE_MESSAGES.FOLLOWUP_RESPONSE,
		}
	}

	// In non-CI mode, check config
	if (config.question?.enabled) {
		return { action: "auto-approve" }
	}

	return { action: "manual" }
}

/**
 * Determines the approval decision for an API retry request
 */
function getRetryApprovalDecision(
	message: ExtensionChatMessage,
	config: AutoApprovalConfig,
	isCIMode: boolean,
): ApprovalDecision {
	if (config.retry?.enabled) {
		// In CI mode, approve immediately without delay
		if (isCIMode) {
			return { action: "auto-approve" }
		}
		// In non-CI mode, apply retry delay
		return {
			action: "auto-approve",
			delay: (config.retry?.delay ?? 10) * 1000,
		}
	}

	return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
}

/**
 * Main function to determine approval decision for any message
 *
 * This is a pure function that takes a message and configuration,
 * and returns a decision about what action to take.
 *
 * @param message - The message requiring approval
 * @param config - The approval configuration
 * @param isCIMode - Whether CI mode is active
 * @returns The approval decision
 *
 * @example
 * ```typescript
 * const decision = getApprovalDecision(message, config, false)
 * if (decision.action === 'auto-approve') {
 *   await approve(decision.message)
 * } else if (decision.action === 'auto-reject') {
 *   await reject(decision.message)
 * } else {
 *   // Show manual approval UI
 * }
 * ```
 */
export function getApprovalDecision(
	message: ExtensionChatMessage,
	config: AutoApprovalConfig,
	isCIMode: boolean,
): ApprovalDecision {
	// Only process ask messages
	if (message.type !== "ask") {
		return { action: "manual" }
	}

	// Don't process partial or already answered messages
	if (message.partial || message.isAnswered) {
		return { action: "manual" }
	}

	const askType = message.ask

	switch (askType) {
		case "tool":
			return getToolApprovalDecision(message, config, isCIMode)

		case "command":
			return getCommandApprovalDecision(message, config, isCIMode)

		case "followup":
			return getFollowupApprovalDecision(message, config, isCIMode)

		case "api_req_failed":
			return getRetryApprovalDecision(message, config, isCIMode)

		default:
			// Unknown ask type - don't auto-approve
			return isCIMode ? { action: "auto-reject", message: CI_MODE_MESSAGES.AUTO_REJECTED } : { action: "manual" }
	}
}
