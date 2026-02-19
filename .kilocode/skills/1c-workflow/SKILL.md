---
name: 1c-workflow
description: Specialized workflow for 1C:Enterprise development - roles, tools, testing with xUnitFor1C and Vanessa, quality gates.
---

# 1C Development Workflow

> Workflow для разработки на платформе 1С:Предприятие.

## Entry Point

Для ЛЮБОЙ задачи 1C делегируй `1c-orchestrator`:

```xml
<new_task>
<mode>1c-orchestrator</mode>
<message>
ЗАДАЧА: [описание]
КОНФИГУРАЦИЯ: [имя]
ПЛАТФОРМА: [8.3.x]
</message>
</new_task>
```

## Process Mapping

| AlfaFlow    | 1C Mode               | Purpose            |
| ----------- | --------------------- | ------------------ |
| architect   | 1c-architect          | Solution design    |
| \*-dev      | 1c-developer          | Implementation     |
| unit-tester | 1c-tester             | xUnitFor1C         |
| e2e-tester  | 1c-vanessa-tester     | Vanessa Automation |
| reviewer    | 1c-quality-specialist | Code Review + АПК  |

## Quality Gates

| Gate     | Requirement | Tool                  |
| -------- | ----------- | --------------------- |
| Coverage | 100%        | xUnitFor1C + Vanessa  |
| Lint     | 0 errors    | АПК / SonarQube       |
| Tests    | All green   | CI pipeline           |
| Review   | Required    | 1c-quality-specialist |

## Roles

### 1c-orchestrator

- Coordinates 1C tasks
- Delegates to specialists
- No direct coding

### 1c-developer

- BSL/SDBL implementation
- Form development
- Module creation

### 1c-tester

- xUnitFor1C tests
- Vanessa-ADD scenarios
- Coverage reporting

### 1c-quality-specialist

- Code review
- АПК analysis
- Standards compliance

## Tools

- **EDT** - Enterprise Development Tools
- **АПК** - Автоматизированная проверка конфигураций
- **xUnitFor1C** - Unit testing
- **Vanessa** - BDD/Automation testing
- **SonarQube** - Static analysis
