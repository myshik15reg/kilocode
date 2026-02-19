# Context

## Current Status

The project is an active open-source VS Code extension with a significant user base (750k+ installs). The codebase is a monorepo managed by TurboRepo. WorkFlowAI is integrated into the extension with automatic installation of workflow assets into `~/.kilocode` on activation.

## Active Tasks

1.  **WorkFlowAI Integration**: Completed (assets auto-install on activation, custom modes merged, VSIX packaging verified).
2.  **Memory Bank Initialization**: Completed (core `.kilocode/memory-bank/` structure in place).

## Recent Changes

- Added WorkFlowAI assets installer on activation (copy-if-missing templates and custom modes merge).
- Packaged WorkFlowAI assets into the VSIX and produced `bin/alfa-code-assistant-4.153.0.vsix`.
- Verified WorkflowAssetsInstaller tests (Vitest) and VSIX build.
- Added `.kilocode/memory-bank/` directory structure.
- Created `index.md`, `brief.md`, `product.md`, `architecture.md`, `tech.md`.
- Added context routing settings (fast/deep thresholds + toggle) across state, UI, and environment details, with updated tests.
- Updated test mocks and expectations for MCP watchers, code index settings defaults, hybrid search scoring, and dist asset checks; full `pnpm --filter ./src test` now passes.
- Fixed webview build type errors by defaulting context routing props in SettingsView (`contextRoutingEnabled`, `contextRoutingFastThresholdPercent`, `contextRoutingDeepThresholdPercent`).
- Updated Graph unification documentation to reflect `tree-sitter-grammars/`, `tree-sitter-onec.wasm`, added RLM mention and 1C change author line.
- Synced WorkFlowAI workflow pack into repo root `.kilocode/` (excluding memory bank) and documented in `docs/workflowai/`.

### WorkFlowAI sync 2026-02-11

- **3-copy layout (anti-drift SoT strategy):**
    - Vendor/upstream workflow-pack: [`WorkFlowAI/`](WorkFlowAI/:1)
    - Runtime embedded pack (authoritative for this repo at runtime): [`.kilocode/`](.kilocode/:1)
    - Distribution/build pack (derived copy): [`src/assets/workflow-ai/pack/`](src/assets/workflow-ai/pack/:1)
- **Core SoT documents added/synced into runtime (`.kilocode/`)** (and mirrored into distribution):
    - Routing: [`.kilocode/rules/agent-routing.md`](.kilocode/rules/agent-routing.md:1)
    - Evidence discipline: [`.kilocode/rules/evidence-rules.md`](.kilocode/rules/evidence-rules.md:1)
    - Terminology: [`.kilocode/rules/terminology.md`](.kilocode/rules/terminology.md:1)
    - Docs standards (SoT vs wrappers, portability rules): [`.kilocode/rules/docs-standards.md`](.kilocode/rules/docs-standards.md:1)
    - Scripts entrypoints (path SoT): [`.kilocode/workflows/scripts-entrypoints.md`](.kilocode/workflows/scripts-entrypoints.md:1)
    - Context handoff protocol (handoff SoT): [`.kilocode/patterns/orchestration/context-handoff.md`](.kilocode/patterns/orchestration/context-handoff.md:1)
- **Protocol + summary:** see [`.protocols/2026-02-11-workflowai-sync/execution.md`](.protocols/2026-02-11-workflowai-sync/execution.md:1).

## Known Issues

- None explicitly identified in the initial scan, but migration to a structured Memory Bank suggests a need for better context retention across sessions.

## Next Steps

- Verify WorkFlowAI installation in VS Code.
- Use WorkFlowAI workflows for new tasks.
