import { ApiStreamNativeToolCallsChunk } from "./kilocode/api-stream-native-tool-calls-chunk"

export type ApiStream = AsyncGenerator<ApiStreamChunk>

export type ApiStreamChunk =
	| ApiStreamTextChunk
	| ApiStreamUsageChunk
	| ApiStreamNativeToolCallsChunk // kilocode_change
	| ApiStreamReasoningChunk
	| ApiStreamGroundingChunk
	| ApiStreamError

export interface ApiStreamError {
	type: "error"
	error: string
	message: string
}

export interface ApiStreamTextChunk {
	type: "text"
	text: string
}

export interface ApiStreamReasoningChunk {
	type: "reasoning"
	text: string
}

export interface ApiStreamUsageChunk {
	type: "usage"
	inputTokens: number
	outputTokens: number
	cacheWriteTokens?: number
	cacheReadTokens?: number
	reasoningTokens?: number
	totalCost?: number
	inferenceProvider?: string // kilocode_change
}

export interface ApiStreamGroundingChunk {
	type: "grounding"
	sources: GroundingSource[]
}

export interface GroundingSource {
	title: string
	url: string
	snippet?: string
}
