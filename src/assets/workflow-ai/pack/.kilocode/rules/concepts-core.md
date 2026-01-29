# Core Concepts

> Подробнее: `~/.kilocode/rules/concepts.md`

## Memory Bank
Долговременный контекст проекта в `.kilocode/memory-bank/`:
- `index.md` - навигация
- `brief.md` - цели проекта
- `context.md` - текущий фокус
- **Memory First** - всегда начинай с index.md

## Protocols
Изолированный контекст задачи в `.protocols/YYYY-MM-DD-name/`:
- `brief.md` - требования + DoD
- `plan.md` - шаги реализации
- **No Protocol, No Code** - протокол обязателен

## Agents (Modes)
Специализированные режимы:
- Orchestrator → координация
- Architect → планирование
- Code → реализация
- Reviewer → проверка качества

**Делегирование:** только через `new_task`
