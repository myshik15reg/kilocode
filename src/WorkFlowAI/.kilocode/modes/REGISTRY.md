# Mode Registry (Single Source of Truth)

> Единственный авторитетный реестр всех режимов AlfaFlowAI.
> Все другие документы ДОЛЖНЫ ссылаться сюда.

---

## Quick Reference Table

| Mode                 | Category        | memory_bank | subagents | tools         | Use When                        |
| -------------------- | --------------- | ----------- | --------- | ------------- | ------------------------------- |
| `architect`          | Core            | full        | no        | read+docs     | Planning, closing protocols     |
| `code`               | Core            | limited     | no        | full          | Implementation (fallback)       |
| `reviewer`           | Core            | limited     | no        | read          | Code review, QA (+skeptic mode) |
| `ask`                | Core            | limited     | no        | read          | Questions, research             |
| `orchestrator`       | Core            | full        | yes       | read+delegate | Multi-agent coordination        |
| `translate`          | Core            | limited     | no        | full          | i18n, localization              |
| `debug`              | Troubleshooting | limited     | no        | full          | Bug investigation (+quick/deep) |
| `code-fixer`         | Troubleshooting | limited     | no        | full          | Bug fixes                       |
| `refactorer`         | Quality         | limited     | no        | full          | Code improvement (+simplify)    |
| `qa-engineer`        | Testing         | limited     | no        | read+cmd      | Test planning, analysis         |
| `unit-tester`        | Testing         | limited     | no        | full          | Unit tests                      |
| `integration-tester` | Testing         | limited     | no        | full          | Integration tests               |
| `e2e-tester`         | Testing         | limited     | no        | full          | E2E tests                       |
| `security-tester`    | Testing         | limited     | no        | full          | DAST (runtime testing)          |
| `security-auditor`   | Testing         | limited     | no        | full          | SAST (static analysis)          |
| `performance-tester` | Testing         | limited     | no        | full          | Performance testing             |
| `*-dev`              | Development     | limited     | no        | full          | Language/framework specific     |
| `*-architect`        | Architecture    | full        | no        | read+docs     | System design                   |
| `1c-orchestrator`    | 1C:Enterprise   | full        | yes       | read+delegate | 1C coordination                 |

### FAST PATH (Micro-change)

Независимо от выбранного режима реализации, если запрос соответствует микро‑правке ("extract method", "обёртка", "быстро поправь фрагмент"), агент SHOULD следовать workflow: [`quick-fix.md`](../workflows/quick-fix.md:1).

Правило: FAST PATH **не отменяет** "No Protocol, No Code" (repo changes всё равно требуют протокол), он задаёт порядок ответа: **patch first → verify**.

**Deprecated:** `code-simplifier`, `error-detective`, `code-skeptic`, `test-analyzer` (see Deprecated Modes section)

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

### error-detective ⚠️ DEPRECATED

**Status:** DEPRECATED - merged into `debug --deep`
**Use Instead:** `debug --deep` for complex error analysis
**Alias:** Redirects to `debug --deep`

---

## Quality Modes

### refactorer

**Identity:** Специалист по улучшению кода (includes simplification)
**When to Use:** Рефакторинг без изменения поведения
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Modes:**

- Default: Full refactoring (architecture, patterns)
- `--simplify`: Simplification only (complexity reduction)
  **Rule:** Тесты должны проходить до и после

### code-simplifier ⚠️ DEPRECATED

**Status:** DEPRECATED - merged into `refactorer --simplify`
**Use Instead:** `refactorer --simplify` for code simplification
**Alias:** Redirects to `refactorer --simplify`

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

### security-tester (DAST)

**Identity:** Специалист по DAST (Dynamic Application Security Testing)
**When to Use:** Runtime security testing, penetration testing
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Scope:** OWASP Top 10, runtime vulnerabilities, active exploitation
**Tools:** OWASP ZAP, Burp Suite, SQLMap
**Details:** [security-rules.md](../rules/security-rules.md)
**Note:** For static code analysis, use `security-auditor` (SAST)

### security-auditor (SAST)

**Identity:** Специалист по SAST (Static Application Security Testing)
**When to Use:** Static code analysis, secure coding review
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Scope:** Code vulnerabilities, secrets detection, dependency scanning
**Tools:** Semgrep, CodeQL, Snyk, npm audit
**Note:** For runtime testing, use `security-tester` (DAST)

### performance-tester

