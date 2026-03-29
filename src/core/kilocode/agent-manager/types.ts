/**
 * Agent Manager Types
 *
 * Re-exports types from @kilocode/core-schemas for consistency
 * and backward compatibility.
 */

import type { Session as RemoteSession } from "../../../shared/kilocode/cli-sessions/core/SessionClient"

export {
	agentStatusSchema,
	sessionSourceSchema,
	parallelModeInfoSchema,
	agentSessionSchema,
	pendingSessionSchema,
	agentManagerStateSchema,
	agentManagerMessageSchema,
	agentManagerExtensionMessageSchema,
	availableModelSchema,
	availableModeSchema,
	startSessionMessageSchema,
	type AgentStatus,
	type SessionSource,
	type ParallelModeInfo,
	type AgentSession,
	type PendingSession,
	type AgentManagerState,
	type AgentManagerMessage,
	type AgentManagerExtensionMessage,
	type AvailableModel,
	type AvailableMode,
	type StartSessionMessage,
} from "@kilocode/core-schemas"
export {
	sessionGroupSchema,
	// kilocode_change
	sessionGroupEventSchema,
	sessionGroupMessageSchema,
	rootTaskMessageSchema,
	schedulerStateSchema,
	type SessionGroup,
	// kilocode_change
	type SessionGroupEvent,
	type SessionGroupMessage,
	type RootTaskMessage,
	type SchedulerState,
} from "../../../../packages/core-schemas/src/agent-manager/session-group"

export type { RemoteSession }
