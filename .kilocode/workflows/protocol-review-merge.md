# Workflow: protocol-review-merge (review, merge, close)

## Goal

Закрыть `task` качественно и переносимо: пройти применимые гейты, выполнить review по risk tier, корректно обработать review feedback, подтвердить свежую verification, принять решение по памяти и закрыть протокол.

Термины: [`../rules/terminology.md`](../rules/terminology.md:1).
Гейты качества: [`../rules/quality-gates.md`](../rules/quality-gates.md:1).
Risk tiers: [`risk-tier-review.md`](risk-tier-review.md:1).
Memory policy: [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1).
Review feedback: [`../rules/review-feedback-policy.md`](../rules/review-feedback-policy.md:1).
Verification discipline: [`../rules/verification-before-completion.md`](../rules/verification-before-completion.md:1).

## Closure path by task type

| Task type               | Required path                                                                                                                | Notes                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Docs-only               | docs self-check -> review if needed -> memory decision -> close protocol                                                     | Не выдумывать runtime gates                 |
| Trivial repo change     | applicable checks -> review per repo policy -> memory decision -> close protocol                                             | MB update только при долгоживущем изменении |
| Non-trivial / long task | risk tier -> feedback triage -> fresh verification -> security sanity -> structural review -> memory decision -> merge/close | default path                                |

## Feedback triage

If review comments exist, classify each material comment as one of:

1. `valid`
2. `uncertain`
3. `incorrect`
4. `out-of-scope`

Rules:

1. accepted feedback MUST be checked against requirements, approved design and evidence;
2. scope-changing or design-changing feedback MUST update the protocol before implementation continues;
3. unresolved or rejected feedback MUST be recorded explicitly, not silently ignored.

## Steps

|   # | Step                              | INPUT                                  | OUTPUT                                          | VERIFY                                             |
| --: | --------------------------------- | -------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
|   1 | Confirm risk tier                 | protocol + changed surface             | `low-risk` / `standard` / `critical`            | tier matches `risk-tier-review.md`                 |
|   2 | Triage review feedback            | protocol + review comments             | feedback disposition note or explicit `none`    | each material comment has a decision               |
|   3 | Run fresh applicable verification | implementation result + current diff   | tests/lint/coverage evidence or docs self-check | verification is fresh for the current state        |
|   4 | Security and structural sanity    | diff + threat surface                  | security notes + structural review notes        | critical tasks explicitly covered                  |
|   5 | Review                            | protocol + diff + feedback disposition | approval or issues list                         | review depth matches tier and complexity           |
|   6 | Make memory decision              | protocol decisions + artifacts         | promote / keep local / discard                  | decision follows memory write policy               |
|   7 | Merge and close                   | approved change                        | merged change + closed protocol                 | protocol marked done only after fresh verification |

## Structural review checklist

1. reuse vs reinvention;
2. subsystem overbuild;
3. missing stop conditions;
4. wrong agent split or ownership conflicts;
5. unsupported memory writes.

## Notes

1. `critical` tasks SHOULD include explicit human-grade verification note in `execution.md` or review artifact.
2. Use a short feedback disposition note with `feedback`, `decision`, `rationale`, `impact`, `verify` when review materially changes the task.
3. `.protocols/` MUST NOT be treated as SoT; promote only stable artifacts.
