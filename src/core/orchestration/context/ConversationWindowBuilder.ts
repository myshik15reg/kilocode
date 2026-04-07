import type { ApiMessage } from "../../task-persistence/apiMessages"

// kilocode_change - new file

export interface ConversationWindowEntry {
	role: "user" | "assistant"
	text: string
}

export interface ConversationWindow {
	systemPrompt?: string
	summary?: string
	history: ConversationWindowEntry[]
	currentInput?: string
}

export interface ConversationWindowBuilderInput {
	systemPrompt?: string
	summary?: string
	history?: ApiMessage[]
	currentInput?: string
	maxMessages?: number
	maxCharsPerMessage?: number
	maxTotalChars?: number
}

export class ConversationWindowBuilder {
	public build(input: ConversationWindowBuilderInput): ConversationWindow {
		const maxMessages = Math.max(0, input.maxMessages ?? Number.MAX_SAFE_INTEGER)
		const maxCharsPerMessage = Math.max(1, input.maxCharsPerMessage ?? Number.MAX_SAFE_INTEGER)
		const maxTotalChars = Math.max(1, input.maxTotalChars ?? Number.MAX_SAFE_INTEGER)

		const normalizedHistory = this.normalizeHistory(input.history ?? [], maxCharsPerMessage)
		const trimmedHistory = this.trimHistory(normalizedHistory, maxMessages, maxTotalChars)

		return {
			systemPrompt: this.normalizeText(input.systemPrompt),
			summary: this.normalizeText(input.summary),
			history: trimmedHistory,
			currentInput: this.normalizeText(input.currentInput),
		}
	}

	public renderHistoryEntries(window: ConversationWindow): string[] {
		return window.history.map((entry) => `${entry.role}: ${entry.text}`)
	}

	private normalizeHistory(history: ApiMessage[], maxCharsPerMessage: number): ConversationWindowEntry[] {
		const entries: ConversationWindowEntry[] = []

		for (const message of history) {
			if (message.role !== "user" && message.role !== "assistant") {
				continue
			}

			const text = this.extractMessageText(message, maxCharsPerMessage)
			if (!text) {
				continue
			}

			const previous = entries.at(-1)
			if (previous && previous.role === message.role && previous.text === text) {
				continue
			}

			entries.push({ role: message.role, text })
		}

		return entries
	}

	private trimHistory(
		history: ConversationWindowEntry[],
		maxMessages: number,
		maxTotalChars: number,
	): ConversationWindowEntry[] {
		if (history.length === 0 || maxMessages === 0) {
			return []
		}

		const collected: ConversationWindowEntry[] = []
		let totalChars = 0

		for (let index = history.length - 1; index >= 0; index -= 1) {
			if (collected.length >= maxMessages) {
				break
			}

			const entry = history[index]
			if (totalChars + entry.text.length > maxTotalChars && collected.length > 0) {
				break
			}

			collected.push(entry)
			totalChars += entry.text.length
		}

		return collected.reverse()
	}

	private extractMessageText(message: ApiMessage, maxCharsPerMessage: number): string | undefined {
		if (!Array.isArray(message.content)) {
			return undefined
		}

		const joined = message.content
			.filter((block): block is { type: "text"; text: string } => block.type === "text")
			.map((block) => block.text)
			.join(" ")

		const normalized = this.normalizeText(joined)
		if (!normalized) {
			return undefined
		}

		return normalized.slice(0, maxCharsPerMessage)
	}

	private normalizeText(value?: string): string | undefined {
		const normalized = value?.replace(/\s+/g, " ").trim()
		return normalized ? normalized : undefined
	}
}
