---
name: 1c-alfa-access-control
description: Focused guidance for 1C access-control work, covering atomic roles, deletion restrictions, and safe role design boundaries.
---

# 1C Access Control

Use this skill for 1C tasks that add, review, or change roles and permissions.

## Goal

Keep access-control design explicit, minimal, and safe against accidental privilege expansion.

## Core rules

1. Prefer atomic roles that represent small clear responsibilities.
2. Treat destructive permissions as high-risk.
3. Review deprecated or legacy objects separately from normal access design.
4. Do not bundle unrelated access changes into one unclear role change.

## Recommended process

| Step | Outcome |
|---|---|
| 1 | identify affected business function or object |
| 2 | map the minimum required permission set |
| 3 | check whether deletion or elevated rights are being introduced |
| 4 | verify role composition and legacy-object handling |
| 5 | record the access-control intent clearly |

## Main risk areas

- roles that are too broad
- hidden destructive permissions
- legacy objects left inside active roles unintentionally
- mixing access design with unrelated metadata changes

## Related sources

- 1C workflow entry: [`../1c-workflow/SKILL.md`](../1c-workflow/SKILL.md:1)
- 1C patterns index: [`../../patterns/1c/index.md`](../../patterns/1c/index.md:1)
