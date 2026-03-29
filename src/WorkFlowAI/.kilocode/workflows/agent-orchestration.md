# Workflow: agent-orchestration

## Goal

Coordinate complex work across multiple modes without bloating context, duplicating effort, or losing verification.

## Use when

Use this workflow when at least one of these is true:

- the task spans multiple phases such as planning, implementation, testing, and review
- the task requires different specialist modes
- the task touches multiple subsystems with different risks
- a single agent would need too much context to work safely

Do not use orchestration for trivial one-file or low-risk edits. In those cases, prefer [`quick-fix.md`](quick-fix.md:1) or a single specialist mode.

## Core rules

1. `orchestrator` classifies, routes, and integrates; it should not become the main implementation worker.
2. Delegation must use `new_task` with the canonical handoff from [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
3. Every repo-changing task still needs a protocol. See [`protocol-new.md`](protocol-new.md:1).
4. Each subtask should have one clear goal, one target mode, and one verification method.
5. Keep handoffs narrow; pass only the files and facts needed for the next step.

## Recommended flow

| Step | Owner | Outcome |
|---|---|---|
| 1 | `orchestrator` | classify task, risks, and required specialists |
| 2 | `architect` if needed | create or refine protocol and plan |
| 3 | specialist mode | perform the focused implementation or analysis |
| 4 | testing / review mode | verify result against the plan |
| 5 | `orchestrator` | integrate outputs and decide next step |
| 6 | close workflow | finish through [`protocol-review-merge.md`](protocol-review-merge.md:1) |

## Handoff checklist

Before sending `new_task`, ensure the message includes:

- `ROOT`
- `PROTOCOL`
- `ORIGIN`
- `GOAL`
- minimal `INPUTS`
- explicit `CONSTRAINTS`
- `OUT OF SCOPE`
- `VERIFY`
- `EXPECTED OUTPUT`

## Context economy rules

1. Prefer source-of-truth links over copied prose.
2. Pass the smallest relevant file set.
3. Separate assumptions from facts.
4. Do not forward stale protocol notes unless they still matter.
5. If a long explanation is needed, summarize it as a capsule first.

## Failure modes to avoid

- orchestration for a trivial task
- delegating without a measurable goal
- passing the whole repository as context
- allowing multiple agents to change the same area without coordination
- skipping reviewer or tester steps on risky changes
- switching modes informally instead of using `new_task`

## Exit condition

This workflow is complete when:

- the required specialists have finished their scoped work
- verification is complete
- protocol status is accurate
- any durable project knowledge has been moved out of the protocol if needed
