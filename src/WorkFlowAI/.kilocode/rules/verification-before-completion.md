# Verification Before Completion (SoT)

## Purpose

Prevent false `done`/`ready`/`merged`/`completed` claims by requiring verification that matches the current repo state.

Related docs: [`quality-gates.md`](quality-gates.md:1), [`evidence-rules.md`](evidence-rules.md:1), [`../workflows/protocol-review-merge.md`](../workflows/protocol-review-merge.md:1).

## Fresh verification rule

An agent MUST NOT claim `done`, `ready`, `merged`, or `completed` unless verification is fresh for the current diff/state.

Verification is fresh only if:

1. it covers the current changed state;
2. it was re-run after the latest meaningful edits;
3. it matches the task type.

## Task-type expectations

| Task type         | Required verification                                      |
| ----------------- | ---------------------------------------------------------- |
| Executable change | applicable tests/lint/coverage/security checks             |
| Docs-only change  | docs self-check, link sanity, evidence sanity              |
| Critical change   | applicable checks + explicit human-grade verification note |

## Rules

1. Stale verification after new edits is insufficient.
2. If checks cannot be run, the agent MUST return an explicit limitation and a safe next action.
3. Docs-only tasks MUST NOT invent runtime gates.
4. Verification claims SHOULD point to concrete evidence or artifacts.

## Notes

1. This rule is a closure invariant, not a replacement for risk-tier review or pre-action checks.
2. `protocol-review-merge.md` is the canonical close-out workflow that applies this rule.
