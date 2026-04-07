# Quick Reference (menu)

Назначение: быстрый выбор процесса, режима и гейтов качества. Этот файл MUST оставаться коротким и операционным. Нормативная рамка документации: [`docs-standards.md`](../rules/docs-standards.md:1).

## Route in 20 seconds

| If                                                | Run / Read                                                                                                       | Stop condition                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Нужен стартовый коридор                           | [`../QUICK.md`](../QUICK.md:1)                                                                                   | Маршрут задачи определён                                 |
| Нужен design-discovery before protocol            | [`brainstorm-design.md`](brainstorm-design.md:1)                                                                 | Есть `approved design summary` или `needs-clarification` |
| Нужен patch-first для micro-change                | [`quick-fix.md`](quick-fix.md:1)                                                                                 | Готов patch-first ответ                                  |
| Нужен быстрый triage / diagnostic path            | [`quick-diagnosis.md`](quick-diagnosis.md:1)                                                                     | Выбран корректный следующий workflow                     |
| Нужен retrieval-first research path               | [`research-retrieval.md`](research-retrieval.md:1)                                                               | Findings staged/promoted correctly                       |
| Нужен planner/executor для tool-heavy задачи      | [`planner-executor.md`](planner-executor.md:1)                                                                   | Есть planner contract и executor path                    |
| Нужен протокол для trivial repo change            | [`../rules/task-classification.md`](../rules/task-classification.md:1) -> [`protocol-new.md`](protocol-new.md:1) | Минимальный протокол готов                               |
| Нужен протокол для standard/long task             | [`protocol-new.md`](protocol-new.md:1)                                                                           | Полный протокол готов                                    |
| Нужна координация нескольких шагов/агентов        | [`agent-orchestration.md`](agent-orchestration.md:1)                                                             | Handoff plan готов                                       |
| Есть сырые заметки или входящий research-контекст | [`notes-inbox-processing.md`](notes-inbox-processing.md:1)                                                       | `INBOX` разобран и нужные знания перенесены              |
| Изменение может быть high-blast-radius            | [`risk-tier-review.md`](risk-tier-review.md:1)                                                                   | Risk tier зафиксирован                                   |
| Перед commit/push/deploy/start нужен safety check | [`pre-action-check.md`](pre-action-check.md:1)                                                                   | Есть go/no-go решение                                    |

## Workflow menu

| Need                                          | Run                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| FAST PATH: быстрая правка / микро-рефакторинг | `/quick-fix.md`                                                        |
| Быстрая диагностика / triage                  | `/quick-diagnosis.md`                                                  |
| Brainstorm / design discovery before protocol | `/brainstorm-design.md`                                                |
| Классифицировать trivial vs non-trivial       | [`../rules/task-classification.md`](../rules/task-classification.md:1) |
| Новый протокол                                | `/protocol-new.md`                                                     |
| Продолжить протокол                           | `/protocol-resume.md`                                                  |
| Ревью, merge, закрытие                        | `/protocol-review-merge.md`                                            |
| Retrieval-first research                      | `/research-retrieval.md`                                               |
| Planner/executor split                        | `/planner-executor.md`                                                 |
| Риск-ориентированный review                   | `/risk-tier-review.md`                                                 |
| Agent evaluation lifecycle                    | `/agent-evaluation-lifecycle.md`                                       |
| Workflow eval scenarios                       | `/workflow-evals.md`                                                   |
| Инцидент / hotfix                             | `/hotfix-emergency.md`                                                 |
| Recovery (после ошибок процесса/гейтов)       | `/failure-recovery.md`                                                 |
| Quality gates enforcement (CI/PR templates)   | `/quality-enforcement.md`                                              |
| Подключить pack к проекту                     | `/project-setup.md`                                                    |
| Глобальная установка pack                     | `/global-install.md`                                                   |
| Оркестрация multi-agent                       | `/agent-orchestration.md`                                              |
| Разобрать `.notes/INBOX`                      | `/notes-inbox-processing.md`                                           |
| Pre-action check перед рискованным действием  | `/pre-action-check.md`                                                 |

## Gate menu

| Output                                           | Apply                                                           | Source                                                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Код или тестируемое поведение                    | Coverage/lint/TDD по SoT                                        | [`quality-gates.md`](../rules/quality-gates.md:1), [`testing-rules.md`](../rules/testing-rules.md:1)                                                     |
| Docs-only change                                 | Self-check ссылок, thin-wrapper discipline, evidence discipline | [`docs-standards.md`](../rules/docs-standards.md:1), [`evidence-rules.md`](../rules/evidence-rules.md:1)                                                 |
| Research / promoted knowledge                    | retrieval discipline + memory write policy                      | [`research-retrieval.md`](research-retrieval.md:1), [`memory-write-policy.md`](../rules/memory-write-policy.md:1)                                        |
| Review close-out                                 | feedback triage + fresh verification                            | [`review-feedback-policy.md`](../rules/review-feedback-policy.md:1), [`verification-before-completion.md`](../rules/verification-before-completion.md:1) |
| Critical/security-sensitive change               | risk-tier review + security sanity + explicit verification note | [`risk-tier-review.md`](risk-tier-review.md:1), [`protocol-review-merge.md`](protocol-review-merge.md:1)                                                 |
| Commit/push/deploy/start/external-service action | Pre-action check + secret hygiene + target sanity               | [`pre-action-check.md`](pre-action-check.md:1), [`security-rules.md`](../rules/security-rules.md:1)                                                      |
| Workflow-pack change                             | doc-eval route and lifecycle checks                             | [`agent-evaluation-lifecycle.md`](agent-evaluation-lifecycle.md:1), [`workflow-evals.md`](workflow-evals.md:1)                                           |

## References

| Topic        | Link                                                          |
| ------------ | ------------------------------------------------------------- |
| Entry points | [`AGENTS.md`](../../AGENTS.md:1), [`QUICK.md`](../QUICK.md:1) |
| Rules index  | [`rules/index.md`](../rules/index.md:1)                       |
| System map   | [`system-map.md`](../system-map.md:1)                         |
