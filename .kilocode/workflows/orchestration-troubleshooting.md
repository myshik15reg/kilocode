# Workflow: orchestration-troubleshooting

Назначение: быстрые действия, когда цепочка режимов/подзадач работает нестабильно.

## Symptom -> action

| Symptom                                | First action                      | Fallback                                 |
| -------------------------------------- | --------------------------------- | ---------------------------------------- |
| wrong mode selected                    | re-read routing + protocol        | re-delegate with narrower specialist     |
| handoff too vague                      | shrink scope and inputs           | rebuild handoff from template            |
| subtask hangs or tools fail            | mark `tool-limited`               | degraded mode                            |
| result came back but cannot be trusted | mark `uncertain` or `no-evidence` | retry narrower or escalate review        |
| conflicting outputs                    | mark `conflict`                   | orchestrator chooses one path explicitly |
| orchestration itself too heavy         | collapse to sequential            | role-loop in one agent                   |

## Recovery loop

1. Убедись, что есть протокол `.protocols/YYYY-MM-DD-name/`.
2. Перечитай `brief.md` и `plan.md` и зафиксируй текущий next step одним предложением.
3. Определи `status` проблемного шага по [`result-contract.md`](../patterns/orchestration/result-contract.md:1).
4. Выбери recovery path:
    - `blocked` -> one blocking question or safe stop;
    - `uncertain` -> narrow retry or reviewer;
    - `inconclusive` / `no-evidence` -> retrieval-first research;
    - `tool-limited` -> degraded mode;
    - `conflict` -> explicit orchestrator decision.
5. Зафиксируй recovery decision в `.protocols/.../execution.md`.

## Degraded mode

Если параллельная схема не держится, переходи строго по порядку:

1. parallel subagents;
2. sequential specialists;
3. role-loop in one agent.

## Related paths

- Planner/executor overload: [`planner-executor.md`](planner-executor.md:1)
- Retrieval gaps: [`research-retrieval.md`](research-retrieval.md:1)
- High-risk closure: [`risk-tier-review.md`](risk-tier-review.md:1)
