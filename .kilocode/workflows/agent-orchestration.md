# Agent Orchestration Workflow

> **КРИТИЧНЫЙ WORKFLOW:** Как использовать 104+ специализированных агентов для максимальной эффективности.

> **⚠️ ВАЖНО: Агенты = Режимы**
> В Kilo Code "агенты" реализованы как **режимы (modes)**, определённые в файле `.kilocodemodes`.
> Когда говорится "вызвать агента", это означает использовать `new_task` с указанием соответствующего режима.
> **НЕ ИСПОЛЬЗОВАТЬ `switch_mode`** внутри задачи - только `new_task` для делегирования!

## Обзор

WorkFlowAI использует **multi-agent архитектуру** с 104 узкоспециализированными агентами. Этот workflow описывает, как правильно делегировать задачи агентам и координировать их работу.

## Иерархия Агентов

```
Orchestrator (главный координатор)
    ↓
Decomposer (декомпозиция сложных задач)
    ↓
┌──────────────────┬──────────────────┬──────────────────┐
Analysis          Architecture      Development
(5 агентов)       (5 агентов)       (70+ агентов)
    ↓                  ↓                   ↓
Requirements      API Design        Language-specific:
Data Analysis     Security          - 1C (12 агентов)
Performance       Solutions         - Python (8 агентов)
                                    - Java, Go, Rust...
    ↓
┌──────────────────┬──────────────────┐
Testing           Quality
(11 агентов)      (3 агента)
    ↓                  ↓
Unit/E2E/API      Code Review
Integration       Refactoring
Security Tests    Security Audit
```

## Когда использовать Agent Orchestration

**ОБЯЗАТЕЛЬНО** для:
- Сложных задач (> 3 шагов)
- Задач требующих разной экспертизы
- Multi-language проектов
- Критичных features (payment, auth, etc.)

**НЕ НУЖНО** для:
- Простых багфиксов (1-2 файла)
- Документации updates
- Trivial refactoring

## Step-by-Step Process

### Step 1: Task Analysis (Orchestrator)

**Режим:** `orchestrator`
**Определение:** `.kilocodemodes` (slug: `orchestrator`)
**Делегирование:** `new_task(mode: "orchestrator", message: "...")`

**Действия:**
1. Проанализировать задачу пользователя
2. Определить сложность и scope
3. Выбрать стратегию: single-agent vs multi-agent
4. Создать execution plan

**Пример:**
```yaml
Task: "Добавить OAuth2 authentication с JWT tokens"

Analysis:
  complexity: high
  estimated_agents: 5-7
  strategy: multi-agent
  categories:
    - Architecture (API design)
    - Security (OAuth2, JWT)
    - Development (Backend implementation)
    - Testing (Security tests, Integration tests)
    - Quality (Code review)
```

### Step 2: Task Decomposition (Decomposer)

**Режим:** `decomposer`
**Определение:** `.kilocodemodes` (slug: `decomposer`)
**Делегирование:** `new_task(mode: "decomposer", message: "...")`

**Действия:**
1. Разбить задачу на подзадачи
2. Определить dependencies между подзадачами
3. Назначить приоритеты
4. Подобрать подходящих агентов

**Пример:**
```markdown
## Декомпозиция: OAuth2 Authentication

### Subtask 1: Architecture Design
- Agent: api-architect
- Priority: P0 (blocking)
- Deliverable: API design document

### Subtask 2: Security Design
- Agent: security-architect
- Priority: P0 (blocking)
- Dependencies: [Subtask 1]
- Deliverable: Security implementation plan

### Subtask 3: Backend Implementation
- Agent: nodejs-dev (или python-dev, go-dev)
- Priority: P1
- Dependencies: [Subtask 1, Subtask 2]
- Deliverable: Working code

### Subtask 4: Testing
- Agents: [security-tester, integration-tester, api-tester]
- Priority: P1
- Dependencies: [Subtask 3]
- Deliverable: Test suite

### Subtask 5: Code Review
- Agent: code-reviewer
- Priority: P2
- Dependencies: [Subtask 3, Subtask 4]
- Deliverable: Review report
```

### Step 3: Agent Selection

**Как выбрать правильного агента:**

