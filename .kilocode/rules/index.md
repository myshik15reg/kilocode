# Rules

Правила и руководства для AI-агентов в рамках методологии AlfaFlow.

## Core Files
- [`project-rules.md`](project-rules.md) — Основные принципы, структура проекта, рабочий процесс AlfaFlow
- [`roles.md`](roles.md) — Ролевые модели: Architect, Code, Reviewer, Ask - полные определения с checklist
- [`safety.md`](safety.md) — Правила безопасности для работы с Memory Bank и протоколами

## Специализированные Rules (NEW)
- [`tool-usage-guide.md`](tool-usage-guide.md) — **⚠️ КРИТИЧЕСКИ ВАЖНО:** Правильное использование инструментов, apply_diff, new_task vs switch_mode
- [`mcp-usage-guide.md`](mcp-usage-guide.md) — **⚠️ КРИТИЧЕСКИ ВАЖНО:** MCP серверы (context7, sequentialthinking, memory, playwright)
- [`security-rules.md`](security-rules.md) — **ОБЯЗАТЕЛЬНО:** OWASP Top 10, secrets management, security checklist
- [`testing-rules.md`](testing-rules.md) — **ОБЯЗАТЕЛЬНО:** Требования к покрытию (≥70%), test pyramid, AAA pattern
- [`git-workflow-rules.md`](git-workflow-rules.md) — Conventional Commits, branch naming, PR process

## Дополнительные
- [`skills-index.md`](skills-index.md) — Индекс доступных скиллов и инструкции по их использованию
- [`ai-execution-rules.md`](ai-execution-rules.md) — Таймауты для команд, обработка зависаний
- [`memory-bank-instructions.md`](memory-bank-instructions.md) — Инструкции по работе с Memory Bank
- [`mode-delegation-example.md`](mode-delegation-example.md) — **КРИТИЧЕСКИ ВАЖНО:** Примеры правильного делегирования между режимами
- [`orchestrator-guide.md`](orchestrator-guide.md) — **КРИТИЧЕСКИ ВАЖНО:** Руководство по делегированию и MCP для Orchestrator

## Quick Reference

### Минимальные требования качества:
- **Test Coverage:** Lines ≥ 70%, Branches ≥ 60%
- **Security:** OWASP Top 10 защита обязательна
- **Code Standards:** SOLID принципы (см. patterns/code-standards.md)
- **Git:** Conventional Commits формат

### Перед каждым commit:
1. Запустить tests (npm test / pytest)
2. Запустить linter
3. Security scan (npm audit / pip-audit)
4. Coverage check

### Перед каждым merge:
1. Code review approved
2. All tests passing
3. Coverage ≥ 70%
4. No security issues
5. Documentation updated
