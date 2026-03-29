import { describe, expect, it, vi } from "vitest"
import { AgentRegistry } from "../AgentRegistry"
import { BackgroundSubagentBindingCoordinator } from "../BackgroundSubagentBindingCoordinator"
import type {
	BackgroundSessionBinding,
	PlannedBackgroundBindingRestoration,
	RestoredBackgroundBindingPlan,
} from "../BackgroundSubagentLifecycle"
import type { AgentSession, AgentStatus } from "../types"
import type { SubagentLaunchRequest } from "@roo-code/types"

function createRequest(overrides: Partial<SubagentLaunchRequest> = {}): SubagentLaunchRequest {
	return {
		parentTaskId: "parent-1",
		rootTaskId: "root-1",
		targetTaskId: "child-1",
		mode: "code",
		handoff: { summary: "Do work", context: ["ctx-a"] },
		execution: "background",
		isolation: "shared",
		relayPolicy: "parent_only",
		...overrides,
	}
}

function createRestorationPlan(overrides: Partial<RestoredBackgroundBindingPlan> = {}): RestoredBackgroundBindingPlan {
	return {
		sessionId: "child-1",
		binding: {
			request: createRequest(),
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
			lifecycleState: "paused",
			pauseReason: "Waiting for resume",
			lastStopSummary: "Resume here",
			resumeContextSummary: "Resume from checkpoint",
		},
		updatedAt: 777,
		restoredLifecycleStatus: "paused",
		restoredActivityState: "paused",
		restoredRecoveryState: "recoverable",
		restoredPendingReaction: "resume",
		...overrides,
	}
}

describe("BackgroundSubagentBindingCoordinator", () => {
	it("prepares normalized background launch binding and start options", async () => {
		const backgroundSessionBindings = new Map<string, BackgroundSessionBinding>()
		const bindSession = vi.fn(async (sessionId: string, binding: BackgroundSessionBinding) => {
			backgroundSessionBindings.set(sessionId, binding)
		})
		const coordinator = new BackgroundSubagentBindingCoordinator({
			backgroundSessionBindings,
			bindSession,
			renameBinding: vi.fn(),
			hasQueuedLaunches: () => true,
			hasBackgroundSubagentCapacity: () => true,
			getSession: () => undefined,
			createSession: vi.fn(),
			updateSessionStatus: vi.fn(),
			updateSession: vi.fn(),
			persistBindings: vi.fn(),
		})

		const launch = await coordinator.prepareLaunch(
			createRequest({
				parentTaskId: "parent-legacy",
				rootTaskId: "root-legacy",
				targetTaskId: undefined,
				handoff: { summary: "Do work" },
				helperProfile: "helper-profile",
			}) as SubagentLaunchRequest,
		)

		expect(bindSession).toHaveBeenCalledWith(
			"parent-legacy",
			expect.objectContaining({
				taskId: "parent-legacy",
				request: expect.objectContaining({
					parentTaskId: "parent-legacy",
					rootTaskId: "root-legacy",
					execution: "background",
					isolation: "shared",
					helperProfile: "helper-profile",
				}),
			}),
		)
		expect(launch).toEqual({
			taskId: "parent-legacy",
			sessionId: "parent-legacy",
			prompt: "Do work",
			queued: true,
			startOptions: {
				parallelMode: false,
				labelOverride: "Background: code",
				sessionId: "parent-legacy",
				mode: "code",
				helperProfile: "helper-profile",
				sessionGroup: {
					groupId: "root-legacy",
					rootSessionId: "root-legacy",
					label: "subagent:parent-legacy",
				},
			},
		})
	})

	it("applies planned restoration and persists only when terminal bindings were removed", async () => {
		const registry = new AgentRegistry()
		const backgroundSessionBindings = new Map<string, BackgroundSessionBinding>([
			[
				"terminal-child",
				{ request: createRequest({ targetTaskId: "terminal-child" }), taskId: "terminal-child" },
			],
		])
		const persistBindings = vi.fn().mockResolvedValue(undefined)
		const coordinator = new BackgroundSubagentBindingCoordinator({
			backgroundSessionBindings,
			bindSession: vi.fn(),
			renameBinding: vi.fn(),
			hasQueuedLaunches: () => false,
			hasBackgroundSubagentCapacity: () => true,
			getSession: (sessionId) => registry.getSession(sessionId),
			createSession: (sessionId, prompt, startTime, options) =>
				registry.createSession(sessionId, prompt, startTime, options),
			updateSessionStatus: (sessionId, status, exitCode, error) =>
				registry.updateSessionStatus(sessionId, status, exitCode, error),
			updateSession: (sessionId, patch) => registry.updateSession(sessionId, patch),
			persistBindings,
		})
		const restoration: PlannedBackgroundBindingRestoration = {
			plans: [createRestorationPlan()],
			terminalSessionIds: ["terminal-child"],
			removedTerminalBindings: true,
		}

		await coordinator.applyPlannedRestoration(restoration)

		expect(backgroundSessionBindings.has("terminal-child")).toBe(false)
		expect(backgroundSessionBindings.get("child-1")).toEqual({
			request: expect.objectContaining({ targetTaskId: "child-1" }),
			taskId: "child-1",
		})
		expect(registry.getSession("child-1")).toMatchObject({
			taskId: "child-1",
			rootTaskId: "root-1",
			parentTaskId: "parent-1",
			status: "stopped",
			lifecycleStatus: "paused",
			activityState: "paused",
			recoveryState: "recoverable",
			pendingReaction: "resume",
			lastStopSummary: "Resume here",
			restartHandoff: "Resume from checkpoint",
			lastEventAt: 777,
		})
		expect(persistBindings).toHaveBeenCalledTimes(1)
	})

	it("rebinds renamed background session ids through the delegated seam", () => {
		const backgroundSessionBindings = new Map<string, BackgroundSessionBinding>([
			["old-id", { request: createRequest({ targetTaskId: "old-id" }), taskId: "old-id" }],
		])
		const renameBinding = vi.fn((oldId: string, newId: string) => {
			const binding = backgroundSessionBindings.get(oldId)
			if (!binding) {
				return
			}
			backgroundSessionBindings.delete(oldId)
			backgroundSessionBindings.set(newId, binding)
		})
		const coordinator = new BackgroundSubagentBindingCoordinator({
			backgroundSessionBindings,
			bindSession: vi.fn(),
			renameBinding,
			hasQueuedLaunches: () => false,
			hasBackgroundSubagentCapacity: () => true,
			getSession: () => undefined,
			createSession: vi.fn(),
			updateSessionStatus: vi.fn<(sessionId: string, status: AgentStatus) => AgentSession | undefined>(),
			updateSession: vi.fn(),
			persistBindings: vi.fn(),
		})

		coordinator.handleSessionRenamed("old-id", "new-id")

		expect(renameBinding).toHaveBeenCalledWith("old-id", "new-id")
		expect(backgroundSessionBindings.has("old-id")).toBe(false)
		expect(backgroundSessionBindings.get("new-id")).toEqual({
			request: expect.objectContaining({ targetTaskId: "old-id" }),
			taskId: "old-id",
		})
	})
})
