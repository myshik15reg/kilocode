# Workflow: quick-fix

## Goal

Handle a very small, low-risk change with minimal context and minimal token cost.

This workflow optimizes for speed, but it does not cancel protocol rules for real repository changes.

## Use when

Use this workflow only when all of these are true:

- the change is small and local
- the intent is clear
- no broad redesign is required
- the agent can explain the fix with a short patch and short verification plan

Typical examples:

- extract a tiny helper
- rename or wrap a small fragment
- adjust a localized condition or message
- make a narrow mechanical fix in one area

## Do not use when

- the root cause is unclear
- multiple subsystems are involved
- requirements or behavior are changing materially
- the fix needs architectural reasoning or broad regression review

In those cases, use the normal protocol path or a more appropriate workflow such as [`protocol-new.md`](protocol-new.md:1), [`deep-analysis.md`](deep-analysis.md:1), or [`refactoring-workflow.md`](refactoring-workflow.md:1).

## Rules

1. Prefer the smallest viable patch.
2. Ask at most one blocking question.
3. If the task changes a real repository, protocol rules still apply.
4. Verification must stay proportional to the change, but it must still be explicit.

## Response shape

1. Show the intended patch or exact change.
2. State any assumption if one was needed.
3. Give a short verification checklist.
4. If the task is no longer truly small, escalate out of quick-fix.

## Verification checklist

- change stays scoped to the stated goal
- no unrelated refactor slips in
- the smallest relevant test or check is identified
- the result preserves intended behavior unless a behavior change was requested
