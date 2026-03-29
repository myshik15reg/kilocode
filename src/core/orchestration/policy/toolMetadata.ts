// kilocode_change - new file
import type { ToolCallCandidate, PlannedToolCall } from "@roo-code/types"

export interface ToolExecutionMetadata {
	readOnly: boolean
	batchable: boolean
	parallelSafe: boolean
}

const DEFAULT_TOOL_METADATA: ToolExecutionMetadata = {
	readOnly: false,
	batchable: false,
	parallelSafe: false,
}

const TOOL_METADATA_REGISTRY: Record<string, ToolExecutionMetadata> = {
	read_file: { readOnly: true, batchable: true, parallelSafe: true },
	list_files: { readOnly: true, batchable: true, parallelSafe: true },
	search_files: { readOnly: true, batchable: true, parallelSafe: true },
	fetch_instructions: { readOnly: true, batchable: true, parallelSafe: false },
	codebase_search: { readOnly: true, batchable: true, parallelSafe: false },
	web_search: { readOnly: true, batchable: true, parallelSafe: false },
	access_mcp_resource: { readOnly: true, batchable: true, parallelSafe: false },
}

export function getToolExecutionMetadata(toolName: string): ToolExecutionMetadata {
	return TOOL_METADATA_REGISTRY[toolName] ?? DEFAULT_TOOL_METADATA
}

export function enrichToolCallCandidate(candidate: ToolCallCandidate): ToolCallCandidate {
	const metadata = getToolExecutionMetadata(candidate.tool)

	return {
		...candidate,
		readOnly: candidate.readOnly ?? metadata.readOnly,
		batchable: candidate.batchable ?? metadata.batchable,
		parallelSafe: candidate.parallelSafe ?? metadata.parallelSafe,
	}
}

export function enrichPlannedToolCall(candidate: ToolCallCandidate): PlannedToolCall {
	const enriched = enrichToolCallCandidate(candidate)

	return {
		callId: candidate.callId,
		tool: enriched.tool,
		arguments: enriched.arguments,
		readOnly: enriched.readOnly,
		batchable: enriched.batchable,
		parallelSafe: enriched.parallelSafe,
	}
}

export function isSafeReadOnlyBatchCandidate(candidate: ToolCallCandidate): boolean {
	const enriched = enrichToolCallCandidate(candidate)

	return enriched.readOnly === true && enriched.batchable === true
}
