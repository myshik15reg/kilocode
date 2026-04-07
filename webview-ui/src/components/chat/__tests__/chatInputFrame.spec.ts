import { describe, expect, it } from "vitest"

import { getChatInputFrameClassName } from "../chatInputFrame"

describe("getChatInputFrameClassName", () => {
	it("returns a visible idle border when the input is not focused", () => {
		const className = getChatInputFrameClassName({
			isDraggingOver: false,
			isFocused: false,
			isRecording: false,
		})

		expect(className).toContain("border")
		expect(className).toContain("border-[var(--vscode-input-border,var(--vscode-input-background))]")
	})

	it("prioritizes the focus border over the idle border", () => {
		const className = getChatInputFrameClassName({
			isDraggingOver: false,
			isFocused: true,
			isRecording: false,
		})

		expect(className).toContain("border-vscode-focusBorder")
		expect(className).not.toContain("border-[var(--vscode-input-border,var(--vscode-input-background))]")
	})

	it("prioritizes the recording border over focus", () => {
		const className = getChatInputFrameClassName({
			isDraggingOver: false,
			isFocused: true,
			isRecording: true,
		})

		expect(className).toContain("border-vscode-editorError-foreground")
		expect(className).not.toContain("border-vscode-focusBorder")
	})

	it("uses a dashed focus border while dragging files", () => {
		const className = getChatInputFrameClassName({
			isDraggingOver: true,
			isFocused: false,
			isRecording: false,
		})

		expect(className).toContain("border-dashed")
		expect(className).toContain("border-vscode-focusBorder")
	})
})
