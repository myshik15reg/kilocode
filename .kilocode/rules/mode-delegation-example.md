# One Mode Per Task — Delegation Examples (wrapper)

SoT по формату handoff: [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Minimal delegation checklist

| Check          | Requirement                                               |
| -------------- | --------------------------------------------------------- |
| Mode switching | MUST delegate via `new_task` (Alfa Code)                  |
| Context        | MUST include `=== CONTEXT HANDOFF ===`                    |
| Inputs         | MUST list file paths (prefer `path:line`)                 |
| Constraints    | MUST include quality gates (coverage 100%, lint 0/0, TDD) |

## Example: Architect -> Code

```text
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Реализовать по plan.md

=== CONTEXT HANDOFF ===
ROOT: <workspace root>
PROTOCOL: .protocols/YYYY-MM-DD-name/
ORIGIN: architect -> code
DOMAIN: <domain>
PHASE: Implementation

GOAL:
<goal>

INPUTS:
1. .protocols/YYYY-MM-DD-name/brief.md:1 - requirements
2. .protocols/YYYY-MM-DD-name/plan.md:1 - steps

CONSTRAINTS:
1. TDD MUST be used.
2. Coverage MUST be 100% (lines/branches/functions).
3. Lint MUST be 0 errors and 0 warnings.

EXPECTED OUTPUT:
Code + tests + updated execution.md.
=======================
</message>
</new_task>
```
