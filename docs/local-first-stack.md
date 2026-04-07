# Local-First Stack

This document defines the supported local-first patterns for AlfaCode assistants.

## Goal

Use local inference where it reduces cost and iteration latency without degrading the primary coding conversation.

Operational workflow: [`.kilocode/workflows/local-first-setup.md`](../.kilocode/workflows/local-first-setup.md:1).

## Supported modes

### Fully Local Dev

Use a local model for both the main chat and helper workflows.

Recommended when:

- you are working offline or on an isolated network;
- you need cheap iterative debugging;
- the task is narrow and does not require the strongest reasoning model.

Tradeoff:

- architecture work, large refactors, and ambiguous debugging may degrade faster than on a strong cloud model.

### Cloud Main + Local Helpers

Use a strong cloud model for the active chat and route helper jobs to a local profile.

Helper jobs that benefit most:

- prompt enhancement;
- context condensing and restart compaction;
- terminal command generation;
- other cheap helper-style routing paths.

This is the default recommendation because it keeps user-facing quality stable while cutting helper costs.

## Engineering rules

- Local-first is a workflow, not a second orchestration framework.
- The primary chat stays on the selected main profile unless the user changes it explicitly.
- Helper routing may prefer reachable local profiles, but must safely fall back to the primary profile.
- Context windows are bounded as `system + trimmed history + current input (+ optional handoff)`.
- Condensed summaries must not be sent alongside the full raw history they replace.

## Diagnostics

Use `Run Local AI Diagnostics` from AlfaCode settings after changing local profiles.

Current diagnostics cover:

- Ollama availability;
- LiteLLM availability when configured;
- local helper profile discovery;
- helper completion smoke test;
- local embedder or reranker checks when they are configured.

## Developer notes

For agent-runtime debugging, use the local smoke harness in `packages/agent-runtime/scripts/local-smoke-harness.mjs` after building `@kilocode/agent-runtime`.
