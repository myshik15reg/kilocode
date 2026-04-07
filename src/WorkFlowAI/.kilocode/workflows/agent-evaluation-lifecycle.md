# Workflow: agent-evaluation-lifecycle

## Goal

Проверять не только кодовые изменения, но и качество самого workflow-pack: routing, contracts, retrieval discipline, degraded mode и reproducibility.

## Lifecycle

| Stage                                                     | Output                                     |
| --------------------------------------------------------- | ------------------------------------------ |
| Define representative scenarios                           | stable eval set                            |
| Run scenarios against current docs                        | traces / observations                      |
| Compare against expected route, bridge skill, and outputs | regressions / gaps                         |
| Review failures                                           | actionable fixes                           |
| Re-run after updates                                      | confidence that docs still route correctly |

## Required artifacts

1. scenario list from [`workflow-evals.md`](workflow-evals.md:1);
2. expected mode and workflow entry for each scenario;
3. expected bridge skill when a `skills-sh-*` overlay should trigger;
4. expected contract fields when the scenario exercises retrieval/frontier/integration typing;
5. observed route / artifacts;
6. failure notes and next actions;
7. local-override note when a narrower local skill should win instead of a bridge skill.

## Steps

|   # | Step                                 | INPUT                                     | OUTPUT                 | VERIFY                                                      |
| --: | ------------------------------------ | ----------------------------------------- | ---------------------- | ----------------------------------------------------------- |
|   1 | Select scenario set                  | workflow-evals                            | chosen eval batch      | covers key workflow paths                                   |
|   2 | Run doc-eval by inspection/use       | current SoT                               | observed route/results | route can be followed without guesswork                     |
|   3 | Check contract-specific fields       | expected route + expected contract fields | contract notes         | retrieval/frontier/integration fields appear where required |
|   4 | Check bridge overlays and precedence | expected route + observed route           | conflict notes         | narrower local skill still wins when required               |
|   5 | Record mismatches                    | expected vs observed                      | regression notes       | each mismatch has file-level cause                          |
|   6 | Update docs                          | regression notes                          | improved SoT           | issues resolved or deferred explicitly                      |
|   7 | Re-check                             | updated docs                              | confirmation           | no ambiguous route for tested scenarios                     |

## Notes

1. Это doc/process eval, не model benchmark.
2. Bridge skills are secondary guidance layers; they do not replace local workflows, rules, or narrower skills.
3. Infrastructure for traces MAY exist later, but core workflow-pack MUST define the process now.
