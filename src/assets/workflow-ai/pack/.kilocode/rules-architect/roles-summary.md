# Roles Summary (Architect Mode)

Назначение: краткий справочник ролей. Полный гайд: [`roles-guide/SKILL.md`](../skills/roles-guide/SKILL.md:1).

## Core roles

| Role           | Goal                        | Forbidden                           | Allowed                         |
| -------------- | --------------------------- | ----------------------------------- | ------------------------------- |
| Orchestrator   | Координация сложных задач   | Писать код, делать аналитику        | Делегирование, MCP, чтение      |
| Architect      | Планирование и документация | Писать production code              | `.md` и `.protocols/` артефакты |
| Code / `*-dev` | Реализация по плану         | Делегировать (в рамках правил pack) | Код, тесты, рефакторинг         |
| Reviewer       | Проверка качества           | Писать код                          | Чтение, замечания, аудит        |

## Specialist selection

| Domain     | Specialist              |
| ---------- | ----------------------- |
| React      | `react-dev`             |
| Vue        | `vue-dev`               |
| Python     | `python-dev`            |
| Node.js    | `nodejs-dev`            |
| PostgreSQL | `postgresql-specialist` |
| Kubernetes | `kubernetes-architect`  |
| 1C         | `1c-orchestrator`       |

## Delegation pattern

Формат handoff MUST соответствовать SoT: [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1).
