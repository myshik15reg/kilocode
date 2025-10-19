/**
 * UI-specific state atoms
 * These atoms manage the command-based UI state including messages, input, and autocomplete
 */

import { atom } from "jotai"
import type { CliMessage } from "../../types/cli.js"
import type { ExtensionChatMessage } from "../../types/messages.js"
import type { CommandSuggestion, ArgumentSuggestion } from "../../services/autocomplete.js"
import { chatMessagesAtom } from "./extension.js"
import { splitMessages } from "../../ui/messages/utils/messageCompletion.js"
import { textBufferStringAtom, textBufferCursorAtom, setTextAtom, clearTextAtom } from "./textBuffer.js"

/**
 * Unified message type that can represent both CLI and extension messages
 */
export type UnifiedMessage =
	| { source: "cli"; message: CliMessage }
	| { source: "extension"; message: ExtensionChatMessage }

// ============================================================================
// Core UI State Atoms
// ============================================================================

/**
 * Atom to hold the message history displayed in the UI
 */
export const messagesAtom = atom<CliMessage[]>([])

/**
 * Atom to track when messages have been reset/replaced
 * Increments each time replaceMessages is called to force Static component re-render
 */
export const messageResetCounterAtom = atom<number>(0)

/**
 * Atom to hold UI error messages
 */
export const errorAtom = atom<string | null>(null)

/**
 * Derived atom to check if the extension is currently streaming/processing
 * This mimics the webview's isStreaming logic from ChatView.tsx (lines 550-592)
 *
 * Returns true when:
 * - The last message is partial (still being streamed)
 * - There's an active API request that hasn't finished yet (no cost field)
 *
 * Returns false when:
 * - There's a tool currently asking for approval (waiting for user input)
 * - No messages exist
 * - All messages are complete
 */
export const isStreamingAtom = atom<boolean>((get) => {
	const messages = get(chatMessagesAtom)

	if (messages.length === 0) {
		return false
	}

	const lastMessage = messages[messages.length - 1]
	if (!lastMessage) {
		return false
	}

	// Check if there's a tool currently asking for approval
	// If so, we're not streaming - we're waiting for user input
	const isLastAsk = lastMessage.type === "ask"

	if (isLastAsk && lastMessage.ask === "tool") {
		// Tool is asking for approval, not streaming
		return false
	}

	// Check if the last message is partial (still streaming)
	if (lastMessage.partial === true) {
		return true
	}

	// Check if there's an active API request without a cost (not finished)
	// Find the last api_req_started message
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (msg?.say === "api_req_started") {
			try {
				const data = JSON.parse(msg.text || "{}")
				// If cost is undefined, the API request hasn't finished yet
				if (data.cost === undefined) {
					return true
				}
			} catch {
				// If we can't parse, assume not streaming
				return false
			}
			// Found an api_req_started with cost, so it's finished
			break
		}
	}

	return false
})

// ============================================================================
// Input Mode System
// ============================================================================

/**
 * Input mode determines keyboard behavior
 */
export type InputMode =
	| "normal" // Regular text input
	| "approval" // Approval pending (blocks input)
	| "autocomplete" // Command autocomplete active
	| "followup" // Followup suggestions active

/**
 * Current input mode
 */
export const inputModeAtom = atom<InputMode>("normal")

/**
 * Cursor position for multiline editing
 * Derived from the text buffer state
 */
export const cursorPositionAtom = atom<{ row: number; col: number }>((get) => {
	const cursor = get(textBufferCursorAtom)
	return { row: cursor.row, col: cursor.column }
})

/**
 * Single selection index used by all modes (replaces multiple separate indexes)
 */
export const selectedIndexAtom = atom<number>(0)

// ============================================================================
// Autocomplete State Atoms
// ============================================================================

/**
 * Derived atom to control autocomplete menu visibility
 * Automatically shows when text starts with "/"
 */
export const showAutocompleteAtom = atom<boolean>((get) => {
	const text = get(textBufferStringAtom)
	return text.startsWith("/")
})

/**
 * Atom to hold command suggestions for autocomplete
 */
