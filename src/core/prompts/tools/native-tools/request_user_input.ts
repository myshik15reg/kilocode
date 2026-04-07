import type OpenAI from "openai"

const REQUEST_USER_INPUT_DESCRIPTION = `Request structured input from the user when you need a small number of explicit choices instead of a free-form clarification. Use this for planner, architect, relay, or approval-style questions where 1-4 compact multiple-choice prompts produce a better answer.

Parameters:
- questions: (required) Array of 1-4 structured questions.
- header: short label shown above the question.
- question: the actual prompt shown to the user.
- options: array of 2-4 choices, each with a short label and one-sentence description.
- multiSelect: optional, allow selecting more than one option.
- preview: optional preview text to show before answering.

Example:
{
  "questions": [
    {
      "header": "Scope",
      "question": "Which implementation slice should I do first?",
      "options": [
        { "label": "Search", "description": "Start with provider-aware web search." },
        { "label": "UI", "description": "Start with the structured input UI." }
      ]
    }
  ]
}`

export default {
	type: "function",
	function: {
		name: "request_user_input",
		description: REQUEST_USER_INPUT_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				questions: {
					type: "array",
					description: "Array of 1-4 structured questions to present to the user",
					items: {
						type: "object",
						properties: {
							header: {
								type: "string",
								description: "Short section label for the question",
							},
							question: {
								type: "string",
								description: "The prompt shown to the user",
							},
							options: {
								type: "array",
								description: "Available options for the question",
								items: {
									type: "object",
									properties: {
										label: {
											type: "string",
											description: "Short option label",
										},
										description: {
											type: "string",
											description: "One-sentence explanation of the option",
										},
										preview: {
											type: "string",
											description: "Optional preview or extra context for the option",
										},
										value: {
											type: "string",
											description: "Optional explicit response value for the option",
										},
									},
									required: ["label", "description"],
									additionalProperties: false,
								},
								minItems: 2,
								maxItems: 4,
							},
							multiSelect: {
								type: "boolean",
								description: "Whether the user may pick more than one option",
							},
							preview: {
								type: "string",
								description: "Optional preview or extra context for the question",
							},
						},
						required: ["header", "question", "options"],
						additionalProperties: false,
					},
					minItems: 1,
					maxItems: 4,
				},
			},
			required: ["questions"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
