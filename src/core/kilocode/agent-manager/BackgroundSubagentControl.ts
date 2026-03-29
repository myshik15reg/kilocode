// kilocode_change - new file
import { listBackgroundSubagentBindings, type BackgroundSessionBinding } from "./BackgroundSubagentLifecycle"
import type { AgentSession, AgentStatus } from "./types"
import type { HistoryItem, SubagentResultEvent, SubagentStatusEvent } from "@roo-code/types"

interface BackgroundTaskHistoryLifecyclePatch {
	lifecycleState: "paused" | "running" | "completed" | "cancelled"
	pauseReason?: string
	pausedAt?: number
	resumeContextSummary?: string
}

export interface BackgroundSubagentControlDependencies {
	getSession: (sessionId: string) => AgentSession | undefined
	updateSession: (sessionId: string, patch: Partial<AgentSession>) => void
	updateSessionStatus: (sessionId: string, status: AgentStatus, exitCode?: number, error?: string) => void
	persistBindings: () => Promise<void>
	hasStdin: (sessionId: string) => boolean
	writeToStdin: (sessionId: string, payload: object, label: string) => Promise<void>
	stopSession: (sessionId: string) => void
	resumeSession: (sessionId: string, prompt: string, sessionLabel?: string) => Promise<void>
	getSessionHistoryItem: (sessionId: string) => HistoryItem | undefined
	updateTaskHistory?: (item: HistoryItem) => Promise<unknown> | unknown
	summarizeCompletion: (sessionId: string) => string
	postStateToWebview: () => void
	log: (message: string) => void
	now?: () => number
}

export class BackgroundSubagentControl {
	private readonly statusListeners = new Set<(event: SubagentStatusEvent) => void>()
	private readonly resultListeners = new Set<(event: SubagentResultEvent) => void>()
	private readonly backgroundSessionBindings = new Map<string, BackgroundSessionBinding>()

	constructor(private readonly deps: BackgroundSubagentControlDependencies) {}

	public get bindings(): Map<string, BackgroundSessionBinding> {
		return this.backgroundSessionBindings
	}

	public onStatus(listener: (event: SubagentStatusEvent) => void): () => void {
		this.statusListeners.add(listener)
		return () => this.statusListeners.delete(listener)
	}

	public onResult(listener: (event: SubagentResultEvent) => void): () => void {
		this.resultListeners.add(listener)
		return () => this.resultListeners.delete(listener)
	}

	public async bindSession(sessionId: string, binding: BackgroundSessionBinding): Promise<void> {
		this.backgroundSessionBindings.set(sessionId, binding)
		await this.deps.persistBindings()
	}

	public renameBinding(oldId: string, newId: string): void {
		const binding = this.backgroundSessionBindings.get(oldId)
		if (!binding) {
			return
		}

		this.backgroundSessionBindings.delete(oldId)
		this.backgroundSessionBindings.set(newId, binding)
		void this.deps.persistBindings()
	}

	public announceLaunch(sessionId: string, queued: boolean): void {
		const binding = this.backgroundSessionBindings.get(sessionId)
		this.emitStatus({
			taskId: binding?.taskId ?? sessionId,
			sessionId,
			state: queued ? "queued" : "running",
			message: queued ? "Background subagent queued" : "Background subagent started",
			timestamp: this.getNow(),
		})
	}

	public handleSessionCompleted(
		sessionId: string,
		exitCode: number,
	): { isSuccess: boolean; terminalStatus: "completed" | "cancelled" | "failed" } {
		const session = this.deps.getSession(sessionId)
		const isSuccess = exitCode === 0
		const terminalStatus = isSuccess ? "completed" : session?.status === "stopped" ? "cancelled" : "failed"

		this.deps.updateSession(sessionId, {
			lifecycleStatus: terminalStatus,
			activityState: "idle",
			needsAttention: !isSuccess,
			recoveryState: undefined,
			pendingReaction: undefined,
			lastEventAt: this.getNow(),
		})

		const binding = this.consumeBinding(sessionId)
		if (binding) {
			if (isSuccess) {
				const summary = this.deps.summarizeCompletion(sessionId)
				this.emitStatus({
					taskId: binding.taskId,
					sessionId,
					state: "completed",
					message: "Background subagent completed",
					timestamp: this.getNow(),
				})
				this.emitResult({
					taskId: binding.taskId,
					sessionId,
					status: "completed",
					output: summary,
					summary,
					timestamp: this.getNow(),
				})
			} else {
				this.emitStatus({
					taskId: binding.taskId,
					sessionId,
					state: terminalStatus,
					message:
						terminalStatus === "cancelled" ? "Background subagent cancelled" : "Background subagent failed",
					timestamp: this.getNow(),
				})
			}
		}

		return { isSuccess, terminalStatus }
	}

