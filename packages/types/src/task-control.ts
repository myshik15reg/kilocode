// kilocode_change - new file
import { z } from "zod"

export const taskHistoryStatusSchema = z.enum(["active", "completed", "delegated", "aborted"])

export const taskStopReasonSchema = z.enum([
	"user_cancelled",
	"streaming_failed",
	"parent_cancelled",
	"parent_completed",
	"loop_detected",
	"restart_limit_exceeded",
])

// kilocode_change start
export const taskControlSchema = z.enum(["pause", "resume", "continue", "branch"])
export const legacyTaskControlSchema = z.enum(["run", "pause", "resume"])
export const taskControlValueSchema = z.enum(["run", "pause", "resume", "continue", "branch"])
export const taskResumeControlSchema = z.enum(["resume", "continue"])

export function normalizeTaskControl(control: z.input<typeof taskControlValueSchema>): TaskControl {
	switch (control) {
		case "run":
			return "continue"
		case "pause":
		case "resume":
		case "continue":
		case "branch":
			return control
	}
}

export const normalizedTaskControlSchema = taskControlValueSchema.transform((control) => normalizeTaskControl(control))
// kilocode_change end

export const branchTaskOptionsSchema = z.object({
	message: z.string().optional(),
	branchStrategy: z.enum(["full", "summary"]).optional(),
})

export type TaskHistoryStatus = z.infer<typeof taskHistoryStatusSchema>
export type TaskStopReason = z.infer<typeof taskStopReasonSchema>
// kilocode_change start
export type TaskControl = z.infer<typeof taskControlSchema>
export type LegacyTaskControl = z.infer<typeof legacyTaskControlSchema>
export type TaskControlValue = z.infer<typeof taskControlValueSchema>
export type TaskResumeControl = z.infer<typeof taskResumeControlSchema>
// kilocode_change end
export type BranchTaskOptions = z.infer<typeof branchTaskOptionsSchema>
