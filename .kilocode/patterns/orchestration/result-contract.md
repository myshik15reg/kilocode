# Result Contract (SoT pattern)

## Purpose

Канонический формат результата для handoff и outputs между агентами.

Цель: сделать сборку multi-agent результатов детерминированной и проверяемой.

Связанные документы: [`context-handoff.md`](context-handoff.md:1), [`../../rules/evidence-rules.md`](../../rules/evidence-rules.md:1).

## Required fields

| Field            | Meaning                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `summary`        | краткий итог подзадачи в 1-5 пунктов                               |
| `findings`       | список замечаний, решений или результатов; MAY be empty            |
| `risks`          | остаточные риски или `none`                                        |
| `evidence_refs`  | ссылки на файлы/артефакты/источники, подтверждающие factual claims |
| `open_questions` | блокирующие или важные незакрытые вопросы; MAY be empty            |
| `next_action`    | следующий рекомендуемый шаг для оркестратора/получателя            |
| `confidence`     | `high` / `medium` / `low`                                          |
| `status`         | один статус из таблицы ниже                                        |

## Optional fields

Используй optional fields только когда это помогает проверить retrieval/eval-heavy результат.

| Field                  | Meaning                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `ranked_evidence_refs` | упорядоченный список evidence refs по силе/релевантности               |
| `evidence_quotes`      | короткие выдержки, anchors или pinpoint fragments для ключевых выводов |
| `retrieval_gaps`       | что осталось непокрытым после retrieval                                |
| `discarded_refs`       | какие refs были отброшены на pruning step и почему                     |

## Allowed status values

| Status         | Meaning                                              | Expected orchestrator action           |
| -------------- | ---------------------------------------------------- | -------------------------------------- |
| `completed`    | цель достигнута                                      | продолжить следующий шаг               |
| `blocked`      | есть блокер                                          | остановить цепочку или задать вопрос   |
| `uncertain`    | есть полезный результат, но недостаточно уверенности | review / narrow retry                  |
| `inconclusive` | данных недостаточно для вывода                       | retrieval/research retry               |
| `conflict`     | найдено противоречие                                 | синтезировать или эскалировать решение |
| `tool-limited` | ограничения инструмента мешают завершить задачу      | degraded mode / alternate path         |
| `no-evidence`  | вывод нельзя подтвердить                             | не продвигать как факт                 |

## Rules

1. `status` MUST быть указан явно.
2. Любой факт в `summary` или `findings` SHOULD иметь `evidence_refs`.
3. Если `status != completed`, поле `next_action` MUST предлагать safe next step.
4. Свободный текст MAY использоваться внутри полей, но outer contract MUST сохраняться.
5. Если результата нет, возвращай пустые списки, а не пропускай поля.
6. Optional fields MAY отсутствовать, если задача не retrieval/eval-heavy.

## Minimal example

```text
summary:
- Reviewed routing docs and found one missing guardrail link.

findings:
- `agent-orchestration.md` does not define degraded mode explicitly.

risks:
- Orchestrator may over-spawn agents on ambiguous tasks.

evidence_refs:
- .kilocode/workflows/agent-orchestration.md:1
- .kilocode/rules/agent-routing.md:1

open_questions:
- none

next_action:
- Update orchestration workflow and quickref links.

confidence:
- high

status:
- completed
```
