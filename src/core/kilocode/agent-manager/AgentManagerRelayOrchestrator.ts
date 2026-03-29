// kilocode_change start
import type { HistoryItem } from "@roo-code/types"
import type { TaskRecoveryPacket } from "../../webview/ClineProvider"
import type { AgentSession, RootTaskMessage, SchedulerState, SessionGroupMessage } from "./types"

export interface RelayPolicyDecision {
	preferCompact: boolean
	queueKey: string
	pressure: number
	backpressure: boolean
}

interface RelayHistoryItem {
	lastStopReason?: string
	lastStopSummary?: string
	restartCount?: number
}

interface AgentManagerRelayOrchestratorDeps {
	getQueueKey: (options?: { sessionGroup?: AgentSession["sessionGroup"]; sessionId?: string }) => string
	getQueuePressure: (queueKey: string) => number
	getSchedulerState: () => Pick<SchedulerState, "backpressure">
	getSessionHistoryItem: (sessionId: string) => HistoryItem | undefined
	getResumeSessionApiConversationHistory: (sessionId: string) => unknown[] | undefined
	buildProviderRecoveryPacket?: (params: {
		historyItem: HistoryItem
		apiConversationHistory: unknown[] | undefined
	}) => Promise<TaskRecoveryPacket | undefined>
	getNow?: () => number
}

const MAX_RELAY_SUMMARY_CHARS = 280
const MAX_RELAY_LINE_LENGTH = 140

export class AgentManagerRelayOrchestrator {
	private readonly relayContentCache: Map<string, string> = new Map()

	constructor(private readonly deps: AgentManagerRelayOrchestratorDeps) {}

	public resolveRelayPolicy(
		session: AgentSession,
		options?: { compact?: boolean; mode?: "auto" | "manual" },
	): RelayPolicyDecision {
		const queueKey = this.deps.getQueueKey({ sessionGroup: session.sessionGroup, sessionId: session.sessionId })
		const pressure = this.deps.getQueuePressure(queueKey)
		const scheduler = this.deps.getSchedulerState()
		const preferCompact =
			options?.compact === true ||
			((options?.mode ?? "manual") === "auto" && (pressure >= 2 || scheduler.backpressure))
		return {
			preferCompact,
			queueKey,
			pressure,
			backpressure: scheduler.backpressure,
		}
	}

	public trimRelayContent(content: string): { content: string; trimmed: boolean } {
		const normalized = content.replace(/\s+/g, " ").trim()
		const lineTrimmed =
			normalized.length > MAX_RELAY_LINE_LENGTH
				? `${normalized.slice(0, MAX_RELAY_LINE_LENGTH - 1)}?`
				: normalized
		const totalTrimmed =
			lineTrimmed.length > MAX_RELAY_SUMMARY_CHARS
				? `${lineTrimmed.slice(0, MAX_RELAY_SUMMARY_CHARS - 1)}?`
				: lineTrimmed
		return { content: totalTrimmed, trimmed: totalTrimmed !== normalized }
	}

	public async buildRestartInstruction(
		session: AgentSession,
		options?: { compact?: boolean },
	): Promise<{ prompt: string; preferCompact: boolean; queueKey: string }> {
		const historyItem = this.deps.getSessionHistoryItem(session.sessionId)
		const relayPolicy = this.resolveRelayPolicy(session, { compact: options?.compact, mode: "manual" })
		const recoveryPacket = await this.buildSessionRecoveryPacket({
			sessionId: session.sessionId,
			historyItem,
			sessionLabel: session.label,
			compact: relayPolicy.preferCompact,
		})
		const restartCacheKey = this.getRelayContentCacheKey({
			sessionId: session.sessionId,
			compact: relayPolicy.preferCompact,
			channel: "restart",
			historyItem,
		})
		const prompt =
			this.getCachedRelayContent(restartCacheKey) ??
			this.buildRestartPrompt({
				preferCompact: relayPolicy.preferCompact,
				historyItem,
				recoveryPacket,
			})

		this.cacheRelayContent(restartCacheKey, prompt)

		return {
			prompt,
			preferCompact: relayPolicy.preferCompact,
			queueKey: relayPolicy.queueKey,
		}
	}

