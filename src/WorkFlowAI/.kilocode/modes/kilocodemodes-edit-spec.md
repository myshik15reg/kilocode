# `.kilocodemodes` Edit Spec

Purpose: keep runtime mode definitions consistent, predictable, and easy to review.

Runtime source of truth: [`.kilocodemodes`](../../.kilocodemodes:1).
Human-readable summary: [`REGISTRY.md`](REGISTRY.md:1).
Role-card structure: [`ROLE-CARD-TEMPLATE.md`](ROLE-CARD-TEMPLATE.md:1).

## Required fields

Each mode entry should define:

- `slug` - unique kebab-case identifier
- `name` - short human-readable label
- `roleDefinition` - one-sentence responsibility summary
- `description` - concise overview for selection
- `whenToUse` - positive routing guidance
- `groups` - tool-access groups aligned with actual capabilities
- `customInstructions` - mode-specific rules, boundaries, workflow, and handoff guidance

## Authoring rules

1. Prefer specialist-first routing language.
2. State boundaries explicitly: what the mode must not do.
3. Do not duplicate large rulebooks inside `customInstructions`; link to source-of-truth docs.
4. Keep mode prompts compact; every extra paragraph increases startup token cost.
5. Use `new_task` for delegation guidance. Do not rely on `switch_mode`.
6. If a mode changes repo files, its instructions must remain compatible with protocol rules in [`../workflows/protocol-new.md`](../workflows/protocol-new.md:1).

## Consistency checklist

Before accepting a mode edit, verify:

1. `slug` is unique and stable.
2. `whenToUse` does not overlap unnecessarily with a narrower specialist.
3. `groups` reflect the intended tool permissions.
4. Links point to valid source-of-truth docs.
5. Examples, constraints, and handoff rules match [`../rules/agent-routing.md`](../rules/agent-routing.md:1) and [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
6. The matching summary in [`REGISTRY.md`](REGISTRY.md:1) is updated if needed.

## Prompt-shaping rules

- Put the role in the first lines.
- Keep boundaries near the top.
- Prefer bullets over long prose.
- Keep examples minimal and representative.
- Avoid project-specific history inside the template pack.

## Deprecated patterns

Avoid these anti-patterns:

- hidden tool expectations not reflected in `groups`
- long duplicated instructions already covered by rules or skills
- ambiguous delegation wording
- repository-specific task history embedded into reusable mode prompts
