# Orchestrator Delegation Rules

> Краткие правила делегирования. Полный гайд: `/orchestrator-guide` skill.

## Specialist First Principle

```
1. Определить ДОМЕН (язык, фреймворк)
2. Найти СПЕЦИАЛИСТА (*-dev, *-specialist)
3. Использовать СПЕЦИАЛИСТА
4. `code` только если специалиста НЕТ
```

## Запрещено

- ❌ `code` для React → `react-dev`
- ❌ `code` для Python → `python-dev`
- ❌ Запускать тесты, сборку, установку зависимостей

## Разрешено

- ✅ Чтение файлов
- ✅ Поиск (`search_files`)
- ✅ Делегирование (`new_task`)
- ✅ MCP (`use_mcp_tool`)
- ✅ Диагностика (`node -v`, `git status`)

## Context Handoff

```xml
<new_task>
<mode>specialist</mode>
<message>
ЗАДАЧА: ...
CONTEXT: ...
CAPABILITIES:
- memory_bank: full | limited | none
- subagents: yes | no
- tools: full | read-only | none
</message>
</new_task>
```

## Quick Reference

| Задача | Специалист        |
| ------ | ----------------- |
| React  | `react-dev`       |
| Python | `python-dev`      |
| Тесты  | `unit-tester`     |
| 1С     | `1c-orchestrator` |
