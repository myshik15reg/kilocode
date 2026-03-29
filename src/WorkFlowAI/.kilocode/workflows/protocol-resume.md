# Workflow: protocol-resume

## Goal

Resume work from an existing protocol without losing context or corrupting the plan.

## Steps

1. Find the active protocol in `.protocols/`.
2. Read `brief.md` and `plan.md` first.
3. Read `execution.md` only if it exists and contains relevant decisions.
4. Identify the current active step and the next safe action.
5. Update `plan.md` if reality changed.
6. Continue in small verified increments.
7. Record notable non-obvious decisions in `execution.md` when useful.
8. Mark completed work clearly before handing off or closing.

## Checks

- `brief.md` still matches the actual task goal.
- `plan.md` reflects current reality.
- blocked assumptions are explicit.
- the next action is measurable and verifiable.

## References

- Protocol creation: [`protocol-new.md`](protocol-new.md:1)
- Repo hygiene: [`../rules/repo-hygiene.md`](../rules/repo-hygiene.md:1)
- Context priming: [`context-priming.md`](context-priming.md:1)
