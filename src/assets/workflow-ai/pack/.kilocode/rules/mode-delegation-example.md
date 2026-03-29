# Mode Delegation Example

Source of truth for handoff structure: [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Minimal checklist

| Check         | Requirement                                 |
| ------------- | ------------------------------------------- |
| Delegation    | use `new_task`                              |
| Context block | include `=== CONTEXT HANDOFF ===`           |
| Inputs        | list specific files, preferably `path:line` |
| Constraints   | include relevant quality and safety limits  |
| Output        | define what the receiving mode must return  |

## Example: `architect` -> `code`

```text
TASK: Implement the approved plan

=== CONTEXT HANDOFF ===
ROOT: <workspace root>
PROTOCOL: .protocols/YYYY-MM-DD-name/
ORIGIN: architect -> code
DOMAIN: <domain>
PHASE: implementation

GOAL:
Implement the planned change and keep behavior aligned with the protocol.

INPUTS:
1. .protocols/YYYY-MM-DD-name/brief.md:1 - requirements and constraints
2. .protocols/YYYY-MM-DD-name/plan.md:1 - execution steps
3. <relevant source file>:<line> - implementation target

CONSTRAINTS:
1. Use TDD when the repo policy requires it.
2. Respect repository lint and test rules.
3. Keep the diff scoped to the approved task.

OUT OF SCOPE:
1. Unrelated refactors.
2. New features outside the brief.

VERIFY:
1. Run the smallest relevant validation first.
2. Confirm the result matches the protocol goal.

EXPECTED OUTPUT:
Code changes, tests if needed, and a concise implementation summary.
=======================
```
