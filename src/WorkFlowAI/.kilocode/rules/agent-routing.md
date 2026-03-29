# Agent Routing Rules

This document defines source-of-truth routing behavior for `orchestrator`.

## Core rules

1. `orchestrator` routes and delegates.
2. `orchestrator` must not perform deep implementation, architecture, or debugging work itself.
3. Specialist-first selection is mandatory.
4. If no specialist fits, fall back to a broader safe mode.

## Deterministic routing

1. Identify the task type.
2. Identify domain triggers.
3. If the task is non-trivial, ensure context is primed and the brief is cleaned before broad delegation.
4. Pick the narrowest valid mode.
5. Delegate using the canonical handoff format from [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Pre-delegation flow for non-trivial work

1. Prime context by [`../workflows/context-priming.md`](../workflows/context-priming.md:1).
2. Clean the task contract by [`../workflows/brief-refinement.md`](../workflows/brief-refinement.md:1).
3. If needed, shape target-state and execution artifacts by [`../workflows/spec-plans-generation.md`](../workflows/spec-plans-generation.md:1).
4. Delegate only the minimal approved slice.

## Task type mapping

| Task type | Preferred mode |
|---|---|
| Planning, protocol, docs-only | `architect` |
| Multi-step coordination | `orchestrator` |
| Unknown-cause bug | `debug` |
| Known-cause fix | `code-fixer` or specialist dev |
| Testing | `unit-tester`, `integration-tester`, `e2e-tester` |
| Review | `reviewer` |
| 1C domain | `1c-orchestrator` |

## Domain triggers

| Trigger | Route |
|---|---|
| React, JSX, hooks | `react-dev` |
| Vue, Nuxt | `vue-dev` |
| Node.js, Express, NestJS | `nodejs-dev` |
| Python, Django, FastAPI | `python-dev` |
| PostgreSQL, indexes, SQL tuning | `postgresql-specialist` |
| Docker, CI, GitHub Actions | `devops` or `cicd` |
| Security audit | `security-auditor` |
| 1C, BSL, EDT, metadata objects | `1c-orchestrator` |

## Blocking ambiguity

If a missing fact blocks safe routing:
- ask at most one blocking question
- state a safe temporary default
- carry both into the handoff
