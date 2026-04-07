import { cn } from "@/lib/utils"

type ChatInputFrameClassNameOptions = {
	isDraggingOver: boolean
	isFocused: boolean
	isRecording: boolean
}

export const getChatInputFrameClassName = ({
	isDraggingOver,
	isFocused,
	isRecording,
}: ChatInputFrameClassNameOptions) =>
	cn(
		"relative",
		"flex-1",
		"flex",
		"flex-col-reverse",
		"min-h-0",
		"overflow-hidden",
		"rounded",
		"border",
		"box-border",
		"transition-colors",
		"duration-150",
		isDraggingOver
			? "border-dashed border-vscode-focusBorder"
			: isRecording
				? "border-vscode-editorError-foreground"
				: isFocused
					? "border-vscode-focusBorder"
					: "border-[var(--vscode-input-border,var(--vscode-input-background))]",
	)
