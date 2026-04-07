import { z } from "zod"

/**
 * Interface for a suggestion item with optional mode switching.
 */
export interface SuggestionItem {
	/** The text of the suggestion */
	answer: string
	/** Optional mode to switch to when selecting this suggestion */
	mode?: string
}

/**
 * Structured option for request_user_input questions.
 */
export interface RequestUserInputOption {
	label: string
	description: string
	preview?: string
	value?: string
}

/**
 * Structured question for request_user_input.
 */
export interface RequestUserInputQuestion {
	header: string
	question: string
	options: RequestUserInputOption[]
	multiSelect?: boolean
	preview?: string
}

/**
 * Structured request_user_input payload.
 */
export interface RequestUserInputData {
	questions: RequestUserInputQuestion[]
}

/**
 * Interface for follow-up data structure used in follow-up questions.
 * This represents the data structure for follow-up questions that the LLM can ask
 * to gather more information needed to complete a task.
 */
export interface FollowUpData {
	/** The question being asked by the LLM */
	question?: string
	/** Array of suggested answers that the user can select */
	suggest?: Array<SuggestionItem>
	/** Optional structured request_user_input payload */
	requestUserInput?: RequestUserInputData
}

/**
 * Zod schema for SuggestionItem.
 */
export const suggestionItemSchema = z.object({
	answer: z.string(),
	mode: z.string().optional(),
})

export const requestUserInputOptionSchema = z.object({
	label: z.string(),
	description: z.string(),
	preview: z.string().optional(),
	value: z.string().optional(),
})

export const requestUserInputQuestionSchema = z.object({
	header: z.string(),
	question: z.string(),
	options: z.array(requestUserInputOptionSchema).min(2).max(4),
	multiSelect: z.boolean().optional(),
	preview: z.string().optional(),
})

export const requestUserInputDataSchema = z.object({
	questions: z.array(requestUserInputQuestionSchema).min(1).max(4),
})

/**
 * Zod schema for FollowUpData.
 */
export const followUpDataSchema = z.object({
	question: z.string().optional(),
	suggest: z.array(suggestionItemSchema).optional(),
	requestUserInput: requestUserInputDataSchema.optional(),
})

export type FollowUpDataType = z.infer<typeof followUpDataSchema>
export type RequestUserInputDataType = z.infer<typeof requestUserInputDataSchema>
export type RequestUserInputQuestionType = z.infer<typeof requestUserInputQuestionSchema>
export type RequestUserInputOptionType = z.infer<typeof requestUserInputOptionSchema>
