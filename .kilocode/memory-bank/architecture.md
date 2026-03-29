# Architecture

## Settings UX

The `AlfaCode` settings tab is implemented in the webview layer and composes existing settings primitives instead of adding risky new backend systems.

The code index settings remain in `CodeIndexPopover` and now follow the same card-based visual rhythm as the `AlfaCode` tab to keep dense setup forms easier to scan.

## Routing Model

Current helper-task routing reuses existing settings/state:

- `enhancementApiConfigId`
- `condensingApiConfigId`
- `terminalCommandApiConfigId`
- current active/editing chat profile

This keeps the feature low-risk while giving users clear control over cheap-vs-strong model assignment.

## Code Index Storage Model

- `Qdrant` + embeddings is the required semantic base layer.
- `Neo4j` is optional and adds graph relationships without replacing semantic search.
- Reranking is optional and can work with semantic-only or semantic+graph retrieval.
- Vector store names are workspace-scoped and must be entered manually before indexing starts.
- Semantic and graph caches are independent, but `Clear Index` clears both backends and both caches together.

## Token-Saving Guidance

The `AlfaCode` tab now also includes static workflow guidance cards for:

- `Local follow-up` as the default cheapest path
- `Compact context` when the task is the same but history is too long
- `New task` only when users need a real context reset

This guidance is implemented purely in the webview UI, so it improves user behavior and token efficiency without adding backend complexity.