**Identity:** Специалист по performance testing
**When to Use:** Нагрузочное тестирование, оптимизация
**Capabilities:** memory_bank: limited, subagents: no, tools: full
**Tools:** k6, Apache Bench, Lighthouse

### test-analyzer ⚠️ DEPRECATED

**Status:** DEPRECATED - merged into `qa-engineer`
**Use Instead:** `qa-engineer` for test analysis and planning
**Alias:** Redirects to `qa-engineer`

### qa-engineer

**Identity:** QA Engineer (includes test analysis)
**When to Use:** Test planning, test results analysis, quality metrics
**Capabilities:** memory_bank: limited, subagents: no, tools: read + command
**Scope:** Test strategy, bug reporting, test failure analysis
**Note:** Merged functionality from `test-analyzer`

### accessibility-auditor

**Identity:** Специалист по a11y
**When to Use:** Проверка доступности
**Capabilities:** memory_bank: limited, subagents: no, tools: read + a11y tools
**Standards:** WCAG 2.1

---

## Development Modes (by Language/Framework)

### Frontend

| Mode                     | Stack          | When to Use              |
| ------------------------ | -------------- | ------------------------ |
| `react-dev`              | React          | React компоненты, hooks  |
| `react-hooks-specialist` | React Hooks    | Сложные custom hooks     |
| `vue-dev`                | Vue            | Vue компоненты           |
| `pinia-dev`              | Vue + Pinia    | State management Vue     |
| `angular-dev`            | Angular        | Angular компоненты       |
| `ngrx-dev`               | Angular + NgRx | State management Angular |
| `next-dev`               | Next.js        | Next.js приложения       |
| `ui-dev`                 | UI/CSS         | UI компоненты, дизайн    |
| `css-expert`             | CSS            | Стилизация               |
| `tailwind-specialist`    | Tailwind CSS   | Tailwind styling         |

### Backend

| Mode              | Stack        | When to Use       |
| ----------------- | ------------ | ----------------- |
| `python-dev`      | Python       | Python код        |
| `fastapi-dev`     | FastAPI      | FastAPI endpoints |
| `django-dev`      | Django       | Django приложения |
| `nodejs-dev`      | Node.js      | Node.js код       |
| `nestjs-dev`      | NestJS       | NestJS приложения |
| `express-dev`     | Express      | Express API       |
| `java-dev`        | Java         | Java код          |
| `spring-boot-dev` | Spring Boot  | Spring приложения |
| `go-dev`          | Go           | Go код            |
| `rust-dev`        | Rust         | Rust код          |
| `dotnet-dev`      | .NET         | .NET код          |
| `aspnet-core-dev` | ASP.NET Core | ASP.NET API       |
| `cpp-dev`         | C++          | C++ код           |

### Database

| Mode                       | Stack         | When to Use               |
| -------------------------- | ------------- | ------------------------- |
| `postgresql-specialist`    | PostgreSQL    | PostgreSQL схемы, queries |
| `mysql-specialist`         | MySQL         | MySQL схемы               |
| `mongodb-specialist`       | MongoDB       | MongoDB schemas           |
| `redis-specialist`         | Redis         | Redis кэширование         |
| `elasticsearch-specialist` | Elasticsearch | Search queries            |
| `prisma-specialist`        | Prisma ORM    | Prisma schemas            |
| `sqlalchemy-dev`           | SQLAlchemy    | SQLAlchemy models         |

---

## Architecture Modes

| Mode                   | Scope    | When to Use                         |
| ---------------------- | -------- | ----------------------------------- |
| `solution-architect`   | System   | System design, overall architecture |
| `api-architect`        | API      | API design, contracts               |
| `data-architect`       | Database | Database design, data models        |
| `security-architect`   | Security | Security architecture               |
| `kubernetes-architect` | K8s      | Kubernetes manifests, deployment    |

---

## Infrastructure Modes

| Mode                     | Scope          | When to Use                 |
| ------------------------ | -------------- | --------------------------- |
| `cicd`                   | CI/CD          | Pipelines, automation       |
| `devops`                 | Infrastructure | IaC, Docker, deployment     |
| `dba`                    | Database Admin | DB operations, tuning       |
| `observability-engineer` | Monitoring     | Metrics, alerts, dashboards |

---

## 1C:Enterprise Modes

**Entry Point:** Всегда начинай с `1c-orchestrator`.

