# AlfaFlowAI Quick Start (Level 0)

Читай только этот файл для старта. Остановись, как только маршрут задачи определён. Детали читай только по ссылкам. Если есть индекс или меню, сначала читай индексный файл, а не глубокие документы: это уменьшает лишний контекст и расход токенов. Нормативная рамка: [`docs-standards.md`](rules/docs-standards.md:1).

## 1) Confirm context

1. Прочитай [`memory-bank/index.md`](memory-bank/index.md:1) и затем [`context.md`](memory-bank/context.md:1).
2. Выведи строку:

```text
[MB: OK]
```

## 2) Route task (stop when matched)

| Situation                                | Next step                                                                                                                                                                                                                                           | Stop condition                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Вопрос / исследование без repo changes   | Выбери режим по [`mode-selection/SKILL.md`](skills/mode-selection/SKILL.md:1): `ask`, `planning-research-codebase` или `planning-research-web`; для retrieval-heavy research используй [`research-retrieval.md`](workflows/research-retrieval.md:1) | Ответ или staged findings готовы; протокол не нужен      |
| Ambiguous or design-heavy request        | Сначала выполни [`brainstorm-design.md`](workflows/brainstorm-design.md:1), затем при repo change переходи к [`protocol-new.md`](workflows/protocol-new.md:1)                                                                                       | Есть `approved design summary` или `needs-clarification` |
| Точная micro-change с явным фрагментом   | Используй FAST PATH [`quick-fix.md`](workflows/quick-fix.md:1)                                                                                                                                                                                      | Готов patch-first ответ                                  |
| Repo change: trivial                     | Проверь условия в [`task-classification.md`](rules/task-classification.md:1), затем создай минимальный протокол через [`protocol-new.md`](workflows/protocol-new.md:1)                                                                              | `brief.md` и `plan.md` готовы в минимальной глубине      |
| Repo change: non-trivial                 | Сразу создай полный протокол через [`protocol-new.md`](workflows/protocol-new.md:1)                                                                                                                                                                 | Протокол готов к реализации                              |
| Multi-step / multi-domain задача         | Создай полный протокол, затем выбери режим по [`mode-selection/SKILL.md`](skills/mode-selection/SKILL.md:1); если нужна координация, используй `orchestrator` по [`agent-routing.md`](rules/agent-routing.md:1)                                     | Есть protocol + mode + handoff plan                      |
| Tool-heavy / MCP-heavy task              | Используй [`planner-executor.md`](workflows/planner-executor.md:1) вместе со specialist-first routing                                                                                                                                               | Есть planner contract + executor path                    |
| Изменение может быть high-blast-radius   | Сначала выполни [`risk-tier-review.md`](workflows/risk-tier-review.md:1)                                                                                                                                                                            | Risk tier зафиксирован                                   |
| Перед risky action нужен safety corridor | Выполни [`pre-action-check.md`](workflows/pre-action-check.md:1)                                                                                                                                                                                    | Есть go/no-go решение                                    |

## 3) Non-negotiables

| Rule               | Requirement                                                                                                                     | Source                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocol           | Любое изменение репозитория MUST иметь `.protocols/YYYY-MM-DD-name/`                                                            | [`protocol-new.md`](workflows/protocol-new.md:1)                                                                                                                                       |
| Depth              | Trivial и non-trivial задачи различаются только глубиной `plan.md`                                                              | [`task-classification.md`](rules/task-classification.md:1)                                                                                                                             |
| Design discovery   | Если design ещё не схлопнут, SHOULD пройти через `brainstorm-design` до `protocol-new`                                          | [`brainstorm-design.md`](workflows/brainstorm-design.md:1)                                                                                                                             |
| FAST PATH          | Patch-first разрешён только как short path; repo changes всё равно требуют протокол                                             | [`quick-fix.md`](workflows/quick-fix.md:1)                                                                                                                                             |
| Specialist-first   | Выбирай самый узкий specialist; `code` только last resort                                                                       | [`mode-selection/SKILL.md`](skills/mode-selection/SKILL.md:1)                                                                                                                          |
| Orchestrator       | `orchestrator` MUST NOT делать аналитику; только маршрутизация/делегирование                                                    | [`agent-routing.md`](rules/agent-routing.md:1)                                                                                                                                         |
| Handoff            | Любая делегация MUST использовать `CONTEXT HANDOFF` + `Result Contract`                                                         | [`patterns/orchestration/context-handoff.md`](patterns/orchestration/context-handoff.md:1), [`patterns/orchestration/result-contract.md`](patterns/orchestration/result-contract.md:1) |
| Prompt contract    | Workflow/prompts MUST follow execution-contract shape                                                                           | [`workflow-prompt-writing.md`](rules/workflow-prompt-writing.md:1)                                                                                                                     |
| Curated memory     | Memory updates MUST follow write policy                                                                                         | [`memory-write-policy.md`](rules/memory-write-policy.md:1)                                                                                                                             |
| Language and UTF-8 | Чат с пользователем, протоколы и Memory Bank MUST быть на русском; файлы с кириллицей MUST быть UTF-8 без BOM                   | [`language-and-encoding.md`](rules/language-and-encoding.md:1)                                                                                                                         |
| Review feedback    | Review comments MUST be triaged, not blindly accepted                                                                           | [`review-feedback-policy.md`](rules/review-feedback-policy.md:1)                                                                                                                       |
| Fresh verification | `done`/`ready`/`merged` claims MUST have fresh verification                                                                     | [`verification-before-completion.md`](rules/verification-before-completion.md:1)                                                                                                       |
| Quality gates      | Применимые гейты MUST следовать [`quality-gates.md`](rules/quality-gates.md:1) и [`testing-rules.md`](rules/testing-rules.md:1) | [`rules/index.md`](rules/index.md:1)                                                                                                                                                   |

## 4) Read next only if needed

Сначала выбирай индекс/роутер (`quickref.md`, `overview.md`, `rules/index.md`), и только потом углубляйся по нужным ссылкам.

| Need                               | Read                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Меню процессов                     | [`quickref.md`](workflows/quickref.md:1)                                         |
| Карта процессов                    | [`overview.md`](workflows/overview.md:1)                                         |
| Design discovery before protocol   | [`brainstorm-design.md`](workflows/brainstorm-design.md:1)                       |
| Путь к скриптам `workflowai-*.ps1` | [`scripts-entrypoints.md`](workflows/scripts-entrypoints.md:1)                   |
| Разбор входящих заметок            | [`notes-inbox-processing.md`](workflows/notes-inbox-processing.md:1)             |
| Retrieval-first research           | [`research-retrieval.md`](workflows/research-retrieval.md:1)                     |
| Planner/Executor                   | [`planner-executor.md`](workflows/planner-executor.md:1)                         |
| Review feedback triage             | [`review-feedback-policy.md`](rules/review-feedback-policy.md:1)                 |
| Close-out verification discipline  | [`verification-before-completion.md`](rules/verification-before-completion.md:1) |
| Риск-ориентированный review        | [`risk-tier-review.md`](workflows/risk-tier-review.md:1)                         |
| Правила и SoT индекс               | [`rules/index.md`](rules/index.md:1)                                             |
