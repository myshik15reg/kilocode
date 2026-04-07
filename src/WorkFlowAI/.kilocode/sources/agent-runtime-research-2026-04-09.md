# Agent Runtime Research (2026-04-09)

Назначение: стабильный source-note по внешнему исследованию runtime-patterns для coding agents, использованный при обновлении WorkFlowAI 2026-04-09.

## Источники

1. Yandex / TrustYFox: <https://habr.com/ru/companies/yandex/articles/1013714/>
2. `gstack`: <https://github.com/garrytan/gstack>
3. `gstack` architecture: <https://raw.githubusercontent.com/garrytan/gstack/main/ARCHITECTURE.md>
4. `gstack` learn skill: <https://raw.githubusercontent.com/garrytan/gstack/main/learn/SKILL.md>
5. Habr article 1021168: <https://habr.com/ru/articles/1021168/>
6. Sebastian Raschka, `Components of a Coding Agent`: <https://magazine.sebastianraschka.com/p/components-of-a-coding-agent>

## Краткие выводы по источникам

### 1. TrustYFox / production agent runtime

- Практическая ценность не в «ещё одном чате», а в управляемом tool-loop, воспроизводимости и наблюдаемости.
- Для production-агента важны явные состояния, traceability и способность восстанавливать ход выполнения.
- UI сам по себе не является первой ценностью; первична управляемость исполнения.

### 2. gstack / workflow-pack как продукт

- Сильный эффект даёт не количество slash-команд, а целостный runtime contour:
    - bootstrap контекста,
    - узкие operational tools,
    - reviewable memory/learn,
    - автоматизация против doc drift.
- `gstack` демонстрирует, что developer workflow-pack может выглядеть как «команда специалистов», но реальную ценность создаёт связность между routing, memory, QA и release loops.

### 3. Mini Coding Agent / Raschka

- Для coding agent важны отдельные слои:
    - модель и prompt loop,
    - tools,
    - память,
    - working memory / runtime state,
    - repository context.
- Из этого следует, что long-lived knowledge и свежий runtime context нельзя смешивать в одном слое.

## Применимость к WorkFlowAI

### Прямо применимо сейчас

1. Ввести task-local `workspace context snapshot` поверх `Memory Bank`.
2. Ввести `session checkpoint` для resume/handoff/compaction.
3. Держать `Memory Bank` только для curated long-lived facts.
4. Вынести крупные runtime инициативы в backlog вместо преждевременного внедрения.

### Частично уже есть в WorkFlowAI

1. `research-retrieval.md` уже требует pruning, staging и promotion discipline.
2. `context-capsule.md` уже решает часть handoff-проблемы.
3. `beads-task-tracking.md` уже описывает устойчивое состояние длинных задач.
4. `planner-executor.md` уже вводит execution frontier и degraded mode.

### Пока не стоит тянуть в core wave

1. Полный semantic stack (`Qdrant`, reranker, graph DB) для самого workflow-pack.
2. Богатый runtime UI.
3. Большую auto-generated платформу поверх всех docs без предварительной валидации на реальных задачах.

## Локальная интерпретация для WorkFlowAI

Это интерпретация источников под текущий репозиторий.

1. WorkFlowAI должен оставаться document-centric workflow-pack.
2. Следующая эволюция pack должна происходить через operational workflow и curated artifacts, а не через немедленное превращение в отдельный runtime platform.
3. Приоритеты: `workspace bootstrap` -> `checkpoint/resume` -> `learn layer` -> `anti-drift` -> `review-readiness`.
