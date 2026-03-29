# Workflow: OpenSpec implementation (`openspec-apply`)

## Purpose

Implement an already approved OpenSpec change with minimal drift between spec, code, and task state.

## Workflow

1. Read `openspec/changes/CHANGE_ID/proposal.md`.
2. Read `design.md` if present.
3. Execute `tasks.md` in order.
4. Keep repository changes under the active `.protocols/YYYY-MM-DD-name/` task.
5. Mark completed items in `tasks.md`.
6. Run project quality gates and `openspec validate CHANGE_ID --strict`.
7. Update Memory Bank if architecture, product behavior, or tech assumptions changed.

## Rules

- Do not start implementation before proposal approval.
- Spec delta remains the contract; code follows it.
- Keep examples and docs aligned with implemented behavior.
