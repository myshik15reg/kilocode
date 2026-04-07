---
name: skills-sh-writing-plans
description: Curated bridge for turning a request into a concrete multi-step implementation plan aligned to WorkFlowAI protocols. Use when Codex needs to decompose a feature, write or refine a handoff-ready plan, define ordered steps, or collapse ambiguity before implementation.
---

# skills.sh Bridge: Writing Plans

## Purpose

Turn open-ended work into a decision-complete plan that fits WorkFlowAI protocol structure and specialist-first routing.

## Triggers

- User asks for a plan, decomposition, or step-by-step implementation route.
- A multi-step change needs ordered `INPUT`/`OUTPUT`/`VERIFY`/`AGENT` steps.
- A handoff plan is needed before delegation or execution.

## Context

- `../../workflows/protocol-new.md` - protocol creation and depth rules
- `../../rules-architect/planning.md` - local `brief.md` and `plan.md` structure
- `../../rules/task-classification.md` - trivial vs non-trivial depth
- `../../rules/evidence-rules.md` - sourcing and assumptions
- `../mode-selection/SKILL.md` - specialist-first routing

## Procedure

1. Check whether design is already collapsed enough for protocol planning; if not, route to `brainstorm-design.md` first.
2. Classify the task and create or refine the protocol at the correct depth.
3. Express the work as ordered steps with `INPUT`, `OUTPUT`, `VERIFY`, and `AGENT`.
4. Make assumptions explicit and choose safe defaults.
5. Stop only when an implementer would not need to invent missing decisions.

## Local Overrides

- Repo changes still require a protocol; this bridge does not replace `protocol-new.md`.
- Facts must be sourced and assumptions explicit.
- Prefer the narrowest local specialist in `AGENT`; do not default to generic `code` when a narrower route exists.

## When not to use

- Simple read-only Q&A or retrieval-only research.
- Exact one-file micro-fixes that fit `quick-fix.md`.
- Active execution when the plan is already decision complete.

## Related Local Skills

- [`mode-selection`](../mode-selection/SKILL.md)
- [`orchestrator-guide`](../orchestrator-guide/SKILL.md)
- [`task-solution`](../task-solution/SKILL.md)

## Upstream Source

- `https://skills.sh/obra/superpowers/writing-plans`
- Retrieved for curation: 2026-04-08
