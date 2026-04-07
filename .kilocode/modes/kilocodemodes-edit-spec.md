# Спецификация правок для `.kilocodemodes`

Назначение: единый стандарт для **именования**, **описаний**, **границ ответственности**, **IO** и **порядка применения режимов**.

> Этот документ — **живая спецификация (SoT)** для поддержания и последующих правок `.kilocodemodes`.
> `.kilocodemodes` — runtime SoT; он должен оставаться синхронным с `.kilocode/modes/REGISTRY.md`.

---

## 1) Источники истины (SoT) для синхронизации

- **Docs SoT (реестр режимов):** `.kilocode/modes/REGISTRY.md`
- **Шаблон карточки режима:** `.kilocode/modes/ROLE-CARD-TEMPLATE.md`
- **Routing rules:** `.kilocode/rules/agent-routing.md`

Правило: `.kilocodemodes` обязан быть совместимым с `.kilocode/modes/REGISTRY.md`.

---

## 2) Канонический формат режима (YAML-конвенции)

### 2.1 Поля

Каждый режим в `.kilocodemodes` ДОЛЖЕН содержать:

- `slug` — kebab-case, уникален.
- `name` — человеко-читаемое имя (без избыточных префиксов).
- `roleDefinition` — 1–2 предложения на английском (для базовой модели), без деталей процесса.
- `description` — 1 строка на русском: роль/назначение.
- `whenToUse` — 1–2 предложения (англ. допускается), конкретный триггер.
- `groups` — минимально достаточные; запрещено «full access по умолчанию».
- `customInstructions` — единый блок-скелет (см. ниже), ссылки на SoT вместо копипасты.

### 2.2 Единый скелет `customInstructions`

Обязательные секции в одинаковом порядке:

1. `⚠️ CRITICAL` (что прочитать первым)
2. `ROLE` (что делает режим)
3. `BOUNDARIES` (что НЕ делает)
4. `INPUT / OUTPUT` (ожидаемые входы/выходы)
5. `WORKFLOW` (3–7 шагов)
6. `QUALITY / VERIFY` (как проверить)
7. `HANDOFF` (кому и когда делегировать)

---

## 3) Политика Deprecated

- Режимы из секции Deprecated в `.kilocode/modes/REGISTRY.md`:
    - **удалить** из `.kilocodemodes` (entry полностью),
    - **сохранить** упоминание в целевом режиме как `MERGED` (1–2 строки), если нужно.

Запрещено:

- оставлять в `.kilocodemodes` заглушки «deprecated alias», которые создают иллюзию доступности.

---

## 4) Порядок секций и группировка (внутри `.kilocodemodes`)

Единый порядок секций (как в evidence):

1. orchestration
2. analysis (read-only research / ask)
3. architecture
4. development
5. testing
6. quality
7. security
8. docs
9. devops
10. 1c

---

## 5) Таблица режимов (минимальный обязательный набор)

> Примечание: полный список specialist-режимов может быть шире.
> Минимум обязан покрывать все категории из `.kilocode/modes/REGISTRY.md`.

| Category        | Slugs (must keep)                                                                                                                   | IO (минимум)                              | Typical handoff                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Core            | `architect`, `orchestrator`, `reviewer`, `ask`, `translate`                                                                         | in: task+context → out: result/decision   | `orchestrator→specialist`, `reviewer→architect` |
| Troubleshooting | `debug`, `code-fixer`                                                                                                               | in: bug report/logs → out: RCA/fix        | `debug→code-fixer→unit-tester→reviewer`         |
| Quality         | `refactorer`, `legacy-modernizer`                                                                                                   | in: code+tests → out: refactor            | `refactorer→unit-tester→reviewer`               |
| Testing         | `unit-tester`, `integration-tester`, `e2e-tester`, `qa-engineer`, `performance-tester`, `security-auditor`, `security-tester`       | in: code+requirements → out: tests/report | `*-dev→*-tester→reviewer`                       |
| Architecture    | `solution-architect`, `api-architect`, `data-architect`, `security-architect`, `kubernetes-architect`                               | in: requirements → out: design/ADR        | `orchestrator→*-architect→*-dev`                |
| Infra           | `devops`, `cicd`, `dba`, `observability-engineer`                                                                                   | in: target env → out: pipeline/infra      | `devops→reviewer`                               |
| 1C              | `1c-orchestrator`, `1c-business-analyst`, `1c-system-analyst`, `1c-architect`, `1c-developer`, `1c-tester`, `1c-quality-specialist` | in: UZ ticket → out: release-ready        | `1c-orchestrator→...`                           |

