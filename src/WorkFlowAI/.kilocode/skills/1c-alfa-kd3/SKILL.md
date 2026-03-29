---
name: 1c-alfa-kd3
description: Focused guidance for 1C KD3 exchange work, emphasizing safe rule changes, shared-algorithm risk, and traceable delivery.
---

# 1C KD3

Use this skill for changes related to KD3 exchange rules or data-conversion flows.

## Goal

Make KD3 changes safely without breaking other exchanges or silently corrupting shared logic.

## Core rules

1. Treat KD3 as the source of truth for exchange-rule behavior.
2. Do not rename or casually repurpose existing exchange rules.
3. Be extremely careful with shared algorithms; assume they may affect multiple integrations.
4. Keep every non-trivial KD3 change traceable to a task, protocol, or review artifact.

## Recommended process

| Step | Outcome |
|---|---|
| 1 | identify the exact rule or pipeline segment being changed |
| 2 | check whether the logic is local or shared |
| 3 | define export vs import impact |
| 4 | make the smallest safe change |
| 5 | verify affected mappings and downstream behavior |

## Main risk areas

- shared algorithms reused by multiple rules
- changing rule identity instead of changing behavior safely
- assuming import and export paths are symmetric when they are not
- missing traceability for what changed and why

## Use related references only when needed

- KD3 pattern notes: [`../../patterns/1c/kd3.md`](../../patterns/1c/kd3.md:1)
- 1C workflow entry: [`../1c-workflow/SKILL.md`](../1c-workflow/SKILL.md:1)
