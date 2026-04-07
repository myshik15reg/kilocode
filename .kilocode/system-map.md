# AlfaFlowAI system map (workflow-pack)

Назначение: объяснить, из каких компонентов состоит pack, где entrypoints, какие документы являются Source of Truth (SoT), и как они связаны с процессами.

Нормативная рамка: [`docs-standards.md`](rules/docs-standards.md:1).

## 1) Entry points

| Audience | Entry point                                      | Purpose                                      |
| -------- | ------------------------------------------------ | -------------------------------------------- |
| Agent    | [`AGENTS.md`](../AGENTS.md:1)                    | Манифест: corridor, non-negotiables, handoff |
| Agent    | [`QUICK.md`](QUICK.md:1)                         | Level 0: минимальные правила                 |
| Agent    | [`memory-bank/index.md`](memory-bank/index.md:1) | Project context (SoT)                        |
| Agent    | [`quickref.md`](workflows/quickref.md:1)         | Меню workflows                               |

## 2) Directory roles

| Path                     | Role                                                              | Portability                  |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------- |
| `.kilocode/`             | workflow-pack docs, rules, patterns, skills, workflows, templates | переносимо                   |
| `.kilocode/memory-bank/` | consuming project context (template)                              | переносимо                   |
| `.kilocode/rules/`       | rules + thin wrappers                                             | переносимо                   |
| `.kilocode/workflows/`   | executable workflows (`/file.md`)                                 | переносимо                   |
| `.kilocode/patterns/`    | patterns (SoT practices)                                          | переносимо                   |
| `.kilocode/skills/`      | skills (SoT instructions in `SKILL.md`)                           | переносимо                   |
| `.kilocode/templates/`   | templates for consuming projects                                  | переносимо                   |
| `.kilocode/evidence/`    | stable evidence (audits/scans)                                    | переносимо                   |
| `.notes/`                | staging area for raw notes and thematic summaries                 | local working layer, NOT SoT |
| `.protocols/`            | task workspaces and task-local trace                              | MUST NOT be treated as SoT   |
| `temp/`                  | scratch space                                                     | MUST NOT be treated as SoT   |

## 3) Source of Truth map

| Topic                          | SoT                                                                              | Notes                                                    |
| ------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Terminology                    | [`terminology.md`](rules/terminology.md:1)                                       | единый словарь                                           |
| Evidence                       | [`evidence-rules.md`](rules/evidence-rules.md:1)                                 | facts vs assumptions                                     |
| Docs standards                 | [`docs-standards.md`](rules/docs-standards.md:1)                                 | структура и дедупликация                                 |
| Workflow prompt contracts      | [`workflow-prompt-writing.md`](rules/workflow-prompt-writing.md:1)               | execution contract over role-play                        |
| Handoff protocol               | [`context-handoff.md`](patterns/orchestration/context-handoff.md:1)              | strict template                                          |
| Result contract                | [`result-contract.md`](patterns/orchestration/result-contract.md:1)              | structured agent outputs                                 |
| Mode selection                 | [`mode-selection/SKILL.md`](skills/mode-selection/SKILL.md:1)                    | specialist-first                                         |
| Orchestrator routing           | [`agent-routing.md`](rules/agent-routing.md:1)                                   | zero-analytics                                           |
| Review feedback handling       | [`review-feedback-policy.md`](rules/review-feedback-policy.md:1)                 | explicit triage and disposition                          |
| Verification before completion | [`verification-before-completion.md`](rules/verification-before-completion.md:1) | fresh verification required                              |
| Memory write policy            | [`memory-write-policy.md`](rules/memory-write-policy.md:1)                       | curated writes only                                      |
| Scripts entrypoints            | [`scripts-entrypoints.md`](workflows/scripts-entrypoints.md:1)                   | embedded vs global vs consuming                          |
| Raw notes intake               | [`../.notes/README.md`](../.notes/README.md:1)                                   | staging only; promote durable material into `.kilocode/` |

## 4) Canonical delivery flows

| Flow                             | Handoff chain                                                                                                                       | Entry workflow                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Ambiguous / design-heavy request | `architect -> approved design summary -> protocol -> specialist chain`                                                              | [`workflows/brainstorm-design.md`](workflows/brainstorm-design.md:1) -> [`workflows/protocol-new.md`](workflows/protocol-new.md:1) |
| Feature/change                   | `architect -> *-dev/code -> unit-tester -> reviewer -> architect`                                                                   | [`workflows/protocol-new.md`](workflows/protocol-new.md:1)                                                                         |
| Bug fix                          | `debug -> code-fixer -> unit-tester -> reviewer`                                                                                    | [`workflows/hotfix-emergency.md`](workflows/hotfix-emergency.md:1) or [`workflows/protocol-new.md`](workflows/protocol-new.md:1)   |
| Research / retrieval             | `planning-research-* -> notes/evidence promotion -> architect`                                                                      | [`workflows/research-retrieval.md`](workflows/research-retrieval.md:1)                                                             |
| Tool-heavy execution             | `planner -> executor -> reviewer/orchestrator`                                                                                      | [`workflows/planner-executor.md`](workflows/planner-executor.md:1)                                                                 |
| 1C                               | `1c-orchestrator -> 1c-business-analyst -> 1c-system-analyst -> 1c-architect -> 1c-developer -> 1c-tester -> 1c-quality-specialist` | [`workflows/1c-testing-workflow.md`](workflows/1c-testing-workflow.md:1)                                                           |

## 5) Invariants

| Invariant                   | Meaning                                                                            | Source                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Protocol-first              | repo changes require protocol                                                      | [`workflows/protocol-new.md`](workflows/protocol-new.md:1)                             |
| Quality gates               | coverage 100%, lint 0/0, TDD                                                       | [`rules/quality-gates.md`](rules/quality-gates.md:1)                                   |
| Evidence discipline         | no unsourced facts, assumptions explicit                                           | [`rules/evidence-rules.md`](rules/evidence-rules.md:1)                                 |
| Prompts are contracts       | prompts/workflows describe execution, not persona role-play                        | [`rules/workflow-prompt-writing.md`](rules/workflow-prompt-writing.md:1)               |
| Review comments are triaged | review feedback is assessed, not blindly accepted                                  | [`rules/review-feedback-policy.md`](rules/review-feedback-policy.md:1)                 |
| Fresh verification          | completion claims require verification for the current state                       | [`rules/verification-before-completion.md`](rules/verification-before-completion.md:1) |
| Memory is curated           | `.notes` and `.protocols` stage information; only stable truth goes to Memory Bank | [`rules/memory-write-policy.md`](rules/memory-write-policy.md:1)                       |
| Notes are not SoT           | `.notes/` may inform work but MUST be promoted before becoming canonical           | [`../.notes/README.md`](../.notes/README.md:1)                                         |
