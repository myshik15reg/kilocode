// kilocode_change - new file
import Anthropic from "@anthropic-ai/sdk"
import crypto from "crypto"

import { TelemetryService } from "@roo-code/telemetry"

import { t } from "../../i18n"
import { ApiHandler } from "../../api"
import { ApiMessage } from "../task-persistence/apiMessages"
import {
	getKeepMessagesWithToolBlocks,
	getMessagesSinceLastSummary,
	N_MESSAGES_TO_KEEP,
	SummarizeResponse,
} from "../condense"

export type RlmMode = "fast" | "deep"

export type RlmSummarizeOptions = {
	messages: ApiMessage[]
	apiHandler: ApiHandler
	systemPrompt: string
	taskId: string
	prevContextTokens: number
	mode: RlmMode
	contextWindow: number
	isAutomaticTrigger?: boolean
	customCondensingPrompt?: string
	condensingApiHandler?: ApiHandler
	useNativeTools?: boolean
}

type RlmSegment = {
	text: string
	tokenEstimate: number
}

type RlmSummaryResult = {
	summary: string
	cost: number
	outputTokens: number
	depth: number
}

const RLM_MIN_CHUNK_TOKENS = 800
const RLM_MAX_CHUNK_TOKENS = 6000
const RLM_FAST_CHUNK_RATIO = 0.08
const RLM_DEEP_CHUNK_RATIO = 0.04
const RLM_FAST_MAX_DEPTH = 2
const RLM_DEEP_MAX_DEPTH = 4
const RLM_MAX_SEGMENT_CHARS = 12_000
const RLM_MAX_BLOCK_CHARS = 4_000

const DEFAULT_RLM_CHUNK_PROMPT = `You are a context-compression agent. Summarize the provided conversation segment into a compact, factual summary.
Focus on decisions, constraints, tool outputs, errors, file paths, and TODOs. Preserve technical detail but keep it shorter than the input.
Output only the summary text.`

const DEFAULT_RLM_MERGE_PROMPT = `You are combining multiple chunk summaries into a single cohesive summary.
De-duplicate repeated items, keep structure (Context, Current Work, Key Technical Concepts, Relevant Files, Problems, Next Steps).
Output only the summary text.`

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const truncateText = (value: string, maxLength: number): string =>
	value.length > maxLength ? `${value.slice(0, maxLength)}…[truncated ${value.length - maxLength} chars]` : value

const safeStringify = (value: unknown): string => {
	try {
		return JSON.stringify(value)
	} catch (error) {
		return String(value)
	}
}

// kilocode_change start: guard image media_type access for URL image sources
const getImageMediaType = (source: Anthropic.Messages.ImageBlockParam["source"] | undefined): string | undefined =>
	source && source.type === "base64" ? source.media_type : undefined
// kilocode_change end: guard image media_type access for URL image sources

const estimateTextTokens = async (text: string, apiHandler: ApiHandler): Promise<number> =>
	apiHandler.countTokens([{ type: "text", text }])

const extractToolResultText = (content: Anthropic.ToolResultBlockParam["content"]): string => {
	if (typeof content === "string") {
		return truncateText(content, RLM_MAX_BLOCK_CHARS)
	}

	if (Array.isArray(content)) {
		return truncateText(
			content
				.map((item) => {
					if (typeof item === "string") {
						return item
					}

					if (typeof item === "object" && item && "type" in item && item.type === "text") {
						return (item as Anthropic.Messages.TextBlockParam).text ?? ""
					}

					if (typeof item === "object" && item && "type" in item && item.type === "image") {
						const imageItem = item as Anthropic.Messages.ImageBlockParam
						const size = "data" in imageItem.source ? imageItem.source.data.length : 0
						const mediaType = getImageMediaType(imageItem.source) ?? "image"
						return `[image:${mediaType} bytes=${size}]`
					}

					return safeStringify(item)
				})
				.filter(Boolean)
				.join("\n"),
			RLM_MAX_BLOCK_CHARS,
		)
	}

	return ""
}

