import { createStore } from "jotai"
import {
	MAX_VERSION_COUNT,
	generateVersionLabels,
	rootTaskMessagesAtom,
	rootTaskRollupAtom,
	schedulerStateAtom,
	sessionGroupEventsAtom,
	sessionGroupMessagesAtom,
	sessionsMapAtom,
	sessionOrderAtom,
	subtreeRollupByGroupAtom,
	type AgentSession,
	type SessionGroupEvent,
	type SessionGroupMessage,
	type VersionCount,
	versionCountAtom,
} from "../sessions"

describe("Agent Manager Sessions Atoms - Version Mode", () => {
	describe("versionCountAtom", () => {
		it("should have a default value of 1", () => {
			const store = createStore()
			const value = store.get(versionCountAtom)
			expect(value).toBe(1)
		})

		it("should accept valid version counts (1-4)", () => {
			const store = createStore()

			store.set(versionCountAtom, 1)
			expect(store.get(versionCountAtom)).toBe(1)

			store.set(versionCountAtom, 2)
			expect(store.get(versionCountAtom)).toBe(2)

			store.set(versionCountAtom, 3)
			expect(store.get(versionCountAtom)).toBe(3)

			store.set(versionCountAtom, 4)
			expect(store.get(versionCountAtom)).toBe(4)
		})
	})

	describe("MAX_VERSION_COUNT", () => {
		it("should be 4", () => {
			expect(MAX_VERSION_COUNT).toBe(4)
		})
	})

	describe("VersionCount type", () => {
		it("should allow values 1, 2, 3, 4", () => {
			// Type check - these should compile
			const v1: VersionCount = 1
			const v2: VersionCount = 2
			const v3: VersionCount = 3
			const v4: VersionCount = 4

			expect([v1, v2, v3, v4]).toEqual([1, 2, 3, 4])
		})
	})

	describe("generateVersionLabels", () => {
		it("should return single label without suffix for version count 1", () => {
			const labels = generateVersionLabels("Build todo app", 1)
			expect(labels).toEqual(["Build todo app"])
		})

		it("should return labels with (v1), (v2) suffixes for version count 2", () => {
			const labels = generateVersionLabels("Build todo app", 2)
			expect(labels).toEqual(["Build todo app (v1)", "Build todo app (v2)"])
		})

		it("should return labels with (v1), (v2), (v3) suffixes for version count 3", () => {
			const labels = generateVersionLabels("Build todo app", 3)
			expect(labels).toEqual(["Build todo app (v1)", "Build todo app (v2)", "Build todo app (v3)"])
		})

		it("should return labels with (v1), (v2), (v3), (v4) suffixes for version count 4", () => {
			const labels = generateVersionLabels("Build todo app", 4)
			expect(labels).toEqual([
				"Build todo app (v1)",
				"Build todo app (v2)",
				"Build todo app (v3)",
				"Build todo app (v4)",
			])
		})

		it("should handle empty prompt", () => {
			const labels = generateVersionLabels("", 2)
			expect(labels).toEqual([" (v1)", " (v2)"])
		})

		it("should handle long prompts", () => {
			const longPrompt = "A".repeat(100)
			const labels = generateVersionLabels(longPrompt, 2)
			expect(labels[0]).toBe(`${longPrompt} (v1)`)
			expect(labels[1]).toBe(`${longPrompt} (v2)`)
		})
	})

	describe("subtree rollups", () => {
		function createGroupedSession(
			session: Partial<AgentSession> & Pick<AgentSession, "sessionId" | "label" | "status" | "startTime">,
		): AgentSession {
			return {
				sessionId: session.sessionId,
				label: session.label,
				prompt: session.prompt ?? "",
				status: session.status,
				startTime: session.startTime,
				source: session.source ?? "local",
				sessionGroup: session.sessionGroup,
				rootTaskId: session.rootTaskId,
				parentTaskId: session.parentTaskId,
			}
		}

		it("builds subtree summary, pressure, relay, guardrail, and problem badges from one rollup", () => {
			const store = createStore()
			const sessions: AgentSession[] = [
				createGroupedSession({
					sessionId: "planner-parent",
					label: "Planner",
					status: "running",
					startTime: 30,
					rootTaskId: "root-1",
					sessionGroup: { groupId: "group-parent", rootSessionId: "planner-parent", label: "Parent" },
				}),
				createGroupedSession({
					sessionId: "worker-child-a",
					label: "Worker A",
					status: "error",
					startTime: 20,
					rootTaskId: "root-1",
					sessionGroup: {
						groupId: "group-child-a",
						rootSessionId: "worker-child-a",
						parentGroupId: "group-parent",
						label: "Child A",
					},
				}),
				createGroupedSession({
					sessionId: "worker-child-b",
					label: "Worker B",
					status: "done",
					startTime: 10,
					rootTaskId: "root-1",
					sessionGroup: {
						groupId: "group-child-b",
						rootSessionId: "worker-child-b",
						parentGroupId: "group-parent",
						label: "Child B",
					},
				}),
			]

			const groupMessages: Record<string, SessionGroupMessage> = {
				"group-child-b": {
					messageId: "msg-1",
					groupId: "group-child-b",
					sourceSessionId: "planner-parent",
					sourceLabel: "Planner",
					content: "Take parser branch and return delta only",
					timestamp: 300,
				},
			}

			const groupEvents: Record<string, SessionGroupEvent> = {
				"group-child-a": {
					groupId: "group-child-a",
					sessionId: "worker-child-a",
					eventType: "error",
					summary: "Loop detected while retrying",
					timestamp: 200,
				},
			}

			store.set(sessionsMapAtom, Object.fromEntries(sessions.map((session) => [session.sessionId, session])))
			store.set(
				sessionOrderAtom,
				sessions.map((session) => session.sessionId),
			)
			store.set(schedulerStateAtom, {
				maxConcurrentStarts: 2,
				activeSessionLoad: 2,
				queuedLaunchCount: 1,
				backpressure: false,
				queueKeyPressure: {
					"group-parent": 1,
					"group-child-a": 2,
					"group-child-b": 1,
				},
			})
			store.set(sessionGroupMessagesAtom, groupMessages)
			store.set(sessionGroupEventsAtom, groupEvents)

			const rollups = store.get(subtreeRollupByGroupAtom)
			expect(rollups["group-parent"]).toEqual({
				descendantGroupIds: ["group-child-a", "group-child-b"],
				summaryLabel: "subtree Branches 3 · A1 · Done 1 · Err 1",
				pressureLabel: "subtree pressure 2 · throttled",
				problemLabel: "subtree issues 1",
				relayLabel: "subtree Planner -> Take parser branch",
				guardrailLabel: "subtree guard loop",
				problematicDescendantGroupIds: ["group-child-a"],
			})
		})

		it("returns empty subtree badges when a group has no descendants or subtree signals", () => {
			const store = createStore()
			const session = createGroupedSession({
				sessionId: "solo",
				label: "Solo",
				status: "running",
				startTime: 1,
				rootTaskId: "root-solo",
				sessionGroup: { groupId: "group-solo", rootSessionId: "solo", label: "Solo Group" },
			})

			store.set(sessionsMapAtom, { [session.sessionId]: session })
			store.set(sessionOrderAtom, [session.sessionId])

			const rollups = store.get(subtreeRollupByGroupAtom)
			expect(rollups["group-solo"]).toEqual({
				descendantGroupIds: [],
				summaryLabel: undefined,
				pressureLabel: undefined,
				problemLabel: undefined,
				relayLabel: undefined,
				guardrailLabel: undefined,
				problematicDescendantGroupIds: [],
			})
		})

		describe("root rollups", () => {
			it("builds root summary, pressure, queue, relay, guardrail, and problem badges from one rollup", () => {
				const store = createStore()
				const sessions: AgentSession[] = [
					createGroupedSession({
						sessionId: "planner-root",
						label: "Planner",
						status: "running",
						startTime: 30,
						rootTaskId: "root-1",
						sessionGroup: { groupId: "group-parent", rootSessionId: "planner-root", label: "Parent" },
					}),
					createGroupedSession({
						sessionId: "worker-root",
						label: "Worker",
						status: "error",
						startTime: 20,
						rootTaskId: "root-1",
						sessionGroup: {
							groupId: "group-child",
							rootSessionId: "worker-root",
							parentGroupId: "group-parent",
							label: "Child",
						},
					}),
					createGroupedSession({
						sessionId: "other-root",
						label: "Other Root",
						status: "running",
						startTime: 10,
						rootTaskId: "root-2",
					}),
				]

				store.set(sessionsMapAtom, Object.fromEntries(sessions.map((session) => [session.sessionId, session])))
				store.set(
					sessionOrderAtom,
					sessions.map((session) => session.sessionId),
				)
				store.set(schedulerStateAtom, {
					maxConcurrentStarts: 2,
					activeSessionLoad: 2,
					queuedLaunchCount: 2,
					activeRootCount: 2,
					queuedRootLaunchCount: 2,
					backpressure: true,
					queueKeyPressure: {
						"group-parent": 1,
						"group-child": 2,
					},
				})
				store.set(sessionGroupMessagesAtom, {
					"group-child": {
						messageId: "group-msg-1",
						groupId: "group-child",
						sourceSessionId: "planner-root",
						sourceLabel: "Planner",
						content: "Fallback relay that should be shadowed",
						timestamp: 100,
					},
				})
				store.set(rootTaskMessagesAtom, {
					"root-1": {
						messageId: "root-msg-1",
						rootTaskId: "root-1",
						sourceSessionId: "planner-root",
						sourceLabel: "Planner",
						content: "Return only root summary",
						timestamp: 200,
					},
				})
				store.set(sessionGroupEventsAtom, {
					"group-child": {
						groupId: "group-child",
						sessionId: "worker-root",
						eventType: "error",
						summary: "Loop detected while retrying",
						timestamp: 150,
					},
				})

				expect(store.get(rootTaskRollupAtom)).toEqual({
					summaryLabel: "Branches 2 · A1 · Err 1",
					pressureLabel: "root pressure 2 · throttled",
					queueLabel: "root queue 2 · active roots 2",
					relayLabel: "root Planner -> Return only root s",
					guardrailLabel: "root guard loop",
					problemLabel: "root issues 1",
				})
			})
		})
	})
})
