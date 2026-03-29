# Workflow: quick-diagnosis

## Goal

Reach a fast evidence-based first diagnosis when a deeper investigation may or may not be necessary.

## Use when

- a bug or issue is visible but the root cause is not yet known
- the user needs a quick triage answer before a larger workflow begins
- you need to decide whether the issue is small, deep, or operational

## Process

1. State the observed problem.
2. Check the smallest relevant evidence source.
3. Identify the most likely next branch: fix, deep analysis, or recovery path.
4. Avoid pretending the first guess is certainty.

## Outcomes

- if root cause looks local -> move to a focused fix path
- if the issue is unclear or broad -> move to [`deep-analysis.md`](deep-analysis.md:1)
- if the environment or workflow is broken -> move to [`failure-recovery.md`](failure-recovery.md:1)
