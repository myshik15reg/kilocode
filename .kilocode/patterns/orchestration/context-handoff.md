# Context Handoff Protocol (SoT)

## Purpose

Этот документ задаёт единственный канонический протокол передачи контекста между агентами при делегировании `task` через [`new_task`](../../rules/mode-delegation-example.md:1).

Цель: сделать делегирование воспроизводимым, проверяемым и безопасным, без «догадок» и скрытых предположений.

Нормативные термины и определения: [`terminology.md`](../../rules/terminology.md:1).
Правила доказательности: [`evidence-rules.md`](../../rules/evidence-rules.md:1).
Result contract: [`result-contract.md`](result-contract.md:1).
Prompt shape: [`../../rules/workflow-prompt-writing.md`](../../rules/workflow-prompt-writing.md:1).

## Non-negotiables

1. Handoff MUST содержать блок `=== CONTEXT HANDOFF ===` и обязательные поля из раздела `Required fields`.
2. Handoff MUST быть самодостаточным: получатель не должен угадывать контекст.
3. Handoff MUST быть execution contract, а не persona prompt.
4. Любые facts MUST иметь source (файл/строки/артефакт).
5. Любые assumptions MUST быть помечены `ASSUMPTION:` и иметь safe default.
6. Если критичный пробел нельзя закрыть фактами, отправитель MUST задать ровно 1 уточняющий вопрос и указать `TEMP:` правило до ответа.
7. В Alfa Code для смены режима MUST использоваться делегирование через `new_task`; `switch_mode` MUST NOT использоваться.
8. Получатель SHOULD возвращать результат по [`result-contract.md`](result-contract.md:1), если handoff не задаёт более узкий совместимый контракт.

## Required fields

Поля MUST идти в указанном порядке.

| Field           | Type           | Semantics                                                                                              |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| ROOT            | path           | Корень проекта (workspace root).                                                                       |
| PROTOCOL        | path or `N/A`  | Путь к активному протоколу `.protocols/YYYY-MM-DD-name/` или `N/A`, если протокол ещё не создан.       |
| ORIGIN          | text           | От кого к кому передача, например `orchestrator -> react-dev`.                                         |
| DOMAIN          | text           | Домен/стек (например `React`, `Node.js`, `Docs`).                                                      |
| PHASE           | enum           | `Planning` / `Implementation` / `Testing` / `Review` / `Release`.                                      |
| GOAL            | text           | Одна цель, измеримая и наблюдаемая.                                                                    |
| INPUTS          | list           | Список источников: файлы/строки/артефакты, которые получатель MUST прочитать.                          |
| CONSTRAINTS     | list           | Ограничения качества/безопасности/границ роли (MUST/MUST NOT).                                         |
| OUT OF SCOPE    | list           | Что явно НЕ делать, чтобы не расползся scope.                                                          |
| VERIFY          | list           | Как проверить результат (что считать done).                                                            |
| RESULT CONTRACT | path or inline | Как именно вернуть структурированный результат. Default: [`result-contract.md`](result-contract.md:1). |
| EXPECTED OUTPUT | text           | Что именно вернуть: файлы/формат/отчёт.                                                                |

## Optional fields

| Field                  | When to use                | Semantics                                                                                       |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| ASSUMPTIONS            | When sources unavailable   | Список `ASSUMPTION:` с риском и safe default.                                                   |
| QUESTIONS              | When blocking ambiguity    | Ровно 1 вопрос (если без ответа нельзя двигаться).                                              |
| TEMP                   | When waiting for answer    | Временное безопасное правило до ответа.                                                         |
| LIMITATIONS            | When target is constrained | Ограничения получателя: tool access, memory bank access, etc.                                   |
| MCP INSTRUCTIONS       | When using MCP             | Что и зачем вызывать; не передавать секреты.                                                    |
| EVIDENCE TARGET        | For retrieval/review tasks | Что считать достаточным evidence package.                                                       |
| PRUNING RULE           | For retrieval-heavy tasks  | Что удалять, сжимать или не тащить дальше по контексту.                                         |
| MAX CONTEXT            | For retrieval-heavy tasks  | Лимит контекста/объёма, который можно передать дальше.                                          |
| EXPECTED RANKED OUTPUT | For retrieval-heavy tasks  | Как должен выглядеть ранжированный evidence output.                                             |
| CAPSULE                | When memory-bank-limited   | Ссылка на Context Capsule или вставка inline. См. [`context-capsule.md`](context-capsule.md:1). |

## Canonical template

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

RESULT CONTRACT:
Use default contract from `.kilocode/patterns/orchestration/result-contract.md`.

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

## Retrieval add-on (optional)

Для retrieval-heavy handoff MAY добавляться такой блок:

```text
EVIDENCE TARGET:
<what counts as sufficient evidence>

PRUNING RULE:
<what to discard or compress before handoff>

MAX CONTEXT:
<token/file/fragment budget>

EXPECTED RANKED OUTPUT:
<ordered refs + gaps + discarded refs>
```