const extractContentText = (content: ApiMessage["content"]): string => {
	if (typeof content === "string") {
		return truncateText(content, RLM_MAX_BLOCK_CHARS)
	}

	if (!Array.isArray(content)) {
		return ""
	}

	return content
		.map((block) => {
			switch (block.type) {
				case "text":
					return truncateText(block.text ?? "", RLM_MAX_BLOCK_CHARS)
				case "tool_use":
					return `[tool_use:${block.name}] ${truncateText(safeStringify(block.input), RLM_MAX_BLOCK_CHARS)}`
				case "tool_result":
					return `[tool_result:${block.tool_use_id}] ${extractToolResultText(block.content)}`
				case "image": {
					const size = "data" in block.source ? block.source.data.length : 0
					const mediaType = getImageMediaType(block.source) ?? "image"
					return `[image:${mediaType} bytes=${size}]`
				}
				default: {
					const typedBlock = block as { type?: string; text?: string }
					if (typedBlock.type === "reasoning") {
						return `[reasoning] ${truncateText(typedBlock.text ?? "", RLM_MAX_BLOCK_CHARS)}`
					}
					return safeStringify(block)
				}
			}
		})
		.filter(Boolean)
		.join("\n")
}

const splitTextByChars = (text: string, maxChars: number): string[] => {
	if (text.length <= maxChars) {
		return [text]
	}

	const parts: string[] = []
	let start = 0
	while (start < text.length) {
		const end = Math.min(start + maxChars, text.length)
		parts.push(text.slice(start, end))
		start = end
	}
	return parts
}

const formatMessageSegments = (message: ApiMessage): string[] => {
	const roleLabel = message.role === "assistant" ? "Assistant" : "User"
	const contentText = extractContentText(message.content)
	const baseText = `${roleLabel}: ${contentText}`.trim()
	const maxChars = Math.max(RLM_MAX_SEGMENT_CHARS, roleLabel.length + 10)
	const parts = splitTextByChars(baseText, maxChars)

	if (parts.length === 1) {
		return parts
	}

	return parts.map((part, index) => `${roleLabel} (part ${index + 1}): ${part.replace(`${roleLabel}: `, "")}`)
}

const buildRlmPrompt = (mode: RlmMode, promptOverride: string | undefined, stage: "chunk" | "merge"): string => {
	const basePrompt = promptOverride?.trim()
	const stagePrompt = stage === "chunk" ? DEFAULT_RLM_CHUNK_PROMPT : DEFAULT_RLM_MERGE_PROMPT
	const modeHint =
		mode === "deep"
			? "Mode: deep. Preserve technical nuances and detailed steps."
			: "Mode: fast. Be concise and focus on key decisions and next steps."

	if (basePrompt) {
		return `${modeHint}\n${basePrompt}`
	}

	return `${modeHint}\n${stagePrompt}`
}

const buildChunkTargetTokens = (contextWindow: number, mode: RlmMode): number => {
	const ratio = mode === "deep" ? RLM_DEEP_CHUNK_RATIO : RLM_FAST_CHUNK_RATIO
	return clamp(Math.floor(contextWindow * ratio), RLM_MIN_CHUNK_TOKENS, RLM_MAX_CHUNK_TOKENS)
}

const resolveCondensingHandler = (
	apiHandler: ApiHandler,
	condensingApiHandler?: ApiHandler,
): ApiHandler | undefined => {
	let handlerToUse = condensingApiHandler || apiHandler

	if (!handlerToUse || typeof handlerToUse.createMessage !== "function") {
		console.warn(
			"Chosen API handler for RLM condensing does not support message creation or is invalid, falling back to main apiHandler.",
		)

		handlerToUse = apiHandler

		if (!handlerToUse || typeof handlerToUse.createMessage !== "function") {
			console.error("Main API handler is also invalid for RLM condensing. Cannot proceed.")
			return undefined
		}
	}

	return handlerToUse
}

const chunkSegments = (segments: RlmSegment[], targetTokens: number): RlmSegment[][] => {
	if (segments.length === 0) {
		return []
	}

	const chunks: RlmSegment[][] = []
	let currentChunk: RlmSegment[] = []
	let currentTokens = 0

	for (const segment of segments) {
		const nextTokens = currentTokens + segment.tokenEstimate
		if (currentChunk.length > 0 && nextTokens > targetTokens) {
			chunks.push(currentChunk)
			currentChunk = []
			currentTokens = 0
		}

		currentChunk.push(segment)
		currentTokens += segment.tokenEstimate
	}

	if (currentChunk.length > 0) {
		chunks.push(currentChunk)
	}

	return chunks
}

