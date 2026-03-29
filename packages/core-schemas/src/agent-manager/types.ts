import { z } from "zod"
import {
	rootTaskMessageSchema,
	schedulerStateSchema,
	sessionGroupEventSchema,
	sessionGroupMessageSchema,
	sessionGroupSchema,
} from "./session-group.js"

/**
 * Agent Manager Types
 *
 * These types are used by the agent-manager in the extension for managing
 * CLI sessions and parallel mode worktrees.
 */

/**
 * Agent status schema
 */
export const agentStatusSchema = z.enum(["creating", "running", "done", "error", "stopped"])

/**
 * Session source schema
 */
export const sessionSourceSchema = z.enum(["local", "remote"])

/**
 * Parallel mode (worktree) information schema
 */
export const parallelModeInfoSchema = z.object({
	enabled: z.boolean(),
	branch: z.string().optional(),
	worktreePath: z.string().optional(),
	parentBranch: z.string().optional(),
	completionMessage: z.string().optional(),
})

/**
 * Agent session schema
 */
export const agentSessionSchema = z.object({
	sessionId: z.string(),
	label: z.string(),
	prompt: z.string(),
	status: agentStatusSchema,
	startTime: z.number(),
	endTime: z.number().optional(),
	exitCode: z.number().optional(),
	error: z.string().optional(),
	logs: z.array(z.string()),
	pid: z.number().optional(),
	source: sessionSourceSchema,
	parallelMode: parallelModeInfoSchema.optional(),
	sessionGroup: sessionGroupSchema.optional(),
	gitUrl: z.string().optional(),
	// kilocode_change start
	taskId: z.string().optional(),
	rootTaskId: z.string().optional(),
	parentTaskId: z.string().optional(),
	childTaskIds: z.array(z.string()).optional(),
	restartCount: z.number().int().nonnegative().optional(),
	restartLimit: z.number().int().nonnegative().optional(),
	autoRestartEnabled: z.boolean().optional(),
	lastStopReason: z.string().optional(),
	lastStopSummary: z.string().optional(),
	restartHandoff: z.string().optional(),
	lifecycleStatus: z.string().optional(),
	activityState: z.string().optional(),
	needsAttention: z.boolean().optional(),
	recoveryState: z.string().optional(),
	pendingReaction: z.string().optional(),
	lastEventAt: z.number().optional(),
	// kilocode_change end
	model: z.string().optional(),
	mode: z.string().optional(),
})

export const pendingSessionSchema = z.object({
	prompt: z.string(),
	label: z.string(),
	startTime: z.number(),
	parallelMode: z.boolean().optional(),
	gitUrl: z.string().optional(),
})

export const agentManagerStateSchema = z.object({
	sessions: z.array(agentSessionSchema),
	selectedId: z.string().nullable(),
	// kilocode_change
	scheduler: schedulerStateSchema.optional(),
})

export const startSessionMessageSchema = z.object({
	type: z.literal("agentManager.startSession"),
	prompt: z.string(),
	parallelMode: z.boolean().optional(),
	existingBranch: z.string().optional(),
	model: z.string().optional(),
	mode: z.string().optional(),
	versions: z.number().optional(),
	labels: z.array(z.string()).optional(),
	images: z.array(z.string()).optional(),
})

export const agentManagerMessageSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("agentManager.webviewReady") }),
	startSessionMessageSchema,
	z.object({ type: z.literal("agentManager.stopSession"), sessionId: z.string() }),
	// kilocode_change
	z.object({ type: z.literal("agentManager.restartSession"), sessionId: z.string() }),
	// kilocode_change
	z.object({ type: z.literal("agentManager.restartSessionCompact"), sessionId: z.string() }),
	// kilocode_change
	z.object({ type: z.literal("agentManager.setSessionAutoRestart"), sessionId: z.string(), enabled: z.boolean() }),
	// kilocode_change
	z.object({ type: z.literal("agentManager.restartSessionGroupCompact"), groupId: z.string() }),
	// kilocode_change
	z.object({ type: z.literal("agentManager.stopSessionGroup"), groupId: z.string() }),
	// kilocode_change
	z.object({
		type: z.literal("agentManager.broadcastToGroup"),
		sessionId: z.string(),
		content: z.string(),
		includeSender: z.boolean().optional(),
	}),
	z.object({
		type: z.literal("agentManager.broadcastToRootTask"),
		sessionId: z.string(),
		content: z.string().optional(),
		includeSender: z.boolean().optional(),
		compact: z.boolean().optional(),
	}),
	z.object({ type: z.literal("agentManager.selectSession"), sessionId: z.string() }),
	z.object({ type: z.literal("agentManager.refreshRemoteSessions") }),
	z.object({ type: z.literal("agentManager.listBranches") }),
	z.object({ type: z.literal("agentManager.refreshModels") }),
	z.object({ type: z.literal("agentManager.setMode"), sessionId: z.string(), mode: z.string() }),
])

