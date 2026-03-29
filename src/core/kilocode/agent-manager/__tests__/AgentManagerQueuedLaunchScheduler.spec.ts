import { describe, expect, it, vi } from "vitest"
import {
	AgentManagerQueuedLaunchScheduler,
	getQueuedSessionLaunchQueueKey,
	getQueuedSessionLaunchRootScopeKey,
	type QueuedSessionLaunch,
} from "../AgentManagerQueuedLaunchScheduler"

function createScheduler(overrides: Partial<ConstructorParameters<typeof AgentManagerQueuedLaunchScheduler>[0]> = {}) {
	const deps = {
		hasSessionLaunchCapacity: vi.fn(() => true),
		hasQueueKeyCapacity: vi.fn(() => true),
		getActiveSessionLoad: vi.fn(() => 0),
		getMaxConcurrentSessionStarts: vi.fn(() => 4),
		startLaunch: vi.fn().mockResolvedValue(undefined),
		log: vi.fn(),
		...overrides,
	}

	return {
		deps,
		scheduler: new AgentManagerQueuedLaunchScheduler(deps),
	}
}

function createQueuedLaunch(overrides: Partial<QueuedSessionLaunch> = {}): QueuedSessionLaunch {
	return {
		prompt: "launch",
		queueKey: "group-1",
		rootScopeKey: "root-1",
		options: { sessionGroup: { groupId: "group-1", rootSessionId: "root-1" } },
		...overrides,
	}
}

describe("AgentManagerQueuedLaunchScheduler", () => {
	it("derives queue and root scope keys from session group or session id", () => {
		expect(
			getQueuedSessionLaunchQueueKey({
				sessionGroup: { groupId: "group-a", rootSessionId: "root-a" },
				sessionId: "session-a",
			}),
		).toBe("group-a")
		expect(
			getQueuedSessionLaunchRootScopeKey({
				sessionGroup: { groupId: "group-a", rootSessionId: "root-a" },
				sessionId: "session-a",
			}),
		).toBe("root-a")
		expect(getQueuedSessionLaunchQueueKey({ sessionId: "session-a" })).toBe("session-a")
		expect(getQueuedSessionLaunchRootScopeKey({ sessionId: "session-a" })).toBe("session-a")
		expect(getQueuedSessionLaunchQueueKey()).toBe("root:default")
		expect(getQueuedSessionLaunchRootScopeKey()).toBe("root:default")
	})

	it("queues launches once backpressure is present and logs queue depth", async () => {
		const { scheduler, deps } = createScheduler({
			hasSessionLaunchCapacity: vi.fn(() => false),
			getActiveSessionLoad: vi.fn(() => 2),
			getMaxConcurrentSessionStarts: vi.fn(() => 2),
		})

		await scheduler.startOrEnqueue("queued prompt", { sessionId: "session-2" })

		expect(deps.startLaunch).not.toHaveBeenCalled()
		expect(scheduler.queuedLaunches).toEqual([
			expect.objectContaining({
				prompt: "queued prompt",
				queueKey: "session-2",
				rootScopeKey: "session-2",
			}),
		])
		expect(deps.log).toHaveBeenCalledWith("[AgentManager] Queued session launch (1 waiting, active=2, limit=2)")
	})

	it("fairly alternates queued launches across groups and root scopes", () => {
		const { scheduler } = createScheduler()
		scheduler.replaceQueuedLaunches([
			createQueuedLaunch({ prompt: "g1-first" }),
			createQueuedLaunch({ prompt: "g1-second" }),
			createQueuedLaunch({
				prompt: "g2-first",
				queueKey: "group-2",
				rootScopeKey: "root-2",
				options: { sessionGroup: { groupId: "group-2", rootSessionId: "root-2" } },
			}),
		])

		const first = scheduler.dequeueNextLaunch()
		const second = scheduler.dequeueNextLaunch()
		const third = scheduler.dequeueNextLaunch()

		expect(first?.prompt).toBe("g1-first")
		expect(second?.prompt).toBe("g2-first")
		expect(third?.prompt).toBe("g1-second")
	})

	it("skips launches whose queue key has no capacity", () => {
		const { scheduler } = createScheduler({
			hasQueueKeyCapacity: vi.fn((queueKey: string) => queueKey !== "group-1"),
		})
		scheduler.replaceQueuedLaunches([
			createQueuedLaunch({ prompt: "g1-queued" }),
			createQueuedLaunch({
				prompt: "g2-queued",
				queueKey: "group-2",
				rootScopeKey: "root-2",
				options: { sessionGroup: { groupId: "group-2", rootSessionId: "root-2" } },
			}),
		])

		const next = scheduler.dequeueNextLaunch()

		expect(next?.prompt).toBe("g2-queued")
		expect(scheduler.queuedLaunches).toHaveLength(1)
		expect(scheduler.queuedLaunches[0].prompt).toBe("g1-queued")
	})

	it("drains queued launches sequentially while capacity remains", async () => {
		const { scheduler, deps } = createScheduler()
		scheduler.replaceQueuedLaunches([
			createQueuedLaunch({ prompt: "first", options: { sessionId: "s1", labelOverride: "First" } }),
			createQueuedLaunch({
				prompt: "second",
				queueKey: "group-2",
				rootScopeKey: "root-2",
				options: { sessionId: "s2", sessionGroup: { groupId: "group-2", rootSessionId: "root-2" } },
			}),
		])

		await scheduler.drainQueuedLaunches()

		expect(deps.startLaunch).toHaveBeenNthCalledWith(1, "first", { sessionId: "s1", labelOverride: "First" })
		expect(deps.startLaunch).toHaveBeenNthCalledWith(2, "second", {
			sessionId: "s2",
			sessionGroup: { groupId: "group-2", rootSessionId: "root-2" },
		})
		expect(deps.log).toHaveBeenNthCalledWith(1, "[AgentManager] Dequeued session launch: First")
		expect(deps.log).toHaveBeenNthCalledWith(2, "[AgentManager] Dequeued session launch")
		expect(scheduler.queuedLaunches).toHaveLength(0)
	})

	it("removes queued launches by predicate and returns removed items", () => {
		const { scheduler } = createScheduler()
		scheduler.replaceQueuedLaunches([
			createQueuedLaunch({ prompt: "keep", queueKey: "keep", rootScopeKey: "root-keep" }),
			createQueuedLaunch({ prompt: "remove", queueKey: "remove", rootScopeKey: "root-remove" }),
		])

		const removed = scheduler.removeQueuedLaunches((launch) => launch.queueKey === "remove")

		expect(removed.map((launch) => launch.prompt)).toEqual(["remove"])
		expect(scheduler.queuedLaunches.map((launch) => launch.prompt)).toEqual(["keep"])
	})
})
