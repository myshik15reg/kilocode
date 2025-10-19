import React from "react"
import { Box, Text } from "ink"
import type { MessageComponentProps } from "../types.js"
import { MarkdownText } from "../../../components/MarkdownText.js"
import { useTheme } from "../../../../state/hooks/useTheme.js"
import { BOX_L1 } from "../../../utils/width.js"

/**
 * Display user feedback messages
 */
export const SayUserFeedbackMessage: React.FC<MessageComponentProps> = ({ message }) => {
	const theme = useTheme()
	return (
		<Box
			width={BOX_L1}
			flexDirection="column"
			borderStyle="round"
			borderColor={theme.messages.user}
			paddingX={1}
			marginY={1}>
			<Box>
				<Text color={theme.messages.user} bold>
					💬 User Feedback
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
