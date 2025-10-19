/**
 * Hook for managing hotkey state and handlers
 */

import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { isStreamingAtom, showFollowupSuggestionsAtom } from "../atoms/ui.js"
import { useApprovalHandler } from "./useApprovalHandler.js"
import { hasResumeTaskAtom } from "../atoms/extension.js"

export interface Hotkey {
	/** The key combination (e.g., "Ctrl+C", "Cmd+X") */
	keys: string
	/** Description of what the hotkey does */
	description: string
	/** Whether this is the primary/recommended action */
	primary?: boolean
}

export interface UseHotkeysReturn {
	/** List of currently available hotkeys */
	hotkeys: Hotkey[]
	/** Whether any hotkeys should be displayed */
	shouldShow: boolean
	/** The platform-specific modifier key (Cmd or Ctrl) */
	modifierKey: string
}

/**
 * Detects the platform and returns the appropriate modifier key
 */
function getModifierKey(): string {
	const platform = process.platform
	return platform === "darwin" ? "Cmd" : "Ctrl"
}

/**
 * Hook to manage and display context-aware hotkeys
 *
 * Returns different hotkeys based on the current UI state:
 * - When streaming: Shows cancel hotkey
 * - When approval pending: Shows approval hotkeys
 * - When followup suggestions visible: Shows navigation hotkeys
 * - When idle: Shows general command hotkeys
 */
export function useHotkeys(): UseHotkeysReturn {
	const isStreaming = useAtomValue(isStreamingAtom)
	const isFollowupVisible = useAtomValue(showFollowupSuggestionsAtom)
	const hasResumeTask = useAtomValue(hasResumeTaskAtom)
	const { isApprovalPending } = useApprovalHandler()

	const modifierKey = useMemo(() => getModifierKey(), [])

	const hotkeys = useMemo((): Hotkey[] => {
		// Priority 1: Resume task hotkey
		if (hasResumeTask) {
			return [{ keys: `${modifierKey}+R`, description: "to resume" }]
		}

		// Priority 2: Approval mode hotkeys
		if (isApprovalPending) {
			return [
				{ keys: "Y", description: "to approve" },
				{ keys: "N", description: "to reject" },
				{ keys: "Esc", description: "to cancel" },
			]
		}

		// Priority 3: Streaming state - show cancel
		if (isStreaming) {
			return [{ keys: `${modifierKey}+X`, description: "to cancel" }]
		}

		// Priority 4: Followup suggestions visible
		if (isFollowupVisible) {
			return [
				{ keys: "↑↓", description: "to navigate" },
				{ keys: "Tab", description: "to fill" },
				{ keys: "Enter", description: "to submit" },
			]
		}

		// Default: General command hints
		return [
			{ keys: "/help", description: "for commands" },
			{ keys: "/mode", description: "to switch mode" },
		]
	}, [hasResumeTask, isApprovalPending, isStreaming, isFollowupVisible, modifierKey])

	const shouldShow = hotkeys.length > 0

	return {
		hotkeys,
		shouldShow,
		modifierKey,
	}
}
