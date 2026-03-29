---
name: roles-guide
description: Compact guide to role boundaries and responsibilities across the main AlfaFlow modes.
---

# Roles Guide

Use this skill when the task depends on understanding who should plan, implement, verify, or review work.

## Core roles

| Mode                     | Primary responsibility                                |
| ------------------------ | ----------------------------------------------------- |
| `architect`              | planning, protocol management, design-level decisions |
| `orchestrator`           | routing, delegation, and integration across modes     |
| `code` or specialist dev | implementation work                                   |
| tester modes             | verification and test delivery                        |
| `reviewer`               | review, acceptance, and issue identification          |

## Boundary rules

1. `architect` should not become the main implementation worker.
2. `orchestrator` should route and integrate, not absorb all work itself.
3. implementation modes should stay within the approved task scope.
4. tester and reviewer roles should verify rather than silently redesign the task.

## Delegation rule

When work must move between roles, use `new_task` with the canonical handoff format.

## Related sources

- Roles wrapper: [`../../rules/roles.md`](../../rules/roles.md:1)
- Routing rules: [`../../rules/agent-routing.md`](../../rules/agent-routing.md:1)
- Handoff protocol: [`../../patterns/orchestration/context-handoff.md`](../../patterns/orchestration/context-handoff.md:1)
