import type {
	SubagentLaunchRequest,
	SubagentRelayEnvelope,
	SubagentResultEvent,
	SubagentStatusEvent,
} from "@roo-code/types"

// kilocode_change - new file
export type SubagentRuntimeStatus = SubagentStatusEvent["state"]

export interface ActiveSubagentBinding {
	request: SubagentLaunchRequest
	parentTaskId: string
	childTaskId: string
	sessionId: string
	fallbackToForeground: boolean
	status: SubagentRuntimeStatus
	createdAt: number
	updatedAt: number
}

// kilocode_change start
export interface TaskRelayRegistration {
	taskId: string
	rootTaskId: string
	parentTaskId?: string
	groupId?: string
	relayPolicy: SubagentLaunchRequest["relayPolicy"]
	sessionId?: string
}

export interface TaskRelayOutcome {
	status: "delivered" | "blocked"
	envelope: SubagentRelayEnvelope
	recipientTaskIds: string[]
	reason?: string
}

export type TaskRelayInput =
	| Omit<Extract<SubagentRelayEnvelope, { kind: "parent" }>, "timestamp" | "requiresParentVisibility">
	| Omit<Extract<SubagentRelayEnvelope, { kind: "task" }>, "timestamp" | "requiresParentVisibility">
	| Omit<Extract<SubagentRelayEnvelope, { kind: "group" }>, "timestamp" | "requiresParentVisibility">
	| Omit<Extract<SubagentRelayEnvelope, { kind: "root" }>, "timestamp" | "requiresParentVisibility">
// kilocode_change end

export interface SubagentLaunchOutcome {
	mode: "background" | "foreground"
	childTaskId: string
	sessionId?: string
	status: Extract<SubagentRuntimeStatus, "queued" | "running">
	fallbackReason?: string
}

export interface SubagentControlOutcome {
	taskId: string
	sessionId?: string
	status: SubagentRuntimeStatus
}

export interface SubagentBridge {
	hasCapacity(request: SubagentLaunchRequest): boolean
	launch(request: SubagentLaunchRequest): Promise<{ taskId: string; sessionId: string; status: "queued" | "running" }>
	cancel(sessionId: string): Promise<void>
	pause?(sessionId: string): Promise<void>
	resume?(sessionId: string): Promise<void>
	release?(sessionId: string): Promise<void>
	listBindings?(): Array<{
		request: SubagentLaunchRequest
		parentTaskId: string
		childTaskId: string
		sessionId: string
		status: SubagentRuntimeStatus
		updatedAt: number
	}>
	// kilocode_change start
	relay?(params: { envelope: SubagentRelayEnvelope; recipientTaskIds: string[] }): Promise<void>
	// kilocode_change end
	onStatus(listener: (event: SubagentStatusEvent) => void): () => void
	onResult(listener: (event: SubagentResultEvent) => void): () => void
}
