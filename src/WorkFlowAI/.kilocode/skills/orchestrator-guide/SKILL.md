---
name: orchestrator-guide
description: Guide for using orchestrator as a routing and coordination mode without letting it become a catch-all implementation worker.
---

# Orchestrator Guide

Use this skill when work requires coordination across multiple modes or phases.

## Role

`orchestrator` classifies the task, selects specialists, delegates with clear handoff, and integrates results.
It should not become the main deep-implementation worker.

## Responsibilities

- identify task type and risk
- make sure non-trivial work starts from a cleaned brief
- decide whether orchestration is actually needed
- choose the narrowest suitable specialist
- send a clean `new_task` handoff
- track progress and decide the next step
- keep context small and relevant

## Boundaries

- do not do broad implementation instead of delegating
- do not use long chat history as the handoff payload when a clean brief or capsule can be passed instead
- do not dump the whole repository into every handoff
- do not switch modes informally; use `new_task`
- do not keep multiple specialists changing the same area without explicit coordination

## When orchestration is useful

- the task spans planning, implementation, testing, or review
- different specialists are needed
- the work is large enough that one agent would carry too much context
- results from several subtasks must be integrated safely

## When orchestration is unnecessary

- the task is a small local fix
- one specialist can safely complete the work end to end
- delegation overhead would exceed the task complexity

## Handoff checklist

Before delegating, include:

- one measurable goal
- the cleaned `brief` or a capsule derived from it
- the relevant protocol path or `N/A`
- a minimal set of inputs
- explicit constraints
- out-of-scope boundaries
- verification expectations
- expected output

## Context economy

1. Prefer links and summaries over copied bulk text.
2. Pass only the files needed for the next step.
3. Distinguish facts, assumptions, and open questions.
4. Use `brief-refinement` and `spec-plans-generation` before mass delegation when the task is non-trivial.
5. Stop delegating once the remaining work fits a single specialist.

## References

- Routing rules: [`../../rules/agent-routing.md`](../../rules/agent-routing.md:1)
- Handoff protocol: [`../../patterns/orchestration/context-handoff.md`](../../patterns/orchestration/context-handoff.md:1)
- Workflow: [`../../workflows/agent-orchestration.md`](../../workflows/agent-orchestration.md:1)
