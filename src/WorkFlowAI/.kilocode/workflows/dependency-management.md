# Workflow: dependency-management

## Goal

Update dependencies in a controlled way that reduces security and compatibility risk without creating unnecessary churn.

## Use when

- security alerts require action
- a dependency is blocking work or supportability
- routine patch or minor maintenance is scheduled
- a major upgrade is planned and needs explicit risk handling

## Core rules

1. Prefer small, reviewable update batches.
2. Separate routine patch/minor updates from major migrations when possible.
3. Verify after each meaningful change.
4. Treat dependency updates as behavior-affecting changes, not as blind version bumps.

## Recommended flow

| Step | Outcome |
|---|---|
| 1 | identify which dependency and why it must change |
| 2 | classify patch, minor, or major risk |
| 3 | update the smallest safe set |
| 4 | run the relevant tests and checks |
| 5 | record notable compatibility or rollback notes |

## Risk guidance

- patch updates: usually the lowest-risk routine path
- minor updates: verify feature and integration boundaries
- major updates: treat as a migration task, not a casual bump

## Anti-patterns

- upgrade everything to latest without a reason
- mix unrelated dependency families in one risky batch
- ignore changelog or release-note impact for major updates
- merge without targeted verification

## Related flows

- emergency security or production path: [`hotfix-emergency.md`](hotfix-emergency.md:1)
- migration-scale upgrade: [`migration-workflow.md`](migration-workflow.md:1)
- quality enforcement: [`quality-enforcement.md`](quality-enforcement.md:1)