---

## 6) Контроль качества `.kilocodemodes` (валидаторы)

Агент, который правит `.kilocodemodes`, должен подтвердить:

- YAML парсится.
- `slug` уникальны.
- Все slugs из `.kilocode/modes/REGISTRY.md` (как минимум: Core + ключевые specialist) присутствуют.
- Deprecated slugs отсутствуют.
- Для каждого режима: есть `INPUT/OUTPUT` и `HANDOFF`.

---

## 7) Нормализация контента (обязательные правки при любом рефакторинге `.kilocodemodes`)

### 7.1 Единый стандарт `name`

Правило:

- `name` — **Title Case**, без `/`, без CamelCase, без лишних суффиксов.
- Примеры:
    - `planning-research-codebase` → `Planning Research (Codebase)`
    - `solution-architect` → `Solution Architect`
    - `1c-orchestrator` → `1C Orchestrator`

### 7.2 Единый стандарт `customInstructions`

Каждый режим должен иметь единый скелет (см. раздел 2.2), без «портянок» и копипасты.

**Запрещено:**

- оставлять внутри `customInstructions` секции вида `# CODE (legacy)` / `deprecated` / «миграционные заглушки».
- утверждения типа «НЕ запускай тесты! Это делает E2ETester» (неверно). Тесты делегируются соответствующим `*-tester`.

### 7.3 Research modes: всегда read-only

Для `planning-research-codebase` и `planning-research-web` обязательно:

- `groups`: только `read` (+ `browser` для web)
- `customInstructions`: явный запрет на file edits/commands + требование выводить **только findings**

### 7.4 Известные проблемы в текущем `.kilocodemodes`, которые нужно исправить при правках

| Problem                                              | Example                                                                                                                                                                                                                                   | Fix                                                                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Несуществующие пути на patterns                      | `.kilocodemodes:347` (`.kilocode/patterns/db/`), `.kilocodemodes:935` (`.kilocode/patterns/frontend/ui.md`), `.kilocodemodes:1007` (`.kilocode/patterns/frontend/css.md`), `.kilocodemodes:923` (`.kilocode/patterns/languages/general/`) | Заменить на актуальные пути из `.kilocode/patterns/` (например `databases/`, `frontend/`, `languages/`)                                                     |
| Несуществующие/неопределённые режимы в делегировании | `.kilocodemodes:381` (`migration-specialist`), `.kilocodemodes:1278` (`APITester`)                                                                                                                                                        | Удалить/заменить на существующие slugs из `.kilocode/modes/REGISTRY.md`                                                                                     |
| Неверные утверждения «кто запускает тесты»           | `.kilocodemodes:521`/`:697`/`:738`/`:959` ("делает E2ETester")                                                                                                                                                                            | Привести к правилу: тесты делегируются соответствующим `unit-tester`/`integration-tester`/`e2e-tester`/`security-tester`; не ссылаться на «мифические» роли |
| Неконсистентный `name` (CamelCase/слэши)             | `.kilocodemodes:31` (`planning/research-codebase`), `.kilocodemodes:169` (`SolutionArchitect`) и т.п.                                                                                                                                     | Нормализовать по разделу 7.1 (Title Case, без `/`)                                                                                                          |

---