#### По языку/фреймворку:
```
Task: "Implement REST API"
  ├─ Python → fastapi-async-dev
  ├─ Node.js → nestjs-dev
  ├─ Java → spring-boot-dev
  ├─ Go → gin-dev или fiber-dev
  ├─ Rust → axum-dev
  └─ 1C → 1c-developer
```

#### По типу задачи:
```
Task Type          →  Recommended Agent
─────────────────────────────────────────
Requirements       →  business-analyst
API Design         →  api-architect
Database Design    →  data-architect
Security Review    →  security-auditor
Code Review        →  code-reviewer
Refactoring        →  refactorer
Unit Tests         →  unit-tester
E2E Tests          →  e2e-tester
Performance        →  performance-analyst
1C Development     →  1c-developer
1C Testing         →  1c-tester
```

#### По базе данных:
```
Database           →  Specialist Agent
─────────────────────────────────────────
PostgreSQL         →  postgresql-specialist
MongoDB            →  mongodb-specialist
Redis              →  redis-specialist
Prisma ORM         →  prisma-specialist
TypeORM            →  typeorm-specialist
```

### Step 4: Sequential Execution

**Orchestrator координирует выполнение через new_task:**

> **⚠️ ВАЖНО:** Используй `new_task` для делегирования, НЕ `switch_mode`!

```xml
<!-- Phase 1: Architecture & Design -->
<new_task>
  <mode>api-architect</mode>
  <message>
    Спроектировать API для OAuth2 authentication.
    Требования: ...
    Deliverable: API design document
  </message>
</new_task>

<!-- После завершения Phase 1, Phase 2: Implementation -->
<new_task>
  <mode>nodejs-dev</mode>
  <message>
    Реализовать OAuth2 authentication на основе дизайна из предыдущего шага.

    КОНТЕКСТ от api-architect:
    [результаты предыдущего шага]

    Deliverable: Working code
  </message>
</new_task>

<!-- Phase 3: Testing -->
<new_task>
  <mode>unit-tester</mode>
  <message>
    Написать и запустить unit-тесты для OAuth2 модуля.
    Coverage target: ≥70%
  </message>
</new_task>

<!-- Phase 4: Review -->
<new_task>
  <mode>code-reviewer</mode>
  <message>
    Провести code review OAuth2 implementation.
    Checklist: SOLID, security, test coverage
  </message>
</new_task>
```

### Step 5: Context Passing

**КРИТИЧНО:** Агенты должны получать context от предыдущих агентов.

**Context Template:**
```yaml
agent: nodejs-dev
task: "Implement OAuth2 endpoints"
context:
  - file: .protocols/2025-12-30-oauth2/architecture-design.md
    from: api-architect
    key_decisions:
      - "Use JWT with RS256"
      - "Token TTL: 15 minutes"
      - "Refresh token TTL: 7 days"

  - file: .protocols/2025-12-30-oauth2/security-plan.md
    from: security-architect
    requirements:
      - "Implement rate limiting (10 req/min)"
      - "Store refresh tokens in Redis"
      - "Rotate signing keys every 30 days"

  - patterns:
      - .kilocode/patterns/languages/nodejs.md
      - .kilocode/patterns/security/security.md

  - rules:
      - .kilocode/rules/security-rules.md
      - .kilocode/rules/testing-rules.md
```

### Step 6: Quality Gates

**Каждый этап проходит проверку:**

```markdown
## Quality Gate Checklist

### After Architecture:
- [ ] API design document complete
- [ ] Security considerations documented
- [ ] Performance requirements defined
- [ ] Technology stack chosen

### After Implementation:
- [ ] Code follows patterns (`.kilocode/patterns/`)
- [ ] All rules followed (`.kilocode/rules/`)
- [ ] No security issues
- [ ] Error handling implemented

### After Testing:
- [ ] Unit tests pass (coverage ≥ 70%)
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Performance acceptable

### After Review:
- [ ] Code reviewer approves
- [ ] All comments addressed
- [ ] Documentation updated
- [ ] Ready for merge
```

### Step 7: Aggregation & Integration

**Orchestrator собирает результаты:**

1. **Collect outputs** от всех агентов
2. **Validate consistency** между результатами
3. **Resolve conflicts** если есть
4. **Create final deliverable**
5. **Update Memory Bank**

## Практические примеры

