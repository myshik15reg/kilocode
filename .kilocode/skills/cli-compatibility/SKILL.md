---
name: cli-compatibility
description: Guidance for adapting AlfaFlowAI workflows to CLI environments that do not provide native `new_task`, mode isolation, or automatic Memory Bank integration.
---

# CLI Compatibility Skill

> Обеспечение совместимости AlfaFlowAI с различными CLI инструментами (Claude Code CLI, Aider, etc.)

## Triggers

- Работа с проектом через CLI вместо Alfa Code
- Миграция workflow между инструментами
- Настройка нового CLI окружения

## Context

**Читать при старте:**

1. `.kilocode/memory-bank/index.md` - статус проекта
2. `.kilocode/cli/CLAUDE.md` - CLI инструкции
3. `AGENTS.md` - главный манифест

## Alfa Code vs CLI Differences

### Feature Comparison

| Feature           | Alfa Code          | Claude Code CLI | Aider       |
| ----------------- | ------------------ | --------------- | ----------- |
| Mode switching    | `new_task`         | Role-loop       | Role-loop   |
| MCP servers       | Native             | Manual          | Limited     |
| File restrictions | Per-mode           | Manual          | Manual      |
| Todo tracking     | `update_todo_list` | Manual          | Manual      |
| Memory Bank       | Native             | Manual read     | Manual read |
| Protocols         | Native             | Manual          | Manual      |

### Delegation

**Alfa Code:**

```xml
<new_task>
<mode>unit-tester</mode>
<message>
ЗАДАЧА: Write tests for auth module
PROTOCOL: .protocols/2025-01-15-auth/
</message>
</new_task>
```

**CLI (Role-loop):**

```
[IMPLEMENTER → TESTER]
Switching to TESTER role.
Task: Write tests for auth module
Protocol: .protocols/2025-01-15-auth/
```

## CLI Workflow

### 1. Session Start

```bash
# Read Memory Bank
cat .kilocode/memory-bank/index.md
cat .kilocode/memory-bank/context.md

# Confirm
echo "[MB: OK]"
```

### 2. Protocol Creation

```bash
# Create protocol directory
mkdir -p .protocols/$(date +%Y-%m-%d)-feature-name

# Create brief.md
cat > .protocols/$(date +%Y-%m-%d)-feature-name/brief.md << 'EOF'
# Brief

## Goal
[описание цели]

## Definition of Done
- [ ] Критерий 1
- [ ] Критерий 2

## Acceptance Criteria
Given [контекст]
When [действие]
Then [результат]
EOF

# Create plan.md
cat > .protocols/$(date +%Y-%m-%d)-feature-name/plan.md << 'EOF'
# Plan

## Steps
- [ ] Step 1: [описание]
- [ ] Step 2: [описание]

## Files to Change
- `path/to/file.ts`
EOF
```

### 3. Role-Loop Pattern

```
[ARCHITECT]
1. Read Memory Bank → [MB: OK]
2. Create protocol
3. Write brief.md and plan.md

[IMPLEMENTER]
4. Implement according to plan
5. Update execution.md with progress

[TESTER]
6. Write tests
7. Verify 100% coverage

[REVIEWER]
8. Review code quality
9. Check SOLID, security, coverage

[ARCHITECT]
10. Close protocol
11. Update Memory Bank
```

### 4. Documenting Role Switches

В `execution.md`:

```markdown
## Role Switches

| Time  | From        | To          | Reason        |
| ----- | ----------- | ----------- | ------------- |
| 10:00 | architect   | implementer | Plan ready    |
| 11:30 | implementer | tester      | Code complete |
| 12:00 | tester      | reviewer    | Tests written |
| 12:30 | reviewer    | architect   | Review passed |
```

## Mode Mapping

| Alfa Code Mode | CLI Role    | Responsibilities                 |
| -------------- | ----------- | -------------------------------- |
| `orchestrator` | Coordinator | Task decomposition, delegation   |
| `architect`    | Planner     | Protocols, architecture          |
| `code`         | Implementer | Code implementation              |
| `*-dev`        | Specialist  | Language-specific implementation |
| `unit-tester`  | Tester      | Unit tests                       |
| `reviewer`     | Reviewer    | Code review                      |
| `ask`          | Consultant  | Questions, research              |
| `debug`        | Detective   | Bug investigation                |

## Quality Gates (Same as Alfa Code)

- **Coverage:** 100% (lines/branches/functions)
- **Lint:** 0 errors, 0 warnings
- **TDD:** Red → Green → Refactor
- **TODO:** Only with ticket: `TODO(#123)`
- **Conventional Commits:** `type(scope): message`

## Context Capsule (for Limited Context)

Когда контекст CLI ограничен, создай Context Capsule:

```markdown
# Context Capsule

## Project

- **Name:** [project name]
- **Stack:** [tech stack]
- **Phase:** [current phase]

## Current Task

- **Protocol:** .protocols/YYYY-MM-DD-task/
- **Goal:** [task goal]
- **Status:** [in progress/blocked/done]

## Key Decisions

1. [decision 1]
2. [decision 2]

## Next Steps

- [ ] Step 1
- [ ] Step 2

## Files Changed

- `path/to/file1.ts` - [description]
- `path/to/file2.ts` - [description]
```

## MCP in CLI

### Manual MCP Integration

CLI не имеет нативной поддержки MCP. Альтернативы:

1. **Documentation:** Используй веб-документацию напрямую
2. **Local docs:** Скачай документацию локально
3. **Context7 API:** Если доступен, используй напрямую

### Example: Getting Library Docs

```bash
# Instead of MCP context7
# Use official documentation or local copies

# For React
curl -s https://react.dev/reference/react | head -100

# For Next.js
curl -s https://nextjs.org/docs | head -100
```

## Best Practices

1. **Явно указывай роль** в начале каждого блока работы
2. **Документируй решения** в execution.md
3. **Не пропускай тесты** - coverage 100%
4. **Обновляй Memory Bank** после значимых изменений
5. **Закрывай протоколы** - не оставляй незавершённые
6. **Используй Context Capsule** при ограниченном контексте

## Troubleshooting

### Problem: Lost Context

**Solution:** Создай Context Capsule и приложи к следующему запросу.

### Problem: No Mode Switching

**Solution:** Используй role-loop pattern с явным указанием роли.

### Problem: No MCP

**Solution:** Используй веб-документацию или локальные копии.

### Problem: No Todo Tracking

**Solution:** Веди todo list в execution.md вручную.

## See Also

- [`.kilocode/cli/CLAUDE.md`](../../cli/CLAUDE.md) - CLI инструкции
- [`AGENTS.md`](../../../AGENTS.md) - главный манифест
- [`../modes/REGISTRY.md`](../../modes/REGISTRY.md) - реестр режимов
