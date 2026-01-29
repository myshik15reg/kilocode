# Mode Registry (Single Source of Truth)

> Единственный авторитетный реестр всех режимов WorkFlowAI.
> Все другие документы ДОЛЖНЫ ссылаться сюда.

---

## Quick Reference Table

| Mode | Category | memory_bank | subagents | tools | Use When |
|------|----------|-------------|-----------|-------|----------|
| `architect` | Core | full | no | read+docs | Planning, closing protocols |
| `code` | Core | limited | no | full | Implementation (fallback) |
| `reviewer` | Core | limited | no | read | Code review, QA |
| `ask` | Core | limited | no | read | Questions, research |
| `orchestrator` | Core | full | yes | read+delegate | Multi-agent coordination |
| `translate` | Core | limited | no | full | i18n, localization |
| `debug` | Troubleshooting | limited | no | full | Bug investigation |
| `code-fixer` | Troubleshooting | limited | no | full | Bug fixes |
| `refactorer` | Quality | limited | no | full | Code improvement |
| `unit-tester` | Testing | limited | no | full | Unit tests |
| `integration-tester` | Testing | limited | no | full | Integration tests |
| `e2e-tester` | Testing | limited | no | full | E2E tests |
| `security-tester` | Testing | limited | no | full | Security testing |
| `performance-tester` | Testing | limited | no | full | Performance testing |
| `*-dev` | Development | limited | no | full | Language/framework specific |
| `*-architect` | Architecture | full | no | read+docs | System design |
| `1c-orchestrator` | 1C:Enterprise | full | yes | read+delegate | 1C coordination |

---

## Core Modes