### Example 1: Простая задача (Single Agent)

```
Task: "Fix bug in user validation"

Decision: Single agent достаточно
Selected Agent: code-fixer

Process:
1. Read bug description
2. Locate issue
3. Fix code
4. Add regression test
5. Push for review

Time: ~30 minutes
```

### Example 2: Средняя задача (2-3 агента)

```
Task: "Add new API endpoint for user stats"

Selected Agents:
1. nodejs-dev → Implementation
2. unit-tester → Tests
3. code-reviewer → Review

Process:
1. nodejs-dev creates endpoint
2. unit-tester writes tests
3. code-reviewer validates
4. Merge

Time: ~2 hours
```

### Example 3: Сложная задача (Multi-Agent Orchestration)

```
Task: "Implement real-time notifications system"

Selected Agents:
1. solution-architect → System design
2. api-architect → API design
3. data-architect → Database schema
4. redis-specialist → Redis pub/sub
5. nodejs-dev → Backend implementation
6. react-hooks-specialist → Frontend WebSocket
7. integration-tester → End-to-end tests
8. performance-tester → Load testing
9. code-reviewer → Final review

Process:
Phase 1 (Architecture): 1, 2, 3 (parallel) → 4 hours
Phase 2 (Implementation): 4, 5, 6 (parallel) → 8 hours
Phase 3 (Testing): 7, 8 (parallel) → 4 hours
Phase 4 (Review): 9 → 2 hours

Total: ~18 hours (но распараллелено)
```

## 1C-Specific Orchestration

**Для 1С:Предприятие (12 специализированных агентов):**

```
Task: "Разработать новый документ 'Заявка на ремонт'"

Orchestration:
1. 1c-business-analyst → Бизнес-требования
2. 1c-system-analyst → Структура документа
3. 1c-architect → Архитектурное решение
4. 1c-developer → Реализация BSL кода
5. 1c-form-designer → Разработка формы документа
6. 1c-kd-developer → КД 3.0 маппинги (если нужно)
7. 1c-docs-specialist → jdocstring документация
8. 1c-tester → Тесты (xUnitFor1C)
9. 1c-quality-specialist → Code review по стандартам BSL
10. 1c-integration-specialist → RabbitMQ интеграция (если нужно)
11. 1c-orchestrator → Координация процесса

Patterns используемые:
- .kilocode/patterns/languages/1c.md
- .kilocode/patterns/1c/jdocstring.md
- .kilocode/patterns/1c/kd3.md (если КД)
- .kilocode/patterns/1c/rabbitmq.md (если интеграция)
```

## Best Practices

### DO:
- ✅ Используй orchestrator для сложных задач
- ✅ Передавай context между агентами
- ✅ Проверяй quality gates на каждом этапе
- ✅ Документируй decisions в protocol
- ✅ Параллель execution где возможно

### DON'T:
- ❌ Используй multi-agent для простых задач
- ❌ Пропускай architecture phase
- ❌ Игнорируй dependencies между subtasks
- ❌ Забывай передавать context
- ❌ Skip testing phase

## Troubleshooting

### Problem: Агент не понимает task
**Solution:** Улучши task description, добавь context, используй decomposer

### Problem: Конфликт между агентами
**Solution:** Orchestrator должен resolve, обратиться к patterns/rules

### Problem: Плохое качество output
**Solution:** Добавь quality gates, используй code-reviewer

### Problem: Слишком долго
**Solution:** Больше parallelization, проще decomposition

## Automation

**Будущее:** Автоматическая orchestration через AI:
```javascript
// Vision for future
const result = await autoOrchestrate({
  task: "Implement OAuth2",
  constraints: { time: "< 4 hours", quality: "production" }
});

// AI automatically:
// 1. Decomposes task
// 2. Selects best agents
// 3. Executes in parallel
// 4. Validates quality
// 5. Delivers result
```

## References

- Agents Index: `.kilocode/agents/index.md`
- Orchestrator: `.kilocode/agents/orchestration/orchestrator/main.md`
- Decomposer: `.kilocode/agents/orchestration/decomposer/main.md`
- All 104 agents: `.kilocode/agents/{category}/{slug}/main.md`

---

**Ключевой принцип:** Right agent for right task = Maximum efficiency
