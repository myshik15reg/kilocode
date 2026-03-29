# Memory Bank

This folder tracks AlfaCode assistant product and implementation context for ongoing work.

## Current Focus

- AlfaCode settings UX for better quality with lower token usage.
- Dedicated `AlfaCode` settings tab for AlfaCode-specific controls.
- Explicit model routing for helper subtasks to cheaper profiles.
- Code index storage UX aligned around `Qdrant-first` with optional `Neo4j` and optional reranker.

## Key Areas

- `webview-ui/src/components/settings/SettingsView.tsx`
- `webview-ui/src/components/settings/AlfaCodeSettings.tsx`
- `webview-ui/src/components/chat/CodeIndexPopover.tsx`
- `webview-ui/src/components/settings/PromptsSettings.tsx`
- `webview-ui/src/components/settings/NotificationSettings.tsx`
- `webview-ui/src/components/settings/DisplaySettings.tsx`
- `src/services/code-index/config-manager.ts`
- `src/services/code-index/search-service.ts`
- `src/services/neo4j/reranker.ts`

## Latest Update

- Added one-click quality presets: `Quality`, `Balanced`, `Token Saver`.
- Added visible task-strategy guidance for `Local follow-up`, `Compact context`, and `New task` to steer users toward the lowest-token path first.
- Added one-click routing presets inside `AlfaCode`:
    - `Strong Main + Cheap Helpers`
    - `Balanced`
    - `Maximum Saving`
- Added explicit routing targets for:
    - main chat profile
    - prompt enhancement profile
    - context condensing profile
    - terminal command profile
- Added recommendation badges in routing UI so stronger main and cheaper helper profiles are easier to choose correctly.
- Consolidated AlfaCode-specific notification/display/prompt-helper settings into the `AlfaCode` tab.
- Exposed LiteLLM image generation controls inside `AlfaCode`.
- Made code index vector store name project-scoped and manual-only; indexing must not start without it.
- Kept semantic search independent with `Qdrant` as the base layer.
- Kept `Neo4j` optional for graph enrichment and reranker optional for post-ranking.
- Unified `Clear Index` so it clears Qdrant, Neo4j, and both caches together.
- Polished `AlfaCode` and code index settings layout for more consistent card/grid alignment.

## Intent

Use stronger models only for main synthesis and final answers, and cheaper profiles for helper subtasks to reduce token spend without noticeably hurting quality.
