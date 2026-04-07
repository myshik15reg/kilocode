# Agent Routing Rules (SoT)

## Purpose

Этот документ задаёт единственный канонический набор правил маршрутизации (`routing`) для режима `orchestrator`.

1. Orchestrator MUST маршрутизировать и делегировать.
2. Orchestrator MUST NOT выполнять аналитику требований/кода/архитектуры.
3. Specialist-first MUST применяться всегда: выбирать самый узкий подходящий `mode`.

Термины: [`terminology.md`](terminology.md:1).
Handoff: [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
Evidence: [`evidence-rules.md`](evidence-rules.md:1).

## Zero-analytics policy (mandatory)

| Если требуется                                   | Orchestrator MUST delegate to                                                            | Notes                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| бизнес-требования, BRD, user stories, AC         | `business-analyst` / `1c-business-analyst`                                               | Orchestrator не уточняет продукт сам, кроме 1 blocking question.  |
| системный анализ, ТЗ, алгоритмы, impact analysis | `system-analyst` / `1c-system-analyst`                                                   |                                                                   |
| архитектура, ADR, проектирование интерфейсов     | `architect` / `solution-architect` / `api-architect` / `data-architect` / `1c-architect` | Use `brainstorm-design.md` when the solution space is still wide. |
| поиск root cause, triage, воспроизведение бага   | `debug`                                                                                  |                                                                   |
| исправление известной причины                    | `code-fixer` или соответствующий `*-dev`                                                 |                                                                   |
| code review                                      | `reviewer` (или доменный QA-режим)                                                       |                                                                   |
| documentation workflow-pack / protocols          | `architect`                                                                              |                                                                   |
| retrieval-heavy research plan                    | `planning-research-codebase` / `planning-research-web` / `architect`                     | planner may precede executor                                      |

## Design ambiguity triggers

Route to `architect` through [`../workflows/brainstorm-design.md`](../workflows/brainstorm-design.md:1) when the request includes one of these observable signals:

1. ambiguous request;
2. design exploration;
3. compare options;
4. need architecture direction;
5. unclear success criteria;
6. large initiative requiring decomposition before protocol.

Do not trigger `brainstorm-design` for:

1. exact bug fix;
2. trivial repo change;
3. docs-only micro-change;
4. already approved design/spec.

## Routing algorithm (deterministic)

1. Determine whether the request needs design discovery before protocol planning.
2. If yes, route to `architect` via [`../workflows/brainstorm-design.md`](../workflows/brainstorm-design.md:1).
3. Otherwise determine `task type` по таблице `Task type -> mode`.
4. Determine `domain trigger` по таблице `Domain triggers`.
5. If a specialist is found, MUST choose it.
6. If task is tool-heavy, SHOULD сначала выбрать planner path по [`../workflows/planner-executor.md`](../workflows/planner-executor.md:1).
7. If specialist не найден, MAY использовать общий `code`.
8. Для любой делегации MUST использовать шаблон [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Task type -> mode

| Task type (observable intent)                                 | Mode                                                                    | Stop condition                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Planning, protocol creation/closure, `.md` editing            | `architect`                                                             | Нет изменений кода, только docs.                             |
| Ambiguous design / compare options / unclear success criteria | `architect`                                                             | `approved design summary` or `needs-clarification` produced. |
| Координация multi-step, декомпозиция, параллельные подзадачи  | `orchestrator`                                                          | Orchestrator не делает содержательную работу.                |
| Вопросы/исследование без изменений                            | `ask` / `planning-research-codebase` / `planning-research-web`          | Findings only; no writes.                                    |
| Retrieval-first research                                      | `planning-research-*` or `architect`                                    | Findings staged and promoted deliberately.                   |
| Bug: причина неизвестна                                       | `debug`                                                                 | Выдать root cause + план фикса.                              |
| Bug: причина известна, нужен фикс                             | `code-fixer` или доменный `*-dev`                                       | Выдать фикс + тесты.                                         |
| Тестирование                                                  | `unit-tester` / `integration-tester` / `e2e-tester` / `security-tester` | Coverage/детерминизм соблюдены.                              |
| Code review                                                   | `reviewer`                                                              | Выдать замечания или approval.                               |
| Рефакторинг                                                   | `refactorer` (или `refactorer --simplify`)                              | Не менять поведение без явного решения в протоколе.          |
| Локализация                                                   | `translate`                                                             | Только i18n/локализация.                                     |

## Domain triggers (specialist-first)

| Trigger                   | Examples                                                              | Route to                |
| ------------------------- | --------------------------------------------------------------------- | ----------------------- |
| 1C:Enterprise (immediate) | `1C`, `1С`, `BSL`, `EDT`, `.bsl`, `справочник`, `документ`, `регистр` | `1c-orchestrator`       |
| React                     | `react`, `jsx`, `hook`, `component`                                   | `react-dev`             |
| Vue                       | `vue`, `nuxt`, `composition api`                                      | `vue-dev`               |
| Node.js backend           | `node`, `express`, `nestjs`, `npm`                                    | `nodejs-dev`            |
| Python backend            | `python`, `django`, `fastapi`                                         | `python-dev`            |
| Database: PostgreSQL      | `postgres`, `sql`, `index`, `migration`                               | `postgresql-specialist` |
| Database: Prisma          | `prisma`, `schema.prisma`                                             | `prisma-specialist`     |
| DevOps/CI                 | `docker`, `k8s`, `pipeline`, `github actions`                         | `devops` или `cicd`     |
| Security audit            | `vulnerability`, `OWASP`, `SAST`                                      | `security-auditor`      |

## Escalation rules

1. Если задача пересекает более 2 доменов, orchestrator SHOULD:
    1. delegate design analysis to `architect` or профильному архитектору,
    2. затем delegate реализацию доменным specialist modes.
2. Если задача tool-heavy или retrieval-heavy, orchestrator SHOULD:
    1. выбрать planner path,
    2. затем привязать executor specialist,
    3. определить degraded mode path.
3. If ambiguity only blocks routing and one short question can unblock it safely, orchestrator MAY ask exactly one blocking question and record a `TEMP:` safe default.
4. If ambiguity requires comparing approaches or collapsing design before protocol planning, orchestrator MUST route to `architect` via `brainstorm-design.md` instead of attempting the analysis itself.
