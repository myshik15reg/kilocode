# Workflow: OpenSpec proposal (`openspec-proposal`)

## Purpose

Create and validate an OpenSpec proposal before code changes start.

## Workflow

1. Read `openspec/AGENTS.md` and `openspec/project.md` if they exist.
2. Pick a unique kebab-case `CHANGE_ID`, preferably verb-led.
3. Create `openspec/changes/CHANGE_ID/` with:
    - `proposal.md`
    - `tasks.md`
    - optional `design.md`
    - spec delta files under `specs/`
4. Give each requirement at least one scenario if the project expects scenario-driven specs.
5. Run `openspec validate CHANGE_ID --strict`.
6. Stop and get approval before implementation.

## Rule

No implementation starts until the proposal is valid and approved.
