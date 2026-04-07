---
name: skills-sh-verification-before-completion
description: Curated bridge for enforcing fresh verification before any completion claim in WorkFlowAI. Use when Codex is about to say work is done, tests pass, a bug is fixed, or a task is ready to merge or close.
---

# skills.sh Bridge: Verification Before Completion

## Purpose

Block false `done` claims by requiring fresh verification evidence that matches the current repo state.

## Triggers

- The agent is about to claim a task is done, ready, fixed, or verified.
- A delegated worker reported success and the controller must verify independently.
- A protocol is nearing close-out.

## Context

- `../../rules/verification-before-completion.md` - canonical local rule
- `../../rules/quality-gates.md` - applicable gates by task type
- `../../rules/evidence-rules.md` - evidence for claims
- `../../workflows/protocol-review-merge.md` - close-out workflow
- `../project-tests/SKILL.md` - standard test execution path

## Procedure

1. Identify the exact command, check, or self-check that proves the pending claim.
2. Re-run that verification after the latest meaningful edits.
3. Read the full result, not just a summary line or prior report.
4. Match the claim to the evidence and report limitations explicitly if verification could not run.
5. Only then state the task status.

## Local Overrides

- The local SoT rule is canonical; this bridge reinforces it, not replaces it.
- Docs-only tasks require docs/link/evidence verification, not invented runtime checks.
- This bridge does not replace quality gates, risk-tier review, or pre-action checks.

## When not to use

- Initial planning before any verification point exists.
- Early implementation when the task is not ready for a status claim.
- Security/risk review that needs a broader review workflow.

## Related Local Skills

- [`quality-gates`](../quality-gates/SKILL.md)
- [`project-tests`](../project-tests/SKILL.md)
- [`code-review`](../code-review/SKILL.md)

## Upstream Source

- `https://skills.sh/obra/superpowers/verification-before-completion`
- Retrieved for curation: 2026-04-08
