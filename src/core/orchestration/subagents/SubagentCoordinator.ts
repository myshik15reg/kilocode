import type {
	ActivityItem,
	SubagentLaunchRequest,
	SubagentRelayEnvelope,
	SubagentResultEvent,
	SubagentStatusEvent,
} from "@roo-code/types"

import type { ClineProvider } from "../../webview/ClineProvider"
import { publishOrchestrationActivity } from "../events/publish"
import type {
	ActiveSubagentBinding,
	SubagentBridge,
	SubagentControlOutcome,
	SubagentLaunchOutcome,
	TaskRelayInput,
	TaskRelayOutcome,
	TaskRelayRegistration,
} from "./types"

// kilocode_change - new file
export class SubagentCoordinator {
	private readonly bindingsByTaskId = new Map<string, ActiveSubagentBinding>()
	private readonly bindingsBySessionId = new Map<string, ActiveSubagentBinding>()
	private readonly relayRegistrationsByTaskId = new Map<string, TaskRelayRegistration>()
	private readonly disposers: Array<() => void> = []
	private readonly completedSessionIds = new Set<string>()

	constructor(
		private readonly provider: ClineProvider,
		private readonly bridge: SubagentBridge,
	) {
		this.restoreBindingsFromBridge()
		this.disposers.push(this.bridge.onStatus((event) => void this.handleStatusEvent(event)))
		this.disposers.push(this.bridge.onResult((event) => void this.handleResultEvent(event)))
	}

	public dispose(): void {
		for (const dispose of this.disposers.splice(0)) {
			dispose()
		}
		this.bindingsByTaskId.clear()
		this.bindingsBySessionId.clear()
		this.relayRegistrationsByTaskId.clear()
	}

	public getBindingForTask(taskId: string): ActiveSubagentBinding | undefined {
		return this.bindingsByTaskId.get(taskId)
	}

	// kilocode_change start
	public registerTaskRelay(registration: TaskRelayRegistration): void {
		this.relayRegistrationsByTaskId.set(registration.taskId, registration)
	}

	public unregisterTaskRelay(taskId: string): void {
		this.relayRegistrationsByTaskId.delete(taskId)
	}

	public getTaskRelayRegistration(taskId: string): TaskRelayRegistration | undefined {
		return this.relayRegistrationsByTaskId.get(taskId)
	}

	public async relay(envelopeInput: TaskRelayInput): Promise<TaskRelayOutcome> {
		const source = this.relayRegistrationsByTaskId.get(envelopeInput.fromTaskId)
		const envelope = {
			...envelopeInput,
			timestamp: Date.now(),
			requiresParentVisibility: envelopeInput.kind === "parent",
		} as SubagentRelayEnvelope

		if (!source || source.rootTaskId !== envelope.rootTaskId) {
			return this.blockRelay(envelope, [], "source_root_mismatch")
		}

		const recipients = this.resolveRelayRecipients(source, envelope)
		if (recipients.status === "blocked") {
			return recipients
		}

		if (this.bridge.relay) {
			await this.bridge.relay({ envelope, recipientTaskIds: recipients.recipientTaskIds })
		}

		this.appendRelayActivity(
			recipients.recipientTaskIds[0] ?? source.taskId,
			envelope,
			"delivered",
			this.buildRelaySummary(envelope, recipients.recipientTaskIds),
		)
		return recipients
	}
	// kilocode_change end

	public hasCapacity(request: SubagentLaunchRequest): boolean {
		return this.bridge.hasCapacity(request)
	}

	public async launch(request: SubagentLaunchRequest): Promise<SubagentLaunchOutcome> {
		if (!this.hasCapacity(request)) {
			return {
				mode: "foreground",
				childTaskId: request.targetTaskId || request.parentTaskId,
				status: "running",
				fallbackReason: "capacity_exhausted",
			}
		}

		const launched = await this.bridge.launch(request)
		const timestamp = Date.now()
		const binding: ActiveSubagentBinding = {
			request,
			parentTaskId: request.parentTaskId,
			childTaskId: launched.taskId,
			sessionId: launched.sessionId,
			fallbackToForeground: false,
			status: launched.status,
			createdAt: timestamp,
			updatedAt: timestamp,
		}

		this.bindingsByTaskId.set(binding.childTaskId, binding)
		this.bindingsBySessionId.set(binding.sessionId, binding)
		this.completedSessionIds.delete(binding.sessionId)
		this.registerTaskRelay({
			taskId: binding.childTaskId,
			rootTaskId: request.rootTaskId,
			parentTaskId: request.parentTaskId,
			groupId: request.rootTaskId,
			relayPolicy: request.relayPolicy,
			sessionId: binding.sessionId,
		})
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			this.toActivityStatus(binding.status),
			binding.status === "queued" ? "Background subagent queued" : "Background subagent started",
		)

