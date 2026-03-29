---
name: 1c-workflow
description: Entry skill for routing and coordinating 1C:Enterprise work across the relevant 1C specialist modes.
---

# 1C Workflow

Use this skill as the main entrypoint for non-trivial 1C tasks.

## Goal

Route 1C work through the correct 1C specialists while keeping context, testing, and quality expectations clear.

## Default entry mode

For substantial 1C tasks, start with `1c-orchestrator`.
Use narrower 1C specialists once the task phase is clear.

## Typical routing

| Need                   | Preferred mode          |
| ---------------------- | ----------------------- |
| task coordination      | `1c-orchestrator`       |
| business clarification | `1c-business-analyst`   |
| system specification   | `1c-system-analyst`     |
| design or architecture | `1c-architect`          |
| implementation         | `1c-developer`          |
| unit-style testing     | `1c-tester`             |
| scenario testing       | `1c-vanessa-tester`     |
| quality review         | `1c-quality-specialist` |

## Core rules

1. Keep 1C handoffs explicit and phase-based.
2. Use protocol discipline for substantial 1C work.
3. Verify both logic and critical business flows when risk justifies it.
4. Load deep 1C references only when the task specifically needs them.

## Related sources

- 1C testing workflow: [`../../workflows/1c-testing-workflow.md`](../../workflows/1c-testing-workflow.md:1)
- 1C full SDLC: [`../../workflows/1c-full-sdlc.md`](../../workflows/1c-full-sdlc.md:1)
- 1C patterns index: [`../../patterns/1c/index.md`](../../patterns/1c/index.md:1)
