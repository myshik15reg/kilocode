import { describe, expect, it, vi } from "vitest"
import {
	AGENT_MANAGER_RECOVERY_STATE_KEY,
	buildRestoredBackgroundSessionCreateOptions,
	listBackgroundSubagentBindings,
	mapSessionToBackgroundSubagentState,
	persistBackgroundBindingsToWorkspaceState,
	planPersistedBackgroundBindingRestoration,
	prepareBackgroundSubagentLaunch,
	type BackgroundSessionBinding,
} from "../BackgroundSubagentLifecycle"
import type { AgentSession } from "../types"
import type { SubagentLaunchRequest } from "@roo-code/types"

function createRequest(overrides: Partial<SubagentLaunchRequest> = {}): SubagentLaunchRequest {
	return {
		parentTaskId: "parent-1",
		rootTaskId: "root-1",
		targetTaskId: "child-1",
		mode: "code",
		handoff: { summary: "Do work" },
		execution: "background",
		isolation: "shared",
		relayPolicy: "parent_only",
		...overrides,
	}
}

function createSession(overrides: Partial<AgentSession> = {}): AgentSession {
	return {
		sessionId: "child-1",
		label: "Background: code",
		prompt: "Do work",
		status: "running",
		startTime: 1,
		logs: [],
		source: "local",
		mode: "code",
		lastEventAt: 123,
		...overrides,
	} as AgentSession
}

