// kilocode_change - new file
import type { StreamEvent } from "./CliOutputParser"
import type { RuntimeProcessHandler } from "./RuntimeProcessHandler"
import type { NormalizedAgentSpawnPlan } from "./AgentManagerSessionSpawnPlanner"

export type AgentManagerSpawnExecutionFailureReason = "missing-workspace"

export type AgentManagerSpawnExecutionResult =
	| {
			kind: "spawned"
	  }
	| {
			kind: "failed"
			reason: AgentManagerSpawnExecutionFailureReason
	  }

export interface AgentManagerSpawnExecutorDeps {
	processHandler: Pick<RuntimeProcessHandler, "spawnProcess">
	processStartTimes: Map<string, number>
	forwardCliEvent: (sessionId: string, event: StreamEvent) => void
	log: (message: string) => void
}

/**
 * Executes an already-normalized spawn plan by handing it off to RuntimeProcessHandler.
 *
 * Responsibilities intentionally limited to:
 * - final workspace prerequisite validation for runtime execution
 * - RuntimeProcessHandler.spawnProcess() invocation
 * - process-start-time/event forwarding adapter wiring
 */
export class AgentManagerSpawnExecutor {
	constructor(private readonly deps: AgentManagerSpawnExecutorDeps) {}

	public async executeSpawnPlan(spawnPlan: NormalizedAgentSpawnPlan): Promise<AgentManagerSpawnExecutionResult> {
		if (!spawnPlan.workspace) {
			this.deps.log("ERROR: No workspace folder open")
			return {
				kind: "failed",
				reason: "missing-workspace",
			}
		}

		// RuntimeProcessHandler uses fork() with agent-runtime, cliPath is ignored.
		this.deps.processHandler.spawnProcess(
			"",
			spawnPlan.workspace,
			spawnPlan.prompt,
			{
				...spawnPlan.spawnOptions,
				worktreeInfo: spawnPlan.spawnOptions.worktreeInfo,
			},
			(sessionId, event) => this.forwardCliEvent(sessionId, event, spawnPlan.processStartTime),
		)

		return { kind: "spawned" }
	}

	private forwardCliEvent(sessionId: string, event: StreamEvent, processStartTime: number): void {
		if (!this.deps.processStartTimes.has(sessionId)) {
			this.deps.processStartTimes.set(sessionId, processStartTime)
		}

		this.deps.forwardCliEvent(sessionId, event)
	}
}
