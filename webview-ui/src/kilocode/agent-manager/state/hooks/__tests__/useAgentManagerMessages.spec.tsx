import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { Provider, useAtomValue } from "jotai"
import { useAgentManagerMessages } from "../useAgentManagerMessages"
import {
	sessionsArrayAtom,
	selectedSessionIdAtom,
	sessionGroupEventsAtom,
	sessionGroupMessagesAtom,
	rootTaskMessagesAtom,
	selectedSessionAtom,
	type AgentSession,
} from "../../atoms/sessions"
import { selectedSessionMachineStateAtom } from "../../atoms/stateMachine"

function createSession(id: string, status: AgentSession["status"] = "running"): AgentSession {
	return {
		sessionId: id,
		label: `Session ${id}`,
		prompt: `Test prompt ${id}`,
		status,
		startTime: Date.now(),
		source: "local",
	}
}

function dispatchStateMessage(sessions: AgentSession[], selectedId: string | null = null) {
	const event = new MessageEvent("message", {
		data: {
			type: "agentManager.state",
			state: { sessions, selectedId },
		},
	})
	window.dispatchEvent(event)
}

describe("useAgentManagerMessages", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("should add sessions from state messages", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selectedId: useAtomValue(selectedSessionIdAtom),
				}
			},
			{ wrapper },
		)

		expect(result.current.sessions).toHaveLength(0)

		// Add two sessions - they get prepended so order is reversed
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("2")])
		})

		expect(result.current.sessions).toHaveLength(2)
		// Sessions are prepended (newest first), so "2" comes before "1"
		expect(result.current.sessions.map((s) => s.sessionId)).toEqual(["2", "1"])
	})

	it("should remove sessions that no longer exist in state - regression test for delete bug", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selectedId: useAtomValue(selectedSessionIdAtom),
				}
			},
			{ wrapper },
		)

		// Start with 3 sessions
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("2"), createSession("3")])
		})

		expect(result.current.sessions).toHaveLength(3)
		// Sessions are prepended in order processed
		expect(result.current.sessions.map((s) => s.sessionId)).toEqual(["3", "2", "1"])

		// Delete session "2" by sending state without it
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("3")])
		})

		// Session "2" should be removed from frontend state
		expect(result.current.sessions).toHaveLength(2)
		expect(result.current.sessions.map((s) => s.sessionId)).toEqual(["3", "1"])
	})

	it("should handle deleting multiple sessions at once", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selectedId: useAtomValue(selectedSessionIdAtom),
				}
			},
			{ wrapper },
		)

		// Start with 4 sessions
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("2"), createSession("3"), createSession("4")])
		})

		expect(result.current.sessions).toHaveLength(4)

		// Delete sessions "2" and "3"
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("4")])
		})

		expect(result.current.sessions).toHaveLength(2)
		expect(result.current.sessions.map((s) => s.sessionId)).toEqual(["4", "1"])
	})

	it("should handle deleting all sessions", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selectedId: useAtomValue(selectedSessionIdAtom),
				}
			},
			{ wrapper },
		)

		// Start with sessions
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("2")])
		})

		expect(result.current.sessions).toHaveLength(2)

		// Delete all sessions
		act(() => {
			dispatchStateMessage([])
		})

		expect(result.current.sessions).toHaveLength(0)
	})

	it("should update selected session when deleted session was selected", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selectedId: useAtomValue(selectedSessionIdAtom),
				}
			},
			{ wrapper },
		)

		// Add sessions - first one gets auto-selected when selectedId is null
		act(() => {
			dispatchStateMessage([createSession("1"), createSession("2")], "1")
		})

		expect(result.current.sessions).toHaveLength(2)
		expect(result.current.selectedId).toBe("1")

		// Delete the selected session
		act(() => {
			dispatchStateMessage([createSession("2")])
		})

		// Selected session should update to remaining session
		expect(result.current.sessions).toHaveLength(1)
		expect(result.current.selectedId).toBe("2")
	})

	it("should update session status without removing it", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selectedId: useAtomValue(selectedSessionIdAtom),
				}
			},
			{ wrapper },
		)

		// Add a running session
		act(() => {
			dispatchStateMessage([createSession("1", "running")])
		})

		expect(result.current.sessions).toHaveLength(1)
		expect(result.current.sessions[0].status).toBe("running")

		// Update to stopped (simulating stop action)
		act(() => {
			dispatchStateMessage([createSession("1", "stopped")])
		})

		// Session should still exist but with updated status
		expect(result.current.sessions).toHaveLength(1)
		expect(result.current.sessions[0].status).toBe("stopped")
	})

	it("rehydrates paused recoverable sessions after reload", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selected: useAtomValue(selectedSessionAtom),
					machineState: useAtomValue(selectedSessionMachineStateAtom),
				}
			},
			{ wrapper },
		)

		act(() => {
			dispatchStateMessage(
				[
					{
						...createSession("paused-1", "stopped"),
						lifecycleStatus: "paused",
						recoveryState: "recoverable",
						pendingReaction: "resume",
						needsAttention: true,
						taskId: "paused-1",
					},
				],
				"paused-1",
			)
		})

		expect(result.current.selected?.sessionId).toBe("paused-1")
		expect(result.current.machineState).toBe("paused")
	})

	// kilocode_change start
	it("does not rehydrate done sessions as recoverable when stale recoverable flags are present", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					sessions: useAtomValue(sessionsArrayAtom),
					selected: useAtomValue(selectedSessionAtom),
					machineState: useAtomValue(selectedSessionMachineStateAtom),
				}
			},
			{ wrapper },
		)

		act(() => {
			dispatchStateMessage(
				[
					{
						...createSession("done-1", "done"),
						lifecycleStatus: "paused",
						recoveryState: "recoverable",
						pendingReaction: "resume",
						needsAttention: true,
						taskId: "done-1",
					},
				],
				"done-1",
			)
		})

		expect(result.current.selected?.sessionId).toBe("done-1")
		expect(result.current.sessions[0]?.status).toBe("done")
		expect(result.current.machineState).toBeNull()
	})
	// kilocode_change end

	it("does not re-dispatch recoverable rehydrate events for the same paused session", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					selected: useAtomValue(selectedSessionAtom),
					machineState: useAtomValue(selectedSessionMachineStateAtom),
				}
			},
			{ wrapper },
		)

		const pausedSession = {
			...createSession("paused-2", "stopped"),
			lifecycleStatus: "paused",
			recoveryState: "recoverable",
			pendingReaction: "resume",
			needsAttention: true,
			taskId: "paused-2",
		} as AgentSession

		act(() => {
			dispatchStateMessage([pausedSession], "paused-2")
			dispatchStateMessage([pausedSession], "paused-2")
		})

		expect(result.current.selected?.sessionId).toBe("paused-2")
		expect(result.current.machineState).toBe("paused")
	})

	it("moves a recoverable session back to streaming after resume state sync", async () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

		const { result } = renderHook(
			() => {
				useAgentManagerMessages()
				return {
					selected: useAtomValue(selectedSessionAtom),
					machineState: useAtomValue(selectedSessionMachineStateAtom),
				}
			},
			{ wrapper },
		)

		act(() => {
			dispatchStateMessage(
				[
					{
						...createSession("paused-3", "stopped"),
						lifecycleStatus: "paused",
						recoveryState: "recoverable",
						pendingReaction: "resume",
						needsAttention: true,
						taskId: "paused-3",
					},
				],
				"paused-3",
			)
		})

		expect(result.current.selected?.sessionId).toBe("paused-3")
		expect(result.current.machineState).toBe("paused")

		act(() => {
			dispatchStateMessage(
				[
					{
						...createSession("paused-3", "running"),
						lifecycleStatus: "active",
						activityState: "active",
						recoveryState: undefined,
						pendingReaction: undefined,
						needsAttention: false,
						taskId: "paused-3",
					},
				],
				"paused-3",
			)
		})

		expect(result.current.selected?.sessionId).toBe("paused-3")
		expect(result.current.machineState).toBe("streaming")
	})
})