	public async composeGroupRelayMessage(
		session: AgentSession,
		params: { content: string | undefined; includeSender: boolean },
	): Promise<{ message?: SessionGroupMessage; formattedMessage?: string; preferCompact: boolean }> {
		const preferCompact = this.resolveRelayPolicy(session, { mode: "auto" }).preferCompact
		const resolvedContent = await this.buildChannelRelayContent(session, "group", {
			compact: preferCompact,
			fallbackContent: params.content,
		})
		if (!resolvedContent) {
			return { preferCompact }
		}

		const timestamp = this.getNow()
		const message: SessionGroupMessage = {
			messageId: `${session.sessionId}:${timestamp}`,
			groupId: session.sessionGroup?.groupId ?? session.sessionId,
			sourceSessionId: session.sessionId,
			sourceLabel: session.label,
			content: resolvedContent,
			includeSender: params.includeSender,
			timestamp,
		}

		return {
			message,
			formattedMessage: this.formatRelayMessage({
				content: message.content,
				tag: "group_handoff",
				messageId: message.messageId,
				sourceSessionId: message.sourceSessionId,
				sourceLabel: message.sourceLabel,
				timestamp: message.timestamp,
				metadata: {
					group_id: message.groupId,
					compact: preferCompact ? "yes" : "no",
				},
			}),
			preferCompact,
		}
	}

	public async composeRootRelayMessage(
		session: AgentSession,
		params: { content: string | undefined; includeSender: boolean; compact?: boolean },
	): Promise<{ message?: RootTaskMessage; formattedMessage?: string; preferCompact: boolean }> {
		const preferCompact = this.resolveRelayPolicy(session, { compact: params.compact, mode: "auto" }).preferCompact
		const resolvedContent = await this.buildChannelRelayContent(session, "root", {
			compact: preferCompact,
			fallbackContent: params.content,
		})
		if (!resolvedContent) {
			return { preferCompact }
		}

		const rootTaskId = session.rootTaskId ?? session.taskId
		if (!rootTaskId) {
			return { preferCompact }
		}

		const timestamp = this.getNow()
		const message: RootTaskMessage = {
			messageId: `${session.sessionId}:root:${timestamp}`,
			rootTaskId,
			sourceSessionId: session.sessionId,
			sourceLabel: session.label,
			content: resolvedContent,
			includeSender: params.includeSender,
			timestamp,
		}

		return {
			message,
			formattedMessage: this.formatRelayMessage({
				content: message.content,
				tag: "root_handoff",
				messageId: message.messageId,
				sourceSessionId: message.sourceSessionId,
				sourceLabel: message.sourceLabel,
				timestamp: message.timestamp,
				metadata: {
					root_task_id: message.rootTaskId,
				},
			}),
			preferCompact,
		}
	}

	private getNow(): number {
		return this.deps.getNow?.() ?? Date.now()
	}

	private getRelayContentCacheKey(params: {
		sessionId: string
		compact: boolean
		channel: "root" | "group" | "restart"
		historyItem?: RelayHistoryItem
	}): string | undefined {
		const historyItem = params.historyItem
		if (!historyItem?.lastStopReason && !historyItem?.lastStopSummary) {
			return undefined
		}
		return [
			params.channel,
			params.sessionId,
			params.compact ? "compact" : "full",
			historyItem.restartCount ?? 0,
			historyItem.lastStopReason ?? "",
			historyItem.lastStopSummary ?? "",
		].join("::")
	}

	private getCachedRelayContent(cacheKey: string | undefined): string | undefined {
		return cacheKey ? this.relayContentCache.get(cacheKey) : undefined
	}

	private cacheRelayContent(cacheKey: string | undefined, content: string | undefined): string | undefined {
		if (cacheKey && content) {
			this.relayContentCache.set(cacheKey, content)
		}
		return content
	}

	private buildRestartPrompt(params: {
		preferCompact: boolean
		historyItem?: RelayHistoryItem
		recoveryPacket?: TaskRecoveryPacket
	}): string {
		if (params.recoveryPacket?.handoff) {
			return params.recoveryPacket.handoff
		}
		return (
			params.preferCompact
				? [
						"Restart branch from latest valid state in compact recovery mode.",
						params.historyItem?.lastStopReason
							? `Previous stop reason: ${params.historyItem.lastStopReason}.`
							: undefined,
						params.historyItem?.lastStopSummary
							? `Previous summary: ${params.historyItem.lastStopSummary}`
							: undefined,
						"Use a short handoff, avoid replaying the whole branch, and continue with the minimal required context.",
					]
				: [
						"Restart branch from latest valid state.",
						params.historyItem?.lastStopReason
							? `Previous stop reason: ${params.historyItem.lastStopReason}.`
							: undefined,
						params.historyItem?.lastStopSummary
							? `Previous summary: ${params.historyItem.lastStopSummary}`
							: undefined,
						"Do not repeat the same failing loop.",
					]
		)
			.filter(Boolean)
			.join(" ")
	}

