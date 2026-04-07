# Overview (process map)

Назначение: концептуальная карта workflow-pack. Этот файл MUST быть кратким и MUST NOT дублировать SoT. Нормативная рамка документации: [`docs-standards.md`](../rules/docs-standards.md:1).

## How workflows run in Alfa Code

1. Любой файл из `.kilocode/workflows/` можно вызвать как workflow через `/имя-файла.md`.
2. Workflow описывает шаги; агент предлагает чтение/правки/команды и запрашивает подтверждение согласно настройкам.
3. Для стартового коридора используй [`../QUICK.md`](../QUICK.md:1), для меню процессов — [`quickref.md`](quickref.md:1).

## Task paths

| Path                       | Use when                                             | Sequence                                                                                                                                           | End state                                                   |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Question / research        | Нужен ответ без repo changes                         | Memory Bank -> route -> retrieval if needed -> answer                                                                                              | Протокол не нужен                                           |
| Brainstorm before protocol | Запрос неясен, design-heavy или нужен выбор подхода  | Memory Bank -> [`brainstorm-design.md`](brainstorm-design.md:1) -> [`protocol-new.md`](protocol-new.md:1) if repo write                            | Есть approved design summary или explicit clarification gap |
| FAST PATH                  | Нужен точный локальный patch-first ответ             | Memory Bank -> [`quick-fix.md`](quick-fix.md:1) -> verify -> при repo write минимальный протокол                                                   | Быстрый фикс без лишней декомпозиции                        |
| Standard repo change       | Любая задача, не попавшая в trivial                  | Memory Bank -> [`protocol-new.md`](protocol-new.md:1) -> specialist-first execution -> applicable gates -> close                                   | Изменение реализовано и проверено                           |
| Critical change            | Высокий blast radius, security/data/external systems | Memory Bank -> protocol -> [`risk-tier-review.md`](risk-tier-review.md:1) -> execution -> [`protocol-review-merge.md`](protocol-review-merge.md:1) | Review depth соответствует риску                            |
| Long / multi-domain task   | Несколько доменов, handoff, параллельные подзадачи   | Memory Bank -> protocol -> `orchestrator` route -> strict handoff -> degraded mode if needed -> close                                              | Координация есть, аналитика не смешана с routing            |
| Tool-heavy task            | MCP/web/retrieval loop or long execution chain       | Memory Bank -> [`planner-executor.md`](planner-executor.md:1) -> structured execution -> close                                                     | План и исполнение разделены                                 |

## Control rules

1. Repo changes всегда требуют протокол.
2. Specialist-first MUST применяться всегда; `code` остаётся last resort.
3. `orchestrator` MUST NOT выполнять аналитику; любая делегация требует strict handoff.
4. Prompts/workflows MUST быть execution contracts.
5. Memory Bank MUST хранить только долгоживущий контекст; raw notes staged separately.
6. Close-out claims MUST have fresh verification for the current state.
7. Если выполнение зависит от runtime/project config, до выбора решения SHOULD выполняться фокусный deep dive конфигурации запуска по [`context-priming.md`](context-priming.md:1); после него решение MUST оставаться минимально достаточным и без оверинжиниринга.
8. Сначала используй индексные/роутер-файлы (`memory-bank/index.md`, `quickref.md`, `rules/index.md`), а deep docs открывай только по маршруту; это удерживает контекст маленьким и снижает расход токенов.
