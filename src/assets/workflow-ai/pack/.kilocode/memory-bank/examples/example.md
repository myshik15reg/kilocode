# Пример Memory Bank (заполнен)

Этот файл — **опциональный пример** заполненного Memory Bank для WorkFlowAI.

Используй как референс при настройке. По умолчанию агентам читать не нужно.

---

## `.kilocode/memory-bank/index.md`

- **Project:** WorkFlowAI (workflow pack for Kilo Code / Codex CLI)
- **Phase:** Delivery / Maintenance
- **Last Updated:** 2026-01-14

**Quick Start**
1. Прочитать `context.md` (текущий фокус).
2. Для любой задачи — создать протокол в `.protocols/YYYY-MM-DD-name/` (см. [`.kilocode/workflows/protocol-new.md`](../../workflows/protocol-new.md)).
3. Перед merge — пройти гейты качества (см. [`.kilocode/rules/quality-gates.md`](../../rules/quality-gates.md)) + закрыть протокол (см. [`.kilocode/workflows/protocol-review-merge.md`](../../workflows/protocol-review-merge.md)).

---

## `.kilocode/memory-bank/context.md`

## Текущий фокус
- Поддерживать WorkFlowAI как «исполняемый» workflow pack: guardrails, quality gates templates, быстрые скрипты и валидная документация.

## Активные протоколы
- (none)

## Следующие шаги
1. Поддерживать `scripts/workflowai-doctor.ps1` как источник истины по целостности pack.
2. При изменении workflow — обновлять `AGENTS.md`, `README.md` и workflows (embedded: `.kilocode/workflows/*`, global: `~/.kilocode/workflows/*`).

## Недавние изменения
- 2026-01-14: Добавлены шаблоны гейтов качества + guardrails (требование формата `TODO(#123)`, запрет lint-disables).

## Риски / блокеры
- Дрейф документации и шаблонов → регулярно прогонять `scripts/workflowai-doctor.ps1` + обновлять индексы.

## Решения (high impact)
- 2026-01-14: Quality gates должны быть исполняемыми (CI блокирует merge при нарушениях).

---

## `.kilocode/memory-bank/brief.md`

## One-liner
WorkFlowAI — workflow pack для строгой разработки с AI-агентами: протоколы, Memory Bank, TDD и quality gates.

## Goals
- Снизить «хаос» в AI-assisted разработке через протоколы и единую навигацию.
- Сделать требования качества исполняемыми (CI/guardrails), а не только декларативными.

## Non-Goals (out of scope)
- Реализация конкретного продукта/приложения (pack встраивается в другие репозитории).
- Поддержка «частичного» качества (меньше 100% coverage / разрешённые lint disables).

## Success Criteria
- Инициализация проекта занимает < 5 минут (global install + init).
- Quality gates запускаются локально и в CI одинаково и блокируют merge при нарушениях.

## Constraints
- **Quality:** TDD + 100% coverage (lines/branches/functions), 0 lint errors/warnings
- **Process:** No Protocol, No Code (без исключений)

---

## `.kilocode/memory-bank/product.md`

## Purpose
Дать командам повторяемый, строгий и масштабируемый процесс работы с AI-агентами.

## Core Features
- Протоколы задач (`.protocols/`) с brief/plan/execution.
- Quality gates templates (CI/PR) + guardrails (TODO tickets, запрет lint-disables).
- Набор правил/паттернов/skills под разные стеки.

## UX Principles
- «Сначала контекст» (Memory First).
- «Доказуемое качество» (tests/coverage/lint enforced).
- Минимальный overhead для тривиальных правок при обязательном протоколе.

---

## `.kilocode/memory-bank/architecture.md`

## System Overview
WorkFlowAI — набор Markdown-правил и PowerShell-скриптов, который подключается к проектам через global install или встраивание в репозиторий.

## Key Decisions
- Протокол = единица изоляции контекста (brief/plan/execution).
- Quality requirements должны быть исполняемыми (CI + guardrails), иначе они деградируют.

## Interfaces / Boundaries
- Внешний проект использует `.protocols/` и `.kilocode/` (embedded) или `~/.kilocode/` (global install), а также скрипты в `scripts/`.

---

## `.kilocode/memory-bank/tech.md`

## Stack
- **Language(s):** PowerShell + Markdown (шаблоны/гайды)
- **Runtime:** Windows PowerShell / PowerShell 7 (опционально)

## Tooling
- **Git:** для установки/встраивания и контроля изменений
- **CI/CD:** GitHub Actions (templates)
