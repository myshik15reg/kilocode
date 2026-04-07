# Workflow: notes-inbox-processing

## Goal

Разобрать сырые заметки из `.notes/INBOX/`, превратить их в краткие тематические документы и перенести долговечные знания в SoT-слой `WorkFlowAI`.

Связанные документы: [`../../.notes/README.md`](../../.notes/README.md:1), [`../rules/docs-standards.md`](../rules/docs-standards.md:1), [`../rules/evidence-rules.md`](../rules/evidence-rules.md:1), [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1), [`research-retrieval.md`](research-retrieval.md:1), [`protocol-new.md`](protocol-new.md:1).

## When to run

Используй workflow, когда:

1. В `.notes/INBOX/` появились новые `.md` файлы.
2. После исследования остались полезные заметки, которые нужно структурировать.
3. Нужно решить, что остаётся временной заметкой, а что должно стать частью `.kilocode/`.

## Inputs and outputs

| Type           | Path                | Purpose                                                    |
| -------------- | ------------------- | ---------------------------------------------------------- |
| Input          | `.notes/INBOX/*.md` | сырой текст, выдержки, наблюдения                          |
| Working output | `.notes/*.md`       | тематические сводки без дублирования                       |
| Durable output | `.kilocode/...`     | rules, workflows, patterns, skills, evidence или templates |

## Steps

|   # | Step                      | INPUT                     | OUTPUT                                                  | VERIFY                                    |
| --: | ------------------------- | ------------------------- | ------------------------------------------------------- | ----------------------------------------- |
|   1 | Inventory inbox           | `.notes/INBOX/*.md`       | список файлов и тем                                     | все файлы прочитаны один раз              |
|   2 | Classify content          | raw notes                 | разметка: temporary note / durable knowledge / evidence | классификация явная, assumptions отмечены |
|   3 | Consolidate themes        | related notes             | 1..N тематических `.notes/*.md`                         | одинаковые тезисы не дублируются          |
|   4 | Promote durable knowledge | stable findings/processes | новые или обновлённые документы в `.kilocode/`          | путь выбран по SoT и memory write policy  |
|   5 | Clean inbox               | processed files           | пустой `.notes/INBOX/`                                  | исходные файлы удалены или перемещены     |

## Promotion rules

| If note contains                          | Promote to                                      |
| ----------------------------------------- | ----------------------------------------------- |
| повторяемый процесс                       | `.kilocode/workflows/`                          |
| нормативное правило                       | `.kilocode/rules/`                              |
| reusable technique or shape               | `.kilocode/patterns/` or `.kilocode/templates/` |
| фактологический аудит / research snapshot | `.kilocode/evidence/`                           |
| task-local material only                  | keep in protocol `artifacts/` or `.notes/`      |

## Guardrails

1. `.notes/` MUST remain a staging area, not a second source of truth.
2. Перед переносом в `.kilocode/` материал MUST быть дедуплицирован и сжат до операционного формата.
3. Если заметки привели к repo changes, MUST быть создан или обновлён протокол.
4. Сырые цитаты и внешние выдержки SHOULD быть сокращены до краткой сводки с указанием источника.