export const remoteSessionSchema = z
	.object({
		id: z.string(),
		name: z.string().optional(),
		status: z.string().optional(),
	})
	.passthrough()

export const availableModelSchema = z.object({
	id: z.string(),
	displayName: z.string().nullable(),
	contextWindow: z.number(),
	supportsImages: z.boolean().optional(),
	inputPrice: z.number().optional(),
	outputPrice: z.number().optional(),
})

export const availableModeSchema = z.object({
	slug: z.string(),
	name: z.string(),
	description: z.string().optional(),
	iconName: z.string().optional(),
	source: z.enum(["global", "project", "organization"]).optional(),
})

export const agentManagerExtensionMessageSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("agentManager.state"), state: agentManagerStateSchema }),
	z.object({ type: z.literal("agentManager.sessionUpdated"), session: agentSessionSchema }),
	z.object({ type: z.literal("agentManager.sessionRemoved"), sessionId: z.string() }),
	z.object({ type: z.literal("agentManager.error"), error: z.string() }),
	z.object({ type: z.literal("agentManager.remoteSessions"), sessions: z.array(remoteSessionSchema) }),
	// kilocode_change
	z
		.object({ type: z.literal("agentManager.groupEvent"), event: sessionGroupEventSchema })
		.transform(({ type, event }) => ({ type, ...event })),
	z
		.object({ type: z.literal("agentManager.groupMessage"), message: sessionGroupMessageSchema })
		.transform(({ type, message }) => ({ type, ...message })),
	z
		.object({ type: z.literal("agentManager.rootTaskMessage"), message: rootTaskMessageSchema })
		.transform(({ type, message }) => ({ type, ...message })),
	z.object({
		type: z.literal("agentManager.branches"),
		branches: z.array(z.string()),
		currentBranch: z.string().optional(),
	}),
	z.object({
		type: z.literal("agentManager.availableModels"),
		provider: z.string(),
		currentModel: z.string(),
		models: z.array(availableModelSchema),
	}),
	z.object({
		type: z.literal("agentManager.modelsLoadFailed"),
		error: z.string().optional(),
	}),
	z.object({
		type: z.literal("agentManager.availableModes"),
		modes: z.array(availableModeSchema),
		currentMode: z.string(),
	}),
	z.object({
		type: z.literal("agentManager.modeChanged"),
		sessionId: z.string(),
		mode: z.string(),
		previousMode: z.string().optional(),
	}),
])

export type AgentStatus = z.infer<typeof agentStatusSchema>
export type SessionSource = z.infer<typeof sessionSourceSchema>
export type AvailableModel = z.infer<typeof availableModelSchema>
export type AvailableMode = z.infer<typeof availableModeSchema>
export type ParallelModeInfo = z.infer<typeof parallelModeInfoSchema>
export type SessionGroup = z.infer<typeof sessionGroupSchema>
export type SessionGroupEvent = z.infer<typeof sessionGroupEventSchema>
export type SessionGroupMessage = z.infer<typeof sessionGroupMessageSchema>
export type RootTaskMessage = z.infer<typeof rootTaskMessageSchema>
export type AgentSession = z.infer<typeof agentSessionSchema>
export type PendingSession = z.infer<typeof pendingSessionSchema>
export type SchedulerState = z.infer<typeof schedulerStateSchema>
export type AgentManagerState = z.infer<typeof agentManagerStateSchema>
export type AgentManagerMessage = z.infer<typeof agentManagerMessageSchema>
export type AgentManagerExtensionMessage = z.infer<typeof agentManagerExtensionMessageSchema>
export type StartSessionMessage = z.infer<typeof startSessionMessageSchema>
