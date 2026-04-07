---
name: skills-sh-skill-creator
description: Curated bridge for creating reusable local skills inside WorkFlowAI. Use when Codex identifies a repeated task pattern, needs to add a new `.kilocode/skills/*` capability, or wants to turn repeated protocol steps into a reusable skill without copying upstream content verbatim.
---

# skills.sh Bridge: Skill Creator

## Purpose

Standardize local skill creation so new skills stay concise, discoverable, and aligned to WorkFlowAI rules.

## Triggers

- A repeated pattern should become a reusable local skill.
- A user asks to create or formalize a new skill.
- Existing protocol steps are repeated often enough to justify codification.

## Context

- `../../workflows/create-new-skill.md` - canonical local creation workflow
- `../../workflows/update-indexes.md` - index update rules
- `../../rules/skills-index.md` - skill-first wrapper
- `../../rules/evidence-rules.md` - source and assumption discipline
- `../load-context/SKILL.md` - context minimization patterns

## Procedure

1. Confirm the pattern is repeated and worth codifying.
2. Define the skill's triggers, required context, procedure, and integration points.
3. Create the skill under `.kilocode/skills/` with concise frontmatter and a short, action-oriented body.
4. Update the relevant indexes and discovery docs.
5. Validate naming, links, and overlap with existing local skills.

## Local Overrides

- Prefer local `.kilocode/skills/` creation over external home-directory installation paths.
- Repo changes still require a protocol.
- Keep upstream inspiration in stable evidence; do not paste large upstream skill bodies into local SoT.

## When not to use

- The need is a one-off task note rather than a reusable pattern.
- A small edit to an existing local skill is enough.
- The pattern lacks clear triggers or stable procedure.

## Related Local Skills

- [`load-context`](../load-context/SKILL.md)
- [`fix-broken-links`](../fix-broken-links/SKILL.md)
- [`task-solution`](../task-solution/SKILL.md)

## Upstream Source

- `https://skills.sh/anthropics/skills/skill-creator`
- Retrieved for curation: 2026-04-08
