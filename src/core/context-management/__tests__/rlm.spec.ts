// cd src && pnpm test core/context-management/__tests__/rlm.spec.ts

import type { Mock } from "vitest"

import { summarizeConversationRlm } from "../rlm"

import type { ApiHandler } from "../../../api"
import type { ApiMessage } from "../../task-persistence/apiMessages"

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureContextCondensed: vi.fn(),
		},
	},
}))

const createStream = ({
	text,
	totalCost,
	outputTokens,
}: {
	text: string
	totalCost: number
	outputTokens: number
}): AsyncGenerator<any, void, unknown> =>
	(async function* () {
		yield { type: "text" as const, text }
		yield { type: "usage" as const, totalCost, outputTokens }
	})()

describe("summarizeConversationRlm", () => {
	it("should generate summary and insert summary message", async () => {
		const messages: ApiMessage[] = [
			{ role: "user", content: "First message", ts: 1 },
			{ role: "assistant", content: "Ack", ts: 2 },
			{ role: "user", content: "More context", ts: 3 },
			{ role: "assistant", content: "Working", ts: 4 },
			{ role: "user", content: "Kept 1", ts: 5 },
			{ role: "assistant", content: "Kept 2", ts: 6 },
			{ role: "user", content: "Kept 3", ts: 7 },
		]

		const mockApiHandler: ApiHandler = {
			createMessage: vi
				.fn()
				.mockReturnValue(createStream({ text: "RLM summary", totalCost: 0.01, outputTokens: 20 })),
			countTokens: vi.fn().mockResolvedValue(10),
			getModel: vi.fn().mockReturnValue({
				id: "test-model",
				info: {
					contextWindow: 100000,
					supportsImages: false,
					supportsPromptCache: false,
					maxTokens: 4096,
				},
			}),
		} as unknown as ApiHandler

		const result = await summarizeConversationRlm({
			messages,
			apiHandler: mockApiHandler,
			systemPrompt: "System prompt",
			taskId: "task-id",
			prevContextTokens: 1000,
			mode: "fast",
			contextWindow: 10000,
		})

		expect(result.error).toBeUndefined()
		expect(result.summary).toBe("RLM summary")
		expect(result.cost).toBe(0.01)
		expect(result.newContextTokens).toBe(30)
		expect(result.condenseId).toBeDefined()

		// Non-destructive condense: original messages + summary message inserted
		expect(result.messages.length).toBe(messages.length + 1)

		const summaryMessage = result.messages.find((m) => m.isSummary)
		expect(summaryMessage).toBeDefined()
		expect(summaryMessage!.role).toBe("assistant")
		expect(Array.isArray(summaryMessage!.content)).toBe(true)

		const contentBlocks = summaryMessage!.content as any[]
		expect(contentBlocks[0]?.type).toBe("reasoning")
		expect(contentBlocks[1]?.type).toBe("text")
		expect(contentBlocks[1]?.text).toBe("RLM summary")

		expect(mockApiHandler.createMessage).toHaveBeenCalledTimes(1)
		expect((mockApiHandler.createMessage as Mock).mock.calls[0]?.[0]).toContain("Mode: fast")
	})

	it("should fall back to main apiHandler when condensingApiHandler is invalid", async () => {
		const messages: ApiMessage[] = [
			{ role: "user", content: "First message", ts: 1 },
			{ role: "assistant", content: "Ack", ts: 2 },
			{ role: "user", content: "More context", ts: 3 },
			{ role: "assistant", content: "Working", ts: 4 },
			{ role: "user", content: "Kept 1", ts: 5 },
			{ role: "assistant", content: "Kept 2", ts: 6 },
			{ role: "user", content: "Kept 3", ts: 7 },
		]

		const mockWarn = vi.fn()
		const originalWarn = console.warn
		console.warn = mockWarn

		const mockApiHandler: ApiHandler = {
			createMessage: vi
				.fn()
				.mockReturnValue(createStream({ text: "Summary from main", totalCost: 0.02, outputTokens: 15 })),
			countTokens: vi.fn().mockResolvedValue(10),
			getModel: vi.fn().mockReturnValue({
				id: "test-model",
				info: {
					contextWindow: 100000,
					supportsImages: false,
					supportsPromptCache: false,
					maxTokens: 4096,
				},
			}),
		} as unknown as ApiHandler

		const invalidCondensingHandler = {
			countTokens: vi.fn(),
			getModel: vi.fn(),
			// createMessage is missing
		} as unknown as ApiHandler

		const result = await summarizeConversationRlm({
			messages,
			apiHandler: mockApiHandler,
			systemPrompt: "System prompt",
			taskId: "task-id",
			prevContextTokens: 1000,
			mode: "fast",
			contextWindow: 10000,
			condensingApiHandler: invalidCondensingHandler,
		})

		expect(result.error).toBeUndefined()
		expect(result.summary).toBe("Summary from main")
		expect(mockApiHandler.createMessage).toHaveBeenCalledTimes(1)
		expect(mockWarn).toHaveBeenCalled()

		console.warn = originalWarn
	})

	it("should return error when API returns empty summary text", async () => {
		const messages: ApiMessage[] = [
			{ role: "user", content: "First message", ts: 1 },
			{ role: "assistant", content: "Ack", ts: 2 },
			{ role: "user", content: "More context", ts: 3 },
			{ role: "assistant", content: "Working", ts: 4 },
			{ role: "user", content: "Kept 1", ts: 5 },
			{ role: "assistant", content: "Kept 2", ts: 6 },
			{ role: "user", content: "Kept 3", ts: 7 },
		]

		const mockApiHandler: ApiHandler = {
			createMessage: vi.fn().mockReturnValue(createStream({ text: "", totalCost: 0.02, outputTokens: 0 })),
			countTokens: vi.fn().mockResolvedValue(10),
			getModel: vi.fn().mockReturnValue({
				id: "test-model",
				info: {
					contextWindow: 100000,
					supportsImages: false,
					supportsPromptCache: false,
					maxTokens: 4096,
				},
			}),
		} as unknown as ApiHandler

		const result = await summarizeConversationRlm({
			messages,
			apiHandler: mockApiHandler,
			systemPrompt: "System prompt",
			taskId: "task-id",
			prevContextTokens: 1000,
			mode: "fast",
			contextWindow: 10000,
		})

		expect(result.summary).toBe("")
		expect(result.messages).toEqual(messages)
		expect(result.error).toBe("RLM summary returned empty text")
	})
})
