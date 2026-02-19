# Claude Code CLI Instructions

> Инструкции для работы с WorkFlowAI через Claude Code CLI (claude-code, aider, etc.)

## Quick Start

1. Read `.kilocode/memory-bank/index.md`
2. Confirm with `[MB: OK]`
3. Follow AGENTS.md rules
4. Create protocol before any changes

## Mode Mapping

| Kilo Code Mode | CLI Equivalent   | Description                |
| -------------- | ---------------- | -------------------------- |
| `orchestrator` | coordinator role | Координация и декомпозиция |
| `architect`    | planner role     | Планирование и архитектура |
| `code`         | implementer role | Реализация кода            |
| `reviewer`     | reviewer role    | Code review                |
| `ask`          | consultant role  | Консультации               |

## Delegation in CLI

CLI не имеет `new_task`. Используй role-loop в одной сессии:

```
# Role-loop pattern
1. [ARCHITECT] Создать план
2. [IMPLEMENTER] Реализовать код
3. [TESTER] Написать тесты
4. [REVIEWER] Проверить качество
5. [ARCHITECT] Закрыть протокол
```

**Документируй переключения ролей в `execution.md`:**

```markdown
## Role Switches

| Time  | From        | To          | Reason                              |
| ----- | ----------- | ----------- | ----------------------------------- |
| 10:00 | architect   | implementer | Plan ready, starting implementation |
| 11:30 | implementer | tester      | Code complete, need tests           |
| 12:00 | tester      | reviewer    | Tests written, need review          |
```

## Quality Gates

Те же требования, что и в Kilo Code:

- **Coverage:** 100% (lines/branches/functions)
- **Lint:** 0 errors, 0 warnings
- **TDD:** Red → Green → Refactor
- **TODO:** Только с тикетом: `TODO(#123)`

## Protocol Workflow

```
1. Создать протокол: .protocols/YYYY-MM-DD-task-name/
2. Написать brief.md с требованиями
3. Написать plan.md с шагами
4. Реализовать по плану
5. Обновить execution.md
6. Закрыть протокол
```

## Memory Bank Access

```bash
# Читать Memory Bank
cat .kilocode/memory-bank/index.md
cat .kilocode/memory-bank/context.md
cat .kilocode/memory-bank/architecture.md
cat .kilocode/memory-bank/tech.md
```

## Context Capsule (для ограниченного контекста)

Если контекст ограничен, создай Context Capsule:

```markdown
# Context Capsule

## Project

- Name: [project name]
- Stack: [tech stack]
- Phase: [current phase]

## Current Task

- Protocol: .protocols/YYYY-MM-DD-task/
- Goal: [task goal]
- Status: [in progress/blocked/done]

## Key Decisions

- [decision 1]
- [decision 2]

## Next Steps

- [ ] Step 1
- [ ] Step 2
```

## Differences from Kilo Code

| Feature           | Kilo Code          | CLI                    |
| ----------------- | ------------------ | ---------------------- |
| Mode switching    | `new_task`         | Role-loop              |
| MCP servers       | Native support     | Manual integration     |
| File restrictions | Per-mode           | Manual discipline      |
| Todo tracking     | `update_todo_list` | Manual in execution.md |

## Best Practices

1. **Явно указывай роль** в начале каждого блока работы
2. **Документируй решения** в execution.md
3. **Не пропускай тесты** - coverage 100%
4. **Обновляй Memory Bank** после значимых изменений
5. **Закрывай протоколы** - не оставляй незавершённые

## Example Session

```
[ARCHITECT]
Читаю Memory Bank... [MB: OK]
Создаю протокол .protocols/2025-01-15-auth-feature/
Пишу brief.md и plan.md

[IMPLEMENTER]
Реализую по плану:
- Step 1: Create auth service ✅
- Step 2: Add middleware ✅
- Step 3: Write tests → delegating to TESTER

[TESTER]
Пишу тесты:
- Unit tests: 15 tests, 100% coverage ✅
- Integration tests: 5 tests ✅

[REVIEWER]
Проверяю качество:
- SOLID: ✅
- Security: ✅
- Coverage: 100% ✅
- Lint: 0 errors ✅

[ARCHITECT]
Закрываю протокол.
Обновляю Memory Bank.
```

## See Also

- [`../memory-bank/index.md`](../memory-bank/index.md) - Memory Bank
- [`../../AGENTS.md`](../../AGENTS.md) - Main manifest
- [`../rules/project-rules.md`](../rules/project-rules.md) - Project rules
- [`../skills/cli-compatibility/SKILL.md`](../skills/cli-compatibility/SKILL.md) - Detailed CLI skill
