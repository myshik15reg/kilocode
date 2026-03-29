# Workflow: protocol-new

## Goal

Create a protocol as the temporary workspace for one task.
The protocol keeps requirements, plan, evidence, and decisions traceable.

Use a cleaned task contract before broad planning or delegation.
If the task request is still noisy, run [`brief-refinement.md`](brief-refinement.md:1) first.

## Output

| Path | Purpose |
|---|---|
| `.protocols/YYYY-MM-DD-name/brief.md` | goal, scope, DoD, acceptance criteria, constraints |
| `.protocols/YYYY-MM-DD-name/plan.md` | ordered steps with verification |
| `.protocols/YYYY-MM-DD-name/execution.md` | optional log for notable decisions and progress |
| `.protocols/YYYY-MM-DD-name/artifacts/` | temporary or task-local artifacts |

## Steps

| # | Step | Outcome |
|---:|---|---|
| 1 | Classify the task | clear protocol slug and task boundary |
| 2 | Create the folder | protocol scaffold exists |
| 3 | Write `brief.md` | goal, scope, DoD, AC, constraints are explicit |
| 4 | Write `plan.md` | steps include inputs, outputs, and verification |
| 5 | Prepare delegation if needed | specialist receives a proper handoff |

## Rules

1. Any repo-changing task must create a protocol before implementation.
2. Keep the protocol task-specific; do not turn it into a generic knowledge base.
3. Durable outcomes must be moved to stable source-of-truth or evidence paths before the protocol is removed.
4. Delegation must follow [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Next step

1. If needed, rewrite `brief.md` using [`brief-refinement.md`](brief-refinement.md:1).
2. If target-state and execution sequencing need to be explicit, run [`spec-plans-generation.md`](spec-plans-generation.md:1).

## References

- Planning rules: [`../rules-architect/planning.md`](../rules-architect/planning.md:1)
- Terminology: [`../rules/terminology.md`](../rules/terminology.md:1)
- Artifact storage: [`../rules/artifacts-and-storage.md`](../rules/artifacts-and-storage.md:1)
- Quality gates: [`../rules/quality-gates.md`](../rules/quality-gates.md:1)
