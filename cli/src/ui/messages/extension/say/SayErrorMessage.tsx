import React from "react"
import { Box, Text } from "ink"
import type { MessageComponentProps } from "../types.js"
import { MarkdownText } from "../../../components/MarkdownText.js"
import { useTheme } from "../../../../state/hooks/useTheme.js"
import { BOX_L1 } from "../../../utils/width.js"

/**
 * Display error messages with red bordered box
 */
export const SayErrorMessage: React.FC<MessageComponentProps> = ({ message }) => {
	const theme = useTheme()
	return (
		<Box
			width={BOX_L1}
			flexDirection="column"
			borderStyle="single"
			borderColor={theme.semantic.error}
			paddingX={1}
			marginY={1}>
			<Box>
				<Text color={theme.semantic.error} bold>
					✖ Error
				</Text>
			</Box>
			{message.text && (
				<Box marginTop={1}>
					<MarkdownText>{message.text}</MarkdownText>
				</Box>
			)}
		</Box>
	)
}