### architect
**Identity:** Планировщик и координатор протоколов
**When to Use:** Создание/закрытие протоколов, архитектурные решения
**Capabilities:** memory_bank: full, subagents: no, tools: read + write docs
**CANNOT:** Писать код — делегирует через `new_task`
**Details:** [roles.md](../rules/roles.md#architect-mode)

### code
**Identity:** Универсальный разработчик (fallback)
**When to Use:** ТОЛЬКО если нет специализированного режима
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**CANNOT:** Менять архитектуру без обновления docs
**Details:** [roles.md](../rules/roles.md#code-mode)
**WARNING:** Предпочитай специализированные `*-dev` режимы!

### reviewer
**Identity:** Code Review специалист
**When to Use:** Проверка кода перед merge
**Capabilities:** memory_bank: limited, subagents: no, tools: read-only
**CANNOT:** Писать/изменять код
**Details:** [roles.md](../rules/roles.md#reviewer-mode)

### ask
**Identity:** Консультант и исследователь
**When to Use:** Вопросы, поиск информации, разъяснения
**Capabilities:** memory_bank: limited, subagents: no, tools: read-only
**CANNOT:** Изменять файлы
**Details:** [roles.md](../rules/roles.md#ask-mode)

### orchestrator
**Identity:** Координатор multi-agent задач
**When to Use:** Сложные задачи с несколькими этапами/специалистами
**Capabilities:** memory_bank: full, subagents: yes, tools: read + delegate
**CANNOT:** Запускать build/test/install — делегирует
**Details:** [orchestrator-guide.md](../rules/orchestrator-guide.md)

### translate
**Identity:** Локализатор
**When to Use:** i18n файлы, переводы
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Details:** [translate.md](translate.md)

---

## Troubleshooting Modes

### debug
**Identity:** Детектив по багам
**When to Use:** Расследование причины ошибки
**Capabilities:** memory_bank: limited, subagents: no, tools: full (read-heavy)
**Output:** Root cause analysis + рекомендации
**Next Mode:** `code-fixer` для исправления

### code-fixer
**Identity:** Специалист по исправлению багов
**When to Use:** Исправление выявленных багов (после `debug`)
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Difference from `code`:** Фокус на минимальном fix + regression test
**Next Mode:** `unit-tester` для проверки

### error-detective
**Identity:** Глубокий анализ сложных ошибок
**When to Use:** Сложные/intermittent баги, которые `debug` не решил
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Specialty:** Race conditions, memory leaks, edge cases

---

## Quality Modes

### refactorer
**Identity:** Специалист по улучшению кода
**When to Use:** Рефакторинг без изменения поведения
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Rule:** Тесты должны проходить до и после

### code-simplifier
**Identity:** Специалист по упрощению кода
**When to Use:** Удаление сложности, dead code
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Specialty:** KISS, удаление over-engineering

### legacy-modernizer
**Identity:** Специалист по модернизации legacy
**When to Use:** Обновление устаревшего кода
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Specialty:** Incremental migration, backwards compatibility

---

## Testing Modes

### unit-tester
**Identity:** Специалист по unit тестам
**When to Use:** Написание unit тестов
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Standards:** TDD, AAA pattern, 100% coverage
**Details:** [testing-rules.md](../rules/testing-rules.md)

### integration-tester
**Identity:** Специалист по integration тестам
**When to Use:** Тестирование взаимодействия компонентов
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Scope:** API tests, DB tests, service interactions

### e2e-tester
**Identity:** Специалист по E2E тестам
**When to Use:** Критические user flows
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Tools:** Playwright (рекомендуется), Cypress

### playwright-specialist
**Identity:** Эксперт по Playwright
**When to Use:** E2E тесты с Playwright
**Capabilities:** memory_bank: limited, subagents: no, tools: full + MCP Playwright
**Details:** [ui-ux-devops-roles.md](../rules/ui-ux-devops-roles.md)

### security-tester
**Identity:** Специалист по security testing
**When to Use:** Проверка на уязвимости
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Scope:** OWASP Top 10, SAST/DAST
**Details:** [security-rules.md](../rules/security-rules.md)

### performance-tester
**Identity:** Специалист по performance testing
**When to Use:** Нагрузочное тестирование, оптимизация
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Tools:** k6, Apache Bench, Lighthouse

### test-analyzer
**Identity:** Аналитик тестовой стратегии
**When to Use:** Анализ и улучшение тестового покрытия
**Capabilities:** memory_bank: limited, subagents: no, tools: read-heavy
**Output:** Рекомендации по улучшению тестов

### accessibility-auditor
**Identity:** Специалист по a11y
**When to Use:** Проверка доступности
**Capabilities:** memory_bank: limited, subagents: no, tools: read + a11y tools
**Standards:** WCAG 2.1

---

## Development Modes (by Language/Framework)

### Frontend
| Mode | Stack | When to Use |
|------|-------|-------------|
| `react-dev` | React | React компоненты, hooks |
| `react-hooks-specialist` | React Hooks | Сложные custom hooks |
| `vue-dev` | Vue | Vue компоненты |
| `pinia-dev` | Vue + Pinia | State management Vue |
| `angular-dev` | Angular | Angular компоненты |
| `ngrx-dev` | Angular + NgRx | State management Angular |
| `next-dev` | Next.js | Next.js приложения |
| `ui-dev` | UI/CSS | UI компоненты, дизайн |
| `css-expert` | CSS | Стилизация |
| `tailwind-specialist` | Tailwind CSS | Tailwind styling |

### Backend
| Mode | Stack | When to Use |
|------|-------|-------------|
| `python-dev` | Python | Python код |
| `fastapi-dev` | FastAPI | FastAPI endpoints |
| `django-dev` | Django | Django приложения |
| `nodejs-dev` | Node.js | Node.js код |
| `nestjs-dev` | NestJS | NestJS приложения |
| `express-dev` | Express | Express API |
| `java-dev` | Java | Java код |
| `spring-boot-dev` | Spring Boot | Spring приложения |
| `go-dev` | Go | Go код |
| `rust-dev` | Rust | Rust код |
| `dotnet-dev` | .NET | .NET код |
| `aspnet-core-dev` | ASP.NET Core | ASP.NET API |
| `cpp-dev` | C++ | C++ код |

### Database
| Mode | Stack | When to Use |
|------|-------|-------------|
| `postgresql-specialist` | PostgreSQL | PostgreSQL схемы, queries |
| `mysql-specialist` | MySQL | MySQL схемы |
| `mongodb-specialist` | MongoDB | MongoDB schemas |
| `redis-specialist` | Redis | Redis кэширование |
| `elasticsearch-specialist` | Elasticsearch | Search queries |
| `prisma-specialist` | Prisma ORM | Prisma schemas |
| `sqlalchemy-dev` | SQLAlchemy | SQLAlchemy models |

---

## Architecture Modes

| Mode | Scope | When to Use |
|------|-------|-------------|
| `solution-architect` | System | System design, overall architecture |
| `api-architect` | API | API design, contracts |
| `data-architect` | Database | Database design, data models |
| `security-architect` | Security | Security architecture |
| `kubernetes-architect` | K8s | Kubernetes manifests, deployment |

---

## Infrastructure Modes

| Mode | Scope | When to Use |
|------|-------|-------------|
| `cicd` | CI/CD | Pipelines, automation |
| `devops` | Infrastructure | IaC, Docker, deployment |
| `dba` | Database Admin | DB operations, tuning |
| `observability-engineer` | Monitoring | Metrics, alerts, dashboards |

---

## 1C:Enterprise Modes

**Entry Point:** Всегда начинай с `1c-orchestrator`.

| Mode | Role | When to Use |
|------|------|-------------|
| `1c-orchestrator` | Координатор | Любая задача 1C |
| `1c-business-analyst` | БА | Бизнес-требования |
| `1c-system-analyst` | СА | Техническое проектирование |
| `1c-architect` | Архитектор | Архитектура решения |
| `1c-developer` | Разработчик | Код 1C |
| `1c-form-designer` | Дизайнер форм | Управляемые формы |
| `1c-kd-developer` | Разработчик КД | Конвертация данных |
| `1c-tester` | Тестировщик | xUnitFor1C |
| `1c-vanessa-tester` | BDD тестировщик | Vanessa Automation |
| `1c-integration-specialist` | Интегратор | HTTP, Web-сервисы, OData |
| `1c-quality-specialist` | QA | Code review, АПК |
| `1c-docs-specialist` | Документация | Документация 1C |

**Details:** [1c-workflow.md](../rules/1c-workflow.md)

---

## Research Subagents (Read-Only)

| Mode | Scope | When to Use |
|------|-------|-------------|
| `planning/research-codebase` | Internal | Исследование кодовой базы |
| `planning/research-web` | External | Поиск внешней документации |

**Rule:** Read-only, не создают/изменяют файлы. Только возвращают findings.

---

## How to Use This Registry

### Finding the Right Mode
1. Определи тип задачи (development, testing, review, etc.)
2. Найди категорию в таблице
3. Выбери самый узкий specialist
4. Если specialist не найден → используй generic (`code`, `unit-tester`)

### Creating New Mode
См. [create-new-skill.md](../workflows/create-new-skill.md) для создания нового режима.

### Updating This Registry
При добавлении/изменении режима обновляй:
1. Этот файл (REGISTRY.md)
2. Соответствующий role file
3. orchestrator-guide.md (Agent Selection Matrix)

---

---

## Mode-Skills Matrix

Какие skills рекомендованы для каждого режима:

| Mode | Recommended Skills |
|------|-------------------|
| `code`, `*-dev` | `cli-master`, `git-workflow`, `project-tests` |
| `reviewer` | `code-review`, `security-audit` |
| `*-tester` | `project-tests`, `security-audit` |
| `refactorer` | `code-review`, `performance-optimization` |
| `translate` | `translation` |
| `cicd`, `devops` | `cli-master`, `git-workflow` |
| `debug`, `code-fixer` | `cli-master`, `project-tests` |

**Skills directory:** `~/.kilocode/skills/index.md`

---

## See Also

- [Mode Selection Guide](../rules/mode-selection-guide.md) — Decision Tree
- [Tool Access Matrix](../rules/tool-access-matrix.md) — What each mode can/cannot do
- [Orchestrator Guide](../rules/orchestrator-guide.md) — Agent Selection Matrix
- [Roles](../rules/roles.md) — Core role definitions
- [Skills Index](../skills/index.md) — Available skills
