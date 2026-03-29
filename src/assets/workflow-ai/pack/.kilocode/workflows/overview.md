# Overview

Purpose: show the main operating loop of the workflow pack without duplicating detailed rules.

## Base loop for non-trivial work

| Step | Outcome                               | Source                                                                                                                                                 |
| ---: | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    1 | startup context loaded                | [`../../AGENTS.md`](../../AGENTS.md:1), [`../QUICK.md`](../QUICK.md:1), [`../memory-bank/index.md`](../memory-bank/index.md:1)                         |
|    2 | Memory Bank confirmed                 | `[MB: OK]` after reading workspace context                                                                                                             |
|    3 | focused context prepared              | [`context-priming.md`](context-priming.md:1)                                                                                                           |
|    4 | task contract cleaned                 | [`brief-refinement.md`](brief-refinement.md:1)                                                                                                         |
|    5 | protocol created if repo changes      | [`protocol-new.md`](protocol-new.md:1)                                                                                                                 |
|    6 | `Spec` and `Plans` shaped when needed | [`spec-plans-generation.md`](spec-plans-generation.md:1)                                                                                               |
|    7 | mode selected                         | [`../skills/mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)                                                                             |
|    8 | focused execution or delegation       | [`agent-orchestration.md`](agent-orchestration.md:1), [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1) |
|    9 | durable context updated if needed     | [`update-memory-bank.md`](update-memory-bank.md:1)                                                                                                     |
|   10 | verification and closure              | [`protocol-review-merge.md`](protocol-review-merge.md:1)                                                                                               |

## Operating principles

1. Prefer specialist-first routing.
2. Keep context minimal and source-backed.
3. Treat a cleaned `brief` as the task contract.
4. Treat protocols as temporary task workspaces.
5. Move durable project knowledge into stable paths when needed.
6. Keep workflow docs short and point to source-of-truth files.

## Start points

- Fast operational menu: [`quickref.md`](quickref.md:1)
- Workflow library: [`index.md`](index.md:1)
- Rules index: [`../rules/index.md`](../rules/index.md:1)
