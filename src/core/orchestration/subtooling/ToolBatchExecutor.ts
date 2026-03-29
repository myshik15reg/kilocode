// kilocode_change - new file
import type {
	PlannedToolCall,
	ToolBatchPlan,
	ToolBatchRequest,
	ToolBatchResult,
	ToolCallError,
	ToolCallResult,
} from "@roo-code/types"

import { publishOrchestrationActivity } from "../events/publish"

export interface ToolBatchExecuteCallbacks {
	execute(call: PlannedToolCall): Promise<string>
}

function buildSummary(results: ToolCallResult[], errors: ToolCallError[]): string {
	const successCount = results.filter((item) => item.success).length
	const errorCount = errors.length

	if (successCount > 0 && errorCount === 0) {
		return `Tool batch completed successfully (${successCount} calls).`
	}

	if (successCount > 0 && errorCount > 0) {
		return `Tool batch completed with partial failures (${successCount} succeeded, ${errorCount} failed).`
	}

	return `Tool batch failed (${errorCount} calls failed).`
}

function getResultStatus(results: ToolCallResult[], errors: ToolCallError[]): ToolBatchResult["status"] {
	const successCount = results.filter((item) => item.success).length

	if (successCount > 0 && errors.length === 0) {
		return "completed"
	}

	if (successCount > 0 && errors.length > 0) {
		return "partial"
	}

	return "failed"
}

async function settleCall(
	call: PlannedToolCall,
	callbacks: ToolBatchExecuteCallbacks,
): Promise<{ result?: ToolCallResult; error?: ToolCallError }> {
	try {
		const content = await callbacks.execute(call)
		return {
			result: {
				callId: call.callId,
				tool: call.tool,
				content,
				success: true,
			},
		}
	} catch (error) {
		return {
			error: {
				callId: call.callId,
				tool: call.tool,
				message: error instanceof Error ? error.message : String(error),
			},
		}
	}
}

export class ToolBatchExecutor {
	async execute(
		request: ToolBatchRequest,
		plan: ToolBatchPlan,
		callbacks: ToolBatchExecuteCallbacks,
	): Promise<ToolBatchResult> {
		const results: ToolCallResult[] = []
		const errors: ToolCallError[] = []
		const totalCalls = plan.parallelGroups.flat().length + plan.sequentialCalls.length
		let settledCalls = 0

		await publishOrchestrationActivity({
			taskId: request.taskId,
			activity: {
				kind: "toolBatch",
				id: `tool-batch-${request.requestId}-started`,
				requestId: request.requestId ?? plan.requestId,
				taskId: request.taskId,
				status: "started",
				summary: `Running tool batch for ${totalCalls} read-only calls.`,
				timestamp: Date.now(),
			},
		})

		for (const group of plan.parallelGroups) {
			const settled = await Promise.all(group.map((call) => settleCall(call, callbacks)))

			for (const item of settled) {
				if (item.result) {
					results.push(item.result)
				}
				if (item.error) {
					errors.push(item.error)
				}
				settledCalls++
			}

			await publishOrchestrationActivity({
				taskId: request.taskId,
				activity: {
					kind: "toolBatch",
					id: `tool-batch-${request.requestId}-progress-${settledCalls}`,
					requestId: request.requestId ?? plan.requestId,
					taskId: request.taskId,
					status: "progress",
					summary: `Tool batch progress: ${settledCalls}/${totalCalls} calls settled.`,
					timestamp: Date.now(),
				},
			})
		}

		for (const call of plan.sequentialCalls) {
			const settled = await settleCall(call, callbacks)

			if (settled.result) {
				results.push(settled.result)
			}
			if (settled.error) {
				errors.push(settled.error)
			}

			settledCalls++
			await publishOrchestrationActivity({
				taskId: request.taskId,
				activity: {
					kind: "toolBatch",
					id: `tool-batch-${request.requestId}-progress-${settledCalls}`,
					requestId: request.requestId ?? plan.requestId,
					taskId: request.taskId,
					status: "progress",
					summary: `Tool batch progress: ${settledCalls}/${totalCalls} calls settled.`,
					timestamp: Date.now(),
				},
			})
		}

		const status = getResultStatus(results, errors)
		const summary = buildSummary(results, errors)

		await publishOrchestrationActivity({
			taskId: request.taskId,
			activity: {
				kind: "toolBatch",
				id: `tool-batch-${request.requestId}-${status}`,
				requestId: request.requestId ?? plan.requestId,
				taskId: request.taskId,
				status: status === "failed" ? "failed" : "completed",
				summary,
				timestamp: Date.now(),
			},
		})

		return {
			requestId: request.requestId ?? plan.requestId,
			status,
			results,
			errors,
			summary,
		}
	}
}
