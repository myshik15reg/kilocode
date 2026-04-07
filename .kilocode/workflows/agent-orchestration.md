# Workflow: agent-orchestration

## Goal

Организовать multi-step работу так, чтобы:

1. каждая подзадача выполнялась подходящим specialist mode;
2. handoff был самодостаточным и проверяемым;
3. subagents использовались только там, где это оправдано;
4. при сбоях был явный degraded mode;
5. результаты собирались через `Result Contract`, а не через свободный пересказ.

Связанные документы: [`../rules/agent-routing.md`](../rules/agent-routing.md:1), [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1), [`../patterns/orchestration/result-contract.md`](../patterns/orchestration/result-contract.md:1), [`planner-executor.md`](planner-executor.md:1), [`risk-tier-review.md`](risk-tier-review.md:1).

## When to use

Используй workflow, когда:

1. задача включает несколько фаз или доменов;
2. нужна разная экспертиза;
3. возможны независимые подзадачи;
4. change может иметь высокий blast radius.

Не используй для:

1. тривиального фиксa в одном файле;
2. docs-only micro-change;
3. задач, где handoff нельзя сделать самодостаточным.

## Orchestrator contract

`orchestrator` MUST:

1. классифицировать задачу и выбрать route;
2. определить, нужна ли оркестрация вообще;
3. зафиксировать dependencies, parallel groups, `ready_frontier` и degraded mode;
4. собрать structured results и выбрать next action.

`orchestrator` MUST NOT:

1. делать содержательную аналитику требований/кода/архитектуры;
2. писать код;
3. запускать tool-heavy execution loop сам, если нужен planner/executor split.

## Subagent activation matrix

| Situation                                           | Use subagents? | Why                                    |
| --------------------------------------------------- | -------------- | -------------------------------------- |
| 2-4 независимых подзадачи с разной экспертизой      | yes            | оправдан параллелизм                   |
| Один локальный фикс                                 | no             | overhead больше пользы                 |
| Docs-only micro-change                              | no             | достаточно одного specialist/architect |
| Handoff нельзя сделать самодостаточным              | no             | высокий риск неверного исполнения      |
| Общий write scope у двух задач                      | no             | сначала split ownership или sequential |
| Нет явного `ready_frontier` для параллельной работы | no             | parallel route не считается безопасным |
| Read-only analysis и review в разных областях       | yes            | безопасный параллелизм                 |

## Execution policy

1. Read-only роли SHOULD идти первыми.
2. На каждый write-step MUST быть один owner.
3. Если задача tool-heavy, SHOULD использоваться [`planner-executor.md`](planner-executor.md:1).
4. Parallel execution MUST ограничиваться только задачами из текущего `ready_frontier`.
5. Если `ready_frontier` нельзя назвать явно, orchestration MUST деградировать в sequential path.
6. Каждый specialist SHOULD возвращать `Result Contract`.
7. Synthesis MUST строиться по structured outputs, не по guessing over chat history.

## Degraded mode

Fallback order MUST be:

1. parallel subagents;
2. sequential specialists;
3. role-loop in one agent.

Use degraded mode when:

1. subagents unavailable;
2. tooling limited;
3. one branch blocked the rest;
4. handoff quality insufficient for safe parallelism.

## Handoff checklist

1. Goal measurable.
2. Inputs minimal but sufficient.
3. Owner of writes explicit.
4. Dependencies and `ready_frontier` explicit for any parallel path.
5. Out-of-scope explicit.
6. Result contract named.

## Structural review checks

Перед закрытием orchestration path reviewer/orchestrator SHOULD проверить:

1. reuse vs reinvention;
2. subsystem overbuild;
3. missing stop conditions;
4. wrong agent split, conflicting ownership, or parallelism without `ready_frontier`;
5. unsupported memory writes.

## Steps

|   # | Step                                     | INPUT                  | OUTPUT                                           | VERIFY                                      |
| --: | ---------------------------------------- | ---------------------- | ------------------------------------------------ | ------------------------------------------- |
|   1 | Decide whether orchestration is needed   | task + scope           | yes/no decision                                  | trivial/docs-only tasks stay simple         |
|   2 | Classify risk and route                  | task + touched surface | risk tier + selected modes                       | routing follows SoT                         |
|   3 | Decompose and assign ownership           | protocol + task        | subtasks, dependencies, `ready_frontier`, owners | no write conflicts                          |
|   4 | Choose parallel/sequential/degraded path | subtask graph          | orchestration path                               | path explicit, justified, and frontier-safe |
|   5 | Delegate with strict handoff             | subtask packet         | specialist tasks                                 | handoff uses required fields                |
|   6 | Collect structured results               | specialist outputs     | synthesized state                                | result contract respected                   |
|   7 | Close or escalate                        | synthesized state      | next step / done                                 | stop condition explicit                     |
