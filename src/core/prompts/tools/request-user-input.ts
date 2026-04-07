export function getRequestUserInputDescription(): string {
	return `## request_user_input
Description: Request structured input from the user when a compact multiple-choice flow is better than an open-ended clarification. Use this for planner, architect, relay, or approval-style questions where 1-4 explicit questions with short options will produce a better answer.

Parameters:
- questions: (required) A JSON array of 1-4 structured questions.
- header: short label shown above each question.
- question: the actual prompt shown to the user.
- options: an array of 2-4 choices, each with a short label and one-sentence description.
- multiSelect: (optional) Set to true when the user may choose more than one option.
- preview: (optional) Extra preview text for the question or option.
- value: (optional) Explicit response value for an option.

Usage:
<request_user_input>
<questions>[{"header":"Scope","question":"Which slice should I tackle first?","options":[{"label":"Search","description":"Start with provider-aware web search."},{"label":"UI","description":"Start with the structured input UI."}]}]</questions>
</request_user_input>

Example:
<request_user_input>
<questions>[{"header":"Scope","question":"Which implementation slice should I do first?","options":[{"label":"Search","description":"Start with provider-aware web search."},{"label":"UI","description":"Start with the structured input UI."}]}]</questions>
</request_user_input>`
}
