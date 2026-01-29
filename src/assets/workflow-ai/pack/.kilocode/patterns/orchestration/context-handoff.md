# Context Handoff Protocol

> **Цель:** Обеспечить полную передачу контекста при делегировании задач между агентами, минимизируя потерю информации и галлюцинации.

## Context Capsule (Memory-Bank-Limited Models)
If the target model cannot read the Memory Bank or has limited tool support, include a Context Capsule in the handoff.
See `~/.kilocode/patterns/orchestration/context-capsule.md`.

Add to CONTEXT HANDOFF:
- CAPSULE: `.protocols/<task>/context-capsule.md` (paste inline if needed)
- NOTE: do not assume Memory Bank access

## Проблема
При переключении между агентами (режимами) через `new_task` часто теряется:
1.  Глобальный контекст (корневая директория, цель проекта).
2.  Результаты предыдущих шагов.
3.  Ограничения и специфические требования.
4.  Связь с текущим активным протоколом.

## Стандарт делегирования
При использовании `new_task`, сообщение (`message`) должно содержать структурированный блок **CONTEXT HANDOFF**.

### JSON-схема (для понимания структуры)
```json
{
  "project_context": {
    "workspace_root": "c:/Users/Евгений/Documents/WorkFlowAI",
    "active_protocol": ".protocols/YYYY-MM-DD-feature-name"
  },
  "task_context": {
    "original_request": "Текст исходного запроса пользователя",
    "current_phase": "Implementation | Testing | Review",
    "previous_outputs": ["Список файлов или выводов предыдущих агентов"]
  },
  "constraints": [
    "Не использовать внешние библиотеки без утверждения",
    "Coverage >= 100%"
  ],
  "mcp_requirements": [
    "context7global: resolve-library-id",
    "sequentialthinkingglobal"
  ]
}
```

### Текстовый шаблон (для использования в `new_task`)

```markdown
ЗАДАЧА: [Краткое описание задачи для субагента]

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Евгений/Documents/WorkFlowAI
PROTOCOL: .protocols/YYYY-MM-DD-feature-name/plan.md
PHASE: [Implementation / Testing / Analysis]

INPUTS:
- [Ссылка на файл с требованиями/дизайном]
- [Ссылка на результаты предыдущего шага]

CONSTRAINTS:
1. [Ограничение 1]
2. [Ограничение 2]

MCP INSTRUCTIONS:
1. [Инструкция по MCP 1]
2. [Инструкция по MCP 2]
=======================

РЕЗУЛЬТАТ: [Ожидаемый формат результата]
```

## Примеры использования

### 1. Architect -> Code (Implementation)

```xml
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Реализовать модуль аутентификации JWT.

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Евгений/Documents/WorkFlowAI
PROTOCOL: .protocols/2024-01-20-auth-system/plan.md
PHASE: Implementation

INPUTS:
- .protocols/2024-01-20-auth-system/brief.md (Requirements)
- ~/.kilocode/patterns/security/security.md (Security Standards)

CONSTRAINTS:
1. Использовать только стандартные библиотеки Python где возможно.
2. Следовать TDD.
3. Строгая типизация.

MCP INSTRUCTIONS:
1. context7global: resolve-library-id("fastapi-jwt") для поиска best practices.
=======================

РЕЗУЛЬТАТ: Реализованный код в `src/auth`, проходящий тесты.
</message>
</new_task>
```

### 2. Code -> Unit Tester (Testing)

```xml
<new_task>
<mode>unit-tester</mode>
<message>
ЗАДАЧА: Написать unit-тесты для сервиса заказов.

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Евгений/Documents/WorkFlowAI
PROTOCOL: .protocols/2024-01-21-orders/plan.md
PHASE: Testing

INPUTS:
- src/orders/service.py (Target Code)
- ~/.kilocode/rules/testing-rules.md (Standards)

CONSTRAINTS:
1. Coverage 100% (Lines, Branches).
2. Использовать `pytest` и `pytest-mock`.
3. Не мокать бизнес-логику, только внешние зависимости.
=======================

РЕЗУЛЬТАТ: Файл тестов `tests/unit/test_orders.py` и отчет о покрытии.
</message>
</new_task>
```

### 3. Orchestrator -> Decomposer (Analysis)

```xml
<new_task>
<mode>decomposer</mode>
<message>
ЗАДАЧА: Декомпозировать эпик "Интеграция с платежной системой Stripe".

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Евгений/Documents/WorkFlowAI
PROTOCOL: N/A (New Epic)
PHASE: Analysis

INPUTS:
- User Request: "Хочу принимать платежи картами через Stripe"
- .kilocode/memory-bank/tech.md (Current Stack)

CONSTRAINTS:
1. Учесть PCI DSS требования (через MCP context7).
2. Архитектура должна быть событийно-ориентированной.

MCP INSTRUCTIONS:
1. sequentialthinkingglobal: Разбить задачу на атомарные шаги.
2. context7global: Найти актуальные Stripe API flow.
=======================

РЕЗУЛЬТАТ: План реализации в формате Markdown списка.
</message>
</new_task>
```

### 4. Code -> Reviewer (Code Review)