	public async cancelSession(sessionId: string): Promise<void> {
		const session = this.deps.getSession(sessionId)
		if (!this.deps.hasStdin(sessionId)) {
			this.deps.log(`[AgentManager] Session ${sessionId} not running, stopping process`)
			this.deps.stopSession(sessionId)
			if (this.backgroundSessionBindings.has(sessionId)) {
				this.consumeBinding(sessionId)
				this.emitStatus({
					taskId: session?.taskId ?? sessionId,
					sessionId,
					state: "cancelled",
					message: "Background subagent cancelled",
					timestamp: this.getNow(),
				})
			}
			return
		}

		try {
			await this.deps.writeToStdin(sessionId, { type: "cancelTask" }, "cancel")
		} catch (error) {
			this.deps.log(`Failed to send cancel via stdin, falling back to SIGTERM: ${error}`)
			this.deps.stopSession(sessionId)
		}

		if (!this.backgroundSessionBindings.has(sessionId)) {
			return
		}

		this.deps.updateSessionStatus(sessionId, "stopped", undefined, "Cancelled by user")
		this.deps.updateSession(sessionId, {
			lifecycleStatus: "cancelled",
			activityState: "idle",
			needsAttention: false,
			recoveryState: undefined,
			pendingReaction: undefined,
			lastEventAt: this.getNow(),
		})
		this.consumeBinding(sessionId)
		this.emitStatus({
			taskId: session?.taskId ?? sessionId,
			sessionId,
			state: "cancelled",
			message: "Background subagent cancelled",
			timestamp: this.getNow(),
		})
	}

	public async pauseSession(sessionId: string): Promise<void> {
		const session = this.deps.getSession(sessionId)
		if (!session) {
			return
		}

		if (this.deps.hasStdin(sessionId)) {
			try {
				await this.deps.writeToStdin(
					sessionId,
					{ type: "pauseTask", text: session.taskId ?? sessionId },
					"pause",
				)
			} catch (error) {
				this.deps.log(`[AgentManager] Failed to send pause via stdin for ${sessionId}: ${error}`)
			}
		}

		if (this.backgroundSessionBindings.has(sessionId)) {
			const historyItem = this.deps.getSessionHistoryItem(sessionId)
			await this.syncTaskHistoryLifecycle(sessionId, {
				lifecycleState: "paused",
				pauseReason: "Paused by user",
				pausedAt: this.getNow(),
				resumeContextSummary:
					historyItem?.resumeContextSummary ||
					historyItem?.lastStopSummary ||
					session.restartHandoff ||
					session.prompt,
			})
		}

		this.deps.updateSessionStatus(sessionId, "stopped", undefined, "Paused by user")
		this.deps.updateSession(sessionId, {
			lifecycleStatus: "paused",
			activityState: "paused",
			needsAttention: true,
			recoveryState: "recoverable",
			pendingReaction: "resume",
			lastEventAt: this.getNow(),
		})
		this.emitStatus({
			taskId: session.taskId ?? sessionId,
			sessionId,
			state: "paused",
			message: "Background subagent paused",
			timestamp: this.getNow(),
		})
		this.deps.postStateToWebview()
	}

	public async resumeBackgroundSubagent(sessionId: string): Promise<void> {
		const session = this.deps.getSession(sessionId)
		const binding = this.backgroundSessionBindings.get(sessionId)
		if (!session || !binding) {
			return
		}

		const resumePrompt =
			session.restartHandoff ||
			this.deps.getSessionHistoryItem(sessionId)?.resumeContextSummary ||
			binding.request.handoff.summary

		await this.syncTaskHistoryLifecycle(sessionId, {
			lifecycleState: "running",
			pauseReason: undefined,
			pausedAt: undefined,
		})

		await this.deps.resumeSession(sessionId, resumePrompt, session.label)
		this.deps.updateSession(sessionId, {
			lifecycleStatus: "active",
			activityState: "active",
			needsAttention: false,
			recoveryState: undefined,
			pendingReaction: undefined,
			lastEventAt: this.getNow(),
		})
		this.emitStatus({
			taskId: binding.taskId,
			sessionId,
			state: "running",
			message: "Background subagent resumed",
			timestamp: this.getNow(),
		})
		this.deps.postStateToWebview()
	}

	public listBindings(): Array<{
		request: BackgroundSessionBinding["request"]
		taskId: string
		sessionId: string
		status: SubagentStatusEvent["state"]
		updatedAt: number
	}> {
		return listBackgroundSubagentBindings(
			this.backgroundSessionBindings,
			(sessionId) => this.deps.getSession(sessionId),
			() => this.getNow(),
		)
	}

	private emitStatus(event: SubagentStatusEvent): void {
		for (const listener of this.statusListeners) {
			listener(event)
		}
	}

	private emitResult(event: SubagentResultEvent): void {
		for (const listener of this.resultListeners) {
			listener(event)
		}
	}

	private consumeBinding(sessionId: string): BackgroundSessionBinding | undefined {
		const binding = this.backgroundSessionBindings.get(sessionId)
		if (binding) {
			this.backgroundSessionBindings.delete(sessionId)
			void this.deps.persistBindings()
		}
		return binding
	}

	private async syncTaskHistoryLifecycle(taskId: string, patch: BackgroundTaskHistoryLifecyclePatch): Promise<void> {
		if (typeof this.deps.updateTaskHistory !== "function") {
			return
		}

		const historyItem = this.deps.getSessionHistoryItem(taskId)
		if (!historyItem) {
			return
		}

		try {
			await this.deps.updateTaskHistory({
				...historyItem,
				...patch,
				id: taskId,
			})
		} catch (error) {
			this.deps.log(
				`[AgentManager] Failed to sync background task history lifecycle for ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	private getNow(): number {
		return this.deps.now?.() ?? Date.now()
	}
}
