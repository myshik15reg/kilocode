---
name: mode-selection
description: Choose the narrowest suitable mode for a task and avoid unnecessary fallback to broad modes.
---

# Mode Selection

Use this skill whenever a task needs routing to the correct mode.

## Core principle

Always prefer the narrowest suitable specialist.
Use broad fallback modes only when no better specialist clearly fits.

## Decision order

1. Determine whether the task is planning, implementation, debugging, testing, review, security, operations, or domain-specific.
2. Check for strong domain triggers such as framework, language, database, CI, or 1C context.
3. Choose the narrowest valid specialist.
4. If no specialist clearly fits, use a broader safe fallback.
5. If work must move to another mode, delegate with `new_task` and the canonical handoff.

## Fast mapping

| Task shape | Preferred mode |
|---|---|
| Planning, protocol, docs-only | `architect` |
| Multi-step coordination | `orchestrator` |
| Unknown-cause bug | `debug` |
| Known-cause fix | `code-fixer` or a domain specialist |
| New implementation | matching `*-dev`, else `code` |
| Unit or integration testing | matching tester mode |
| Review | `reviewer` |
| Security review | `security-auditor` or `security-tester` |
| 1C work | `1c-orchestrator` or the relevant 1C specialist |

## Domain triggers

| Trigger | Likely route |
|---|---|
| React, hooks, JSX | `react-dev` |
| Vue, Nuxt | `vue-dev` |
| Node.js, Express, Nest | `nodejs-dev` |
| Python, Django, FastAPI | `python-dev` |
| SQL tuning, indexes, PostgreSQL | `postgresql-specialist` |
| Docker, pipelines, CI | `devops` or `cicd` |
| 1C metadata, BSL, EDT | `1c-orchestrator` |

## Fallback rules

1. `code` is a fallback, not the first choice.
2. `orchestrator` routes and integrates; it is not the default worker for deep implementation.
3. `ask` is for questions or light research, not for code changes.
4. If routing is blocked by one missing fact, ask one blocking question or state a safe temporary default.

## References

- Registry: [`../../modes/REGISTRY.md`](../../modes/REGISTRY.md:1)
- Routing rules: [`../../rules/agent-routing.md`](../../rules/agent-routing.md:1)
- Handoff format: [`../../patterns/orchestration/context-handoff.md`](../../patterns/orchestration/context-handoff.md:1)
