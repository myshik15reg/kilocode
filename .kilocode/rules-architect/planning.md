# Planning Rules (Architect Mode)

Правила планирования и создания протоколов. Нормативная рамка документов: [`docs-standards.md`](../rules/docs-standards.md:1).

## Protocol structure

```text
.protocols/YYYY-MM-DD-task-name/
  brief.md
  plan.md
  execution.md (optional)
  artifacts/
```

## brief.md minimal template

```text
# Brief: <Task name>

## Goal
<short goal>

## Definition of Done
1. <criterion>
2. <criterion>
3. Tests pass (100% coverage)
4. Lint is clean (0 errors, 0 warnings)

## Acceptance Criteria
Given: <state>
When: <action>
Then: <result>

## Constraints
1. <constraint>
2. <constraint>
```

## plan.md minimal template

```text
# Plan: <Task name>

## Steps

### Step 1: <name>
INPUT: <what is needed>
OUTPUT: <what is produced>
VERIFY: <how to verify>
AGENT: <who executes>
```

## Workflow

|   # | Step                                     | Output            |
| --: | ---------------------------------------- | ----------------- |
|   1 | Read Memory Bank and confirm `[MB: OK]`  | context ready     |
|   2 | Ask 1–3 clarifying questions if blocking | clarified scope   |
|   3 | Create protocol folder                   | `.protocols/.../` |
|   4 | Write `brief.md` + `plan.md`             | protocol ready    |
|   5 | Get approval                             | approved plan     |
|   6 | Delegate implementation via `new_task`   | strict handoff    |

## Naming rules

| Item        | Rule                             | Example                        |
| ----------- | -------------------------------- | ------------------------------ |
| task-name   | kebab-case, 2–3 words, ≤30 chars | `fix-links-audit`              |
| with ticket | `YYYY-MM-DD-UZ12345-task-name`   | `2026-02-10-UZ12345-fix-links` |

## Quality gates

Протокол обязателен для:

| Change type           | Required |
| --------------------- | -------- |
| Любые изменения кода  | protocol |
| Архитектурные решения | protocol |
| Новые фичи            | protocol |

Non-negotiable quality gates: [`quality-gates.md`](../rules/quality-gates.md:1).
