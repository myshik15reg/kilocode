---
name: testing-detailed
description: Detailed testing guidance for choosing the right test depth, keeping tests deterministic, and aligning verification with repository quality policy.
---

# Testing Guidance

Use this skill when planning or implementing verification work.

## Core principles

1. Choose the smallest test that proves the required behavior.
2. Keep tests deterministic and focused.
3. Protect behavior that matters, not incidental implementation details.
4. Let repository policy define exact coverage and quality thresholds.

## Test levels

| Level       | Use when                                           |
| ----------- | -------------------------------------------------- |
| Unit        | one function, class, or local behavior needs proof |
| Integration | multiple components or boundaries interact         |
| End-to-end  | a critical user or system flow must be verified    |

## TDD loop

1. Write or define the failing expectation.
2. Make the smallest change that satisfies it.
3. Refactor while keeping verification green.

## Good test qualities

- deterministic
- isolated where appropriate
- readable
- scoped to one clear behavior
- fast enough for their intended role

## Mocking guidance

Mock unstable or external boundaries when the test does not need the real dependency.
Do not mock away the behavior you are actually trying to prove.

## Selection rules

- prefer unit tests for localized logic
- prefer integration tests for contracts and wiring
- reserve E2E for critical flows and cross-boundary confidence
- avoid inflating a small change into a broad expensive test suite unless risk justifies it

## Related sources

- Testing rules wrapper: [`../../rules/testing-rules.md`](../../rules/testing-rules.md:1)
- Quality gates: [`../../rules/quality-gates.md`](../../rules/quality-gates.md:1)
- Quality enforcement workflow: [`../../workflows/quality-enforcement.md`](../../workflows/quality-enforcement.md:1)
