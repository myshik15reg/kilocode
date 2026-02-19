# Context Handoff Protocol (SoT)

## Purpose

Этот документ задаёт единственный канонический протокол передачи контекста между агентами при делегировании `task` через [`new_task`](../../rules/mode-delegation-example.md:1).

Цель: сделать делегирование воспроизводимым, проверяемым и безопасным, без «догадок» и скрытых предположений.

Нормативные термины и определения: [`terminology.md`](../../rules/terminology.md:1).
Правила доказательности: [`evidence-rules.md`](../../rules/evidence-rules.md:1).

## Non-negotiables

1. Handoff MUST содержать блок `=== CONTEXT HANDOFF ===` и обязательные поля из раздела "Required fields".
2. Handoff MUST быть самодостаточным: получатель не должен угадывать контекст.
3. Любые facts MUST иметь source (файл/строки/артефакт). См. [`evidence-rules.md`](../../rules/evidence-rules.md:1).
4. Любые assumptions MUST быть помечены `ASSUMPTION:` и иметь safe default.
5. Если критичный пробел нельзя закрыть фактами, отправитель MUST задать ровно 1 уточняющий вопрос и указать `TEMP:` правило до ответа.
6. В Alfa Code для смены режима MUST использоваться делегирование через `new_task`; `switch_mode` MUST NOT использоваться.

## Required fields

Таблица описывает обязательные поля handoff. Поля MUST идти в указанном порядке.

| Field           | Type          | Semantics                                                                                        |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| ROOT            | path          | Корень проекта (workspace root).                                                                 |
| PROTOCOL        | path or `N/A` | Путь к активному протоколу `.protocols/YYYY-MM-DD-name/` или `N/A`, если протокол ещё не создан. |
| ORIGIN          | text          | От кого к кому передача, например `orchestrator -> react-dev`.                                   |
| DOMAIN          | text          | Домен/стек (например `React`, `Node.js`, `Docs`).                                                |
| PHASE           | enum          | `Planning` / `Implementation` / `Testing` / `Review` / `Release`.                                |
| GOAL            | text          | Одна цель, измеримая и наблюдаемая.                                                              |
| INPUTS          | list          | Список источников: файлы/строки/артефакты, которые получатель MUST прочитать.                    |
| CONSTRAINTS     | list          | Ограничения качества/безопасности/границ роли (MUST/MUST NOT).                                   |
| OUT OF SCOPE    | list          | Что явно НЕ делать, чтобы не расползся scope.                                                    |
| VERIFY          | list          | Как проверить результат (что считать done).                                                      |
| EXPECTED OUTPUT | text          | Что именно вернуть: файлы/формат/отчёт.                                                          |

## Optional fields

| Field            | When to use                | Semantics                                                                                       |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| ASSUMPTIONS      | When sources unavailable   | Список `ASSUMPTION:` с риском и safe default.                                                   |
| QUESTIONS        | When blocking ambiguity    | Ровно 1 вопрос (если без ответа нельзя двигаться).                                              |
| TEMP             | When waiting for answer    | Временное безопасное правило до ответа.                                                         |
| LIMITATIONS      | When target is constrained | Ограничения получателя: tool access, memory bank access, etc.                                   |
| MCP INSTRUCTIONS | When using MCP             | Что и зачем вызывать; не передавать секреты.                                                    |
| CAPSULE          | When memory-bank-limited   | Ссылка на Context Capsule или вставка inline. См. [`context-capsule.md`](context-capsule.md:1). |

## Canonical template

Используй этот шаблон без изменений структуры. Меняй только значения.

```text
ЗАДАЧА: <short title>

=== CONTEXT HANDOFF ===
ROOT: <path>
PROTOCOL: <.protocols/.../> | N/A
ORIGIN: <from -> to>
DOMAIN: <domain>
PHASE: <Planning|Implementation|Testing|Review|Release>

GOAL:
<one measurable goal>

INPUTS:
1. <path:line> - <why>
2. <path:line> - <why>

CONSTRAINTS:
1. <MUST/MUST NOT rule>
2. <MUST/MUST NOT rule>

OUT OF SCOPE:
1. <explicit exclusion>

VERIFY:
1. <verification step / artifact>

EXPECTED OUTPUT:
<what to return>

ASSUMPTIONS:
1. ASSUMPTION: <...>. Risk: <...>. Default: <...>.

QUESTIONS:
1. <single blocking question>

TEMP:
1. TEMP: <safe default rule until question answered>.

LIMITATIONS:
1. <e.g., memory bank not accessible>

MCP INSTRUCTIONS:
1. <tool> - <purpose>

CAPSULE:
<path or inline>
=======================
```

## Minimal example (docs-only)

```text
ЗАДАЧА: Rewrite quickref to be menu-only

=== CONTEXT HANDOFF ===
ROOT: <workspace-root>
PROTOCOL: .protocols/2026-02-10-sot-rewrite/
ORIGIN: architect -> architect
DOMAIN: Docs
PHASE: Planning

GOAL:
Make quickref operational and non-duplicating.

INPUTS:
1. .kilocode/workflows/quickref.md:1 - current quickref
2. .kilocode/rules/docs-standards.md:1 - doc constraints
3. .kilocode/workflows/scripts-entrypoints.md:1 - script paths SoT

CONSTRAINTS:
1. quickref MUST remain short.
2. quickref MUST NOT duplicate SoT; link instead.
3. quickref MUST NOT reference missing files.

OUT OF SCOPE:
1. Do not change templates or scripts.

VERIFY:
1. All internal links in quickref resolve by inspection.

EXPECTED OUTPUT:
Updated quickref.md content.
=======================
```