export const suggestionsAtom = atom<CommandSuggestion[]>([])

/**
 * Atom to hold argument suggestions for autocomplete
 */
export const argumentSuggestionsAtom = atom<ArgumentSuggestion[]>([])

/**
 * @deprecated Use selectedIndexAtom instead - this is now shared across all selection contexts
 * This atom is kept for backward compatibility but will be removed in a future version.
 */
export const selectedSuggestionIndexAtom = selectedIndexAtom

// ============================================================================
// Followup Suggestions State Atoms
// ============================================================================

/**
 * Followup suggestion structure
 */
export interface FollowupSuggestion {
	answer: string
	mode?: string
}

/**
 * Atom to hold followup suggestions
 */
export const followupSuggestionsAtom = atom<FollowupSuggestion[]>([])

/**
 * Atom to control followup suggestions menu visibility
 */
export const showFollowupSuggestionsAtom = atom<boolean>(false)

/**
 * @deprecated Use selectedIndexAtom instead - this is now shared across all selection contexts
 * This atom is kept for backward compatibility but will be removed in a future version.
 * Note: The new selectedIndexAtom starts at 0, but followup mode logic handles -1 for "no selection"
 */
export const selectedFollowupIndexAtom = selectedIndexAtom

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * Derived atom to get the total count of suggestions (command or argument)
 */
export const suggestionCountAtom = atom<number>((get) => {
	const commandSuggestions = get(suggestionsAtom)
	const argumentSuggestions = get(argumentSuggestionsAtom)
	return commandSuggestions.length > 0 ? commandSuggestions.length : argumentSuggestions.length
})

/**
 * Derived atom to check if input is a command (starts with /)
 */
export const isCommandInputAtom = atom<boolean>((get) => {
	const input = get(textBufferStringAtom)
	return input.startsWith("/")
})

/**
 * Derived atom to get the command query (input without the leading /)
 */
export const commandQueryAtom = atom<string>((get) => {
	const input = get(textBufferStringAtom)
	return get(isCommandInputAtom) ? input.slice(1) : ""
})

/**
 * Derived atom to check if there are any messages
 */
export const hasMessagesAtom = atom<boolean>((get) => {
	const messages = get(messagesAtom)
	return messages.length > 0
})

/**
 * Derived atom to get the last message
 */
export const lastMessageAtom = atom<CliMessage | null>((get) => {
	const messages = get(messagesAtom)
	return messages.length > 0 ? (messages[messages.length - 1] ?? null) : null
})

/**
 * Derived atom to check if there's an active error
 */
export const hasErrorAtom = atom<boolean>((get) => {
	return get(errorAtom) !== null
})

// ============================================================================
// Action Atoms
// ============================================================================

/**
 * Action atom to add a message to the history
 */
export const addMessageAtom = atom(null, (get, set, message: CliMessage) => {
	const messages = get(messagesAtom)
	set(messagesAtom, [...messages, message])
})

/**
 * Action atom to clear all messages
 */
export const clearMessagesAtom = atom(null, (get, set) => {
	set(messagesAtom, [])
})

/**
 * Action atom to replace the entire message history
 * Increments the reset counter to force Static component re-render
 */
export const replaceMessagesAtom = atom(null, (get, set, messages: CliMessage[]) => {
	set(messagesAtom, messages)
	set(messageResetCounterAtom, (prev) => prev + 1)
})

/**
 * Action atom to update the last message
 * Useful for streaming or partial updates
 */
export const updateLastMessageAtom = atom(null, (get, set, content: string) => {
	const messages = get(messagesAtom)
	if (messages.length === 0) return

	const lastMessage = messages[messages.length - 1]
	if (!lastMessage) return

	const updatedMessage: CliMessage = {
		id: lastMessage.id,
		type: lastMessage.type,
		ts: lastMessage.ts,
		content,
		partial: false,
	}
	const updatedMessages = [...messages.slice(0, -1), updatedMessage]
	set(messagesAtom, updatedMessages)
})

/**
 * Action atom to update the text buffer value
 */
