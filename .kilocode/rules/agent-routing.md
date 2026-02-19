# Agent Routing Rules (SoT)

## Purpose

Этот документ задаёт единственный канонический набор правил маршрутизации (`routing`) для режима `orchestrator`.

1. Orchestrator MUST маршрутизировать и делегировать.
2. Orchestrator MUST NOT выполнять аналитику требований/кода/архитектуры.
3. Specialist-first MUST применяться всегда: выбирать самый узкий подходящий `mode`.

Термины: [`terminology.md`](terminology.md:1).
Handoff: [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
Правила доказательности: [`evidence-rules.md`](evidence-rules.md:1).

## Zero-analytics policy (mandatory)

Таблица фиксирует запреты и обязательную эскалацию.

| Если требуется                                   | Orchestrator MUST delegate to                                                            | Notes                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| бизнес-требования, BRD, user stories, AC         | `business-analyst` / `1c-business-analyst`                                               | Оркестратор не уточняет продукт сам, кроме 1 blocking question по [`evidence-rules.md`](evidence-rules.md:1). |
| системный анализ, ТЗ, алгоритмы, Impact analysis | `system-analyst` / `1c-system-analyst`                                                   |                                                                                                               |
| архитектура, ADR, проектирование интерфейсов     | `architect` / `solution-architect` / `api-architect` / `data-architect` / `1c-architect` |                                                                                                               |
| поиск root cause, triage, воспроизведение бага   | `debug`                                                                                  |                                                                                                               |
| исправление известной причины                    | `code-fixer` или соответствующий `*-dev`                                                 |                                                                                                               |
| код-ревью                                        | `reviewer` (или доменный QA-режим)                                                       |                                                                                                               |
| документация workflow-pack / протоколы           | `architect`                                                                              | Отдельного `technical-writer` в pack не предполагается.                                                       |

## Routing algorithm (deterministic)

1. Определи `task type` по таблице "Task type -> mode".
2. Определи `domain trigger` по таблице "Domain triggers".
3. Если найден specialist, MUST выбрать его.
4. Если specialist не найден, MAY использовать общий `code`.
5. Для любой делегации MUST использовать шаблон [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Task type -> mode

| Task type (observable intent)                                   | Mode                                                                    | Stop condition                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| Планирование, создание/закрытие протокола, редактирование `.md` | `architect`                                                             | Нет изменений кода, только docs.                    |
| Координация multi-step, декомпозиция, параллельные подзадачи    | `orchestrator`                                                          | Orchestrator не делает содержательную работу.       |
| Вопросы/исследование без изменений                              | `ask` / `planning-research-codebase` / `planning-research-web`          | Findings only; no writes.                           |
| Баг: причина неизвестна                                         | `debug`                                                                 | Выдать root cause + план фикса.                     |
| Баг: причина известна, нужен фикс                               | `code-fixer` или доменный `*-dev`                                       | Выдать фикс + тесты.                                |
| Тестирование                                                    | `unit-tester` / `integration-tester` / `e2e-tester` / `security-tester` | Coverage/детерминизм соблюдены.                     |
| Code review                                                     | `reviewer`                                                              | Выдать замечания или approval.                      |
| Рефакторинг                                                     | `refactorer` (или `refactorer --simplify`)                              | Не менять поведение без явного решения в протоколе. |
| Локализация                                                     | `translate`                                                             | Только i18n/локализация.                            |

## Domain triggers (specialist-first)

Таблица задаёт стоп-условия. Если триггер сработал, orchestrator MUST делегировать в указанный `mode`.

| Trigger                   | Examples                                                              | Route to                                                   |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1C:Enterprise (immediate) | `1C`, `1С`, `BSL`, `EDT`, `.bsl`, `справочник`, `документ`, `регистр` | `1c-orchestrator`                                          |
| React                     | `react`, `jsx`, `hook`, `component`                                   | `react-dev`                                                |
| Vue                       | `vue`, `nuxt`, `composition api`                                      | `vue-dev`                                                  |
| Node.js backend           | `node`, `express`, `nestjs`, `npm`                                    | `nodejs-dev`                                               |
| Python backend            | `python`, `django`, `fastapi`                                         | `python-dev` (или более узкий specialist)                  |
| Database: PostgreSQL      | `postgres`, `sql`, `index`, `migration`                               | `postgresql-specialist` (или `data-architect` для дизайна) |
| Database: Prisma          | `prisma`, `schema.prisma`                                             | `prisma-specialist`                                        |
| DevOps/CI                 | `docker`, `k8s`, `pipeline`, `github actions`                         | `devops` или `cicd`                                        |
| Security audit            | `vulnerability`, `OWASP`, `SAST`                                      | `security-auditor`                                         |

## Escalation rules

1. Если задача пересекает более 2 доменов (например, backend + DB + infra), orchestrator SHOULD:
    1. делегировать анализ `architect` (или профильному архитектору),
    2. затем делегировать реализацию доменным `*-dev/*-specialist` по отдельным подзадачам.
2. Если требование неоднозначно и блокирует работу, orchestrator MUST:
    1. задать ровно 1 уточняющий вопрос,
    2. указать `TEMP:` правило safe default до ответа,
    3. зафиксировать это в handoff по [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Evidence discipline during routing

1. Любое утверждение про файлы/пути MUST иметь source-ссылку. См. [`evidence-rules.md`](evidence-rules.md:1).
2. Если в handoff упоминаются скрипты, пути MUST следовать SoT [`scripts-entrypoints.md`](../workflows/scripts-entrypoints.md:1).
