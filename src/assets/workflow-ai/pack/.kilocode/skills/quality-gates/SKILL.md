---
name: quality-gates
description: Authoritative source for quality requirements - 100% coverage, lint rules, TDD workflow, CI/CD gates.
---

# Quality Gates (SoT)

## Normative language

1. MUST означает обязательное требование.
2. MUST NOT означает запрещённое действие.
3. SHOULD означает рекомендацию; отклонение допускается только при явной причине, зафиксированной как evidence.
4. MAY означает опциональное действие.

Термины: [`terminology.md`](../../rules/terminology.md:1).
Enforcement workflow: [`quality-enforcement.md`](../../workflows/quality-enforcement.md:1).
Exceptions workflow: [`waiver-workflow.md`](../../workflows/waiver-workflow.md:1).

## 1) Coverage

Coverage MUST be 100%.

| Metric    | Requirement | Blocks        |
| --------- | ----------: | ------------- |
| Lines     |        100% | Merge + Build |
| Branches  |        100% | Merge + Build |
| Functions |        100% | Merge + Build |

| Rule           | Requirement                                 |
| -------------- | ------------------------------------------- |
| Zero tolerance | Код с coverage < 100% MUST NOT быть смёржен |
| Enforcement    | CI MUST fail if coverage < 100%             |

### 1.1) Exclusions (only if explicitly configured)

| Exclusion type             | Allowed when                          | Notes                                        |
| -------------------------- | ------------------------------------- | -------------------------------------------- |
| Generated code             | code is generated and not hand-edited | exclusion MUST be documented in repo config  |
| Type definitions (`.d.ts`) | no runtime logic                      | exclude only if tooling supports it          |
| Config-only files          | no logic branches                     | prefer to keep configs out of coverage scope |

## 2) Lint

Lint MUST be clean.

| Metric       | Requirement | Blocks        |
| ------------ | ----------: | ------------- |
| Errors       |           0 | Merge + Build |
| Warnings     |           0 | Merge + Build |
| Rule disable |    MUST NOT | Merge         |

## 3) TDD

TDD MUST follow Red -> Green -> Refactor.

| Step     | Requirement                              |
| -------- | ---------------------------------------- |
| Red      | Test MUST be written first and MUST fail |
| Green    | Minimal change to make it pass           |
| Refactor | Improve code with tests green            |

## 4) Exceptions (waiver)

1. Любое отклонение от gate MUST идти через [`waiver-workflow.md`](../../workflows/waiver-workflow.md:1).
2. Waiver MUST быть ограничен по scope и по времени.

## 5) CI templates (consuming project)

Эти файлы являются шаблонами для consuming project и SHOULD использоваться через workflow [`quality-enforcement.md`](../../workflows/quality-enforcement.md:1).

| Template                | Path                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| GitHub Actions workflow | [`workflowai-quality-gates.yml`](../../templates/quality-gates/project/.github/workflows/workflowai-quality-gates.yml:1) |
| Runner script           | [`workflowai-quality-gates.ps1`](../../templates/quality-gates/project/scripts/workflowai-quality-gates.ps1:1)           |
