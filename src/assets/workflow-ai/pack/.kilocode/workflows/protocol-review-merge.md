# Workflow: protocol-review-merge

## Goal

Close a task cleanly: verify quality, perform review, update durable context if needed, and close the protocol safely.

## Flow

|   # | Step                          | Outcome                                                  |
| --: | ----------------------------- | -------------------------------------------------------- |
|   1 | Run quality gates             | tests, coverage, lint, and required checks are satisfied |
|   2 | Perform security sanity check | no obvious secrets or unsafe regressions                 |
|   3 | Review the change             | result matches `brief.md` and `plan.md`                  |
|   4 | Update durable context        | Memory Bank or evidence updated only when needed         |
|   5 | Merge and close               | repo state is integrated and protocol can be closed      |

## Closure checklist

| Area        | Pass criteria                                     |
| ----------- | ------------------------------------------------- |
| Tests       | required test suite is green                      |
| Coverage    | meets repo policy when applicable                 |
| Lint        | meets repo policy when applicable                 |
| Security    | no secret leakage; basic security review complete |
| Protocol    | `brief.md` and `plan.md` reflect actual outcome   |
| Memory Bank | updated only for long-lived context changes       |

## Rules

1. Follow repository merge policy and protected-branch rules where they exist.
2. Do not treat `.protocols/` as long-lived source of truth.
3. Remove or archive a protocol only as an explicit close step.
4. If durable artifacts are needed, move them to stable paths before protocol removal.

## References

- Testing: [`../rules/testing-rules.md`](../rules/testing-rules.md:1)
- Security: [`../rules/security-rules.md`](../rules/security-rules.md:1)
- Code standards: [`../patterns/code-standards.md`](../patterns/code-standards.md:1)
- Artifact storage: [`../rules/artifacts-and-storage.md`](../rules/artifacts-and-storage.md:1)
