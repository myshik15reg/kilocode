import { describe, expect, it, vi } from "vitest"
import { AgentManagerSpawnExecutor } from "../AgentManagerSpawnExecutor"
import type { StreamEvent } from "../CliOutputParser"
import type { NormalizedAgentSpawnPlan } from "../AgentManagerSessionSpawnPlanner"

describe("AgentManagerSpawnExecutor", () => {
	const createSpawnPlan = (overrides?: Partial<NormalizedAgentSpawnPlan>): NormalizedAgentSpawnPlan => ({
		prompt: "Implement feature",
		workspace: "/mock/workspace",
		processStartTime: 123,
		spawnOptions: {
			sessionId: "session-1",
			label: "Worker A",
		},
		...overrides,
	})

	it("returns a failure result when workspace is missing", async () => {
		const spawnProcess = vi.fn()
		const log = vi.fn()
		const executor = new AgentManagerSpawnExecutor({
			processHandler: { spawnProcess },
			processStartTimes: new Map(),
			forwardCliEvent: vi.fn(),
			log,
		})

		const result = await executor.executeSpawnPlan(createSpawnPlan({ workspace: "" }))

		expect(result).toEqual({ kind: "failed", reason: "missing-workspace" })
		expect(log).toHaveBeenCalledWith("ERROR: No workspace folder open")
		expect(spawnProcess).not.toHaveBeenCalled()
	})

	it("spawns the runtime process and records process start time only once while forwarding events", async () => {
		const processStartTimes = new Map<string, number>()
		const forwardCliEvent = vi.fn()
		const spawnProcess = vi.fn(
			(
				_cliPath: string,
				_workspace: string,
				_prompt: string,
				_options: unknown,
				onEvent: (sessionId: string, event: StreamEvent) => void,
			) => {
				processStartTimes.set("session-1", 999)
				const event: StreamEvent = { streamEventType: "kilocode", payload: { timestamp: 321 } }
				onEvent("session-1", event)
				const secondEvent: StreamEvent = {
					streamEventType: "status",
					message: "later",
					timestamp: "2026-03-18T20:00:00.000Z",
				}
				onEvent("session-1", secondEvent)
			},
		)
		const executor = new AgentManagerSpawnExecutor({
			processHandler: { spawnProcess },
			processStartTimes,
			forwardCliEvent,
			log: vi.fn(),
		})
		const spawnPlan = createSpawnPlan({
			processStartTime: 123,
			spawnOptions: {
				sessionId: "session-1",
				label: "Worker A",
				worktreeInfo: {
					branch: "feature/a",
					path: "/mock/worktree",
					parentBranch: "main",
				},
			},
		})

		const result = await executor.executeSpawnPlan(spawnPlan)

		expect(result).toEqual({ kind: "spawned" })
		expect(spawnProcess).toHaveBeenCalledWith(
			"",
			"/mock/workspace",
			"Implement feature",
			expect.objectContaining({
				sessionId: "session-1",
				label: "Worker A",
				worktreeInfo: {
					branch: "feature/a",
					path: "/mock/worktree",
					parentBranch: "main",
				},
			}),
			expect.any(Function),
		)
		expect(processStartTimes.get("session-1")).toBe(999)
		expect(forwardCliEvent).toHaveBeenCalledTimes(2)
		expect(forwardCliEvent).toHaveBeenNthCalledWith(
			1,
			"session-1",
			expect.objectContaining({ streamEventType: "kilocode" }),
		)
		expect(forwardCliEvent).toHaveBeenNthCalledWith(
			2,
			"session-1",
			expect.objectContaining({ streamEventType: "status" }),
		)
	})
})
