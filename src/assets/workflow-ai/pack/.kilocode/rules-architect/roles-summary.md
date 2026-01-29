# Roles Summary (Architect Mode)

> Краткий справочник ролей. Полный гайд: `~/.kilocode/rules/roles.md`

## Core Roles

### Orchestrator
- **Цель:** Координация сложных задач
- **Запрещено:** Писать код, запускать тесты
- **Разрешено:** Делегирование, MCP, чтение

### Architect
- **Цель:** Планирование, проектирование
- **Артефакты:** brief.md, plan.md, architecture.md
- **Workflow:** Memory Bank → Protocol → Design → Delegate

### Code
- **Цель:** Реализация по плану
- **Требования:** TDD, 100% coverage, lint clean
- **Workflow:** Test → Code → Refactor → Commit

### Reviewer
- **Цель:** Проверка качества
- **Checklist:** SOLID, Security, Tests, Docs

## Specialist Selection

| Домен | Специалист |
|-------|-----------|
| React | `react-dev` |
| Vue | `vue-dev` |
| Python | `python-dev` |
| Node.js | `nodejs-dev` |
| PostgreSQL | `postgresql-specialist` |
| Kubernetes | `kubernetes-architect` |
| 1С | `1c-orchestrator` |

## Delegation Pattern
```xml
<new_task>
<mode>specialist</mode>
<message>
ЗАДАЧА: ...
PROTOCOL: .protocols/YYYY-MM-DD-name/
INPUTS: ...
CONSTRAINTS: ...
</message>
</new_task>
```

## Key Rules
1. **One Mode Per Task** - не переключаться
2. **Specialist First** - узкий специалист предпочтителен
3. **Memory First** - всегда читать Memory Bank
4. **No Protocol, No Code** - протокол обязателен
