# Workflow: research-retrieval

## Goal

Провести retrieval-first исследование без шумового context dump: ограничить scope, разложить вопрос на под-вопросы, выбрать источники по tier, извлечь только релевантные фрагменты, отрезать distractors, собрать ранжированный evidence package, а затем продвинуть подтверждённые выводы в устойчивые артефакты.

Связанные документы: [`../rules/evidence-rules.md`](../rules/evidence-rules.md:1), [`../rules/memory-write-policy.md`](../rules/memory-write-policy.md:1), [`../patterns/orchestration/result-contract.md`](../patterns/orchestration/result-contract.md:1), [`../../.notes/README.md`](../../.notes/README.md:1), [`notes-inbox-processing.md`](notes-inbox-processing.md:1).

## Source tiers

| Tier | Source type                               | Default use                     |
| ---- | ----------------------------------------- | ------------------------------- |
| 1    | repo SoT (`.kilocode`, stable docs, code) | always first for local facts    |
| 2    | protocol artifacts / stable evidence      | task-specific proof             |
| 3    | official docs / primary sources           | external factual grounding      |
| 4    | secondary sources / articles              | synthesis, heuristics, examples |

## Steps

|   # | Step                    | INPUT                        | OUTPUT                                                      | VERIFY                                                                |
| --: | ----------------------- | ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
|   1 | Scope question          | user request / research goal | scoped brief with evidence target and boundaries            | scope is bounded enough for targeted retrieval                        |
|   2 | Decompose question      | scoped brief                 | sub-questions                                               | each sub-question observable                                          |
|   3 | Rank sources            | sub-questions                | source plan by tier                                         | primary sources preferred for factual claims                          |
|   4 | Retrieve minimally      | source plan                  | candidate evidence notes                                    | only relevant fragments captured                                      |
|   5 | Prune and compress      | candidate evidence notes     | ranked evidence package + discarded refs + gaps             | distractors removed and residue compressed                            |
|   6 | Stage and report        | ranked evidence package      | `.notes/*.md` or protocol artifacts + retrieval report      | staging area used, retrieval output is not treated as final synthesis |
|   7 | Promote durable outputs | confirmed findings           | `.kilocode/evidence/` / `.kilocode/sources/` / updated docs | promotion follows memory/write policy                                 |

## Guardrails

1. MUST NOT dump entire retrieved context into one giant prompt.
2. MUST distinguish facts, interpretations and hypotheses.
3. MUST keep raw notes in `.notes` or protocol artifacts until promotion decision is made.
4. SHOULD prefer compact evidence over long narrative summary.
5. После каждой retrieval-итерации MUST выполняться pruning: удалить distractors, дедуплицировать refs, сжать остаток.
6. Retrieval role MUST возвращать ranked evidence package, gaps и discarded refs вместо немедленного collapse в финальный ответ.
7. Если исследование кормит другой workflow или роль, synthesis SHOULD выполняться отдельным шагом/handoff.

## Delegated retrieval output

Когда retrieval делегирован отдельному agent/subagent, результат SHOULD возвращаться по [`result-contract.md`](../patterns/orchestration/result-contract.md:1) с optional fields:

1. `ranked_evidence_refs`
2. `evidence_quotes`
3. `retrieval_gaps`
4. `discarded_refs`

## Promotion rules

| If output is                                                  | Promote to                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| ranked evidence package awaiting synthesis/promotion decision | `.notes/` or `.protocols/.../artifacts/`                            |
| durable factual reference                                     | `.kilocode/evidence/` or `.kilocode/sources/`                       |
| reusable workflow guidance                                    | `.kilocode/workflows/` / `.kilocode/rules/` / `.kilocode/patterns/` |
| temporary investigation note                                  | `.notes/` or `.protocols/.../artifacts/`                            |
