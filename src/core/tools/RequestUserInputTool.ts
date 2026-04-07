import { requestUserInputDataSchema, type RequestUserInputQuestionType } from "@roo-code/types"

import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import type { ToolUse } from "../../shared/tools"
import { BaseTool, ToolCallbacks } from "./BaseTool"

interface RequestUserInputParams {
	questions: RequestUserInputQuestionType[]
}

function renderQuestionPrompt(questions: RequestUserInputQuestionType[]): string {
	const lines = [
		"Please answer the following questions. Reply with the option labels or your own text if none of the options fit.",
	]

	for (const [index, question] of questions.entries()) {
		lines.push("")
		lines.push(`${index + 1}. ${question.header}`)
		lines.push(question.question)
		if (question.preview) {
			lines.push(`Preview: ${question.preview}`)
		}
		if (question.multiSelect) {
			lines.push("Select one or more options.")
		}

		for (const option of question.options) {
			lines.push(`- ${option.label}: ${option.description}`)
			if (option.preview) {
				lines.push(`  Preview: ${option.preview}`)
			}
		}
	}

	return lines.join("\n")
}

function firstQuestionText(questions: RequestUserInputQuestionType[] | undefined): string {
	return questions?.[0]?.question || "I need a bit more structured input from you."
}

export class RequestUserInputTool extends BaseTool<"request_user_input"> {
	readonly name = "request_user_input" as const

	parseLegacy(params: Partial<Record<string, string>>): RequestUserInputParams {
		const rawQuestions = params.questions || "[]"
		try {
			const parsed = JSON.parse(rawQuestions)
			return {
				questions: Array.isArray(parsed) ? parsed : [],
			}
		} catch (error) {
			throw new Error(`Failed to parse questions JSON: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async execute(params: RequestUserInputParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { handleError, pushToolResult } = callbacks

		try {
			const state = await task.providerRef.deref()?.getState()
			if (state?.yoloMode) {
				pushToolResult(
					formatResponse.toolResult(
						"<error>This tool is not available in yolo mode. Do not ask questions - make your best judgment and proceed with the task.</error>",
					),
				)
				return
			}

			const parsed = requestUserInputDataSchema.safeParse({ questions: params.questions })
			if (!parsed.success || parsed.data.questions.length === 0) {
				task.consecutiveMistakeCount++
				task.recordToolError("request_user_input" as any)
				task.didToolFailInCurrentTurn = true
				pushToolResult(
					formatResponse.toolError(
						'Invalid arguments for request_user_input: provide a non-empty "questions" array with 1-4 structured questions.',
					),
				)
				return
			}

			const prompt = renderQuestionPrompt(parsed.data.questions)
			task.consecutiveMistakeCount = 0
			const { text, images } = await task.ask("followup", prompt, false, undefined, false, {
				metadata: {
					requestUserInput: parsed.data,
				},
			})
			await task.say("user_feedback", text ?? "", images)
			pushToolResult(formatResponse.toolResult(`<answer>\n${text}\n</answer>`, images))
		} catch (error) {
			await handleError("requesting user input", error as Error)
		}
	}

	override async handlePartial(task: Task, block: ToolUse<"request_user_input">): Promise<void> {
		const state = await task.providerRef.deref()?.getState()
		if (state?.yoloMode) {
			return
		}

		const questions = Array.isArray(block.nativeArgs?.questions)
			? block.nativeArgs.questions
			: (() => {
					const rawQuestions = block.params.questions
					if (!rawQuestions) {
						return undefined
					}
					try {
						const parsed = JSON.parse(rawQuestions)
						return Array.isArray(parsed) ? parsed : undefined
					} catch {
						return undefined
					}
				})()

		await task.ask("followup", firstQuestionText(questions), true).catch(() => {})
	}
}

export const requestUserInputTool = new RequestUserInputTool()