export const updateTextBufferAtom = atom(null, (get, set, value: string) => {
	set(setTextAtom, value)

	// Reset selected index when input is a command
	const isCommand = value.startsWith("/")
	if (isCommand) {
		set(selectedIndexAtom, 0)
	}
})

/**
 * Action atom to clear the text buffer
 */
export const clearTextBufferAtom = atom(null, (get, set) => {
	set(clearTextAtom)
	set(selectedIndexAtom, 0)
})

/**
 * Action atom to set command suggestions
 */
export const setSuggestionsAtom = atom(null, (get, set, suggestions: CommandSuggestion[]) => {
	set(suggestionsAtom, suggestions)
	set(selectedIndexAtom, 0)
})

/**
 * Action atom to set argument suggestions
 */
export const setArgumentSuggestionsAtom = atom(null, (get, set, suggestions: ArgumentSuggestion[]) => {
	set(argumentSuggestionsAtom, suggestions)
	set(selectedIndexAtom, 0)
})

/**
 * Action atom to select the next suggestion
 */
export const selectNextSuggestionAtom = atom(null, (get, set) => {
	const count = get(suggestionCountAtom)
	if (count === 0) return

	const currentIndex = get(selectedIndexAtom)
	const nextIndex = (currentIndex + 1) % count
	set(selectedIndexAtom, nextIndex)
})

/**
 * Action atom to select the previous suggestion
 */
export const selectPreviousSuggestionAtom = atom(null, (get, set) => {
	const count = get(suggestionCountAtom)
	if (count === 0) return

	const currentIndex = get(selectedIndexAtom)
	const prevIndex = currentIndex === 0 ? count - 1 : currentIndex - 1
	set(selectedIndexAtom, prevIndex)
})

/**
 * Action atom to set an error message
 * Auto-clears after 5 seconds
 */
export const setErrorAtom = atom(null, (get, set, error: string | null) => {
	set(errorAtom, error)

	// Auto-clear error after 5 seconds
	if (error) {
		setTimeout(() => {
			set(errorAtom, null)
		}, 5000)
	}
})

/**
 * Action atom to hide autocomplete by clearing the text buffer
 * Note: Autocomplete visibility is now derived from text buffer content
 * @deprecated This atom is kept for backward compatibility but may be removed
 */
export const hideAutocompleteAtom = atom(null, (get, set) => {
	set(clearTextAtom)
	set(selectedIndexAtom, 0)
})

/**
 * Action atom to show autocomplete
 * Note: Autocomplete visibility is now automatically derived from text buffer
 * This atom is kept for backward compatibility but has no effect
 * @deprecated This atom is kept for backward compatibility but may be removed
 */
export const showAutocompleteMenuAtom = atom(null, (get, set) => {
	// No-op: autocomplete visibility is now derived from text buffer
	// Kept for backward compatibility
})

/**
 * Action atom to get the currently selected suggestion
 */
export const getSelectedSuggestionAtom = atom<CommandSuggestion | ArgumentSuggestion | null>((get) => {
	const commandSuggestions = get(suggestionsAtom)
	const argumentSuggestions = get(argumentSuggestionsAtom)
	const selectedIndex = get(selectedIndexAtom)

	if (commandSuggestions.length > 0) {
		return commandSuggestions[selectedIndex] ?? null
	}

	if (argumentSuggestions.length > 0) {
		return argumentSuggestions[selectedIndex] ?? null
	}

	return null
})

/**
 * Derived atom that merges CLI messages and extension messages chronologically
 * This provides a unified view of all messages for display
 */
export const mergedMessagesAtom = atom<UnifiedMessage[]>((get) => {
	const cliMessages = get(messagesAtom)
	const extensionMessages = get(chatMessagesAtom)

	// Convert to unified format
	const unified: UnifiedMessage[] = [
		...cliMessages.map((msg) => ({ source: "cli" as const, message: msg })),
		...extensionMessages.map((msg) => ({ source: "extension" as const, message: msg })),
	]

	// Sort chronologically by timestamp
	const sorted = unified.sort((a, b) => {
		return a.message.ts - b.message.ts
	})

	return sorted
})

