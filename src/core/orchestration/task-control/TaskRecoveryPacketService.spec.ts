// kilocode_change - new file
import type { HistoryItem } from "@roo-code/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn(),
}))

vi.mock("../../helper-routing/HelperModelRouter", () => ({
	HelperModelRouter: {
		selectConfig: vi.fn(),
	},
}))

import { buildApiHandler } from "../../../api"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import { TaskRecoveryPacketService, type TaskRecoveryPacketRuntime } from "./TaskRecoveryPacketService"

async function* createStream(...chunks: Array<{ type: string; text?: string }>) {
	for (const chunk of chunks) {
		yield chunk
	}
}

describe("TaskRecoveryPacketService", () => {
	let runtime: TaskRecoveryPacketRuntime
	let getState: ReturnType<typeof vi.fn>
	let log: ReturnType<typeof vi.fn>

	const createHistoryItem = (overrides: Partial<HistoryItem> = {}): HistoryItem =>
		({
			id: "task-1",
			number: 1,
			task: "Recover failed generation",
			ts: 1,
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			...overrides,
		}) as HistoryItem

	beforeEach(() => {
		vi.clearAllMocks()
		getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "helper-1",
			listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper", apiProvider: "openai" }],
		})
		log = vi.fn()
		runtime = {
			getState,
			providerSettingsManager: { getProfile: vi.fn() } as any,
			log,
		}
	})

	it("caches recovery packets by default and returns the cached instance on repeat calls", async () => {
		const service = new TaskRecoveryPacketService(runtime)
		const summarySpy = vi
			.spyOn(service as any, "maybeBuildCheapRestartSummary")
			.mockResolvedValue("Compact restart summary")
		const historyItem = createHistoryItem({ lastStopReason: "streaming_failed" })

		const firstPacket = await service.buildRecoveryPacket({ historyItem })
		const secondPacket = await service.buildRecoveryPacket({ historyItem })

		expect(summarySpy).toHaveBeenCalledTimes(1)
		expect(firstPacket).toBe(secondPacket)
		expect(firstPacket).toEqual({
			summary: "Compact restart summary",
			handoff: expect.stringContaining("Recovery mode: standard."),
			recoveryMode: "standard",
			stopReason: "streaming_failed",
			restartAttempt: 1,
		})
	})

	it("skips cache reads and writes when useCache is disabled", async () => {
		const service = new TaskRecoveryPacketService(runtime)
		const summarySpy = vi
			.spyOn(service as any, "maybeBuildCheapRestartSummary")
			.mockResolvedValueOnce("First summary")
			.mockResolvedValueOnce("Second summary")
			.mockResolvedValueOnce("Third summary")
		const historyItem = createHistoryItem({ restartCount: 1 })

		const firstPacket = await service.buildRecoveryPacket({ historyItem, useCache: false })
		const secondPacket = await service.buildRecoveryPacket({ historyItem, useCache: false })
		const cachedPacket = await service.buildRecoveryPacket({ historyItem })

		expect(summarySpy).toHaveBeenCalledTimes(3)
		expect(firstPacket.summary).toBe("First summary")
		expect(secondPacket.summary).toBe("Second summary")
		expect(cachedPacket.summary).toBe("Third summary")
	})

	it("builds compact summaries for standard and pressure recovery modes", () => {
		const service = new TaskRecoveryPacketService(runtime)
		const historyItem = createHistoryItem({
			lastStopSummary: "Need to resume from the failing API step.",
			lastStopReason: "streaming_failed",
		})

		const standardSummary = (service as any).buildCompactRestartSummary({
			historyItem,
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "  Continue   from here  " }, { type: "image" }] },
				{ role: "assistant", content: [{ type: "text", text: " Timeout while calling model " }] },
			],
		})
		const pressureSummary = (service as any).buildCompactRestartSummary({
			historyItem: createHistoryItem({ lastStopReason: "restart_limit_exceeded" }),
			compactMode: "pressure",
			apiConversationHistory: [{ role: "user", content: [{ type: "text", text: " retry minimally " }] }],
		})

		expect(standardSummary).toContain("Need to resume from the failing API step.")
		expect(standardSummary).toContain("Recent user intent: Continue from here")
		expect(standardSummary).toContain("Recent assistant context: Timeout while calling model")
		expect(pressureSummary).toContain("Recent user intent: retry minimally")
		expect(pressureSummary).toContain("Recovery mode: compact retry after restart_limit_exceeded.")
	})

	it("falls back to the generic compact summary when no useful fragments exist", () => {
		const service = new TaskRecoveryPacketService(runtime)

		const result = (service as any).buildCompactRestartSummary({
			historyItem: createHistoryItem({ lastStopSummary: undefined, lastStopReason: undefined }),
			apiConversationHistory: [
				{ role: "user", content: "not-an-array" },
				{ role: "assistant", content: "still-not-an-array" },
			],
		})

		expect(result).toBe("The previous attempt stopped unexpectedly before completion.")
	})

	it("selects pressure recovery mode for repeated or looping failures and standard otherwise", () => {
		const service = new TaskRecoveryPacketService(runtime)

		expect((service as any).getRestartRecoveryMode(createHistoryItem())).toBe("standard")
		expect((service as any).getRestartRecoveryMode(createHistoryItem({ restartCount: 2 }))).toBe("pressure")
		expect((service as any).getRestartRecoveryMode(createHistoryItem({ lastStopReason: "loop_detected" }))).toBe(
			"pressure",
		)
		expect(
			(service as any).getRestartRecoveryMode(createHistoryItem({ lastStopReason: "restart_limit_exceeded" })),
		).toBe("pressure")
	})

	it("deduplicates recent recovery history and applies tighter limits in pressure mode", () => {
		const service = new TaskRecoveryPacketService(runtime)
		const repeatedText = "x".repeat(500)

		const standardHistory = (service as any).buildRecoveryHistorySummary(
			[
				{ role: "user", content: [{ type: "text", text: "   repeated   entry   " }] },
				{ role: "user", content: [{ type: "text", text: "repeated entry" }] },
				{ role: "assistant", content: [{ type: "text", text: repeatedText }] },
				{ role: "assistant", content: "not-an-array" },
			],
			"standard",
		)
		const pressureHistory = (service as any).buildRecoveryHistorySummary(
			[
				{ role: "assistant", content: [{ type: "text", text: repeatedText }] },
				{ role: "assistant", content: [{ type: "text", text: repeatedText }] },
			],
			"pressure",
		)

		expect(standardHistory).toContain("user: repeated entry")
		expect(standardHistory.match(/user: repeated entry/g)).toHaveLength(1)
		expect(standardHistory.match(/assistant:/g)).toHaveLength(1)
		expect(pressureHistory.length).toBeLessThanOrEqual(600)
	})

	it("returns the heuristic summary when helper routing does not provide an API provider", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "relay_compact",
			config: {},
			source: "primary",
			provider: "anthropic",
			modelId: "claude-sonnet",
		} as any)
		const service = new TaskRecoveryPacketService(runtime)
		const historyItem = createHistoryItem({ lastStopSummary: "Use fallback summary" })

		const result = await (service as any).maybeBuildCheapRestartSummary({ historyItem })

		expect(buildApiHandler).not.toHaveBeenCalled()
		expect(result).toBe("Use fallback summary")
	})

	it("uses the routed helper model to build a compact restart summary", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "relay_compact",
			config: { apiProvider: "openai", openAiModelId: "gpt-4.1-mini" },
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		} as any)
		const createMessage = vi
			.fn()
			.mockReturnValue(
				createStream(
					{ type: "text", text: "  First chunk  " },
					{ type: "other" },
					{ type: "text", text: " second chunk " },
				),
			)
		vi.mocked(buildApiHandler).mockReturnValue({
			createMessage,
		} as any)
		const service = new TaskRecoveryPacketService(runtime)

		const result = await (service as any).maybeBuildCheapRestartSummary({
			historyItem: createHistoryItem({ lastStopReason: "streaming_failed" }),
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "Continue from the failure point" }] },
				{ role: "assistant", content: [{ type: "text", text: "The request timed out" }] },
			],
			recoveryMode: "standard",
		})

		expect(buildApiHandler).toHaveBeenCalledWith({ apiProvider: "openai", openAiModelId: "gpt-4.1-mini" })
		expect(createMessage).toHaveBeenCalledWith(
			"Create a compact restart handoff summary for a failed coding task. Preserve only actionable intent, failed path, and current status. Keep it under 700 characters. Plain text only.",
			expect.any(Array),
		)
		expect(result).toBe("First chunk second chunk")
	})

	it("passes shared helper routing settings and retry context into relay compaction", async () => {
		getState.mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet" },
			condensingApiConfigId: "helper-1",
			listApiConfigMeta: [{ id: "helper-1", name: "Cheap helper", apiProvider: "openai" }],
			helperLocalityPreference: "prefer",
			orchestrationEscalationSensitivity: "balanced",
			orchestrationTelemetryEnabled: true,
		})
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "relay_compact",
			config: {},
			source: "primary",
			provider: "anthropic",
		} as any)
		const service = new TaskRecoveryPacketService(runtime)

		await (service as any).maybeBuildCheapRestartSummary({
			historyItem: createHistoryItem({ id: "task-7", restartCount: 2 }),
		})

		expect(HelperModelRouter.selectConfig).toHaveBeenCalledWith(
			expect.objectContaining({
				job: "relay_compact",
				state: expect.objectContaining({
					helperLocalityPreference: "prefer",
					orchestrationEscalationSensitivity: "balanced",
					orchestrationTelemetryEnabled: true,
				}),
				decisionContext: { taskId: "task-7", retryCount: 2 },
			}),
		)
	})

	it("logs and falls back when helper summary generation throws", async () => {
		vi.mocked(HelperModelRouter.selectConfig).mockResolvedValue({
			job: "relay_compact",
			config: { apiProvider: "openai" },
			source: "configured_helper",
			provider: "openai",
			modelId: "gpt-4.1-mini",
		} as any)
		vi.mocked(buildApiHandler).mockImplementation(() => {
			throw new Error("cheap profile failed")
		})
		const service = new TaskRecoveryPacketService(runtime)

		const result = await (service as any).maybeBuildCheapRestartSummary({
			historyItem: createHistoryItem({ lastStopReason: "streaming_failed", restartCount: 2 }),
		})

		expect(result).toBe("Recovery mode: compact retry after streaming_failed.")
		expect(log).toHaveBeenCalledWith(
			expect.stringContaining(
				"[maybeBuildCheapRestartSummary] Falling back to heuristic summary: cheap profile failed",
			),
		)
	})

	it("normalizes cache keys and renders standard and pressure handoff messages", () => {
		const service = new TaskRecoveryPacketService(runtime)

		const cacheKey = (service as any).getRecoveryPacketCacheKey({
			historyItem: createHistoryItem({
				restartCount: 1,
				lastStopReason: "streaming_failed",
				lastStopSummary: " Summary ",
			}),
			apiConversationHistory: [
				{ role: "user", content: [{ type: "text", text: "  Keep going  " }, { type: "image" }] },
				{ role: "assistant", content: "not-an-array" },
			],
			recoveryMode: "standard",
		})
		const standardHandoff = (service as any).buildRecoveryHandoffMessage(
			createHistoryItem({ lastStopSummary: "Summary", lastStopReason: "streaming_failed" }),
		)
		const pressureHandoff = (service as any).buildRecoveryHandoffMessage(
			createHistoryItem({ restartCount: 2, lastStopSummary: "Summary" }),
		)

		expect(cacheKey).toContain("task-1::1::streaming_failed:: Summary ::standard::user: Keep going")
		expect(standardHandoff).toContain("Stop reason: streaming_failed.")
		expect(standardHandoff).toContain("Recovery mode: standard.")
		expect(pressureHandoff).toContain("Recovery mode: pressure.")
		expect(pressureHandoff).toContain("Use the smallest viable context")
	})
})
