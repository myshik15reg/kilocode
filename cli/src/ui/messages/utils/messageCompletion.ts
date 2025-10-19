/**
 * Message completion utilities for determining when messages are ready for static rendering
 *
 * This module provides logic to determine if messages are "complete" and can be moved
 * to the static rendering section, preventing unnecessary re-renders and improving performance.
 */

import type { UnifiedMessage } from "../../../state/atoms/ui.js"
import type { ExtensionChatMessage } from "../../../types/messages.js"
import type { CliMessage } from "../../../types/cli.js"
import { parseApiReqInfo } from "../extension/utils.js"
import { logs } from "../../../services/logs.js"

/**
 * Determines if a CLI message is complete
 * CLI messages are complete when they are not marked as partial
 */
function isCliMessageComplete(message: CliMessage): boolean {
	const isComplete = message.partial !== true
	logs.debug("CLI message completion check", "messageCompletion", {
		id: message.id,
		type: message.type,
		partial: message.partial,
		isComplete,
	})
	return isComplete
}

/**
 * Determines if an extension message is complete based on its type and state
 *
 * Completion rules:
 * - Messages with partial=true are never complete
 * - api_req_started requires specific completion indicators
 * - ask messages require isAnswered=true
 * - All other messages are complete if not partial
 */
function isExtensionMessageComplete(message: ExtensionChatMessage): boolean {
	// Handle partial flag first - if partial is explicitly true, not complete
	if (message.partial === true) {
		logs.debug("Extension message incomplete: partial=true", "messageCompletion", {
			ts: message.ts,
			type: message.type,
			say: message.say,
			ask: message.ask,
		})
		return false
	}

	// Special handling for api_req_started
	// This message type needs additional attributes to be considered complete
	if (message.say === "api_req_started") {
		const apiInfo = parseApiReqInfo(message)
		const isComplete = !!(apiInfo?.streamingFailedMessage || apiInfo?.cancelReason || apiInfo?.cost !== undefined)
		logs.debug("api_req_started completion check", "messageCompletion", {
			ts: message.ts,
			hasStreamingFailed: !!apiInfo?.streamingFailedMessage,
			hasCancelReason: !!apiInfo?.cancelReason,
			hasCost: apiInfo?.cost !== undefined,
			isComplete,
		})
		return isComplete
	}

	// Ask messages completion logic
	if (message.type === "ask") {
		// These ask types don't render, so they're immediately complete
		const nonRenderingAskTypes = ["completion_result", "command_output"]
		if (message.ask && nonRenderingAskTypes.includes(message.ask)) {
			logs.debug("Ask message complete (non-rendering type)", "messageCompletion", {
				ts: message.ts,
				ask: message.ask,
			})
			return true
		}

		// Ask messages are complete once they're in final form (not partial)
		// They don't need to wait for isAnswered since they're just displaying
		// the request and waiting for user interaction
		const isComplete = !message.partial
		logs.debug("Ask message completion check", "messageCompletion", {
			ts: message.ts,
			ask: message.ask,
			isAnswered: message.isAnswered,
			isAnsweredType: typeof message.isAnswered,
			partial: message.partial,
			isComplete,
			reason: isComplete ? "not partial" : "still partial",
		})
		return isComplete
	}

	// All other messages are complete if not partial
	logs.debug("Extension message complete (default)", "messageCompletion", {
		ts: message.ts,
		type: message.type,
		say: message.say,
		partial: message.partial,
	})
	return true
}

/**
 * Determines if a unified message is complete
 * Routes to appropriate completion checker based on message source
 */
export function isMessageComplete(message: UnifiedMessage): boolean {
	if (message.source === "cli") {
		return isCliMessageComplete(message.message)
	}
	return isExtensionMessageComplete(message.message)
}
/**
 * Deduplicates checkpoint_saved messages with the same hash
 * Keeps only the first occurrence of each unique checkpoint hash
 */
function deduplicateCheckpointMessages(messages: UnifiedMessage[]): UnifiedMessage[] {
	const seenCheckpointHashes = new Set<string>()
	const deduplicated: UnifiedMessage[] = []

	for (const msg of messages) {
		// Only deduplicate checkpoint_saved messages
		if (
			msg.source === "extension" &&
			msg.message.type === "say" &&
			msg.message.say === "checkpoint_saved" &&
			msg.message.text
		) {
			const hash = msg.message.text.trim()
			if (seenCheckpointHashes.has(hash)) {
				// Skip duplicate checkpoint
				logs.debug("Skipping duplicate checkpoint message", "messageCompletion", {
					ts: msg.message.ts,
					hash,
				})
				continue
			}
			seenCheckpointHashes.add(hash)
		}

		deduplicated.push(msg)
	}

	return deduplicated
}

/**
 * Splits messages into static (complete) and dynamic (incomplete) arrays
 *
 * IMPORTANT: Ensures sequential completion - a message can only be marked as static
 * if ALL previous messages are also complete. This prevents:
 * - Mixed ordering in the static section
 * - Partial messages appearing before completed ones
 * - Visual jumping when messages complete out of order
 *
 * @param messages - Array of unified messages in chronological order
 * @returns Object with staticMessages (complete) and dynamicMessages (incomplete)
 */
export function splitMessages(messages: UnifiedMessage[]): {
	staticMessages: UnifiedMessage[]
	dynamicMessages: UnifiedMessage[]
} {
	// First, deduplicate checkpoint messages
	const deduplicatedMessages = deduplicateCheckpointMessages(messages)

	let lastCompleteIndex = -1
	const incompleteReasons: Array<{ index: number; reason: string; message: any }> = []

	// Find the last consecutive index where all messages up to that point are complete
	for (let i = 0; i < deduplicatedMessages.length; i++) {
		const msg = deduplicatedMessages[i]!
		if (isMessageComplete(msg)) {
			// Only advance if this is the next consecutive complete message
			if (i === 0 || i === lastCompleteIndex + 1) {
				lastCompleteIndex = i
			} else {
				// Gap found - an earlier message is incomplete, stop here
				incompleteReasons.push({
					index: i,
					reason: "Gap in completion - previous message incomplete",
					message: {
						source: msg.source,
						...(msg.source === "cli" ? { id: msg.message.id } : { ts: msg.message.ts }),
					},
				})
				break
			}
		} else {
			// Incomplete message found - stop here
			incompleteReasons.push({
				index: i,
				reason: "Message not complete",
				message: {
					source: msg.source,
					...(msg.source === "cli"
						? { id: msg.message.id, partial: msg.message.partial }
						: {
								ts: msg.message.ts,
								type: msg.message.type,
								say: msg.message.say,
								ask: msg.message.ask,
								partial: msg.message.partial,
								isAnswered: msg.message.isAnswered,
							}),
				},
			})
			break
		}
	}

	const staticMessages = deduplicatedMessages.slice(0, lastCompleteIndex + 1)
	const dynamicMessages = deduplicatedMessages.slice(lastCompleteIndex + 1)

	logs.debug("Message split summary", "messageCompletion", {
		originalCount: messages.length,
		deduplicatedCount: deduplicatedMessages.length,
		totalMessages: deduplicatedMessages.length,
		staticCount: staticMessages.length,
		dynamicCount: dynamicMessages.length,
		lastCompleteIndex,
		incompleteReasons: incompleteReasons.length > 0 ? incompleteReasons : "All messages complete",
	})

	return {
		staticMessages,
		dynamicMessages,
	}
}
