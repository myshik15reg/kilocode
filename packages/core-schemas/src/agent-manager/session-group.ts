// kilocode_change - new file
import { z } from "zod"

export const sessionGroupSchema = z.object({
	groupId: z.string(),
	rootSessionId: z.string(),
	parentGroupId: z.string().optional(),
	label: z.string().optional(),
	sessionIndex: z.number().optional(),
	sessionCount: z.number().optional(),
})

export const sessionGroupEventSchema = z.object({
	groupId: z.string(),
	sessionId: z.string(),
	eventType: z.enum(["creating", "running", "completed", "stopped", "error"]),
	summary: z.string().optional(),
	timestamp: z.number(),
})

export const sessionGroupMessageSchema = z.object({
	messageId: z.string(),
	groupId: z.string(),
	sourceSessionId: z.string(),
	sourceLabel: z.string().optional(),
	content: z.string(),
	includeSender: z.boolean().optional(),
	timestamp: z.number(),
})

export const rootTaskMessageSchema = z.object({
	messageId: z.string(),
	rootTaskId: z.string(),
	sourceSessionId: z.string(),
	sourceLabel: z.string().optional(),
	content: z.string(),
	includeSender: z.boolean().optional(),
	timestamp: z.number(),
})

export const schedulerStateSchema = z.object({
	maxConcurrentStarts: z.number(),
	activeSessionLoad: z.number(),
	queuedLaunchCount: z.number(),
	activeRootCount: z.number().optional(),
	queuedRootLaunchCount: z.number().optional(),
	maxConcurrentPerQueueKey: z.number().optional(),
	queueKeyPressure: z.record(z.string(), z.number()).optional(),
	backpressure: z.boolean(),
})

export type SessionGroup = z.infer<typeof sessionGroupSchema>
export type SessionGroupEvent = z.infer<typeof sessionGroupEventSchema>
export type SessionGroupMessage = z.infer<typeof sessionGroupMessageSchema>
export type RootTaskMessage = z.infer<typeof rootTaskMessageSchema>
export type SchedulerState = z.infer<typeof schedulerStateSchema>