		return {
			mode: "background",
			childTaskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status === "running" ? "running" : "queued",
		}
	}

	public async cancel(taskId: string): Promise<SubagentControlOutcome | undefined> {
		const binding = this.bindingsByTaskId.get(taskId)
		if (!binding) {
			return undefined
		}

		await this.bridge.cancel(binding.sessionId)
		this.completedSessionIds.add(binding.sessionId)
		binding.status = "cancelled"
		binding.updatedAt = Date.now()
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			"cancelled",
			"Background subagent cancelled",
		)
		this.bindingsByTaskId.delete(binding.childTaskId)
		this.bindingsBySessionId.delete(binding.sessionId)
		this.unregisterTaskRelay(binding.childTaskId)

		return {
			taskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status,
		}
	}

	public async pause(taskId: string): Promise<SubagentControlOutcome | undefined> {
		const binding = this.bindingsByTaskId.get(taskId)
		if (!binding) {
			return undefined
		}

		if (this.bridge.pause) {
			await this.bridge.pause(binding.sessionId)
		}

		binding.status = "paused"
		binding.updatedAt = Date.now()
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			"paused",
			"Background subagent paused",
		)

		return {
			taskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status,
		}
	}

	public async resume(taskId: string): Promise<SubagentControlOutcome | undefined> {
		const binding = this.bindingsByTaskId.get(taskId)
		if (!binding) {
			return undefined
		}

		if (this.bridge.resume) {
			await this.bridge.resume(binding.sessionId)
		}

		binding.status = "running"
		binding.updatedAt = Date.now()
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			"running",
			"Background subagent resumed",
		)

		return {
			taskId: binding.childTaskId,
			sessionId: binding.sessionId,
			status: binding.status,
		}
	}

	private restoreBindingsFromBridge(): void {
		if (!this.bridge.listBindings) {
			return
		}

		for (const restored of this.bridge.listBindings()) {
			if (restored.status === "completed" || restored.status === "failed" || restored.status === "cancelled") {
				this.completedSessionIds.add(restored.sessionId)
				continue
			}

			const binding: ActiveSubagentBinding = {
				request: restored.request,
				parentTaskId: restored.parentTaskId,
				childTaskId: restored.childTaskId,
				sessionId: restored.sessionId,
				fallbackToForeground: false,
				status: restored.status,
				createdAt: restored.updatedAt,
				updatedAt: restored.updatedAt,
			}

			this.bindingsByTaskId.set(binding.childTaskId, binding)
			this.bindingsBySessionId.set(binding.sessionId, binding)
			this.registerTaskRelay({
				taskId: binding.childTaskId,
				rootTaskId: restored.request.rootTaskId,
				parentTaskId: restored.request.parentTaskId,
				groupId: restored.request.rootTaskId,
				relayPolicy: restored.request.relayPolicy,
				sessionId: binding.sessionId,
			})
		}
	}

	private async handleStatusEvent(event: SubagentStatusEvent): Promise<void> {
		if (this.completedSessionIds.has(event.sessionId)) {
			return
		}

		const binding = this.bindingsBySessionId.get(event.sessionId)
		if (!binding) {
			return
		}

		if (event.state === "completed") {
			return
		}

		if (event.state === "failed" || event.state === "cancelled") {
			this.completedSessionIds.add(event.sessionId)
			binding.status = event.state
			binding.updatedAt = event.timestamp
			this.appendSubagentActivity(
				binding.parentTaskId,
				binding.childTaskId,
				binding.sessionId,
				this.toActivityStatus(event.state),
				event.message || `Background subagent ${event.state}`,
			)
			this.bindingsByTaskId.delete(binding.childTaskId)
			this.bindingsBySessionId.delete(binding.sessionId)
			this.unregisterTaskRelay(binding.childTaskId)
			return
		}

		binding.status = event.state
		binding.updatedAt = event.timestamp
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			this.toActivityStatus(event.state),
			event.message || `Background subagent ${event.state}`,
		)
	}

	private async handleResultEvent(event: SubagentResultEvent): Promise<void> {
		if (this.completedSessionIds.has(event.sessionId)) {
			return
		}

		const binding = this.bindingsBySessionId.get(event.sessionId)
		if (!binding) {
			return
		}

		this.completedSessionIds.add(event.sessionId)

		binding.status = event.status
		binding.updatedAt = event.timestamp
		this.appendSubagentActivity(
			binding.parentTaskId,
			binding.childTaskId,
			binding.sessionId,
			this.toActivityStatus(event.status),
			event.summary || event.output,
		)

		if (event.status === "completed") {
			await this.provider.reopenParentFromDelegation({
				parentTaskId: binding.parentTaskId,
				childTaskId: binding.childTaskId,
				completionResultSummary: event.summary || event.output,
				preserveParentFocus: true,
			})
		}

		this.bindingsByTaskId.delete(binding.childTaskId)
		this.bindingsBySessionId.delete(binding.sessionId)
		this.unregisterTaskRelay(binding.childTaskId)
	}

	private appendSubagentActivity(
		parentTaskId: string,
		childTaskId: string,
		sessionId: string,
		status: "queued" | "running" | "paused" | "completed" | "failed" | "cancelled",
		summary: string,
	): void {
		const timestamp = Date.now()
		void this.publishActivity(parentTaskId, {
			kind: "subagent",
			id: `subagent-${childTaskId}-${timestamp}`,
			taskId: childTaskId,
			sessionId,
			status,
			summary,
			timestamp,
		})
	}

	private async publishActivity(taskId: string, activity: ActivityItem): Promise<void> {
		if (typeof (this.provider as any).recordTaskActivity === "function") {
			await (this.provider as any).recordTaskActivity(taskId, activity)
			return
		}

		await publishOrchestrationActivity({
			taskId,
			activity,
		})
	}

	// kilocode_change start
	private resolveRelayRecipients(source: TaskRelayRegistration, envelope: SubagentRelayEnvelope): TaskRelayOutcome {
		switch (envelope.kind) {
			case "parent": {
				const target = this.relayRegistrationsByTaskId.get(envelope.toTaskId)
				if (!target || target.rootTaskId !== source.rootTaskId) {
					return this.blockRelay(envelope, [], "cross_root_forbidden")
				}
				if (source.parentTaskId !== envelope.toTaskId || source.relayPolicy === "none") {
					return this.blockRelay(envelope, [], "parent_only_forbidden")
				}
				return this.deliverRelay(envelope, [envelope.toTaskId])
			}
			case "task": {
				const target = this.relayRegistrationsByTaskId.get(envelope.toTaskId)
				if (!target || target.rootTaskId !== source.rootTaskId) {
					return this.blockRelay(envelope, [], "cross_root_forbidden")
				}
				if (source.relayPolicy !== "group") {
					return this.blockRelay(envelope, [], "policy_forbidden")
				}
				return this.deliverRelay(envelope, [envelope.toTaskId])
			}
			case "group": {
				if (source.relayPolicy !== "group") {
					return this.blockRelay(envelope, [], "policy_forbidden")
				}
				const recipients = Array.from(this.relayRegistrationsByTaskId.values())
					.filter(
						(registration) =>
							registration.taskId !== envelope.fromTaskId &&
							registration.rootTaskId === source.rootTaskId &&
							registration.groupId === envelope.groupId,
					)
					.map((registration) => registration.taskId)
				return this.deliverRelay(envelope, recipients)
			}
			case "root": {
				if (source.relayPolicy !== "group") {
					return this.blockRelay(envelope, [], "policy_forbidden")
				}
				const recipients = Array.from(this.relayRegistrationsByTaskId.values())
					.filter(
						(registration) =>
							registration.taskId !== envelope.fromTaskId &&
							registration.rootTaskId === source.rootTaskId,
					)
					.map((registration) => registration.taskId)
				return this.deliverRelay(envelope, recipients)
			}
			default:
				return this.blockRelay(envelope, [], "unsupported_kind")
		}
	}

	private deliverRelay(envelope: SubagentRelayEnvelope, recipientTaskIds: string[]): TaskRelayOutcome {
		return {
			status: "delivered",
			envelope,
			recipientTaskIds,
		}
	}

	private blockRelay(envelope: SubagentRelayEnvelope, recipientTaskIds: string[], reason: string): TaskRelayOutcome {
		this.appendRelayActivity(envelope.fromTaskId, envelope, "blocked", `Relay blocked: ${reason}`)
		return {
			status: "blocked",
			envelope,
			recipientTaskIds,
			reason,
		}
	}

	private appendRelayActivity(
		taskId: string,
		envelope: SubagentRelayEnvelope,
		status: "delivered" | "blocked",
		summary: string,
	): void {
		void this.publishActivity(taskId, {
			kind: "relay",
			id: envelope.relayId ?? `relay-${envelope.fromTaskId}-${envelope.timestamp}`,
			taskId,
			rootTaskId: envelope.rootTaskId,
			status,
			envelope,
			summary,
			timestamp: envelope.timestamp,
		})
	}

	private buildRelaySummary(envelope: SubagentRelayEnvelope, recipientTaskIds: string[]): string {
		const targetSummary =
			envelope.kind === "parent"
				? `parent ${envelope.toTaskId}`
				: envelope.kind === "task"
					? `task ${envelope.toTaskId}`
					: envelope.kind === "group"
						? `group ${envelope.groupId}`
						: `root ${envelope.rootTaskId}`
		return `Relay delivered from ${envelope.fromTaskId} to ${targetSummary} (${recipientTaskIds.length} recipients).`
	}
	// kilocode_change end

	private toActivityStatus(
		state: SubagentStatusEvent["state"] | SubagentResultEvent["status"],
	): "queued" | "running" | "paused" | "completed" | "failed" | "cancelled" {
		switch (state) {
			case "queued":
			case "starting":
				return "queued"
			case "running":
			case "waiting_input":
			case "waiting_approval":
				return "running"
			case "paused":
				return "paused"
			case "completed":
				return "completed"
			case "cancelled":
				return "cancelled"
			case "failed":
			default:
				return "failed"
		}
	}
}
