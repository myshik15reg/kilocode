# Hotfix Emergency

Purpose: handle urgent production-impacting defects with the smallest safe change and an explicit follow-up path.

## Use when

Use this workflow only when delay creates unacceptable business or operational risk.
For non-production mistakes, use [`failure-recovery.md`](failure-recovery.md:1).

## Core rules

1. Scope the fix as narrowly as possible.
2. Prefer mitigation or rollback if it is safer than a rushed code change.
3. Record what happened, what changed, and what still needs follow-up.
4. Return to normal protocol hygiene as soon as the incident is contained.

## Flow

| Step | Outcome                                                             |
| ---- | ------------------------------------------------------------------- |
| 1    | confirm incident severity and affected area                         |
| 2    | establish safe mitigation or rollback option                        |
| 3    | create an incident-focused protocol or equivalent tracked record    |
| 4    | implement the minimal safe fix                                      |
| 5    | run the fastest relevant verification                               |
| 6    | ship, monitor, and create follow-up work for any deferred hardening |

## Minimum record

- incident summary
- impacted system or user path
- chosen mitigation or fix
- verification performed
- known residual risk
- follow-up task or protocol if the fix is intentionally incomplete

## References

- Failure recovery: [`failure-recovery.md`](failure-recovery.md:1)
- Protocol closure: [`protocol-review-merge.md`](protocol-review-merge.md:1)
- Security rules: [`../rules/security-rules.md`](../rules/security-rules.md:1)
