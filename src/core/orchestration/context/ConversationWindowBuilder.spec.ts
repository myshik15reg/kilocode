// kilocode_change - new file
import { describe, expect, it } from "vitest"

import { ConversationWindowBuilder } from "./ConversationWindowBuilder"

describe("ConversationWindowBuilder", () => {
	it("keeps system prompt outside history and trims deterministically", () => {
		const builder = new ConversationWindowBuilder()
		const window = builder.build({
			systemPrompt: " You are system ",
			summary: " Older summary ",
			history: [
				{ role: "system", content: [{ type: "text", text: "do not persist" }] } as any,
				{ role: "user", content: [{ type: "text", text: " first user " }] } as any,
				{ role: "user", content: [{ type: "text", text: "first user" }] } as any,
				{ role: "assistant", content: [{ type: "text", text: " assistant reply " }] } as any,
				{ role: "user", content: [{ type: "text", text: " current request " }] } as any,
			],
			maxMessages: 3,
			maxCharsPerMessage: 40,
			maxTotalChars: 120,
		})

		expect(window.systemPrompt).toBe("You are system")
		expect(window.summary).toBe("Older summary")
		expect(window.history).toEqual([
			{ role: "user", text: "first user" },
			{ role: "assistant", text: "assistant reply" },
			{ role: "user", text: "current request" },
		])
		expect(builder.renderHistoryEntries(window).join(" | ")).toBe(
			"user: first user | assistant: assistant reply | user: current request",
		)
	})

	it("keeps the newest messages when total history chars overflow", () => {
		const builder = new ConversationWindowBuilder()
		const longText = "x".repeat(80)
		const window = builder.build({
			history: [
				{ role: "user", content: [{ type: "text", text: longText }] } as any,
				{ role: "assistant", content: [{ type: "text", text: "recent assistant" }] } as any,
				{ role: "user", content: [{ type: "text", text: "recent user" }] } as any,
			],
			maxMessages: 3,
			maxCharsPerMessage: 80,
			maxTotalChars: 40,
		})

		expect(window.history).toEqual([
			{ role: "assistant", text: "recent assistant" },
			{ role: "user", text: "recent user" },
		])
	})
})
