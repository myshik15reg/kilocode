---
name: mode-selection
description: Decision tree for selecting the right mode - specialist-first principle, task type routing, mode capabilities.
---

# Mode Selection (SoT)

## Purpose

Этот документ задаёт единственный канонический алгоритм выбора `mode` для `task`.

Термины: [`terminology.md`](../../rules/terminology.md:1).
Маршрутизация orchestrator (zero-analytics): [`agent-routing.md`](../../rules/agent-routing.md:1).
Handoff: [`context-handoff.md`](../../patterns/orchestration/context-handoff.md:1).

## Non-negotiables

1. Specialist-first MUST применяться всегда: выбирать самый узкий доступный specialist.
2. `code` MUST использоваться только как last resort, когда specialist отсутствует.
3. Для 1C:Enterprise MUST немедленно выбирать `1c-orchestrator` как entry point. См. [`REGISTRY.md`](../../modes/REGISTRY.md:268).
4. Orchestrator MUST NOT выполнять аналитику; только маршрутизировать и делегировать. См. [`agent-routing.md`](../../rules/agent-routing.md:1).

## Decision tree (deterministic)

```text
START: What is the observable intent?
|
+-- [A] Planning / Protocol / Docs-only?
|      -> architect
|
+-- [B] Multi-step coordination / parallel subtasks?
|      -> orchestrator
|
+-- [C] Question / Research (no repo changes)?
|      +-- Internal repo analysis? -> planning-research-codebase
|      +-- External docs search?   -> planning-research-web
|      +-- General Q&A?            -> ask
|
+-- [D] Bug / Problem?
|      +-- Root cause unknown?     -> debug
|      +-- Root cause known, fix?  -> code-fixer (or specialist dev)
|
+-- [E] Testing / QA?
|      +-- Unit?                   -> unit-tester
|      +-- Integration?            -> integration-tester
|      +-- E2E?                    -> e2e-tester (or playwright-specialist)
|      +-- Security (DAST)?        -> security-tester
|
+-- [F] Code review?
|      -> reviewer
|
+-- [G] Refactoring?
|      +-- Simplify only?          -> refactorer --simplify
|      +-- General refactor?       -> refactorer
|
+-- [H] Localization (i18n only)?
|      -> translate
|
+-- [I] Development (implementation)?
       -> choose narrowest *-dev / *-specialist
       -> if none found: code
```

## Specialist-first selection (implementation)

1. Определи домен по триггерам.
2. Если триггер 1C:Enterprise сработал, MUST выбрать `1c-orchestrator`.
3. Если несколько триггеров сработало, MUST выбрать наиболее узкий specialist.
4. Если задача пересекает более 2 доменов, SHOULD выбрать `orchestrator` для декомпозиции и делегирования. См. escalation в [`agent-routing.md`](../../rules/agent-routing.md:67).

| Domain trigger  | Examples                                           | Preferred mode             |
| --------------- | -------------------------------------------------- | -------------------------- |
| 1C:Enterprise   | `1C`, `1С`, `.bsl`, `EDT`, `справочник`, `регистр` | `1c-orchestrator`          |
| React           | `react`, `jsx`, `hook`                             | `react-dev`                |
| Vue             | `vue`, `nuxt`                                      | `vue-dev`                  |
| Node.js backend | `node`, `express`, `nestjs`                        | `nodejs-dev`               |
| Python backend  | `python`, `django`, `fastapi`                      | `python-dev` (or narrower) |
| PostgreSQL      | `postgres`, `migration`, `index`                   | `postgresql-specialist`    |
| Prisma          | `prisma`, `schema.prisma`                          | `prisma-specialist`        |
| CI/CD           | `pipeline`, `github actions`                       | `cicd`                     |
| DevOps          | `docker`, `k8s`                                    | `devops`                   |

## Output contract

1. Результат выбора MUST быть одним `mode_slug` из [`REGISTRY.md`](../../modes/REGISTRY.md:1) (или alias, если явно допустим).
2. Если выбор опирается на assumptions (например, неизвестен стек), MUST указать `ASSUMPTION:` и safe default.
3. Если ambiguity блокирует выбор, MUST задать ровно 1 вопрос и применить `TEMP:` safe default до ответа. См. [`evidence-rules.md`](../../rules/evidence-rules.md:1).