describe("BackgroundSubagentLifecycle", () => {
	it("prepares background launch data with normalized legacy defaults", () => {
		const launch = prepareBackgroundSubagentLaunch({
			parentTaskId: "parent-legacy",
			rootTaskId: "root-legacy",
			mode: "code",
			handoff: { summary: "Do work", context: ["ctx-a", "ctx-b"] },
		} as SubagentLaunchRequest)

		expect(launch).toEqual({
			normalizedRequest: expect.objectContaining({
				parentTaskId: "parent-legacy",
				rootTaskId: "root-legacy",
				execution: "foreground",
				isolation: "auto",
				relayPolicy: "parent_only",
			}),
			sessionId: "parent-legacy",
			prompt: "Do work\n\nctx-a\nctx-b",
			queueKey: "root-legacy",
		})
	})

	it("maps recoverable and runtime states to background subagent states", () => {
		expect(
			mapSessionToBackgroundSubagentState(
				createSession({ status: "stopped", lifecycleStatus: "recoverable", recoveryState: "recoverable" }),
			),
		).toBe("paused")
		expect(
			mapSessionToBackgroundSubagentState(createSession({ status: "running", activityState: "waiting_input" })),
		).toBe("waiting_input")
		expect(mapSessionToBackgroundSubagentState(createSession({ status: "done" }))).toBe("completed")
	})

	it("persists serialized bindings using workspace recovery key", async () => {
		const workspaceState = {
			update: vi.fn().mockResolvedValue(undefined),
			get: vi.fn(),
		}
		const bindings = new Map<string, BackgroundSessionBinding>([
			[
				"child-1",
				{
					request: createRequest(),
					taskId: "child-1",
				},
			],
		])
		const session = createSession({ lifecycleStatus: "paused", activityState: "paused", status: "stopped" })

		await persistBackgroundBindingsToWorkspaceState(
			workspaceState,
			bindings,
			() => session,
			() => 999,
		)

		expect(workspaceState.update).toHaveBeenCalledWith(AGENT_MANAGER_RECOVERY_STATE_KEY, {
			backgroundBindings: [
				{
					sessionId: "child-1",
					taskId: "child-1",
					request: createRequest(),
					lastKnownState: "paused",
					updatedAt: 123,
				},
			],
		})
	})

	it("plans restoration by normalizing active snapshots and filtering terminal bindings", () => {
		const restoration = planPersistedBackgroundBindingRestoration(
			{
				backgroundBindings: [
					{
						sessionId: "child-running",
						taskId: "child-running",
						request: createRequest({ targetTaskId: "child-running" }),
						lastKnownState: "running",
						updatedAt: 456,
					},
					{
						sessionId: "child-completed",
						taskId: "child-completed",
						request: createRequest({ targetTaskId: "child-completed" }),
						lastKnownState: "completed",
						updatedAt: 789,
					},
				],
			},
			{
				getHistoryItem: (sessionId) =>
					sessionId === "child-running"
						? {
								id: "child-running",
								rootTaskId: "root-1",
								parentTaskId: "parent-1",
								number: 1,
								ts: 400,
								task: "Do work",
								tokensIn: 0,
								tokensOut: 0,
								totalCost: 0,
							}
						: {
								id: "child-completed",
								rootTaskId: "root-1",
								parentTaskId: "parent-1",
								number: 2,
								ts: 500,
								task: "Done",
								tokensIn: 0,
								tokensOut: 0,
								totalCost: 0,
								lifecycleState: "completed",
							},
				getExistingSession: () => undefined,
			},
		)

		expect(restoration.terminalSessionIds).toEqual(["child-completed"])
		expect(restoration.removedTerminalBindings).toBe(true)
		expect(restoration.plans).toEqual([
			expect.objectContaining({
				sessionId: "child-running",
				binding: expect.objectContaining({
					taskId: "child-running",
					request: expect.objectContaining({ targetTaskId: "child-running" }),
				}),
				restoredLifecycleStatus: "recoverable",
				restoredActivityState: "active",
				restoredRecoveryState: "recoverable",
			}),
		])
	})

	it("keeps terminal bindings for reconciliation when parent history is not terminal yet", () => {
		const restoration = planPersistedBackgroundBindingRestoration(
			{
				backgroundBindings: [
					{
						sessionId: "child-completed",
						taskId: "child-completed",
						request: createRequest({ targetTaskId: "child-completed" }),
						lastKnownState: "completed",
						updatedAt: 789,
					},
					{
						sessionId: "child-failed",
						taskId: "child-failed",
						request: createRequest({ targetTaskId: "child-failed" }),
						lastKnownState: "failed",
						updatedAt: 790,
					},
				],
			},
			{
				getHistoryItem: (sessionId) => ({
					id: sessionId,
					rootTaskId: "root-1",
					parentTaskId: "parent-1",
					number: 1,
					ts: 500,
					task: sessionId,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					lifecycleState: "running",
				}),
				getExistingSession: () => undefined,
			},
		)

		expect(restoration.terminalSessionIds).toEqual([])
		expect(restoration.removedTerminalBindings).toBe(false)
		expect(restoration.plans).toEqual([
			expect.objectContaining({
				sessionId: "child-completed",
				restoredLifecycleStatus: "completed",
				restoredActivityState: "idle",
				restoredRecoveryState: undefined,
				restoredPendingReaction: undefined,
			}),
			expect.objectContaining({
				sessionId: "child-failed",
				restoredLifecycleStatus: "failed",
				restoredActivityState: "idle",
				restoredRecoveryState: undefined,
				restoredPendingReaction: undefined,
			}),
		])
	})

	it("lists bindings with paused recoverable status and queued fallback", () => {
		const bindings = new Map<string, BackgroundSessionBinding>([
			["child-paused", { request: createRequest({ targetTaskId: "child-paused" }), taskId: "child-paused" }],
			["child-queued", { request: createRequest({ targetTaskId: "child-queued" }), taskId: "child-queued" }],
		])
		const sessions = new Map<string, AgentSession>([
			[
				"child-paused",
				createSession({
					sessionId: "child-paused",
					status: "stopped",
					lifecycleStatus: "recoverable",
					recoveryState: "recoverable",
					lastEventAt: 333,
				}),
			],
		])

		expect(
			listBackgroundSubagentBindings(
				bindings,
				(sessionId) => sessions.get(sessionId),
				() => 999,
			),
		).toEqual([
			{
				request: createRequest({ targetTaskId: "child-paused" }),
				taskId: "child-paused",
				sessionId: "child-paused",
				status: "paused",
				updatedAt: 333,
			},
			{
				request: createRequest({ targetTaskId: "child-queued" }),
				taskId: "child-queued",
				sessionId: "child-queued",
				status: "queued",
				updatedAt: 999,
			},
		])
	})

	it("builds restored session create options from restoration plan", () => {
		const options = buildRestoredBackgroundSessionCreateOptions({
			sessionId: "child-1",
			binding: {
				request: createRequest({ isolation: "worktree" }),
				taskId: "child-1",
			},
			historyItem: {
				id: "child-1",
				rootTaskId: "root-1",
				parentTaskId: "parent-1",
				number: 1,
				ts: 100,
				task: "Do work",
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				lastStopSummary: "Resume here",
			},
			updatedAt: 777,
			restoredLifecycleStatus: "paused",
			restoredActivityState: "paused",
			restoredRecoveryState: "recoverable",
			restoredPendingReaction: "resume",
		})

		expect(options).toEqual(
			expect.objectContaining({
				labelOverride: "Background: code",
				parallelMode: true,
				mode: "code",
				taskId: "child-1",
				rootTaskId: "root-1",
				parentTaskId: "parent-1",
				lifecycleStatus: "paused",
				activityState: "paused",
				recoveryState: "recoverable",
				pendingReaction: "resume",
				restartHandoff: "Resume here",
				lastEventAt: 777,
				sessionGroup: {
					groupId: "root-1",
					rootSessionId: "root-1",
					label: "subagent:parent-1",
				},
			}),
		)
	})
})
