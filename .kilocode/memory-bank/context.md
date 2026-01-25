# Context

## Current Status
The project is an active open-source VS Code extension with a significant user base (750k+ installs). The codebase is a monorepo managed by TurboRepo. We are currently in the process of establishing a formal "Memory Bank" to improve context management for AI agents working on the project.

## Active Tasks
1.  **Memory Bank Initialization**: Creating the core documentation structure (`.kilocode/memory-bank/`) to guide future development. (In Progress)

## Recent Changes
-   Added `.kilocode/memory-bank/` directory structure.
-   Created `index.md`, `brief.md`, `product.md`, `architecture.md`, `tech.md`.
-   Added context routing settings (fast/deep thresholds + toggle) across state, UI, and environment details, with updated tests.
-   Updated test mocks and expectations for MCP watchers, code index settings defaults, hybrid search scoring, and dist asset checks; full `pnpm --filter ./src test` now passes.

## Known Issues
-   None explicitly identified in the initial scan, but migration to a structured Memory Bank suggests a need for better context retention across sessions.

## Next Steps
-   Complete the Memory Bank creation.
-   Start using the Memory Bank for subsequent development tasks.
-   Review existing code to populate `architecture.md` with more specific details if needed.
