---
name: defer
description: Record an out-of-scope finding in a backlog without interrupting the current task.
argument-hint: <title>
---

# Defer Finding

Use this skill when you discover a bug, debt item, risk, or idea that should be tracked but not solved now.

## Portability note

This skill is portable only if the consuming workspace also provides a local backlog script or equivalent automation.
Do not assume Claude-specific environment variables or global paths.

Preferred script location, if the workspace supports it:

- `.kilocode/cli/defer.py`
- or another documented local path from the consuming project

If no local script exists, create a manual backlog note instead of failing the workflow.

## Minimum fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | short backlog item title |
| `type` | yes | `bug`, `debt`, `idea`, or `risk` |
| `priority` | yes | `p0` to `p3` |
| `area` | no | subsystem or domain tag |
| `origin` | no | protocol step, review, or standalone context |
| `description` | no | one short explanation |

## Workflow

1. Detect whether the finding comes from a protocol step, review flow, or standalone work.
2. Infer `type` and `priority` from context; ask only if ambiguity blocks safe classification.
3. If a local backlog script exists, create the item with that script.
4. If the finding came from a protocol step, add a short backlink from the protocol when appropriate.
5. Report the created item path or the manual fallback location.

## Manual fallback

If no automation exists, create a concise note in a workspace-defined backlog location such as:

- `.backlog/items/<slug>.md`
- or another repository-specific backlog path

Use this minimal structure:

```md
# <title>

- Type: <bug|debt|idea|risk>
- Priority: <p0-p3>
- Area: <area>
- Origin: <origin>
- Description: <short note>
```

## Rules

1. Do not let backlog capture replace solving the current in-scope acceptance criteria.
2. Keep deferred items small and searchable.
3. Prefer linking the origin step rather than copying long context into the backlog item.
4. Do not assume any global tool path unless the current project documents it.
