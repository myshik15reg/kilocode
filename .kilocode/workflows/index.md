# Workflows

## Критичные Workflows (Phase 1)

### Orchestration & Development
- [`agent-orchestration.md`](agent-orchestration.md) — **[КРИТИЧНЫЙ]** Использование 104+ специализированных агентов для максимальной эффективности
- [`protocol-new.md`](protocol-new.md) — Создание нового протокола для изолированной разработки задачи
- [`protocol-resume.md`](protocol-resume.md) — Возобновление работы над существующим протоколом
- [`protocol-review-merge.md`](protocol-review-merge.md) — Ревью и слияние завершенного протокола
- [`vibe-coding.md`](vibe-coding.md) — Свободное программирование с креативным подходом

### Emergency & Maintenance
- [`hotfix-emergency.md`](hotfix-emergency.md) — **[КРИТИЧНЫЙ]** Процесс срочных исправлений production issues
- [`refactoring-workflow.md`](refactoring-workflow.md) — Систематический рефакторинг кода без ломания функциональности
- [`dependency-management.md`](dependency-management.md) — Управление зависимостями и security updates

### Analysis & Utilities
- [`deep-analysis.md`](deep-analysis.md) — Глубокий анализ кода и архитектуры
- [`create-new-skill.md`](create-new-skill.md) — Рабочий процесс создания новых скиллов для повторяющихся задач
- [`update-indexes.md`](update-indexes.md) — Обновление индексных файлов (index.md) в папках проекта

## Phase 2 Workflows

### Development & Operations
- [`documentation-workflow.md`](documentation-workflow.md) — Создание и обновление технической документации (code docs, API docs, ADRs)
- [`migration-workflow.md`](migration-workflow.md) — Database migrations (schema changes, data migrations, zero-downtime)
- [`deployment-workflow.md`](deployment-workflow.md) — Процесс развертывания в production (CI/CD, blue-green, canary)

## Описание

Workflows — это пошаговые процессы для типичных задач разработки. Каждый workflow:
- Содержит четкую структуру (When to use, Process, Checklist, Examples)
- Интегрирован с rules/ и patterns/
- Включает best practices и troubleshooting
- Содержит ссылки на релевантных агентов

## Когда использовать какой Workflow

```
Задача                                    → Workflow
─────────────────────────────────────────────────────────────────
Production down / Security breach         → hotfix-emergency.md
Сложная feature (> 3 шагов)               → protocol-new.md + agent-orchestration.md
Продолжить работу над протоколом          → protocol-resume.md
Завершить протокол и смержить             → protocol-review-merge.md
Legacy код требует улучшения              → refactoring-workflow.md
Security vulnerabilities обнаружены       → dependency-management.md
CVE в зависимостях                        → dependency-management.md
Глубокий анализ архитектуры               → deep-analysis.md
Быстрый прототип / эксперимент            → vibe-coding.md
Создать новый skill                       → create-new-skill.md
Обновить индексы после изменений          → update-indexes.md

Phase 2 Workflows:
Создать/обновить документацию             → documentation-workflow.md
Database schema changes                   → migration-workflow.md
Deploy to production                      → deployment-workflow.md
```

## Quick Start

1. **Для production incident:** Начни с `hotfix-emergency.md`
2. **Для новой feature:** Начни с `protocol-new.md`
3. **Для рефакторинга:** Начни с `refactoring-workflow.md`
4. **Для security update:** Начни с `dependency-management.md`

## References

- Agents: `.kilocode/agents/index.md`
- Rules: `.kilocode/rules/index.md`
- Patterns: `.kilocode/patterns/index.md`
- Skills: `.kilocode/skills/index.md`
