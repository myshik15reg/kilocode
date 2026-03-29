# Failure Recovery

Purpose: recover from workflow, validation, or local process mistakes without turning a normal issue into a production incident.

For real production incidents, use [`hotfix-emergency.md`](hotfix-emergency.md:1).

## Recovery order

1. Stop and identify what failed.
2. Preserve important context before changing more files.
3. Restore a safe working state.
4. Re-enter the normal workflow through the correct protocol or validation step.
5. Record any non-obvious recovery decision if it affects future work.

## Common cases

| Problem | First action |
|---|---|
| Wrong mode or bad delegation | return to routing and issue a correct `new_task` handoff |
| Lost protocol context | reopen the active protocol and read `brief.md` + `plan.md` |
| Failed tests or lint | reproduce with the smallest relevant command |
| Broken local branch state | follow repo git policy and recover to a known commit |
| Memory Bank confusion | reread [`../memory-bank/index.md`](../memory-bank/index.md:1) and confirm `[MB: OK]` |

## Rules

1. Prefer the smallest reversible recovery step.
2. Do not rewrite history on shared branches unless repository policy explicitly allows it.
3. Do not hide failures; make the blocking condition explicit.
4. After recovery, continue through the normal protocol path instead of improvising a new one.

## Re-entry points

- Resume task work: [`protocol-resume.md`](protocol-resume.md:1)
- Rebuild context: [`context-priming.md`](context-priming.md:1)
- Close safely after recovery: [`protocol-review-merge.md`](protocol-review-merge.md:1)
