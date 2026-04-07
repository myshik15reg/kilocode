import type {
	ClineMessage,
	SubagentLaunchRequest,
	SubagentRelayEnvelope,
	SubagentResultEvent,
	SubagentStatusEvent,
} from "@roo-code/types"
import { normalizeSubagentLaunchRequest } from "@roo-code/types"

import type { AgentManagerProvider } from "../../kilocode/agent-manager/AgentManagerProvider"
import { compactCompletionSummary } from "../compactCompletionSummary"
import type { SubagentBridge } from "../subagents/types"

type Listener<T> = (event: T) => void

// kilocode_change - new file
export class AgentManagerBridge implements SubagentBridge {
	private readonly statusListeners = new Set<Listener<SubagentStatusEvent>>()
	private readonly resultListeners = new Set<Listener<SubagentResultEvent>>()

	constructor(private readonly agentManager: AgentManagerProvider) {
		this.agentManager.onBackgroundSubagentStatus((event) => {
			for (const listener of this.statusListeners) {
				listener(event)
			}
		})
		this.agentManager.onBackgroundSubagentResult((event) => {
			for (const listener of this.resultListeners) {
				listener(event)
			}
		})
	}

	public hasCapacity(request: SubagentLaunchRequest): boolean {
		return this.agentManager.hasBackgroundSubagentCapacity(normalizeSubagentLaunchRequest(request))
	}

	public async launch(
		request: SubagentLaunchRequest,
	): Promise<{ taskId: string; sessionId: string; status: "queued" | "running" }> {
		return this.agentManager.startBackgroundSubagent(normalizeSubagentLaunchRequest(request))
	}

	public async cancel(sessionId: string): Promise<void> {
		await this.agentManager.cancelSession(sessionId)
	}

	public async pause(sessionId: string): Promise<void> {
		await this.agentManager.pauseSession(sessionId)
	}

	public async resume(sessionId: string): Promise<void> {
		await this.agentManager.resumeBackgroundSubagent(sessionId)
	}

	public async release(sessionId: string): Promise<void> {
		await this.agentManager.releaseBackgroundSubagentBinding(sessionId)
	}

	public listBindings(): Array<{
		request: SubagentLaunchRequest
		parentTaskId: string
		childTaskId: string
		sessionId: string
		status:
			| "queued"
			| "starting"
			| "running"
			| "waiting_input"
			| "waiting_approval"
			| "paused"
			| "completed"
			| "failed"
			| "cancelled"
			| "abstained"
		updatedAt: number
	}> {
		return this.agentManager.listBackgroundSubagentBindings().map((binding) => ({
			request: binding.request,
			parentTaskId: binding.request.parentTaskId,
			childTaskId: binding.taskId,
			sessionId: binding.sessionId,
			status: binding.status,
			updatedAt: binding.updatedAt,
		}))
	}

	public onStatus(listener: Listener<SubagentStatusEvent>): () => void {
		this.statusListeners.add(listener)
		return () => this.statusListeners.delete(listener)
	}

	public onResult(listener: Listener<SubagentResultEvent>): () => void {
		this.resultListeners.add(listener)
		return () => this.resultListeners.delete(listener)
	}

	// kilocode_change start
	public async relay(params: { envelope: SubagentRelayEnvelope; recipientTaskIds: string[] }): Promise<void> {
		if (params.recipientTaskIds.length === 0) {
			return
		}

		const content = AgentManagerBridge.formatRelayEnvelope(params.envelope)
		await Promise.all(params.recipientTaskIds.map((taskId) => this.agentManager.sendMessage(taskId, content)))
	}

	private static formatRelayEnvelope(envelope: SubagentRelayEnvelope): string {
		const metadata = Object.entries(envelope.metadata ?? {})
			.map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
			.join("\n")
		const target =
			envelope.kind === "parent" || envelope.kind === "task"
				? `to_task_id: ${envelope.toTaskId}`
				: envelope.kind === "group"
					? `group_id: ${envelope.groupId}`
					: `root_task_id: ${envelope.rootTaskId}`
		const visibility = `requires_parent_visibility: ${envelope.requiresParentVisibility ? "yes" : "no"}`
		const body = [
			envelope.content.trim(),
			"",
			"<task_relay>",
			`kind: ${envelope.kind}`,
			`from_task_id: ${envelope.fromTaskId}`,
			`root_task_id: ${envelope.rootTaskId}`,
			target,
			visibility,
			`timestamp: ${envelope.timestamp}`,
			metadata,
			"</task_relay>",
		]
		return body.filter(Boolean).join("\n")
	}
	// kilocode_change end

	public static summarizeCompletion(messages: ClineMessage[] | undefined): string {
		const completion = messages
			?.slice()
			.reverse()
			.find(
				(message) =>
					message.type === "say" && message.say === "completion_result" && typeof message.text === "string",
			)

		if (completion?.text?.trim()) {
			return compactCompletionSummary(completion.text)
		}

		const fallback = messages
			?.slice()
			.reverse()
			.find((message) => typeof message.text === "string" && message.text.trim().length > 0)

		return fallback?.text?.trim() ? compactCompletionSummary(fallback.text) : "Background subagent completed."
	}
}
