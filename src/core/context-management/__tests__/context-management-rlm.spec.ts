// cd src && pnpm test core/context-management/__tests__/context-management-rlm.spec.ts

import type { Mock } from "vitest"

import type { ApiHandler } from "../../../api"
import type { ApiMessage } from "../../task-persistence/apiMessages"

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureSlidingWindowTruncation: vi.fn(),
		},
	},
}))

const summarizeConversationRlmMock = vi.fn()

vi.mock("../rlm", () => ({
	summarizeConversationRlm: (...args: any[]) => summarizeConversationRlmMock(...args),
}))

import * as condenseModule from "../../condense"

import { manageContext } from "../index"

describe("manageContext (RLM routing)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		summarizeConversationRlmMock.mockReset()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should use summarizeConversationRlm when routing triggers", async () => {
		const messages: ApiMessage[] = [
			{ role: "user", content: "First message" },
			{ role: "assistant", content: "Second message" },
			{ role: "user", content: "Third message" },
			{ role: "assistant", content: "Fourth message" },
			{ role: "user", content: "Last message" },
		]

		const mockApiHandler: ApiHandler = {
			countTokens: vi.fn().mockResolvedValue(1000),
			getModel: vi.fn().mockReturnValue({
				id: "test-model",
				info: { contextWindow: 100000, maxTokens: 30000, supportsPromptCache: false, supportsImages: false },
			}),
		} as unknown as ApiHandler

		summarizeConversationRlmMock.mockResolvedValueOnce({
			messages: [{ role: "user", content: "First message" }],
			summary: "RLM summary",
			cost: 0.02,
			newContextTokens: 123,
			condenseId: "condense-id",
		})

		const summarizeSpy = vi.spyOn(condenseModule, "summarizeConversation")

		const result = await manageContext({
			messages,
			totalTokens: 59000, // + lastMessageTokens(1000) => prevContextTokens=60000 => routingMode=fast
			contextWindow: 100000,
			maxTokens: 30000,
			apiHandler: mockApiHandler,
			autoCondenseContext: true,
			autoCondenseContextPercent: 100,
			systemPrompt: "System prompt",
			taskId: "task-id",
			profileThresholds: {},
			currentProfileId: "default",
			contextRoutingEnabled: true,
			contextRoutingFastThresholdPercent: 50,
			contextRoutingDeepThresholdPercent: 80,
		})

		expect(summarizeConversationRlmMock).toHaveBeenCalledTimes(1)
		const rlmArgs = (summarizeConversationRlmMock as Mock).mock.calls[0]?.[0]
		expect(rlmArgs.mode).toBe("fast")
		expect(summarizeSpy).not.toHaveBeenCalled()

		expect(result.summary).toBe("RLM summary")
		expect(result.condenseId).toBe("condense-id")
		expect(result.prevContextTokens).toBe(60000)
	})

	it("should fall back to summarizeConversation when summarizeConversationRlm returns error", async () => {
		const messages: ApiMessage[] = [
			{ role: "user", content: "First message" },
			{ role: "assistant", content: "Second message" },
			{ role: "user", content: "Third message" },
			{ role: "assistant", content: "Fourth message" },
			{ role: "user", content: "Last message" },
		]

		const mockApiHandler: ApiHandler = {
			countTokens: vi.fn().mockResolvedValue(1000),
			getModel: vi.fn().mockReturnValue({
				id: "test-model",
				info: { contextWindow: 100000, maxTokens: 30000, supportsPromptCache: false, supportsImages: false },
			}),
		} as unknown as ApiHandler

		summarizeConversationRlmMock.mockResolvedValueOnce({
			messages,
			summary: "",
			cost: 0.01,
			error: "RLM failed",
		})

		const mockSummarizeResponse: condenseModule.SummarizeResponse = {
			messages: [{ role: "user", content: "First message" }],
			summary: "Fallback summary",
			cost: 0.05,
			newContextTokens: 111,
		}

		const summarizeSpy = vi
			.spyOn(condenseModule, "summarizeConversation")
			.mockResolvedValueOnce(mockSummarizeResponse)

		const result = await manageContext({
			messages,
			totalTokens: 59000,
			contextWindow: 100000,
			maxTokens: 30000,
			apiHandler: mockApiHandler,
			autoCondenseContext: true,
			autoCondenseContextPercent: 100,
			systemPrompt: "System prompt",
			taskId: "task-id",
			profileThresholds: {},
			currentProfileId: "default",
			contextRoutingEnabled: true,
			contextRoutingFastThresholdPercent: 50,
			contextRoutingDeepThresholdPercent: 80,
		})

		expect(summarizeConversationRlmMock).toHaveBeenCalledTimes(1)
		expect(summarizeSpy).toHaveBeenCalledTimes(1)
		expect(result.summary).toBe("Fallback summary")
		expect(result.prevContextTokens).toBe(60000)
	})

	it("should trigger fast RLM routing at lower token pressure with new defaults", async () => {
		const messages: ApiMessage[] = [
			{ role: "user", content: "First message" },
			{ role: "assistant", content: "Second message" },
			{ role: "user", content: "Third message" },
			{ role: "assistant", content: "Fourth message" },
			{ role: "user", content: "Last message" },
		]

		const mockApiHandler: ApiHandler = {
			countTokens: vi.fn().mockResolvedValue(1000),
			getModel: vi.fn().mockReturnValue({
				id: "test-model",
				info: { contextWindow: 100000, maxTokens: 30000, supportsPromptCache: false, supportsImages: false },
			}),
		} as unknown as ApiHandler

		summarizeConversationRlmMock.mockResolvedValueOnce({
			messages: [{ role: "user", content: "First message" }],
			summary: "Earlier RLM summary",
			cost: 0.01,
			newContextTokens: 120,
			condenseId: "condense-early",
		})

		const result = await manageContext({
			messages,
			totalTokens: 34000, // + 1000 => 35% of context window
			contextWindow: 100000,
			maxTokens: 30000,
			apiHandler: mockApiHandler,
			autoCondenseContext: true,
			autoCondenseContextPercent: 85,
			systemPrompt: "System prompt",
			taskId: "task-id",
			profileThresholds: {},
			currentProfileId: "default",
			contextRoutingEnabled: true,
			contextRoutingFastThresholdPercent: 35,
			contextRoutingDeepThresholdPercent: 65,
		})

		expect(summarizeConversationRlmMock).toHaveBeenCalledTimes(1)
		expect(result.summary).toBe("Earlier RLM summary")
		expect(result.prevContextTokens).toBe(35000)
	})
})
