---
name: skills-sh-systematic-debugging
description: Curated bridge for root-cause-first debugging aligned to WorkFlowAI. Use when Codex needs to investigate a failing test, broken behavior, build failure, integration issue, or performance problem and the root cause is not yet known.
---

# skills.sh Bridge: Systematic Debugging

## Purpose

Enforce root-cause investigation before proposing fixes, so debugging stays evidence-driven instead of symptom-driven.

## Triggers

- A bug or regression exists but the root cause is unknown.
- Tests, builds, or integrations fail and quick patching would be guesswork.
- Previous fix attempts did not resolve the issue.

## Context

- `../../workflows/quick-diagnosis.md` - local debugging entrypoint
- `../../workflows/planner-executor.md` - tool-heavy diagnostic loops
- `../../rules/evidence-rules.md` - evidence discipline
- `../mode-selection/SKILL.md` - route to `debug` first when root cause is unknown
- `../project-tests/SKILL.md` - verification after diagnosis

## Procedure

1. Reproduce the issue and capture the exact failing signal.
2. Inspect recent changes, logs, stack traces, and component boundaries before suggesting a fix.
3. Form one explicit hypothesis at a time and test it with the smallest possible diagnostic change.
4. Confirm the root cause before moving from diagnosis to implementation.
5. Route the eventual fix to the narrowest specialist and preserve the evidence trail.

## Local Overrides

- Unknown root cause routes to `debug`; do not jump straight to implementation.
- Keep diagnosis and fixing conceptually separate, even if the same task later performs both.
- If three fix attempts fail, stop and escalate architecture concerns instead of thrashing.

## When not to use

- Root cause is already known and the task is purely implementation.
- The request is a code review rather than incident triage.
- The issue is actually a design-choice discussion, not a bug investigation.

## Related Local Skills

- [`anti-patterns`](../anti-patterns/SKILL.md)
- [`project-tests`](../project-tests/SKILL.md)
- [`orchestrator-guide`](../orchestrator-guide/SKILL.md)

## Upstream Source

- `https://skills.sh/obra/superpowers/systematic-debugging`
- Retrieved for curation: 2026-04-08