const summarizeChunkText = async (
	text: string,
	prompt: string,
	apiHandler: ApiHandler,
): Promise<{ summary: string; cost: number; outputTokens: number }> => {
	const requestMessages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: [{ type: "text", text }] }]
	const stream = apiHandler.createMessage(prompt, requestMessages)
	let summary = ""
	let cost = 0
	let outputTokens = 0

	for await (const chunk of stream) {
		if (chunk.type === "text") {
			summary += chunk.text
		} else if (chunk.type === "usage") {
			cost = chunk.totalCost ?? 0
			outputTokens = chunk.outputTokens ?? 0
		}
	}

	return { summary: summary.trim(), cost, outputTokens }
}

const summarizeRecursively = async (
	segments: RlmSegment[],
	targetTokens: number,
	maxDepth: number,
	chunkPrompt: string,
	mergePrompt: string,
	apiHandler: ApiHandler,
): Promise<RlmSummaryResult> => {
	let levelSegments = segments
	let totalCost = 0
	let outputTokens = 0
	let depth = 0

	if (levelSegments.length === 0) {
		return { summary: "", cost: 0, outputTokens: 0, depth: 0 }
	}

	while (true) {
		const prompt = depth === 0 ? chunkPrompt : mergePrompt
		const chunks = chunkSegments(levelSegments, targetTokens)
		const nextSegments: RlmSegment[] = []

		for (const chunk of chunks) {
			const chunkText = chunk.map((segment) => segment.text).join("\n\n")
			const {
				summary,
				cost,
				outputTokens: chunkOutputTokens,
			} = await summarizeChunkText(chunkText, prompt, apiHandler)
			if (!summary) {
				throw new Error("RLM summary returned empty text")
			}

			totalCost += cost
			outputTokens = chunkOutputTokens
			const tokenEstimate = await estimateTextTokens(summary, apiHandler)
			nextSegments.push({ text: summary, tokenEstimate })
		}

		depth += 1
		levelSegments = nextSegments

		if (levelSegments.length <= 1) {
			break
		}

		if (depth >= maxDepth) {
			break
		}
	}

	if (levelSegments.length > 1) {
		const mergedText = levelSegments.map((segment) => segment.text).join("\n\n")
		const {
			summary,
			cost,
			outputTokens: mergedOutputTokens,
		} = await summarizeChunkText(mergedText, mergePrompt, apiHandler)
		if (!summary) {
			throw new Error("RLM merge returned empty text")
		}

		totalCost += cost
		outputTokens = mergedOutputTokens
		depth += 1
		return { summary, cost: totalCost, outputTokens, depth }
	}

	return { summary: levelSegments[0].text, cost: totalCost, outputTokens, depth }
}

const buildSegments = async (messages: ApiMessage[], apiHandler: ApiHandler): Promise<RlmSegment[]> => {
	const segments: RlmSegment[] = []
	for (const message of messages) {
		const messageSegments = formatMessageSegments(message)
		for (const segmentText of messageSegments) {
			const tokenEstimate = await estimateTextTokens(segmentText, apiHandler)
			segments.push({ text: segmentText, tokenEstimate })
		}
	}
	return segments
}

