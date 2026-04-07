# AlfaFlowAI for AI agents (manifest)

## Corridor (read in order)

| Level | File                                                       | Purpose                                |
| ----: | ---------------------------------------------------------- | -------------------------------------- |
|     0 | [`QUICK.md`](.kilocode/QUICK.md:1)                         | Минимальные правила и старт задачи     |
|     1 | [`memory-bank/index.md`](.kilocode/memory-bank/index.md:1) | Контекст проекта (только нужные файлы) |
|     2 | [`quickref.md`](.kilocode/workflows/quickref.md:1)         | Меню процессов и ссылок                |
|     3 | [`rules/index.md`](.kilocode/rules/index.md:1)             | Индекс SoT и wrappers                  |

После чтения Memory Bank агент MUST вывести строку `[MB: OK]`.

## Non-negotiables (Zero tolerance)

| Rule                        | Requirement                                                                                                      | Source                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No Protocol, No Code        | Любое изменение репозитория MUST иметь протокол `.protocols/YYYY-MM-DD-name/`                                    | [`protocol-new.md`](.kilocode/workflows/protocol-new.md:1)                                                                                                   |
| Quality gates               | Coverage MUST be 100% (lines/branches/functions); lint MUST be 0/0; TDD MUST be used                             | [`quality-gates.md`](.kilocode/rules/quality-gates.md:1)                                                                                                     |
| Specialist-first            | MUST выбирать самый узкий specialist; `code` только last resort                                                  | [`mode-selection/SKILL.md`](.kilocode/skills/mode-selection/SKILL.md:1)                                                                                      |
| Zero-analytics orchestrator | Orchestrator MUST NOT делать аналитику; только маршрутизация/делегирование                                       | [`agent-routing.md`](.kilocode/rules/agent-routing.md:1)                                                                                                     |
| Strict handoff              | Любое делегирование MUST использовать `CONTEXT HANDOFF` + `Result Contract`                                      | [`context-handoff.md`](.kilocode/patterns/orchestration/context-handoff.md:1), [`result-contract.md`](.kilocode/patterns/orchestration/result-contract.md:1) |
| Execution contract prompts  | Workflow/prompts MUST use explicit `GOAL/INPUTS/CONSTRAINTS/VERIFY/EXPECTED OUTPUT`, not persona-heavy role-play | [`workflow-prompt-writing.md`](.kilocode/rules/workflow-prompt-writing.md:1)                                                                                 |
| Evidence discipline         | Facts MUST be sourced; assumptions MUST be explicit                                                              | [`evidence-rules.md`](.kilocode/rules/evidence-rules.md:1)                                                                                                   |
| Curated memory              | Memory Bank updates MUST follow write policy; no automatic dumps                                                 | [`memory-write-policy.md`](.kilocode/rules/memory-write-policy.md:1)                                                                                         |
| Language and UTF-8          | Чат с пользователем, протоколы и Memory Bank MUST быть на русском; файлы с кириллицей MUST быть UTF-8 без BOM    | [`language-and-encoding.md`](.kilocode/rules/language-and-encoding.md:1)                                                                                     |
| Fresh verification          | MUST NOT claim `done`/`ready`/`merged`/`completed` without fresh verification for the current state              | [`verification-before-completion.md`](.kilocode/rules/verification-before-completion.md:1)                                                                   |
| Risky actions               | Before deploy/start/env-change/commit/push/external-service ops, run pre-action check                            | [`pre-action-check.md`](.kilocode/workflows/pre-action-check.md:1)                                                                                           |

## Task classification (trivial vs non-trivial)

Тривиальная правка существует только если одновременно выполнены все условия.

| Condition                          | Trivial requires |
| ---------------------------------- | ---------------- |
| Files changed                      | 1 file           |
| Size                               | ≤ 10 lines       |
| Behavior/API                       | no change        |
| Dependencies/CI/scripts/migrations | no changes       |

Любой другой случай MUST считаться нетривиальным. Протокол обязателен в обоих случаях; различается только глубина `plan.md`.

## Design discovery (before protocol)

Если запрос design-heavy, solution space широкий или успех нельзя безопасно зафиксировать сразу, агент SHOULD сначала запустить [`brainstorm-design.md`](.kilocode/workflows/brainstorm-design.md:1), а уже потом переходить к [`protocol-new.md`](.kilocode/workflows/protocol-new.md:1).

Use `brainstorm-design` when the request includes one of these triggers:

1. ambiguous request;
2. design exploration;
3. compare options;
4. need architecture direction;
5. unclear success criteria;
6. large initiative requiring decomposition before protocol.

Do not use it for exact bug fixes, trivial repo changes, docs-only micro-changes, or already approved designs/specs.

## FAST PATH (Micro-change / Quick fix)

Для запросов вида «быстрая правка / микро‑рефакторинг / extract method / обёртка» при наличии точного фрагмента кода агент SHOULD использовать FAST PATH workflow: [`quick-fix.md`](.kilocode/workflows/quick-fix.md:1).

| Rule               | Meaning                                                          |
| ------------------ | ---------------------------------------------------------------- |
| Patch first        | сначала выдать готовый код/патч, затем verify                    |
| Questions cap      | максимум 1 blocking question, иначе `TEMP:` safe default         |
| Protocol unchanged | repo changes всё равно требуют протокол ("No Protocol, No Code") |

## Mode selection (entrypoint)

1. Выбор режима MUST следовать SoT: [`mode-selection/SKILL.md`](.kilocode/skills/mode-selection/SKILL.md:1).
2. Маршрутизация orchestrator MUST следовать SoT: [`agent-routing.md`](.kilocode/rules/agent-routing.md:1).
3. Полный список режимов: [`REGISTRY.md`](.kilocode/modes/REGISTRY.md:1).

## Delegation (Alfa Code)

1. В Alfa Code смена режима MUST быть через `new_task`; `switch_mode` MUST NOT использоваться.
2. Любая делегация MUST содержать блок `=== CONTEXT HANDOFF ===` по SoT: [`context-handoff.md`](.kilocode/patterns/orchestration/context-handoff.md:1).
3. Для tool-heavy задач SHOULD использоваться split planner/executor: [`planner-executor.md`](.kilocode/workflows/planner-executor.md:1).
4. При multi-agent работе MUST быть определён degraded mode path. Source: [`agent-orchestration.md`](.kilocode/workflows/agent-orchestration.md:1).

## Delegation example

```text
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Implement according to protocol plan

=== CONTEXT HANDOFF ===
ROOT: d:/path/to/project
PROTOCOL: .protocols/YYYY-MM-DD-name/
ORIGIN: architect -> code
DOMAIN: <domain>
PHASE: Implementation

GOAL:
<measurable goal>

INPUTS:
1. .protocols/YYYY-MM-DD-name/brief.md:1 - requirements
2. .protocols/YYYY-MM-DD-name/plan.md:1 - steps

CONSTRAINTS:
1. TDD MUST be used.
2. Coverage MUST be 100% (lines/branches/functions).
3. Lint MUST be 0 errors and 0 warnings.

OUT OF SCOPE:
1. Do not change requirements without updating brief.md.

VERIFY:
1. Tests pass and coverage is 100%.

RESULT CONTRACT:
Use the default contract from `.kilocode/patterns/orchestration/result-contract.md`.

EXPECTED OUTPUT:
Code + tests + updated execution.md.
=======================
</message>
</new_task>
```
