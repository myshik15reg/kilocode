# Planning Rules (Architect Mode)

> Правила планирования и создания протоколов.

## Protocol Structure
```
.protocols/YYYY-MM-DD-task-name/
├── brief.md      # Что делать + Definition of Done
├── plan.md       # Как делать (шаги)
├── execution.md  # Лог выполнения (опционально)
└── artifacts/    # Промежуточные материалы
```

## brief.md Template
```markdown
# Brief: Task Name

## Goal
Краткое описание цели.

## Definition of Done
- [ ] Критерий 1
- [ ] Критерий 2
- [ ] Tests pass (100% coverage)
- [ ] No lint errors

## Acceptance Criteria
Given: исходное состояние
When: действие
Then: ожидаемый результат

## Constraints
- Ограничение 1
- Ограничение 2
```

## plan.md Template
```markdown
# Plan: Task Name

## Steps

### Step 1: Name
- **INPUT:** Что нужно
- **OUTPUT:** Что получим
- **VERIFY:** Как проверить
- **AGENT:** Кто выполняет

### Step 2: ...
```

## Workflow
1. Прочитать Memory Bank → `[MB: OK]`
2. Уточнить требования (1-3 вопроса)
3. Создать протокол
4. Написать brief.md + plan.md
5. Получить approval
6. Делегировать реализацию

## Naming Rules
- `task-name`: kebab-case, 2-3 слова, ≤30 символов
- С номером задачи: `YYYY-MM-DD-UZ12345-task-name`

## Quality Gates
Протокол обязателен для:
- Любых изменений кода
- Архитектурных решений
- Новых фич

**No Protocol, No Code!**
