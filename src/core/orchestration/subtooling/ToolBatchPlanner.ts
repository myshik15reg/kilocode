// kilocode_change - new file
import type { ToolBatchPlan, ToolBatchRequest } from "@roo-code/types"

import { enrichPlannedToolCall } from "../policy/toolMetadata"

export class ToolBatchPlanner {
	plan(request: ToolBatchRequest): ToolBatchPlan {
		const parallelCalls = []
		const sequentialCalls = []
		const rejectedCalls: ToolBatchPlan["rejectedCalls"] = []

		for (const candidate of request.calls) {
			const planned = enrichPlannedToolCall(candidate)

			if (planned.readOnly !== true) {
				rejectedCalls.push({ tool: planned.tool, reason: "Tool is not read-only." })
				continue
			}

			if (planned.batchable !== true) {
				rejectedCalls.push({ tool: planned.tool, reason: "Tool is not batchable." })
				continue
			}

			if (planned.parallelSafe === true) {
				parallelCalls.push(planned)
			} else {
				sequentialCalls.push(planned)
			}
		}

		return {
			requestId: request.requestId ?? `tool-batch-${request.taskId}`,
			parallelGroups: parallelCalls.length > 0 ? [parallelCalls] : [],
			sequentialCalls,
			rejectedCalls,
		}
	}
}