## 8) Маппинг режимов на шаблоны инструкций (для быстрого приведения к единому стандарту)

> Идея: не переписывать 70+ режимов вручную «с нуля», а применить 8–10 типовых шаблонов.

### 8.1 Templates (коротко)

| Template ID             | Для каких режимов                                                                                                  | Главное отличие                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `TPL-CORE-ORCHESTRATOR` | `orchestrator`, `1c-orchestrator`                                                                                  | только классификация/делегирование/сбор результатов |
| `TPL-CORE-PLANNING`     | `architect`, `solution-architect`, `api-architect`, `data-architect`, `security-architect`, `kubernetes-architect` | план/дизайн/ADR, без реализации                     |
| `TPL-RESEARCH-RO`       | `planning-research-codebase`, `planning-research-web`, `ask`                                                       | findings-only, no edits                             |
| `TPL-DEV`               | все `*-dev`, `code`                                                                                                | реализация по плану, TDD, handoff к тестеру         |
| `TPL-TEST`              | `unit-tester`, `integration-tester`, `e2e-tester`, `playwright-specialist`, `performance-tester`                   | написание/запуск тестов + отчёт                     |
| `TPL-QUALITY`           | `reviewer`, `refactorer`, `legacy-modernizer`, `qa-engineer`                                                       | review/refactor/QA отчёт                            |
| `TPL-SECURITY`          | `security-auditor`, `security-tester`                                                                              | SAST/DAST, отчёты, запрет на секреты                |
| `TPL-DEVOPS`            | `devops`, `cicd`, `dba`, `observability-engineer`                                                                  | IaC/pipelines/ops с verify                          |
| `TPL-1C-SDLC`           | все `1c-*` кроме `1c-orchestrator`                                                                                 | SDLC 1C + firm rules + handoff                      |

### 8.2 Canonical skeleton (вставка в `customInstructions`)

```text
⚠️ CRITICAL: Start by reading [`../../AGENTS.md`](../../AGENTS.md:1)

ROLE:
- ...

BOUNDARIES:
- ...

INPUT:
- ...

OUTPUT:
- ...

WORKFLOW:
1. ...
2. ...

QUALITY / VERIFY:
- ...

HANDOFF:
- ...
```

---

## 9) Инвентаризация `.kilocodemodes` (актуальные режимы) и место в SDLC

> Эта таблица — «точное ТЗ» для агента, который будет править `.kilocodemodes`.
> Источник: фактические `slug` в текущем `.kilocodemodes`.

