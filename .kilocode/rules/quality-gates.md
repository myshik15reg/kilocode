# Quality Gates (wrapper)

Source of Truth: [`quality-gates/SKILL.md`](../skills/quality-gates/SKILL.md:1).

Этот файл MUST быть thin wrapper’ом.

## Summary

1. Coverage MUST be 100% (lines/branches/functions).
2. Lint MUST be 0 errors and 0 warnings.
3. TDD MUST be used (Red -> Green -> Refactor).
4. Exceptions MUST go via waiver: [`waiver-workflow.md`](../workflows/waiver-workflow.md:1).

## References

1. SoT: [`quality-gates/SKILL.md`](../skills/quality-gates/SKILL.md:1).
2. Enforcement: [`quality-enforcement.md`](../workflows/quality-enforcement.md:1).
