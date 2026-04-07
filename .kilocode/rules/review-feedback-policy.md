# Review Feedback Policy (SoT)

## Purpose

Define how review comments are handled so that the agent responds with evidence and scope discipline instead of blindly accepting or silently ignoring feedback.

Related docs: [`evidence-rules.md`](evidence-rules.md:1), [`workflow-prompt-writing.md`](workflow-prompt-writing.md:1), [`../workflows/protocol-review-merge.md`](../workflows/protocol-review-merge.md:1).

## Feedback triage

Every review comment MUST be classified as exactly one of:

| Decision       | Meaning                                                            |
| -------------- | ------------------------------------------------------------------ |
| `valid`        | feedback is supported and should be addressed                      |
| `uncertain`    | feedback may be valid but needs more evidence or clarification     |
| `incorrect`    | feedback conflicts with requirements, approved design, or evidence |
| `out-of-scope` | feedback is reasonable but expands or changes agreed scope         |

## Rules

1. A review comment MUST NOT be accepted only because it came from review.
2. Accepted feedback MUST be checked against requirements, approved design, and evidence.
3. If feedback changes scope or design intent, the protocol MUST be updated before implementation continues.
4. If feedback is not confirmed, that must be stated explicitly.
5. Closure paths MUST distinguish `addressed` from `acknowledged but rejected with rationale`.

## Feedback disposition note

When review materially affects the task, record a short note in `execution.md` or review artifacts with:

1. `feedback`
2. `decision`
3. `rationale`
4. `impact`
5. `verify`

## Notes

1. `uncertain` feedback SHOULD lead to targeted clarification or evidence gathering, not silent acceptance.
2. `out-of-scope` feedback MAY become a follow-up task, but MUST NOT quietly rewrite the current task.
