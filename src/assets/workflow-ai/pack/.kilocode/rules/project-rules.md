# Project Rules

Purpose: provide a thin, stable corridor to the main source-of-truth documents.

## Entry corridor

1. Start with [`../../AGENTS.md`](../../AGENTS.md:1).
2. Read [`../QUICK.md`](../QUICK.md:1) for startup rules.
3. Read [`../memory-bank/index.md`](../memory-bank/index.md:1) for project context.
4. Use [`index.md`](index.md:1) for rule navigation when needed.

## Core source of truth

| Topic               | Source                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Terminology         | [`terminology.md`](terminology.md:1)                                                             |
| Evidence discipline | [`evidence-rules.md`](evidence-rules.md:1)                                                       |
| Memory Bank usage   | [`memory-bank-instructions.md`](memory-bank-instructions.md:1)                                   |
| Agent routing       | [`agent-routing.md`](agent-routing.md:1)                                                         |
| Handoff format      | [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1) |
| Mode selection      | [`../skills/mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)                       |
| Quality gates       | [`quality-gates.md`](quality-gates.md:1)                                                         |

## Mandatory process rules

1. Any task that changes the repository must have a protocol created by [`../workflows/protocol-new.md`](../workflows/protocol-new.md:1).
2. Delegation across modes must use `new_task` plus the canonical handoff format.
3. Keep reusable workflow docs template-safe; project-specific state belongs in the consuming workspace.
4. Prefer the narrowest suitable specialist before falling back to broader modes.