| Category        | slug                         | Target `name`                | Template                | SDLC phase          | Typical handoff                        |
| --------------- | ---------------------------- | ---------------------------- | ----------------------- | ------------------- | -------------------------------------- |
| orchestration   | `orchestrator`               | Orchestrator                 | `TPL-CORE-ORCHESTRATOR` | triage/coordination | → `architect` / specialist             |
| analysis        | `planning-research-codebase` | Planning Research (Codebase) | `TPL-RESEARCH-RO`       | research            | → `architect` / `orchestrator`         |
| analysis        | `planning-research-web`      | Planning Research (Web)      | `TPL-RESEARCH-RO`       | research            | → `architect` / `orchestrator`         |
| analysis        | `ask`                        | Ask                          | `TPL-RESEARCH-RO`       | research/consult    | → appropriate specialist               |
| core            | `architect`                  | Architect                    | `TPL-CORE-PLANNING`     | planning/closure    | → `*-dev` / `reviewer`                 |
| architecture    | `solution-architect`         | Solution Architect           | `TPL-CORE-PLANNING`     | design              | → `*-dev`                              |
| architecture    | `api-architect`              | API Architect                | `TPL-CORE-PLANNING`     | design              | → `*-dev`                              |
| architecture    | `data-architect`             | Data Architect               | `TPL-CORE-PLANNING`     | design              | → `postgresql-specialist` / `*-dev`    |
| architecture    | `security-architect`         | Security Architect           | `TPL-CORE-PLANNING`     | threat-model/design | → `security-auditor` / `reviewer`      |
| architecture    | `kubernetes-architect`       | Kubernetes Architect         | `TPL-CORE-PLANNING`     | infra design        | → `devops`                             |
| development     | `code`                       | Code                         | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `react-dev`                  | React Developer              | `TPL-DEV`               | implementation      | → `unit-tester` / `e2e-tester`         |
| development     | `react-hooks-specialist`     | React Hooks Specialist       | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `vue-dev`                    | Vue Developer                | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `pinia-dev`                  | Pinia Developer              | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `angular-dev`                | Angular Developer            | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `ngrx-dev`                   | NgRx Developer               | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `next-dev`                   | Next.js Developer            | `TPL-DEV`               | implementation      | → `unit-tester` / `e2e-tester`         |
| development     | `ui-dev`                     | UI Developer                 | `TPL-DEV`               | implementation      | → `reviewer` / `accessibility-auditor` |
| development     | `css-expert`                 | CSS Expert                   | `TPL-DEV`               | implementation      | → `reviewer`                           |
| development     | `tailwind-specialist`        | Tailwind CSS Specialist      | `TPL-DEV`               | implementation      | → `reviewer`                           |
| development     | `python-dev`                 | Python Developer             | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `fastapi-dev`                | FastAPI Developer            | `TPL-DEV`               | implementation      | → `integration-tester` / `unit-tester` |
| development     | `django-dev`                 | Django Developer             | `TPL-DEV`               | implementation      | → `integration-tester`                 |
| development     | `nodejs-dev`                 | Node.js Developer            | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `nestjs-dev`                 | NestJS Developer             | `TPL-DEV`               | implementation      | → `unit-tester` / `integration-tester` |
| development     | `express-dev`                | Express Developer            | `TPL-DEV`               | implementation      | → `integration-tester`                 |
| development     | `java-dev`                   | Java Developer               | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `spring-boot-dev`            | Spring Boot Developer        | `TPL-DEV`               | implementation      | → `integration-tester`                 |
| development     | `go-dev`                     | Go Developer                 | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `rust-dev`                   | Rust Developer               | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| development     | `dotnet-dev`                 | .NET Developer               | `TPL-DEV`               | implementation      | → `integration-tester`                 |
| development     | `aspnet-core-dev`            | ASP.NET Core Developer       | `TPL-DEV`               | implementation      | → `integration-tester`                 |
| development     | `cpp-dev`                    | C++ Developer                | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| database        | `postgresql-specialist`      | PostgreSQL Specialist        | `TPL-DEV`               | implementation      | → `reviewer`                           |
| database        | `mysql-specialist`           | MySQL Specialist             | `TPL-DEV`               | implementation      | → `reviewer`                           |
| database        | `mongodb-specialist`         | MongoDB Specialist           | `TPL-DEV`               | implementation      | → `reviewer`                           |
| database        | `redis-specialist`           | Redis Specialist             | `TPL-DEV`               | implementation      | → `reviewer`                           |
| database        | `elasticsearch-specialist`   | Elasticsearch Specialist     | `TPL-DEV`               | implementation      | → `reviewer`                           |
| database        | `prisma-specialist`          | Prisma Specialist            | `TPL-DEV`               | implementation      | → `reviewer`                           |
| database        | `sqlalchemy-dev`             | SQLAlchemy Developer         | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| testing         | `qa-engineer`                | QA Engineer                  | `TPL-QUALITY`           | planning/analysis   | → `reviewer` / `architect`             |
| testing         | `unit-tester`                | Unit Tester                  | `TPL-TEST`              | testing             | → `reviewer`                           |
| testing         | `integration-tester`         | Integration Tester           | `TPL-TEST`              | testing             | → `reviewer`                           |
| testing         | `e2e-tester`                 | E2E Tester                   | `TPL-TEST`              | testing             | → `reviewer`                           |
| testing         | `playwright-specialist`      | Playwright Specialist        | `TPL-TEST`              | testing             | → `reviewer`                           |
| testing         | `performance-tester`         | Performance Tester           | `TPL-TEST`              | testing             | → `reviewer`                           |
| testing         | `accessibility-auditor`      | Accessibility Auditor        | `TPL-TEST`              | quality/a11y        | → `reviewer`                           |
| troubleshooting | `debug`                      | Debug                        | `TPL-QUALITY`           | investigation       | → `code-fixer`                         |
| troubleshooting | `code-fixer`                 | Code Fixer                   | `TPL-DEV`               | implementation      | → `unit-tester`                        |
| quality         | `refactorer`                 | Refactorer                   | `TPL-QUALITY`           | refactor            | → `unit-tester` / `reviewer`           |
| quality         | `legacy-modernizer`          | Legacy Modernizer            | `TPL-QUALITY`           | refactor/migration  | → `unit-tester` / `reviewer`           |
| quality         | `reviewer`                   | Reviewer                     | `TPL-QUALITY`           | review              | → `architect`                          |
| security        | `security-auditor`           | Security Auditor (SAST)      | `TPL-SECURITY`          | audit               | → `code` / `reviewer`                  |
| security        | `security-tester`            | Security Tester (DAST)       | `TPL-SECURITY`          | testing             | → `reviewer`                           |
| docs            | `translate`                  | Translate                    | `TPL-DEV`               | implementation      | → `reviewer`                           |
| devops          | `devops`                     | DevOps Engineer              | `TPL-DEVOPS`            | delivery/ops        | → `reviewer`                           |
| devops          | `dba`                        | Database Admin               | `TPL-DEVOPS`            | ops                 | → `reviewer`                           |
| devops          | `cicd`                       | CI/CD Engineer               | `TPL-DEVOPS`            | delivery/ops        | → `reviewer`                           |
| devops          | `observability-engineer`     | Observability Engineer       | `TPL-DEVOPS`            | ops                 | → `reviewer`                           |
| 1c              | `1c-orchestrator`            | 1C Orchestrator              | `TPL-CORE-ORCHESTRATOR` | triage/coordination | → `1c-business-analyst`                |
| 1c              | `1c-business-analyst`        | 1C Business Analyst          | `TPL-1C-SDLC`           | analysis            | → `1c-system-analyst`                  |
| 1c              | `1c-system-analyst`          | 1C System Analyst            | `TPL-1C-SDLC`           | analysis            | → `1c-architect`                       |
| 1c              | `1c-architect`               | 1C Architect                 | `TPL-1C-SDLC`           | design              | → `1c-developer`                       |
| 1c              | `1c-docs-specialist`         | 1C Docs Specialist           | `TPL-1C-SDLC`           | docs                | → `1c-quality-specialist`              |
| 1c              | `1c-developer`               | 1C Developer                 | `TPL-1C-SDLC`           | implementation      | → `1c-tester`                          |
| 1c              | `1c-kd-developer`            | 1C KD Developer              | `TPL-1C-SDLC`           | implementation      | → `1c-tester`                          |
| 1c              | `1c-form-designer`           | 1C Form Designer             | `TPL-1C-SDLC`           | implementation      | → `1c-tester`                          |
| 1c              | `1c-integration-specialist`  | 1C Integration Specialist    | `TPL-1C-SDLC`           | implementation      | → `1c-tester`                          |
| 1c              | `1c-tester`                  | 1C Tester                    | `TPL-1C-SDLC`           | testing             | → `1c-quality-specialist`              |
| 1c              | `1c-vanessa-tester`          | 1C Vanessa Tester            | `TPL-1C-SDLC`           | testing             | → `1c-quality-specialist`              |
| 1c              | `1c-quality-specialist`      | 1C Quality Specialist        | `TPL-1C-SDLC`           | review              | → `1c-orchestrator`                    |
