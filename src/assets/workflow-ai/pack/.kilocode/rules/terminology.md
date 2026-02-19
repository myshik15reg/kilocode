# Terminology (SoT)

## Normative language

1. MUST означает обязательное требование.
2. MUST NOT означает запрещённое действие.
3. SHOULD означает рекомендацию; отклонение допускается только при явной причине, зафиксированной как evidence.
4. MAY означает опциональное действие.

## Terms

| Term                     | Definition                                                                                    | Notes                                                                                                                                                                           | Canonical refs                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| mode                     | Режим работы агента (набор обязанностей, ограничений и инструментов).                         | Один `task` MUST выполняться в одном `mode` (Alfa Code: через `new_task`).                                                                                                      | [`AGENTS.md`](../../AGENTS.md:1), [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)                     |
| agent                    | Исполнитель в конкретном `mode` (специалист или общий).                                       | В тексте документов AlfaFlowAI слова `mode` и `agent` SHOULD использоваться строго в этих значениях.                                                                            | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)                                                       |
| task                     | Единица работы с одним целью и одним Definition of Done.                                      | `task` MUST иметь протокол в `.protocols/` (кроме явно оговорённых режимов triage в `ask`).                                                                                     | [`protocol-new.md`](../workflows/protocol-new.md:1)                                                                    |
| protocol                 | Рабочая папка задачи в `.protocols/YYYY-MM-DD-name/` (контекст, план, лог, артефакты).        | `protocol` MUST рассматриваться как временный workspace; результаты, которые должны пережить задачу, MUST быть перенесены в стабильные SoT/evidence пути до удаления протокола. | [`protocol-new.md`](../workflows/protocol-new.md:1), [`artifacts-and-storage.md`](../rules/artifacts-and-storage.md:1) |
| handoff                  | Стандартизированная передача контекста при делегировании `task` другому `agent`.              | Любое делегирование MUST включать блок `CONTEXT HANDOFF` по SoT.                                                                                                                | [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1)                                                 |
| evidence                 | Проверяемое утверждение/факт с указанием источника (файл/строка, лог, артефакт, ссылка).      | Любая неочевидная рекомендация, решение, вывод аудита SHOULD сопровождаться evidence. Предположения MUST маркироваться как `ASSUMPTION`.                                        | [`evidence-rules.md`](evidence-rules.md:1)                                                                             |
| scope                    | Явные границы задачи: что входит и что не входит.                                             | `scope` MUST быть указан в `brief.md` и в handoff (если делегируется).                                                                                                          | [`planning.md`](../rules-architect/planning.md:1)                                                                      |
| AC (Acceptance Criteria) | Критерии приёмки в формате Given/When/Then, описывающие ожидаемое поведение.                  | AC MUST описывать наблюдаемый результат, а не способ реализации.                                                                                                                | [`planning.md`](../rules-architect/planning.md:1)                                                                      |
| DoD (Definition of Done) | Критерии готовности результата задачи (качество, проверка, документация, закрытие протокола). | DoD MUST включать применимые quality gates и правила обновления документации.                                                                                                   | [`quality-gates.md`](quality-gates.md:1), [`quality-gates/SKILL.md`](../skills/quality-gates/SKILL.md:1)               |

## Canonical writing rules (terms)

1. Документы MUST использовать термины из таблицы без переопределения значений.
2. Если вводится новый термин, он MUST быть добавлен в этот словарь и использован единообразно.
