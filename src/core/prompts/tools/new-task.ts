import { ToolArgs } from "./types"

const STRUCTURED_FIELDS = `Optional structured delegation fields:
- execution: "foreground" or "background" when you need explicit routing.
- isolation: "auto", "shared", or "worktree".
- deliverable: concrete artifact or output expected from the child task.
- constraints: list of non-negotiable limits or rules.
- acceptanceCriteria: checklist the child task must satisfy.
- inputs: relevant files, tasks, searches, docs, workflows, or artifacts.
- evidenceNeeded: true when the child must cite evidence.
- expectedArtifact: expected artifact type such as patch, report, summary, or plan.
- role: preferred child role such as researcher, executor, or validator.
- permissions: explicit capability limits if needed.
- retryBudget: number of allowed retries.
- retrievalPackId: prebuilt retrieval pack identifier when available.`

const BACKGROUND_GUIDANCE = `Background delegation should only be used for genuinely independent work. When structured delegation is enabled, background calls should include a clear goal and acceptanceCriteria; otherwise the request may stay on the foreground path.`

const PROMPT_WITHOUT_TODOS = `## new_task
Description: Create a new task instance in the chosen mode using your provided message.

Use this for meaningful decomposition, not for tiny follow-up steps. Prefer solving in the current task when the work is small, local to already-open context, or can be completed with one tool/action sequence. Prefer \`new_task\` when the work needs a different specialist mode, a clear sub-goal, or a longer independent execution path.

${BACKGROUND_GUIDANCE}

Parameters:
- mode: (required) The slug of the mode to start the new task in (e.g. "code", "debug", "architect").
- message: (required) The initial instructions for the child task.
${STRUCTURED_FIELDS}

Usage:
<new_task>
<mode>your-mode-slug-here</mode>
<message>Your initial instructions here</message>
</new_task>

Example:
<new_task>
<mode>code</mode>
<message>Implement a new feature for the application</message>
</new_task>

Structured example:
<new_task>
<mode>code</mode>
<message>Investigate why agent-runtime startup is slow</message>
<execution>background</execution>
<deliverable>Short findings memo with the main bottleneck and one recommended fix</deliverable>
<acceptanceCriteria>
- Identify the slowest startup stage
- Cite the relevant files or logs
- Recommend the next implementation step
</acceptanceCriteria>
<inputs>
- file: packages/agent-runtime/src/process.ts
- file: packages/agent-runtime/src/index.ts
</inputs>
<evidenceNeeded>true</evidenceNeeded>
<role>researcher</role>
</new_task>
`

const PROMPT_WITH_TODOS = `## new_task
Description: Create a new task instance in the chosen mode using your provided message and initial todo list.

Use this for meaningful decomposition, not for tiny follow-up steps. Prefer solving in the current task when the work is small, local to already-open context, or can be completed with one tool/action sequence. Prefer \`new_task\` when the work needs a different specialist mode, a clear sub-goal, or a longer independent execution path.

${BACKGROUND_GUIDANCE}

Parameters:
- mode: (required) The slug of the mode to start the new task in (e.g. "code", "debug", "architect").
- message: (required) The initial instructions for the child task.
- todos: (required) The initial todo list in markdown checklist format.
${STRUCTURED_FIELDS}

Usage:
<new_task>
<mode>your-mode-slug-here</mode>
<message>Your initial instructions here</message>
<todos>
[ ] First task to complete
[ ] Second task to complete
[ ] Third task to complete
</todos>
</new_task>

Example:
<new_task>
<mode>code</mode>
<message>Implement user authentication</message>
<todos>
[ ] Set up auth middleware
[ ] Create login endpoint
[ ] Add session management
[ ] Write tests
</todos>
</new_task>

Structured example:
<new_task>
<mode>code</mode>
<message>Implement the retrieval confidence UI state</message>
<todos>
[ ] Wire retrieval metadata into the view model
[ ] Render confidence and warnings in the UI
[ ] Add a focused regression test
</todos>
<execution>foreground</execution>
<deliverable>UI patch with test coverage</deliverable>
<acceptanceCriteria>
- Confidence and warnings are visible in the UI
- Existing token-saver flows do not regress
- Tests cover the new state
</acceptanceCriteria>
<inputs>
- file: webview-ui/src/components/chat/CodeIndexPopover.tsx
- file: webview-ui/src/context/ExtensionStateContext.tsx
</inputs>
<role>executor</role>
</new_task>
`

export function getNewTaskDescription(args: ToolArgs): string {
	const todosRequired = args.settings?.newTaskRequireTodos === true
	return todosRequired ? PROMPT_WITH_TODOS : PROMPT_WITHOUT_TODOS
}
