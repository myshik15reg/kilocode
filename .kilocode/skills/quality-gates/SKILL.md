---
name: quality-gates
description: Authoritative source for quality requirements - 100% coverage, lint rules, TDD workflow, CI/CD gates.
---

# Quality Gates (Authoritative Source)

## Coverage Requirements

| Metric        | Requirement | Blocks        |
| ------------- | ----------- | ------------- |
| **Lines**     | 100%        | Merge + Build |
| **Branches**  | 100%        | Merge + Build |
| **Functions** | 100%        | Merge + Build |

### Zero Tolerance

- Code without 100% coverage CANNOT be merged
- Build MUST fail if coverage < 100%
- No exceptions without `waiver-workflow.md`

### Excluded from Coverage

- Generated code (proto, swagger)
- Type definitions (.d.ts)
- Config files (0 logic)

## Lint Requirements

| Requirement   | Value     | Blocks        |
| ------------- | --------- | ------------- |
| Errors        | 0         | Merge + Build |
| Warnings      | 0         | Merge + Build |
| Disable rules | Forbidden | Merge         |

## TDD Requirements

| Step     | Requirement                  |
| -------- | ---------------------------- |
| Red      | Test written FIRST and fails |
| Green    | Minimal code to pass         |
| Refactor | Improve with green tests     |

## CI/CD Pipeline

```yaml
# Every PR must pass:
- lint (0 errors, 0 warnings)
- test:unit (100% coverage)
- test:integration
- security-scan
- build
```

## Pre-commit Hooks

```bash
npm test -- --coverage  # Must be 100%
npm run lint           # Must be 0 issues
```