| Mode                        | Role            | When to Use                |
| --------------------------- | --------------- | -------------------------- |
| `1c-orchestrator`           | Координатор     | Любая задача 1C            |
| `1c-business-analyst`       | БА              | Бизнес-требования          |
| `1c-system-analyst`         | СА              | Техническое проектирование |
| `1c-architect`              | Архитектор      | Архитектура решения        |
| `1c-developer`              | Разработчик     | Код 1C                     |
| `1c-form-designer`          | Дизайнер форм   | Управляемые формы          |
| `1c-kd-developer`           | Разработчик КД  | Конвертация данных         |
| `1c-tester`                 | Тестировщик     | xUnitFor1C                 |
| `1c-vanessa-tester`         | BDD тестировщик | Vanessa Automation         |
| `1c-integration-specialist` | Интегратор      | HTTP, Web-сервисы, OData   |
| `1c-quality-specialist`     | QA              | Code review, АПК           |
| `1c-docs-specialist`        | Документация    | Документация 1C            |

**Details:** [1c-workflow.md](../rules/1c-workflow.md)

---

## Research Subagents (Read-Only)

| Mode                         | Scope    | When to Use                |
| ---------------------------- | -------- | -------------------------- |
| `planning-research-codebase` | Internal | Исследование кодовой базы  |
| `planning-research-web`      | External | Поиск внешней документации |

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

| Mode                  | Recommended Skills                            |
| --------------------- | --------------------------------------------- |
| `code`, `*-dev`       | `cli-master`, `git-workflow`, `project-tests` |
| `reviewer`            | `code-review`, `security-audit`               |
| `*-tester`            | `project-tests`, `security-audit`             |
| `refactorer`          | `code-review`, `performance-optimization`     |
| `translate`           | `translation`                                 |
| `cicd`, `devops`      | `cli-master`, `git-workflow`                  |
| `debug`, `code-fixer` | `cli-master`, `project-tests`                 |

**Skills directory:** [`skills/index.md`](../skills/index.md)

---

---

## Deprecated Modes

> Эти режимы сохранены для обратной совместимости, но рекомендуется использовать альтернативы.

| Deprecated Mode   | Use Instead             | Deprecated Date | Removal Date |
| ----------------- | ----------------------- | --------------- | ------------ |
| `code-simplifier` | `refactorer --simplify` | 2026-02-03      | 2026-05-03   |
| `error-detective` | `debug --deep`          | 2026-02-03      | 2026-05-03   |
| `code-skeptic`    | `reviewer --skeptic`    | 2026-02-03      | 2026-05-03   |
| `test-analyzer`   | `qa-engineer`           | 2026-02-03      | 2026-05-03   |

**Migration Period:** 3 months. After removal date, deprecated modes will be removed.

---

## Mode Aliases

> Алиасы для удобства и обратной совместимости.

| Alias              | Target Mode             | Notes                  |
| ------------------ | ----------------------- | ---------------------- |
| `code-simplifier`  | `refactorer --simplify` | Deprecated alias       |
| `error-detective`  | `debug --deep`          | Deprecated alias       |
| `code-skeptic`     | `reviewer --skeptic`    | Deprecated alias       |
| `test-analyzer`    | `qa-engineer`           | Deprecated alias       |
| `security-tester`  | `security-tester`       | DAST (runtime testing) |
| `security-auditor` | `security-auditor`      | SAST (static analysis) |

---

## Mode Relationships (Handoff Chains)

> Типичные цепочки передачи между режимами.

### Development Flow

```
architect → code/*-dev → unit-tester → reviewer → architect
```

### Bug Fix Flow

```
debug → code-fixer → unit-tester → reviewer
```

### Security Flow

```
security-auditor (SAST) → code → security-tester (DAST) → reviewer
```

### Refactoring Flow

```
refactorer → unit-tester → reviewer
```

### 1C Flow

```
1c-orchestrator → 1c-business-analyst → 1c-system-analyst → 1c-architect → 1c-developer → 1c-tester → 1c-quality-specialist
```

---

## See Also

- [Mode Selection Guide](../rules/mode-selection-guide.md) — Decision Tree
- [Tool Access Matrix](../rules/tool-access-matrix.md) — What each mode can/cannot do
- [Orchestrator Guide](../rules/orchestrator-guide.md) — Agent Selection Matrix
- [Roles](../rules/roles.md) — Core role definitions
- [Skills Index](../skills/index.md) — Available skills
- [CLI Compatibility](../cli/CLAUDE.md) — Claude Code CLI instructions