// ============================================================================
// Followup Suggestions Action Atoms
// ============================================================================

/**
 * Action atom to set followup suggestions
 */
export const setFollowupSuggestionsAtom = atom(null, (get, set, suggestions: FollowupSuggestion[]) => {
	set(followupSuggestionsAtom, suggestions)
	set(showFollowupSuggestionsAtom, suggestions.length > 0)
	// Start with no selection (-1) so user can type custom response
	set(selectedIndexAtom, -1)
})

/**
 * Action atom to clear followup suggestions
 */
export const clearFollowupSuggestionsAtom = atom(null, (get, set) => {
	set(followupSuggestionsAtom, [])
	set(showFollowupSuggestionsAtom, false)
	set(selectedIndexAtom, -1)
})

/**
 * Action atom to select the next followup suggestion
 * Special behavior: if at last item, unselect (set to -1)
 */
export const selectNextFollowupAtom = atom(null, (get, set) => {
	const suggestions = get(followupSuggestionsAtom)
	if (suggestions.length === 0) return

	const currentIndex = get(selectedIndexAtom)

	// If no selection (-1), start at 0
	if (currentIndex === -1) {
		set(selectedIndexAtom, 0)
		return
	}

	// If at last item, unselect
	if (currentIndex === suggestions.length - 1) {
		set(selectedIndexAtom, -1)
		return
	}

	// Otherwise, move to next
	set(selectedIndexAtom, currentIndex + 1)
})

/**
 * Action atom to select the previous followup suggestion
 * Special behavior: if at index 0, unselect (set to -1)
 */
export const selectPreviousFollowupAtom = atom(null, (get, set) => {
	const suggestions = get(followupSuggestionsAtom)
	if (suggestions.length === 0) return

	const currentIndex = get(selectedIndexAtom)

	// If at first item (0), unselect
	if (currentIndex === 0) {
		set(selectedIndexAtom, -1)
		return
	}

	// If no selection (-1), go to last item
	if (currentIndex === -1) {
		set(selectedIndexAtom, suggestions.length - 1)
		return
	}

	// Otherwise, move to previous
	set(selectedIndexAtom, currentIndex - 1)
})

/**
 * Action atom to unselect followup suggestion
 */
export const unselectFollowupAtom = atom(null, (get, set) => {
	set(selectedIndexAtom, -1)
})

/**
 * Derived atom to get the currently selected followup suggestion
 */
export const getSelectedFollowupAtom = atom<FollowupSuggestion | null>((get) => {
	const suggestions = get(followupSuggestionsAtom)
	const selectedIndex = get(selectedIndexAtom)

	if (selectedIndex === -1 || selectedIndex >= suggestions.length) {
		return null
	}

	return suggestions[selectedIndex] ?? null
})

/**
 * Derived atom to check if followup suggestions are active
 */
export const hasFollowupSuggestionsAtom = atom<boolean>((get) => {
	return get(followupSuggestionsAtom).length > 0
})

// ============================================================================
// Message Splitting Atoms (for Ink Static optimization)
// ============================================================================

/**
 * Derived atom that splits messages into static (complete) and dynamic (incomplete)
 * This enables Ink Static optimization by separating messages that won't change
 * from those that are still being updated
 */
export const splitMessagesAtom = atom((get) => {
	const allMessages = get(mergedMessagesAtom)
	return splitMessages(allMessages)
})

/**
 * Derived atom for static messages (complete, ready for static rendering)
 * These messages won't change and can be rendered once without re-rendering
 */
export const staticMessagesAtom = atom<UnifiedMessage[]>((get) => {
	const { staticMessages } = get(splitMessagesAtom)
	return staticMessages
})

/**
 * Derived atom for dynamic messages (incomplete, need active rendering)
 * These messages may still be updating and need to be re-rendered
 */
export const dynamicMessagesAtom = atom<UnifiedMessage[]>((get) => {
	const { dynamicMessages } = get(splitMessagesAtom)
	return dynamicMessages
})
