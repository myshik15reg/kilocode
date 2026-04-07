---
name: skills-sh-subagent-driven-development
description: Curated bridge for executing a decision-complete plan via fresh subagents with review checkpoints in WorkFlowAI. Use when Codex already has a clear plan, tasks are mostly independent, and the runtime explicitly allows delegated agent execution.
---

# skills.sh Bridge: Subagent-Driven Development

## Purpose

Use fresh subagents per task while preserving local handoff, specialist-first routing, and review discipline.

## Triggers

- A decision-complete implementation plan already exists.
- Tasks can be executed one by one with focused context.
- The runtime and the current task explicitly allow subagent delegation.

## Context

- `../../workflows/agent-orchestration.md` - orchestration entrypoint
- `../../workflows/planner-executor.md` - planner/executor split when needed
- `../../patterns/orchestration/context-handoff.md` - mandatory handoff structure
- `../../patterns/orchestration/result-contract.md` - structured results
- `../orchestrator-guide/SKILL.md` - delegation rules and degraded mode

## Procedure

1. Confirm the plan is decision complete and tasks are small enough for delegated execution.
2. Dispatch one focused implementer at a time with only the task-local context it needs.
3. Review each result for spec compliance and code quality before advancing.
4. Re-dispatch only when missing context, blocked status, or review findings justify it.
5. Close with fresh verification against the full changed state.

## Local Overrides

- Use only when delegation is explicitly allowed by the runtime and the user/task context.
- Keep bridge behavior subordinate to local `orchestrator-guide`, `agents-guide`, and `verification-before-completion` rules.
- Do not require per-task commits; follow the repo's local git workflow and quality gates instead.

## When not to use

- No plan exists yet.
- Tasks are tightly coupled or write scopes overlap.
- A one-step fix is faster and safer without delegation.

## Related Local Skills

- [`orchestrator-guide`](../orchestrator-guide/SKILL.md)
- [`agents-guide`](../agents-guide/SKILL.md)
- [`skills-sh-verification-before-completion`](../skills-sh-verification-before-completion/SKILL.md)

## Upstream Source

- `https://skills.sh/obra/superpowers/subagent-driven-development`
- Retrieved for curation: 2026-04-08