it("should store latest group messages", async () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>
	const { result } = renderHook(
		() => {
			useAgentManagerMessages()
			return { groupMessages: useAtomValue(sessionGroupMessagesAtom) }
		},
		{ wrapper },
	)
	act(() => {
		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "agentManager.groupMessage",
					messageId: "msg-1",
					groupId: "group-1",
					sourceSessionId: "session-1",
					sourceLabel: "Planner",
					content: "Only send delta summary",
					includeSender: false,
					timestamp: 1,
				},
			}),
		)
	})
	expect(result.current.groupMessages["group-1"]).toMatchObject({
		sourceLabel: "Planner",
		content: "Only send delta summary",
	})
})

it("should store latest group events", async () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>
	const { result } = renderHook(
		() => {
			useAgentManagerMessages()
			return { groupEvents: useAtomValue(sessionGroupEventsAtom) }
		},
		{ wrapper },
	)
	act(() => {
		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "agentManager.groupEvent",
					groupId: "group-1",
					sessionId: "session-1",
					eventType: "running",
					summary: "Worker active",
					timestamp: 1,
				},
			}),
		)
	})
	expect(result.current.groupEvents["group-1"]).toMatchObject({ eventType: "running", summary: "Worker active" })
})

it("should store latest root-task messages", async () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>
	const { result } = renderHook(
		() => {
			useAgentManagerMessages()
			return { rootTaskMessages: useAtomValue(rootTaskMessagesAtom) }
		},
		{ wrapper },
	)
	act(() => {
		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "agentManager.rootTaskMessage",
					messageId: "root-msg-1",
					rootTaskId: "root-task-1",
					sourceSessionId: "session-1",
					sourceLabel: "Planner",
					content: "Share only delta summary",
					includeSender: false,
					timestamp: 1,
				},
			}),
		)
	})
	expect(result.current.rootTaskMessages["root-task-1"]).toMatchObject({
		sourceLabel: "Planner",
		content: "Share only delta summary",
	})
})
