# Quality Gates (Core)

> Полная версия: `~/.kilocode/skills/quality-gates/SKILL.md`

## Обязательные метрики

| Метрика                             | Требование                     | Блокирует     |
| ----------------------------------- | ------------------------------ | ------------- |
| Coverage (lines/branches/functions) | 100%                           | Merge + Build |
| Lint (errors + warnings)            | 0                              | Merge + Build |
| TDD                                 | Red→Green→Refactor             | Merge         |
| TODO                                | Только с тикетом: `TODO(#123)` | Merge         |
| Conventional Commits                | `type(scope): msg`             | Merge         |

## Краткие правила

- Код без 100% покрытия НЕ мержится
- Lint warnings = errors
- Тест пишется ПЕРВЫМ (TDD)
- Secrets в коде запрещены
- Протокол обязателен для изменений кода
