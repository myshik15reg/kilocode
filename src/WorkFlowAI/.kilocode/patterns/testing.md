# Testing Patterns

Purpose: provide a compact reference for choosing and structuring tests.

## Key reminders

1. Choose the smallest test that proves the needed behavior.
2. Keep tests deterministic and readable.
3. Protect critical behavior, boundaries, and regressions.
4. Use repository policy to determine exact coverage and gate requirements.

## Typical layers

- unit tests for local logic
- integration tests for boundaries and contracts
- end-to-end tests for critical flows

## Related sources

- Detailed testing guidance: [`../skills/testing-detailed/SKILL.md`](../skills/testing-detailed/SKILL.md:1)
- Testing rules: [`../rules/testing-rules.md`](../rules/testing-rules.md:1)
