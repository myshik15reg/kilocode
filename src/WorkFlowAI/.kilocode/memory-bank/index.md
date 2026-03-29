# Memory Bank

This directory defines the project Memory Bank structure for the current workspace.

## Core boundary

- This pack provides a Memory Bank template only.
- The real, writable Memory Bank must live in the current project at `.kilocode/memory-bank/`.
- Do not treat the template pack copy as live project state.
- Read the workspace copy first, then confirm `[MB: OK]`.

## Session start

1. Read this file in the workspace copy.
2. Read `context.md` in the workspace copy.
3. Confirm in chat: `[MB: OK]`.

## File roles

- `brief.md` - goals, constraints, Definition of Done
- `product.md` - users, flows, UX expectations
- `architecture.md` - system design and decisions
- `tech.md` - stack, tooling, key commands
- `context.md` - current focus, risks, next step

## Update rule

Update workspace Memory Bank files after meaningful changes. Do not write task-specific history back into the template pack.