import { describe, expect, it } from "vitest"

import {
	rootTaskMessageSchema,
	schedulerStateSchema,
	sessionGroupEventSchema,
	sessionGroupSchema,
} from "./session-group.js"

describe("agent-manager session group schemas", () => {
	it("parses a grouped session envelope", () => {
		expect(sessionGroupSchema.parse({ groupId: "g1", rootSessionId: "s1" })).toEqual({
			groupId: "g1",
			rootSessionId: "s1",
		})
	})

	it("parses session group events", () => {
		expect(
			sessionGroupEventSchema.parse({
				groupId: "g1",
				sessionId: "s1",
				eventType: "running",
				timestamp: 1,
			}),
		).toEqual({ groupId: "g1", sessionId: "s1", eventType: "running", timestamp: 1 })
	})

	it("parses root task relay messages", () => {
		expect(
			rootTaskMessageSchema.parse({
				messageId: "m1",
				rootTaskId: "task-1",
				sourceSessionId: "s1",
				content: "done",
				timestamp: 1,
			}),
		).toEqual({
			messageId: "m1",
			rootTaskId: "task-1",
			sourceSessionId: "s1",
			content: "done",
			timestamp: 1,
		})
	})

	it("parses scheduler state", () => {
		expect(
			schedulerStateSchema.parse({
				maxConcurrentStarts: 2,
				activeSessionLoad: 1,
				queuedLaunchCount: 3,
				backpressure: false,
			}),
		).toEqual({
			maxConcurrentStarts: 2,
			activeSessionLoad: 1,
			queuedLaunchCount: 3,
			backpressure: false,
		})
	})
})