	private formatRelayMessage(params: {
		content: string
		tag: "group_handoff" | "root_handoff"
		messageId: string
		sourceSessionId: string
		sourceLabel?: string
		timestamp: number
		metadata: Record<string, string>
	}): string {
		const relay = this.trimRelayContent(params.content)
		return this.buildRelayEnvelope({
			body: relay.content,
			tag: params.tag,
			metadata: {
				message_id: params.messageId,
				source_session_id: params.sourceSessionId,
				source_label: params.sourceLabel ?? "unknown",
				timestamp: String(params.timestamp),
				trimmed: relay.trimmed ? "yes" : "no",
				...params.metadata,
			},
		})
	}

	private buildRelayEnvelope(params: {
		body: string
		tag: "group_handoff" | "root_handoff"
		metadata: Record<string, string>
	}): string {
		const metadataLines = Object.entries(params.metadata)
			.map(([key, value]) => `${key}: ${value}`)
			.join("\r\n")
		return `${params.body}\r\n\r\n<${params.tag}>\r\n${metadataLines}\r\n</${params.tag}>`
	}

	private shouldUseRecoveryRelayContent(content: string | undefined): boolean {
		const normalized = content?.trim()
		if (!normalized) {
			return true
		}
		return normalized.startsWith("Branch handoff from ")
	}

	private async buildChannelRelayContent(
		session: AgentSession,
		channel: "group" | "root",
		options?: { compact?: boolean; fallbackContent?: string },
	): Promise<string | undefined> {
		if (!this.shouldUseRecoveryRelayContent(options?.fallbackContent)) {
			return options?.fallbackContent
		}

		const historyItem = this.deps.getSessionHistoryItem(session.sessionId)
		const cacheKey = this.getRelayContentCacheKey({
			sessionId: session.sessionId,
			compact: options?.compact === true,
			channel,
			historyItem,
		})
		const cachedContent = this.getCachedRelayContent(cacheKey)
		if (cachedContent) {
			return cachedContent
		}
		const recoveryPacket = await this.buildSessionRecoveryPacket({
			sessionId: session.sessionId,
			historyItem,
			sessionLabel: session.label,
			compact: options?.compact,
		})
		if (recoveryPacket) {
			return this.cacheRelayContent(
				cacheKey,
				`Branch handoff from ${session.label}: ${options?.compact ? recoveryPacket.summary : recoveryPacket.handoff}`,
			)
		}
		return options?.fallbackContent
	}

	private async buildSessionRecoveryPacket(params: {
		sessionId: string
		historyItem?: RelayHistoryItem
		sessionLabel: string
		compact?: boolean
	}): Promise<TaskRecoveryPacket | undefined> {
		const historyItem = params.historyItem
		if (!historyItem?.lastStopReason && !historyItem?.lastStopSummary) {
			return undefined
		}

		const providerBuildRecoveryPacket = this.deps.buildProviderRecoveryPacket
		if (!providerBuildRecoveryPacket) {
			return undefined
		}
		const packet = await providerBuildRecoveryPacket({
			historyItem: {
				id: params.sessionId,
				number: 0,
				ts: this.getNow(),
				task: params.sessionLabel,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "aborted",
				restartCount: historyItem.restartCount ?? 0,
				lastStopReason: historyItem.lastStopReason,
				lastStopSummary: historyItem.lastStopSummary,
			} as HistoryItem,
			apiConversationHistory: this.deps.getResumeSessionApiConversationHistory(params.sessionId),
		})
		if (!packet || !params.compact || packet.recoveryMode === "pressure") {
			return packet
		}

		return {
			...packet,
			summary: packet.summary.length > 280 ? `${packet.summary.slice(0, 279)}?` : packet.summary,
			handoff: [
				"Restart branch from latest valid state in compact recovery mode.",
				packet.stopReason ? `Previous stop reason: ${packet.stopReason}.` : undefined,
				`Previous summary: ${packet.summary.length > 220 ? `${packet.summary.slice(0, 219)}?` : packet.summary}`,
				"Use a short handoff, avoid replaying the whole branch, and continue with the minimal required context.",
			]
				.filter(Boolean)
				.join(" "),
		}
	}
}
// kilocode_change end