```xml
<new_task>
<mode>reviewer</mode>
<message>
TASK: Review authentication module implementation.

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Project
PROTOCOL: .protocols/2024-01-20-auth-system/plan.md
PHASE: Review

INPUTS:
- src/auth/* (Changed files)
- tests/auth/* (Test coverage)
- .protocols/2024-01-20-auth-system/brief.md (Requirements)

CONSTRAINTS:
1. Verify 100% coverage (lines/branches/functions)
2. Check OWASP Top 10 compliance
3. Ensure no hardcoded secrets
4. Validate error handling

FOCUS AREAS:
- Security: JWT validation, password hashing
- Performance: Token caching, DB queries
- Maintainability: SOLID principles

EXPECTED OUTPUT:
- Approval OR list of required changes
- Format: file:line - issue - severity
=======================
</message>
</new_task>
```

### 5. Orchestrator -> Research (Codebase Analysis)

```xml
<new_task>
<mode>planning/research-codebase</mode>
<message>
TASK: Analyze error handling patterns in codebase.

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Project
PROTOCOL: .protocols/2024-01-25-error-handling-refactor/plan.md
PHASE: Analysis

INPUTS:
- src/**/*.ts (Target codebase)

CONSTRAINTS:
1. READ-ONLY: No file modifications
2. Document all findings with file:line references
3. Focus on exception types and error response formats

QUESTIONS TO ANSWER:
1. What error handling patterns exist?
2. Are there custom exception classes?
3. How are errors logged?
4. What's the HTTP error response format?

EXPECTED OUTPUT:
- .protocols/.../artifacts/research/error-handling-analysis.md
- Include: patterns found, file locations, recommendations
=======================
</message>
</new_task>
```

### 6. Orchestrator -> Debug (Troubleshooting)

```xml
<new_task>
<mode>debug</mode>
<message>
TASK: Diagnose intermittent 500 errors on /api/users endpoint.

=== CONTEXT HANDOFF ===
ROOT: c:/Users/Project
PROTOCOL: .protocols/2024-01-26-api-500-bug/plan.md
PHASE: Diagnosis

INPUTS:
- Error logs (attached below)
- src/api/users.ts (Endpoint code)
- src/services/userService.ts (Service layer)

ERROR CONTEXT:
- Frequency: ~5% of requests
- Time: Random, no pattern
- Environment: Production only

CONSTRAINTS:
1. Do not modify production code
2. Document reproduction steps
3. Identify root cause before fix

EXPECTED OUTPUT:
- Root cause analysis
- Reproduction steps (if possible)
- Recommended fix approach
=======================

ERROR LOGS:
[Paste relevant logs here]
</message>
</new_task>
```

---

## Pre-Delegation Checklist

### Required (MUST have)

- [ ] **ROOT** - Workspace root directory specified
- [ ] **PROTOCOL** - Active protocol path (or "N/A" for new tasks)
- [ ] **PHASE** - Current phase (Analysis/Design/Implementation/Testing/Review)
- [ ] **INPUTS** - All necessary files linked
- [ ] **CONSTRAINTS** - Quality requirements stated

### Recommended (SHOULD have)

- [ ] **MCP INSTRUCTIONS** - If MCP tools needed
- [ ] **EXPECTED OUTPUT** - Clear deliverable format
- [ ] **FOCUS AREAS** - Priority items for attention

### For Limited Models (Context Capsule)

- [ ] **CAPSULE** - Full context capsule included
- [ ] **NOTE** - "Do not assume Memory Bank access"
- [ ] **DECISIONS** - Key decisions already made
- [ ] **RISKS** - Known risks and mitigations

---

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing ROOT | Agent can't find files | Always include ROOT |
| No PROTOCOL | No traceability | Link to active protocol |
| Vague CONSTRAINTS | Quality violations | List specific requirements |
| Missing INPUTS | Agent guesses | List all relevant files |
| No EXPECTED OUTPUT | Unclear deliverable | Specify format and location |

---

## Phase-Specific Templates

### Analysis Phase
```
PHASE: Analysis
INPUTS: [Requirements, existing code to analyze]
CONSTRAINTS: [READ-ONLY, no code changes]
EXPECTED OUTPUT: [Analysis document in artifacts/research/]
```

### Design Phase
```
PHASE: Design
INPUTS: [Requirements, analysis results]
CONSTRAINTS: [Architecture patterns, tech stack limits]
EXPECTED OUTPUT: [Design document, updated plan.md]
```

### Implementation Phase
```
PHASE: Implementation
INPUTS: [Design docs, existing code, patterns]
CONSTRAINTS: [TDD, coverage 100%, lint clean]
EXPECTED OUTPUT: [Working code + tests, updated plan.md]
```

### Testing Phase
```
PHASE: Testing
INPUTS: [Code to test, test standards]
CONSTRAINTS: [Coverage 100%, no flaky tests]
EXPECTED OUTPUT: [Test files, coverage report]
```

### Review Phase
```
PHASE: Review
INPUTS: [Changed files, requirements, test results]
CONSTRAINTS: [Security checklist, SOLID principles]
EXPECTED OUTPUT: [Approval OR change list with file:line]
```