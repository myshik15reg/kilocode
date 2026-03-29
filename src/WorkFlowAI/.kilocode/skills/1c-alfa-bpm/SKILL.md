---
name: 1c-alfa-bpm
description: Focused guidance for 1C business-process changes, emphasizing workflow clarity, task boundaries, and regression-safe behavior changes.
---

# 1C BPM

Use this skill for changes to business-process logic, workflow routing, or process-driven behavior in 1C.

## Goal

Keep BPM changes understandable, bounded, and regression-safe across the affected business flow.

## Core rules

1. Make process entry, transition, and completion rules explicit.
2. Review user-facing and automation-facing impacts separately.
3. Protect critical business paths with suitable testing.
4. Avoid changing process semantics implicitly while making technical cleanup.

## Recommended process

| Step | Outcome |
|---|---|
| 1 | identify the process and affected business path |
| 2 | define what state or routing behavior changes |
| 3 | verify downstream task or integration impact |
| 4 | protect critical paths with tests or scenario checks |
| 5 | document business-visible behavior changes clearly |

## Main risk areas

- hidden routing changes
- incomplete handling of intermediate states
- user workflow regressions
- automation triggers no longer matching the intended process state

## Related sources

- 1C workflow entry: [`../1c-workflow/SKILL.md`](../1c-workflow/SKILL.md:1)
- 1C testing workflow: [`../../workflows/1c-testing-workflow.md`](../../workflows/1c-testing-workflow.md:1)
