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

## Known Issues

- None explicitly identified in the initial scan, but migration to a structured Memory Bank suggests a need for better context retention across sessions.

## Next Steps

- Verify WorkFlowAI installation in VS Code.
- Use WorkFlowAI workflows for new tasks.
