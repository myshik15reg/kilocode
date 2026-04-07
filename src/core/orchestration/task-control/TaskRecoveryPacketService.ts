import type { HistoryItem, ProviderSettings, ProviderSettingsEntry } from "@roo-code/types"

import { buildApiHandler } from "../../../api"
import type { ProviderSettingsManager } from "../../config/ProviderSettingsManager"
import { HelperRoutingContextBuilder } from "../../helper-routing/HelperRoutingContextBuilder"
import { HelperModelRouter } from "../../helper-routing/HelperModelRouter"
import type { ApiMessage } from "../../task-persistence/apiMessages"
import { ConversationWindowBuilder } from "../context/ConversationWindowBuilder"

// kilocode_change - new file

export interface TaskRecoveryPacket {
	summary: string
	handoff: string
	recoveryMode: "standard" | "pressure"
	stopReason?: string
	restartAttempt: number
}

export interface TaskRecoveryPacketRuntime {
	getState(): Promise<{
		apiConfiguration?: ProviderSettings
		condensingApiConfigId?: string
		listApiConfigMeta?: ProviderSettingsEntry[]
		helperLocalityPreference?: "off" | "prefer" | "require"
		orchestrationEscalationSensitivity?: "conservative" | "balanced" | "aggressive"
		orchestrationTelemetryEnabled?: boolean
	}>
	providerSettingsManager: ProviderSettingsManager
	log(message: string): void
}

export class TaskRecoveryPacketService {
	private readonly recoveryPacketCache = new Map<string, TaskRecoveryPacket>()
	private readonly conversationWindowBuilder = new ConversationWindowBuilder()

	constructor(private readonly runtime: TaskRecoveryPacketRuntime) {}

	public async buildRecoveryPacket(params: {
		historyItem: HistoryItem
		apiConversationHistory?: ApiMessage[]
		useCache?: boolean
	}): Promise<TaskRecoveryPacket> {
		const recoveryMode = this.getRestartRecoveryMode(params.historyItem)
		const cacheKey = this.getRecoveryPacketCacheKey({
			historyItem: params.historyItem,
			apiConversationHistory: params.apiConversationHistory,
			recoveryMode,
		})

		if (params.useCache !== false) {
			const cachedPacket = this.recoveryPacketCache.get(cacheKey)
			if (cachedPacket) {
				return cachedPacket
			}
		}

		const summary = await this.maybeBuildCheapRestartSummary({
			historyItem: params.historyItem,
			apiConversationHistory: params.apiConversationHistory,
			recoveryMode,
		})
		const handoff = this.buildRecoveryHandoffMessage({
			...params.historyItem,
			lastStopSummary: summary,
		})
		const packet: TaskRecoveryPacket = {
			summary,
			handoff,
			recoveryMode,
			stopReason: params.historyItem.lastStopReason,
			restartAttempt: (params.historyItem.restartCount ?? 0) + 1,
		}

		if (params.useCache !== false) {
			this.recoveryPacketCache.set(cacheKey, packet)
		}

		return packet
	}

	private buildCompactRestartSummary(params: {
		historyItem: HistoryItem
		apiConversationHistory?: ApiMessage[]
		compactMode?: "standard" | "pressure"
	}): string {
		const { historyItem, apiConversationHistory = [], compactMode = "standard" } = params
		const window = this.conversationWindowBuilder.build({
			summary: historyItem.lastStopSummary,
			history: apiConversationHistory,
			maxMessages: compactMode === "pressure" ? 2 : 4,
			maxCharsPerMessage: compactMode === "pressure" ? 220 : 320,
			maxTotalChars: compactMode === "pressure" ? 440 : 900,
		})

		const lastUserMessages = window.history
			.filter((message) => message.role === "user")
			.map((message) => message.text)
		const lastAssistantMessages = window.history
			.filter((message) => message.role === "assistant")
			.map((message) => message.text)

		const fragments = [
			window.summary,
			lastUserMessages.length > 0 ? `Recent user intent: ${lastUserMessages.join(" | ")}` : undefined,
			lastAssistantMessages.length > 0
				? `Recent assistant context: ${lastAssistantMessages.join(" | ")}`
				: undefined,
			compactMode === "pressure"
				? `Recovery mode: compact retry after ${historyItem.lastStopReason ?? "unknown"}.`
				: undefined,
		]
			.filter(Boolean)
			.join("\n")

		const summaryLimit = compactMode === "pressure" ? 700 : 1200
		return fragments.slice(0, summaryLimit) || "The previous attempt stopped unexpectedly before completion."
	}

	private getRestartRecoveryMode(historyItem: HistoryItem): "standard" | "pressure" {
		const restartCount = historyItem.restartCount ?? 0
		if (restartCount >= 2) {
			return "pressure"
		}

		if (historyItem.lastStopReason === "loop_detected" || historyItem.lastStopReason === "restart_limit_exceeded") {
			return "pressure"
		}

		return "standard"
	}

