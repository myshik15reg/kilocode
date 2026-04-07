# Workflow: planner-executor

## Goal

Разделить tool-heavy или retrieval-heavy задачу на два разных контракта:

1. `planner` определяет шаги, порядок, stop conditions и expected outputs;
2. `executor` выполняет только утверждённые шаги и возвращает результат по [`result-contract.md`](../patterns/orchestration/result-contract.md:1).

## When to use

Используй workflow, когда:

1. задача требует нескольких tool/MCP/web шагов;
2. есть риск раздувания контекста или хаотичного tool-calling;
3. нужно чётко разделить планирование и исполнение;
4. нужен degraded mode при ограничениях subagents/tools.

## Planner contract

Planner MUST вернуть:

1. goal;
2. ordered steps;
3. inputs for each step;
4. dependencies for each step;
5. parallel groups when safe parallelism exists;
6. current `ready_frontier`;
7. stop condition;
8. expected output for each step;
9. `degradation_trigger` and fallback path if a step fails.

## Executor contract

Executor MUST:

1. не перепридумывать план без явного blocking reason;
2. выполнять только текущий утверждённый шаг или шаги из текущего `ready_frontier`;
3. после выполнения явно фиксировать, какие зависимости закрыты и что unlocked next;
4. возвращать `Result Contract`;
5. явно фиксировать `status`, если не может завершить шаг.

## Steps

|   # | Step                          | INPUT                      | OUTPUT                                        | VERIFY                                                                   |
| --: | ----------------------------- | -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
|   1 | Plan the run                  | task + sources             | ordered plan with dependencies and frontier   | plan has steps, dependencies, `ready_frontier`, stop condition, fallback |
|   2 | Lock execution scope          | plan                       | execution boundary + initial `ready_frontier` | scope and out-of-scope explicit                                          |
|   3 | Execute frontier step-by-step | locked plan                | step results + frontier updates               | each step returns result contract and unlocks next frontier explicitly   |
|   4 | Degrade if needed             | failed/limited step        | fallback path                                 | fallback order explicit and `degradation_trigger` named                  |
|   5 | Synthesize                    | planner + executor outputs | final summary                                 | synthesis uses structured outputs, not free-text guesswork               |

## Degraded mode

Fallback order MUST be:

1. parallel subagents;
2. sequential specialists;
3. role-loop in one agent.

## Notes

1. Planner/Executor split дополняет specialist-first routing, а не заменяет его.
2. Для research-heavy задач используй вместе с [`research-retrieval.md`](research-retrieval.md:1).
3. Если planner не может безопасно сформулировать `ready_frontier`, execution MUST деградировать в последовательный path.
