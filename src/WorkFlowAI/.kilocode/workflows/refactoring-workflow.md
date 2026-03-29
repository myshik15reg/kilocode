# Workflow: refactoring

## Goal

Improve structure, clarity, or maintainability while preserving intended behavior unless a behavior change is explicitly requested.

## Use when

- code is hard to read or maintain
- duplication or poor boundaries are slowing safe changes
- the behavior is mostly correct but the structure is weak
- a planned cleanup is part of a broader task

## Core rules

1. Preserve behavior unless the brief says otherwise.
2. Keep the refactor scoped and explain the target improvement.
3. Prefer small verified steps over one large rewrite.
4. Update tests or add focused coverage when needed to protect the behavior.

## Process

| Step | Outcome |
|---|---|
| 1 | define the refactoring goal |
| 2 | identify the behavior that must stay stable |
| 3 | make the smallest safe structural step |
| 4 | verify after each meaningful step |
| 5 | stop when the targeted improvement is achieved |

## Good targets

- simplify branching
- extract small helpers
- reduce duplication
- improve naming and local cohesion
- separate concerns without expanding scope

## Bad targets

- opportunistic redesign during an unrelated task
- hidden behavior changes packaged as cleanup
- cross-repo style crusades with no acceptance criteria

## Verification

- behavior remains aligned with tests or known expectations
- diff stays focused on the stated refactor goal
- complexity or duplication is measurably reduced
