# Workflow: OpenSpec change lifecycle (`openspec-change-workflow`)

## Purpose
Run spec-driven changes through a stable lifecycle from proposal to archive.

## Source of truth
- active changes live in `openspec/changes/CHANGE_ID/`
- accepted requirements live in `openspec/specs/`

## Lifecycle
1. Create the task protocol first if the repository will change.
2. Inspect current specs and open changes.
3. Create `proposal.md`, `tasks.md`, optional `design.md`, and spec deltas.
4. Validate with `openspec validate CHANGE_ID --strict`.
5. Get approval.
6. Implement from `tasks.md`.
7. Revalidate.
8. Archive the change.

## Rules
- proposal before implementation
- strict validation before and after implementation
- protocol and Memory Bank stay workspace-specific, not template-scoped
