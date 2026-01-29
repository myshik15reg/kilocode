# Git Workflow Rules (Code Mode)

> Правила работы с Git. Полный гайд: `~/.kilocode/rules/git-workflow-rules.md`

## Conventional Commits
```
type(scope): message

feat     - новая функциональность
fix      - исправление бага
docs     - документация
style    - форматирование
refactor - рефакторинг
test     - тесты
chore    - сборка, CI
```

## Примеры
```
feat(auth): add OAuth2 login support
fix(api): handle null response in user endpoint
test(utils): add unit tests for date formatter
```

## Branch Naming
```
type/description

feature/user-authentication
fix/null-pointer-api
refactor/database-layer
```

## TODO Rules
```js
// TODO(#123): Implement retry logic
```
**TODO только с номером тикета!**

## Pre-commit Checklist
- [ ] Тесты проходят
- [ ] Coverage 100%
- [ ] Lint 0 errors
- [ ] Conventional commit message
- [ ] Нет секретов в коде

## Запрещено
- ❌ `// eslint-disable`
- ❌ Коммиты без тестов
- ❌ WIP коммиты в main
- ❌ Секреты в коде
