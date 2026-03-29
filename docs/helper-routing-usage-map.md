# Helper Routing Usage Map

Status: complete for the currently planned helper jobs.

## Usage Map

- `condense`

    - Entry point: `src/core/task/Task.ts`
    - Used for both manual `condenseContext()` and automatic context condensing before request execution.
    - Routing is opportunistic: helper profile when available, primary model otherwise.

- `search_assist`

    - Entry points: `src/core/webview/webviewMessageHandler.ts` and `src/core/webview/webviewSingleCompletion.ts`
    - Used by the `singleCompletion` request path, including extension-host callers such as `packages/agent-runtime/src/services/extension.ts`.
    - Routing is opportunistic: the webview handler delegates to `handleSingleCompletionRequest(...)`, which uses helper profile selection when available and the primary model otherwise.
    - Note: chat ghost-text UI autocomplete currently uses `requestChatCompletion` via `src/services/ghost/chat-autocomplete/handleChatCompletionRequest.ts`, which is a separate production path and not part of helper routing.

- `summarize_branch`

    - Entry point: `src/core/webview/ClineProvider.ts`
    - Used by `branchTask(..., { branchStrategy: "summary" })` to generate a compact branch handoff.

- `tech_debt_extract`

    - Entry point: `src/core/webview/ClineProvider.ts`
    - Used by `extractTechDebtForTask(...)`, triggered from `src/core/tools/AttemptCompletionTool.ts` after task completion.

- `relay_compact`
    - Entry point: `src/core/webview/ClineProvider.ts`
    - Used by `maybeBuildCheapRestartSummary(...)` during restart/recovery handoff compaction.

## Deferred

- None for the current planned helper-job list.

## Fallback Note

- Helper routing must remain optional.
- When no helper profile is configured or no safe helper model is available, execution stays on the primary model.
