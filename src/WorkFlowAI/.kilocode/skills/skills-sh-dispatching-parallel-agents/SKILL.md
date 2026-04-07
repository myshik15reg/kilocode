---
name: skills-sh-dispatching-parallel-agents
description: Curated bridge for splitting self-contained work across parallel agents in WorkFlowAI. Use when Codex needs to coordinate 2-4 independent subtasks with clear ownership, disjoint scopes, and structured result collection.
---

# skills.sh Bridge: Dispatching Parallel Agents

## Purpose

Coordinate parallel agent work without losing local routing, ownership, or degraded-mode discipline.

## Triggers

- There are 2-4 independent subtasks that can run in parallel.
- Ownership and write scopes are clear.
- A structured handoff and result collection path is available.

## Context

- `../../workflows/agent-orchestration.md` - local orchestration workflow
- `../../patterns/orchestration/context-handoff.md` - required handoff shape
- `../../patterns/orchestration/result-contract.md` - result collection contract
- `../orchestrator-guide/SKILL.md` - zero-analytics orchestrator behavior
- `../agents-guide/SKILL.md` - delegation patterns and limits

## Procedure

1. Confirm orchestration is actually needed and the subtasks are independent.
2. Split the work into self-contained units with explicit ownership and dependencies.
3. Dispatch read-only or lowest-risk tasks first when possible.
4. Require `CONTEXT HANDOFF` and the default `Result Contract` for each delegated task.
5. Aggregate results, decide memory disposition, and fall back to sequential execution if parallelism stops being safe.

## Local Overrides

- Narrow local specialists still win over generic parallelization patterns.
- Orchestrator must not do substantive analysis itself.
- Overlapping write scopes, unresolved ambiguity, or missing handoff data force a non-parallel route.

## When not to use

- One-step fixes or docs-only micro-changes.
- Overlapping write scopes.
- Ambiguity that blocks safe delegation.

## Related Local Skills

- [`orchestrator-guide`](../orchestrator-guide/SKILL.md)
- [`agents-guide`](../agents-guide/SKILL.md)
- [`context-tiers`](../context-tiers/SKILL.md)

## Upstream Source

- `https://skills.sh/obra/superpowers/dispatching-parallel-agents`
- Retrieved for curation: 2026-04-08
