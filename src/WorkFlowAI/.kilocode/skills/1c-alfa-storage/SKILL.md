---
name: 1c-alfa-storage
description: Focused guidance for 1C repository or storage workflows, emphasizing safe checkout, scoped changes, and controlled reintegration.
---

# 1C Storage

Use this skill when a task depends on taking, changing, and returning objects through a 1C storage workflow.

## Goal

Keep storage operations predictable, scoped, and safe for concurrent work.

## Core rules

1. Take only the objects needed for the task.
2. Avoid broad or accidental batch grabs.
3. Keep storage operations traceable to the active task or protocol.
4. Reintegrate changes only after the relevant checks are complete.

## Recommended process

| Step | Outcome |
|---|---|
| 1 | identify the exact objects needed |
| 2 | take or lock only the required scope |
| 3 | perform the change with clear task linkage |
| 4 | run the relevant checks |
| 5 | return or publish changes in a controlled way |

## Main risk areas

- taking too many objects at once
- parallel conflicts caused by unclear scope
- storage operations without task traceability
- reintegration before verification

## Related sources

- 1C workflow entry: [`../1c-workflow/SKILL.md`](../1c-workflow/SKILL.md:1)
