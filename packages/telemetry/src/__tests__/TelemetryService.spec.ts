import { describe, expect, it, vi } from "vitest"

import { TelemetryEventName, type TelemetryClient } from "@roo-code/types"

import { TelemetryService } from "../TelemetryService"

describe("TelemetryService", () => {
	function createClient(): TelemetryClient {
		return {
			setProvider: vi.fn(),
			capture: vi.fn().mockResolvedValue(undefined),
			captureException: vi.fn(),
			updateIdentity: vi.fn().mockResolvedValue(undefined),
			updateTelemetryState: vi.fn(),
			isTelemetryEnabled: vi.fn().mockReturnValue(true),
			shutdown: vi.fn().mockResolvedValue(undefined),
		}
	}

	it("captures task completion outcomes with summary properties", () => {
		const client = createClient()
		const service = new TelemetryService([client])

		service.captureTaskOutcomeCompleted("task-1", {
			toolCount: 3,
			toolFailureCount: 1,
			inputTokens: 120,
			outputTokens: 45,
			cacheWriteTokens: 2,
			cacheReadTokens: 4,
			totalCost: 0.012,
		})

		expect(client.capture).toHaveBeenCalledWith({
			event: TelemetryEventName.TASK_OUTCOME_COMPLETED,
			properties: {
				taskId: "task-1",
				toolCount: 3,
				toolFailureCount: 1,
				inputTokens: 120,
				outputTokens: 45,
				cacheWriteTokens: 2,
				cacheReadTokens: 4,
				totalCost: 0.012,
			},
		})
	})

	it("captures task delegation outcomes", () => {
		const client = createClient()
		const service = new TelemetryService([client])

		service.captureTaskOutcomeDelegated("parent-1", {
			childTaskId: "child-1",
			execution: "background",
			delegationDepth: 2,
			isBackground: true,
		})

		expect(client.capture).toHaveBeenCalledWith({
			event: TelemetryEventName.TASK_OUTCOME_DELEGATED,
			properties: {
				taskId: "parent-1",
				childTaskId: "child-1",
				execution: "background",
				delegationDepth: 2,
				isBackground: true,
			},
		})
	})

	it("captures delegation lifecycle completion, resume, and handoff events", () => {
		const client = createClient()
		const service = new TelemetryService([client])

		service.captureDelegationCompleted("parent-1", "child-1")
		service.captureDelegationResumed("parent-1", "child-1")
		service.captureDelegationHandoffUsed("parent-1", "child-1", "sequential", true)
		service.captureDelegationAbstained("parent-1", "child-1", "insufficient_context")

		expect(client.capture).toHaveBeenNthCalledWith(1, {
			event: TelemetryEventName.DELEGATION_COMPLETED,
			properties: {
				taskId: "parent-1",
				childTaskId: "child-1",
			},
		})
		expect(client.capture).toHaveBeenNthCalledWith(2, {
			event: TelemetryEventName.DELEGATION_RESUMED,
			properties: {
				taskId: "parent-1",
				childTaskId: "child-1",
			},
		})
		expect(client.capture).toHaveBeenNthCalledWith(3, {
			event: TelemetryEventName.DELEGATION_HANDOFF_USED,
			properties: {
				taskId: "parent-1",
				childTaskId: "child-1",
				handoffStrategy: "sequential",
				canAbstain: true,
			},
		})
		expect(client.capture).toHaveBeenNthCalledWith(4, {
			event: TelemetryEventName.DELEGATION_ABSTAINED,
			properties: {
				taskId: "parent-1",
				childTaskId: "child-1",
				reason: "insufficient_context",
			},
		})
	})

	it("captures task error outcomes", () => {
		const client = createClient()
		const service = new TelemetryService([client])

		service.captureTaskOutcomeError("task-err", {
			reason: "mistake_limit_reached",
			source: "task_loop",
		})

		expect(client.capture).toHaveBeenCalledWith({
			event: TelemetryEventName.TASK_OUTCOME_ERROR,
			properties: {
				taskId: "task-err",
				reason: "mistake_limit_reached",
				source: "task_loop",
			},
		})
	})
})
