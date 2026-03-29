# AlfaFlowAI Quick Start (Level 0)

Читай только этот файл для старта. Детали только по ссылкам. Нормативная рамка: [`docs-standards.md`](rules/docs-standards.md:1).

## 1) Confirm context

1. Прочитай [`memory-bank/index.md`](memory-bank/index.md:1) и затем [`context.md`](memory-bank/context.md:1).
2. Выведи строку:

```text
[MB: OK]
```

## 2) Protocol is mandatory for repo changes

Любое изменение репозитория MUST иметь протокол:

```text
.protocols/YYYY-MM-DD-name/
  brief.md
  plan.md
  execution.md (optional)
  artifacts/
```

Source: [`protocol-new.md`](workflows/protocol-new.md:1).

## 2.1) FAST PATH для быстрых правок (Micro-change)

Если пользователь явно просит **быструю правку / микро‑рефакторинг / extract method / обёртку** и даёт точный фрагмент кода, агент SHOULD использовать FAST PATH workflow: [`quick-fix.md`](workflows/quick-fix.md:1).

Правило: FAST PATH **не отменяет** протокол для repo changes; он меняет порядок ответа: **patch → verify → (если применяем к репозиторию) протокол**.

## 3) Choose mode (specialist-first)

Алгоритм выбора режима: [`mode-selection/SKILL.md`](skills/mode-selection/SKILL.md:1).

| If you do                                  | Use mode                                     |
| ------------------------------------------ | -------------------------------------------- |
| Планируешь/пишешь docs/закрываешь протокол | `architect`                                  |
| Декомпозируешь и делегируешь               | `orchestrator`                               |
| Реализуешь по стеку                        | narrowest `*-dev/*-specialist`, иначе `code` |
| Работаешь с 1C                             | `1c-orchestrator`                            |

## 4) Quality gates (non-negotiable)

| Gate     | Requirement                     | Source                                                 |
| -------- | ------------------------------- | ------------------------------------------------------ |
| Coverage | 100% (lines/branches/functions) | [`quality-gates.md`](rules/quality-gates.md:1)         |
| Lint     | 0 errors and 0 warnings         | [`quality-gates.md`](rules/quality-gates.md:1)         |
| TDD      | Red -> Green -> Refactor        | [`testing-rules.md`](rules/testing-rules.md:1)         |
| Waiver   | only via waiver workflow        | [`waiver-workflow.md`](workflows/waiver-workflow.md:1) |

## 5) Delegation (strict handoff)

В Alfa Code смена режима MUST быть через `new_task`; `switch_mode` MUST NOT использоваться. Handoff MUST соответствовать SoT: [`context-handoff.md`](patterns/orchestration/context-handoff.md:1).

```text
<new_task>
<mode>react-dev</mode>
<message>
ЗАДАЧА: ...

=== CONTEXT HANDOFF ===
ROOT: d:/path/to/project
PROTOCOL: .protocols/YYYY-MM-DD-name/
ORIGIN: architect -> react-dev
DOMAIN: React
PHASE: Implementation

GOAL:
...

INPUTS:
1. .protocols/YYYY-MM-DD-name/brief.md:1 - requirements
2. .protocols/YYYY-MM-DD-name/plan.md:1 - steps

CONSTRAINTS:
1. TDD MUST be used.
2. Coverage MUST be 100%.
3. Lint MUST be 0/0.

EXPECTED OUTPUT:
...
=======================
</message>
</new_task>
```

## What to read next

| Need                               | Read                                                           |
| ---------------------------------- | -------------------------------------------------------------- |
| Меню процессов                     | [`quickref.md`](workflows/quickref.md:1)                       |
| Карта процессов                    | [`overview.md`](workflows/overview.md:1)                       |
| Путь к скриптам `workflowai-*.ps1` | [`scripts-entrypoints.md`](workflows/scripts-entrypoints.md:1) |
| Правила и SoT индекс               | [`rules/index.md`](rules/index.md:1)                           |