export async function summarizeConversationRlm({
	messages,
	apiHandler,
	systemPrompt,
	taskId,
	prevContextTokens,
	mode,
	contextWindow,
	isAutomaticTrigger,
	customCondensingPrompt,
	condensingApiHandler,
	useNativeTools,
}: RlmSummarizeOptions): Promise<SummarizeResponse> {
	TelemetryService.instance.captureContextCondensed(
		taskId,
		isAutomaticTrigger ?? false,
		!!customCondensingPrompt?.trim(),
		!!condensingApiHandler,
	)

	const response: SummarizeResponse = { messages, cost: 0, summary: "" }

	const handlerToUse = resolveCondensingHandler(apiHandler, condensingApiHandler)
	if (!handlerToUse) {
		const error = t("common:errors.condense_handler_invalid")
		return { ...response, error }
	}

	const { keepMessages, toolUseBlocksToPreserve, reasoningBlocksToPreserve } = useNativeTools
		? getKeepMessagesWithToolBlocks(messages, N_MESSAGES_TO_KEEP)
		: {
				keepMessages: messages.slice(-N_MESSAGES_TO_KEEP),
				toolUseBlocksToPreserve: [],
				reasoningBlocksToPreserve: [],
			}

	const keepStartIndex = Math.max(messages.length - N_MESSAGES_TO_KEEP, 0)
	const includeFirstKeptMessageInSummary = toolUseBlocksToPreserve.length > 0
	const summarySliceEnd = includeFirstKeptMessageInSummary ? keepStartIndex + 1 : keepStartIndex
	const messagesBeforeKeep = summarySliceEnd > 0 ? messages.slice(0, summarySliceEnd) : []
	let messagesToSummarize = getMessagesSinceLastSummary(messagesBeforeKeep)

	const lastMessageToSummarizeContent = messagesToSummarize.at(-1)?.content
	if (
		Array.isArray(lastMessageToSummarizeContent) &&
		lastMessageToSummarizeContent.some((item) => item.type === "tool_use")
	) {
		console.debug("[summarizeConversationRlm] discarding tool_use", lastMessageToSummarizeContent)
		messagesToSummarize = messagesToSummarize.slice(0, -1)
	}

	if (messagesToSummarize.length <= 1) {
		const error =
			messages.length <= N_MESSAGES_TO_KEEP + 1
				? t("common:errors.condense_not_enough_messages", {
						prevContextTokens,
						messageCount: messages.length,
						minimumMessageCount: N_MESSAGES_TO_KEEP + 2,
					})
				: t("common:errors.condensed_recently")
		return { ...response, error }
	}

	const recentSummaryExists = keepMessages.some((message: ApiMessage) => message.isSummary)
	if (recentSummaryExists) {
		const error = t("common:errors.condensed_recently")
		return { ...response, error }
	}

	try {
		const segments = await buildSegments(messagesToSummarize, apiHandler)
		const chunkTargetTokens = buildChunkTargetTokens(contextWindow, mode)
		const chunkPrompt = buildRlmPrompt(mode, customCondensingPrompt, "chunk")
		const mergePrompt = buildRlmPrompt(mode, customCondensingPrompt, "merge")
		const maxDepth = mode === "deep" ? RLM_DEEP_MAX_DEPTH : RLM_FAST_MAX_DEPTH

		const { summary, cost, outputTokens } = await summarizeRecursively(
			segments,
			chunkTargetTokens,
			maxDepth,
			chunkPrompt,
			mergePrompt,
			handlerToUse,
		)

		if (!summary) {
			const error = t("common:errors.condense_failed")
			return { ...response, cost, error }
		}

		const syntheticReasoningBlock = {
			type: "reasoning" as const,
			text: "Condensing conversation context via RLM. The summary below captures the key information from the prior conversation.",
		}

		const textBlock: Anthropic.Messages.TextBlockParam = { type: "text", text: summary }

		const summaryContent: Anthropic.Messages.ContentBlockParam[] =
			toolUseBlocksToPreserve.length > 0
				? [
						syntheticReasoningBlock as unknown as Anthropic.Messages.ContentBlockParam,
						...reasoningBlocksToPreserve,
						textBlock,
						...toolUseBlocksToPreserve,
					]
				: [syntheticReasoningBlock as unknown as Anthropic.Messages.ContentBlockParam, textBlock]

		const condenseId = crypto.randomUUID()
		const firstKeptTs = keepMessages[0]?.ts ?? Date.now()

		const summaryMessage: ApiMessage = {
			role: "assistant",
			content: summaryContent,
			ts: firstKeptTs - 1,
			isSummary: true,
			condenseId,
		}

		const newMessages = messages.map((msg, index) => {
			if (index === 0) {
				return msg
			}

			if (index >= keepStartIndex) {
				return msg
			}

			if (!msg.condenseParent) {
				return { ...msg, condenseParent: condenseId }
			}

			return msg
		})

		newMessages.splice(keepStartIndex, 0, summaryMessage)

		const systemPromptMessage: ApiMessage = { role: "user", content: systemPrompt }
		const contextMessages = outputTokens
			? [systemPromptMessage, ...keepMessages]
			: [systemPromptMessage, summaryMessage, ...keepMessages]
		const contextBlocks = contextMessages.flatMap((message) =>
			typeof message.content === "string" ? [{ text: message.content, type: "text" as const }] : message.content,
		)
		const newContextTokens = outputTokens + (await apiHandler.countTokens(contextBlocks))
		if (newContextTokens >= prevContextTokens) {
			const error = t("common:errors.condense_context_grew", { prevContextTokens, newContextTokens })
			return { ...response, cost, error }
		}

		return { messages: newMessages, summary, cost, newContextTokens, condenseId }
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return { ...response, error: message }
	}
}
