# Workflow: migration

## Goal

Execute larger changes that cannot be treated as simple fixes or routine updates, while keeping scope, risk, and rollback visible.

## Use when

- a major dependency or platform upgrade is required
- structure or data contracts are changing significantly
- multiple coordinated changes must land safely over phases

## Core rules

1. Break the migration into explicit phases.
2. Define compatibility and rollback expectations early.
3. Validate incrementally instead of waiting for one final big check.
4. Treat migrations as protocol-worthy work.

## Recommended flow

| Step | Outcome |
|---|---|
| 1 | define migration scope and success criteria |
| 2 | identify compatibility constraints and rollout risks |
| 3 | split the work into safe phases |
| 4 | validate each phase |
| 5 | close with explicit follow-up if any temporary bridge remains |

## Typical risks

- hidden contract drift
- rollout ordering issues
- partial compatibility between old and new states
- underestimating validation scope

## Related flows

- dependency-driven migration: [`dependency-management.md`](dependency-management.md:1)
- protocol lifecycle: [`protocol-new.md`](protocol-new.md:1), [`protocol-review-merge.md`](protocol-review-merge.md:1)
