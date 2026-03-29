// kilocode_change - new file
import type {
	ExecutionDecision,
	PlannedToolCall,
	SubagentLaunchRequest,
	ToolBatchRequest,
	ToolBatchResult,
	ToolCallCandidate,
} from "@roo-code/types"

import { ToolBatchPlanner } from "./subtooling/ToolBatchPlanner"
import { ToolBatchExecutor } from "./subtooling/ToolBatchExecutor"

export interface OrchestrationDispatchCallbacks {
	executeToolBatch(call: PlannedToolCall): Promise<string>
	executeSubagent(call: ToolCallCandidate, request: SubagentLaunchRequest): Promise<string | undefined>
}

export type OrchestrationDispatchOutcome =
	| {
			handled: false
			route: "direct"
			decision: ExecutionDecision
			reason: string
	  }
	| {
			handled: true
			route: "subtooling"
			decision: ExecutionDecision
			batchResult: ToolBatchResult
	  }
	| {
			handled: true
			route: "subagent"
			decision: ExecutionDecision
			result: {
				callId?: string
				tool: string
				content: string
			}
	  }

function isToolBatchRequestPayload(payload: ExecutionDecision["payload"]): payload is ToolBatchRequest {
	return Boolean(payload && typeof payload === "object" && "calls" in payload && Array.isArray(payload.calls))
}

function isSubagentLaunchRequestPayload(payload: ExecutionDecision["payload"]): payload is SubagentLaunchRequest {
	return Boolean(
		payload &&
			typeof payload === "object" &&
			"parentTaskId" in payload &&
			"rootTaskId" in payload &&
			"mode" in payload &&
			"handoff" in payload,
	)
}

export class OrchestrationDispatcher {
	constructor(
		private readonly toolBatchPlanner = new ToolBatchPlanner(),
		private readonly toolBatchExecutor = new ToolBatchExecutor(),
	) {}

	async dispatch(
		decision: ExecutionDecision,
		candidateToolCalls: ToolCallCandidate[],
		callbacks: OrchestrationDispatchCallbacks,
	): Promise<OrchestrationDispatchOutcome> {
		switch (decision.kind) {
			case "subtooling": {
				if (!isToolBatchRequestPayload(decision.payload)) {
					return this.buildDirectFallback(decision, "Subtooling payload is missing or unsafe.")
				}

				const plan = this.toolBatchPlanner.plan(decision.payload)
				if (plan.parallelGroups.length === 0 && plan.sequentialCalls.length === 0) {
					return this.buildDirectFallback(decision, "Subtooling plan contains no runnable calls.")
				}

				const batchResult = await this.toolBatchExecutor.execute(decision.payload, plan, {
					execute: callbacks.executeToolBatch,
				})

				return {
					handled: true,
					route: "subtooling",
					decision,
					batchResult,
				}
			}

			case "subagent": {
				if (!isSubagentLaunchRequestPayload(decision.payload)) {
					return this.buildDirectFallback(decision, "Subagent payload is missing or unsafe.")
				}

				if (candidateToolCalls.length !== 1 || candidateToolCalls[0]?.tool !== "new_task") {
					return this.buildDirectFallback(
						decision,
						"Subagent routing in this slice supports only a single background new_task call.",
					)
				}

				const [candidate] = candidateToolCalls
				const content = await callbacks.executeSubagent(candidate, decision.payload)
				if (!content) {
					return this.buildDirectFallback(decision, "Subagent launch downgraded to the direct path.")
				}

				return {
					handled: true,
					route: "subagent",
					decision,
					result: {
						callId: candidate.callId,
						tool: candidate.tool,
						content,
					},
				}
			}

			case "direct":
			default:
				return this.buildDirectFallback(decision, decision.reason)
		}
	}

	private buildDirectFallback(decision: ExecutionDecision, reason: string): OrchestrationDispatchOutcome {
		return {
			handled: false,
			route: "direct",
			decision,
			reason,
		}
	}
}