	private buildRecoveryHistorySummary(
		apiConversationHistory: ApiMessage[] | undefined,
		recoveryMode: "standard" | "pressure",
	): string {
		const window = this.conversationWindowBuilder.build({
			history: apiConversationHistory,
			maxMessages: recoveryMode === "pressure" ? 4 : 6,
			maxCharsPerMessage: recoveryMode === "pressure" ? 220 : 360,
			maxTotalChars: recoveryMode === "pressure" ? 600 : 900,
		})

		return this.conversationWindowBuilder.renderHistoryEntries(window).join(" | ")
	}

	private async maybeBuildCheapRestartSummary(params: {
		historyItem: HistoryItem
		apiConversationHistory?: ApiMessage[]
		recoveryMode?: "standard" | "pressure"
	}): Promise<string> {
		const recoveryMode = params.recoveryMode ?? this.getRestartRecoveryMode(params.historyItem)
		const fallbackSummary = this.buildCompactRestartSummary({
			historyItem: params.historyItem,
			apiConversationHistory: params.apiConversationHistory,
			compactMode: recoveryMode,
		})

		try {
			const state = await this.runtime.getState()
			const route = await HelperModelRouter.selectConfig(
				HelperRoutingContextBuilder.build({
					job: "relay_compact",
					state: {
						apiConfiguration: state.apiConfiguration as ProviderSettings,
						condensingApiConfigId: state.condensingApiConfigId,
						listApiConfigMeta: state.listApiConfigMeta,
						helperLocalityPreference: state.helperLocalityPreference,
						orchestrationEscalationSensitivity: state.orchestrationEscalationSensitivity,
						orchestrationTelemetryEnabled: state.orchestrationTelemetryEnabled,
					},
					providerSettingsManager: this.runtime.providerSettingsManager,
					decisionContext: {
						taskId: params.historyItem.id,
						retryCount: params.historyItem.restartCount ?? 0,
					},
				}),
			)

			if (!route.config?.apiProvider) {
				return fallbackSummary
			}

			const handler = buildApiHandler(route.config as ProviderSettings)
			const recentHistory = this.buildRecoveryHistorySummary(params.apiConversationHistory, recoveryMode)

			const requestMessages = [
				{ role: "user", content: [{ type: "text", text: `Task: ${params.historyItem.task}` }] },
				{
					role: "user",
					content: [{ type: "text", text: `Stop reason: ${params.historyItem.lastStopReason ?? "unknown"}` }],
				},
				{
					role: "user",
					content: [{ type: "text", text: `Restart count: ${params.historyItem.restartCount ?? 0}` }],
				},
				{ role: "user", content: [{ type: "text", text: `Recovery mode: ${recoveryMode}` }] },
				{ role: "user", content: [{ type: "text", text: `Existing summary: ${fallbackSummary}` }] },
				{ role: "user", content: [{ type: "text", text: `Recent history: ${recentHistory}` }] },
			] satisfies ApiMessage[]

			const stream = handler.createMessage(
				recoveryMode === "pressure"
					? "Create an ultra-compact restart handoff summary for a repeatedly failing coding task. Keep only current goal, failing path, and safest next step. Keep it under 400 characters. Plain text only."
					: "Create a compact restart handoff summary for a failed coding task. Preserve only actionable intent, failed path, and current status. Keep it under 700 characters. Plain text only.",
				requestMessages,
			)

			let result = ""
			for await (const chunk of stream) {
				if (chunk.type === "text") {
					result += chunk.text
				}
			}

			const maxLength = recoveryMode === "pressure" ? 400 : 700
			const compact = result.replace(/\s+/g, " ").trim().slice(0, maxLength)
			return compact || fallbackSummary
		} catch (error) {
			this.runtime.log(
				`[maybeBuildCheapRestartSummary] Falling back to heuristic summary: ${error instanceof Error ? error.message : String(error)}`,
			)
			return fallbackSummary
		}
	}

	private getRecoveryPacketCacheKey(params: {
		historyItem: HistoryItem
		apiConversationHistory?: ApiMessage[]
		recoveryMode: "standard" | "pressure"
	}): string {
		const recentHistorySignature = this.buildRecoveryHistorySummary(
			params.apiConversationHistory,
			params.recoveryMode,
		).slice(0, 400)

		return [
			params.historyItem.id,
			params.historyItem.restartCount ?? 0,
			params.historyItem.lastStopReason ?? "unknown",
			params.historyItem.lastStopSummary ?? "",
			params.recoveryMode,
			recentHistorySignature,
		].join("::")
	}

	private buildRecoveryHandoffMessage(historyItem: HistoryItem): string {
		const summary = historyItem.lastStopSummary ?? "The previous attempt stopped unexpectedly."
		const reason = historyItem.lastStopReason ? `Stop reason: ${historyItem.lastStopReason}.` : ""
		const restartCount = historyItem.restartCount ?? 0
		const recoveryMode = this.getRestartRecoveryMode(historyItem)
		const recoveryHint =
			recoveryMode === "pressure"
				? "Use the smallest viable context, do not revisit the failed loop, and produce short progress updates."
				: "Continue from the latest valid state, avoid repeating the failing loop, and summarize progress more compactly if needed."
		return `${historyItem.task}\n\n<restart_handoff>\n${reason}\nPrevious summary: ${summary}\nRestart attempt: ${restartCount + 1}.\nRecovery mode: ${recoveryMode}.\n${recoveryHint}\n</restart_handoff>`
	}
}
