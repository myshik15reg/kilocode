# Workflow Prompt Writing (SoT)

## Purpose

Этот документ задаёт канонические правила написания workflow/prompts в `WorkFlowAI`.

Главный принцип: prompt MUST быть execution contract, а не role-play.

Связанные документы: [`docs-standards.md`](docs-standards.md:1), [`evidence-rules.md`](evidence-rules.md:1), [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1), [`../patterns/orchestration/result-contract.md`](../patterns/orchestration/result-contract.md:1), [`../patterns/orchestration/integration-types.md`](../patterns/orchestration/integration-types.md:1).

## Non-negotiables

1. Prompt MUST описывать задачу через цель, входы, ограничения и верификацию.
2. Prompt MUST NOT опираться на persona-heavy framing (`"ты гуру"`, `"ты лучший эксперт"`) как основной механизм качества.
3. Prompt MUST содержать stop condition: когда работа считается завершённой.
4. Prompt MUST содержать out-of-scope, если есть риск расползания.
5. Для factual/research/review задач prompt MUST требовать source-backed output.
6. Для agent-to-agent задач prompt SHOULD ссылаться на [`result-contract.md`](../patterns/orchestration/result-contract.md:1).
7. Prompt MUST NOT смешивать `resource`, `prompt` и `tool` semantics в одном неразделённом блоке.

## Canonical shape

Используй следующий каркас по умолчанию:

1. `GOAL` — одна измеримая цель.
2. `INPUTS` — что читать или использовать.
3. `CONSTRAINTS` — MUST/MUST NOT правила.
4. `OUT OF SCOPE` — что явно не делать.
5. `VERIFY` — как проверить done.
6. `EXPECTED OUTPUT` — что вернуть и в каком формате.

## When examples help

Примеры MAY добавляться, если они:

1. снимают неоднозначность формата;
2. уменьшают риск неверного routing/contract;
3. не подменяют собой нормативное правило.

## Integration typing

Если workflow или prompt использует внешние интеграции, классифицируй их по [`integration-types.md`](../patterns/orchestration/integration-types.md:1):

1. `resource` — read-only context; belongs in `INPUTS`.
2. `prompt` — reusable template/bridge; MUST NOT masquerade as evidence.
3. `tool` — executable action; MUST быть описан отдельно с constraints/approval semantics.

Если одна и та же система используется и как источник контекста, и как действие, эти surfaces MUST быть разделены явно.

## Anti-patterns

| Anti-pattern                                   | Why it is wrong                                                | Replace with                                  |
| ---------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| `Ты эксперт мирового уровня`                   | создаёт ложную уверенность, но не определяет выходной контракт | explicit `GOAL/INPUTS/VERIFY/EXPECTED OUTPUT` |
| Большой свободный текст без структуры          | трудно проверить, что агент понял scope                        | sectioned execution contract                  |
| `Сделай хорошо`                                | нет наблюдаемого done-state                                    | measurable stop condition                     |
| `Если что сам реши`                            | размывает ответственность                                      | `ASSUMPTION:` + safe default                  |
| Огромный контекст dump                         | увеличивает шум и галлюцинации                                 | minimal relevant inputs + retrieval workflow  |
| Один блок, где смешаны docs, template и action | теряются boundaries и approval semantics                       | split into `resource` / `prompt` / `tool`     |

## Minimal template

```text
GOAL:
<one measurable goal>

INPUTS:
1. <path/source> - <why>

CONSTRAINTS:
1. <MUST/MUST NOT>

OUT OF SCOPE:
1. <explicit exclusion>

VERIFY:
1. <observable check>

EXPECTED OUTPUT:
<artifact/format/result contract>
```

## Notes

1. Persona wording MAY использоваться только как cosmetic wrapper, но НЕ как SoT.
2. Если prompt конфликтует с evidence или stable contract, приоритет у evidence и stable contract.
3. Для tool-heavy задач используй [`../workflows/planner-executor.md`](../workflows/planner-executor.md:1).
