/**
 * StatusBar component - displays project info, git branch, mode, model, and context usage
 */

import React, { useMemo } from "react"
import { Box, Text } from "ink"
import { useAtomValue } from "jotai"
import {
	cwdAtom,
	extensionModeAtom,
	apiConfigurationAtom,
	chatMessagesAtom,
	routerModelsAtom,
} from "../../state/atoms/index.js"
import { useGitInfo } from "../../state/hooks/useGitInfo.js"
import { useContextUsage } from "../../state/hooks/useContextUsage.js"
import { useTheme } from "../../state/hooks/useTheme.js"
import { formatContextUsage } from "../../utils/context.js"
import {
	getCurrentModelId,
	getModelsByProvider,
	prettyModelName,
	type RouterModels,
} from "../../constants/providers/models.js"
import type { ProviderSettings } from "../../types/messages.js"
import path from "path"

const MAX_MODEL_NAME_LENGTH = 40

/**
 * Get the display name for the current model
 */
function getModelDisplayName(apiConfig: ProviderSettings | null, routerModels: RouterModels | null): string {
	if (!apiConfig || !apiConfig.apiProvider) return "N/A"

	try {
		// Get current model ID
		const currentModelId = getCurrentModelId({
			providerConfig: {
				provider: apiConfig.apiProvider,
				...apiConfig,
			} as any,
			routerModels,
			kilocodeDefaultModel: apiConfig.kilocodeModel || "",
		})

		// Get models for the provider
		const { models } = getModelsByProvider({
			provider: apiConfig.apiProvider,
			routerModels,
			kilocodeDefaultModel: apiConfig.kilocodeModel || "",
		})

		// Get model info
		const modelInfo = models[currentModelId]

		// Use displayName if available, otherwise use pretty name
		const displayName = modelInfo?.displayName || prettyModelName(currentModelId)

		// Limit length for display
		return displayName.length > MAX_MODEL_NAME_LENGTH
			? displayName.substring(0, MAX_MODEL_NAME_LENGTH - 3) + "..."
			: displayName
	} catch {
		// Fallback to simple model ID extraction
		const modelId =
			apiConfig.apiModelId ||
			apiConfig.openAiModelId ||
			apiConfig.ollamaModelId ||
			apiConfig.kilocodeModel ||
			"Unknown"

		return modelId.length > MAX_MODEL_NAME_LENGTH
			? modelId.substring(0, MAX_MODEL_NAME_LENGTH - 3) + "..."
			: modelId
	}
}

/**
 * Get project name from workspace path
 */
function getProjectName(cwd: string | null): string {
	if (!cwd) return "N/A"
	return path.basename(cwd)
}

/**
 * StatusBar component that displays current project status
 */
export const StatusBar: React.FC = () => {
	// Get theme
	const theme = useTheme()

	// Get data from atoms
	const cwd = useAtomValue(cwdAtom)
	const mode = useAtomValue(extensionModeAtom)
	const apiConfig = useAtomValue(apiConfigurationAtom)
	const messages = useAtomValue(chatMessagesAtom)
	const routerModels = useAtomValue(routerModelsAtom)

	// Get git info
	const gitInfo = useGitInfo(cwd)

	// Calculate context usage
	const contextUsage = useContextUsage(messages, apiConfig)

	// Prepare display values
	const projectName = getProjectName(cwd)
	const modelName = useMemo(() => getModelDisplayName(apiConfig, routerModels), [apiConfig, routerModels])

	// Get context color based on percentage using theme colors
	const contextColor = useMemo(() => {
		if (contextUsage.percentage >= 86) {
			return theme.semantic.error
		}
		if (contextUsage.percentage >= 61) {
			return theme.semantic.warning
		}
		return theme.semantic.success
	}, [contextUsage.percentage, theme])

	const contextText = formatContextUsage(contextUsage)

	// Git status color (success if clean, warning if dirty)
	const gitStatusColor = gitInfo.isClean ? theme.semantic.success : theme.semantic.warning

	return (
		<Box borderStyle="single" borderColor={theme.ui.border.default} paddingX={1} justifyContent="space-between">
			{/* Left side: Project and Git Branch */}
			<Box>
				{/* Project Name */}
				<Text color={theme.semantic.info} bold>
					{projectName}
				</Text>

				{/* Git Branch */}
				{gitInfo.isRepo && gitInfo.branch ? (
					<>
						<Text color={theme.ui.text.dimmed} dimColor>
							{" / "}
						</Text>
						<Text color={gitStatusColor}>{gitInfo.branch}</Text>
					</>
				) : null}
			</Box>

			{/* Right side: Mode, Model, and Context */}
			<Box>
				{/* Mode */}
				<Text color={theme.ui.text.highlight} bold>
					{mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "N/A"}
				</Text>

				<Text color={theme.ui.text.dimmed} dimColor>
					{" | "}
				</Text>

				{/* Model */}
				<Text color={theme.messages.user}>{modelName}</Text>

				<Text color={theme.ui.text.dimmed} dimColor>
					{" | "}
				</Text>

				{/* Context Usage */}
				<Text color={contextColor} bold>
					{contextText}
				</Text>
			</Box>
		</Box>
	)
}
