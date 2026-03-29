# Brief / Spec / Plans / Memory Bank

Purpose: define the artifact boundary for non-trivial work.

## Core rules

1. Do not treat a long chat session as the source of truth.
2. Rewrite the task into a clean `brief` before broad planning or delegation.
3. Keep `brief`, `Spec`, `Plans`, and `Memory Bank` distinct.
4. Promote only durable project knowledge back into Memory Bank.

## Artifact roles

| Artifact | Role |
|---|---|
| `brief` | task contract: goal, DoD, AC, constraints |
| `Spec` | target-state description of the intended change |
| `Plans` | implementation blueprint and execution order |
| `Memory Bank` | durable project context for future tasks |

## Required discipline

1. If the brief is noisy, run [`../workflows/brief-refinement.md`](../workflows/brief-refinement.md:1).
2. If execution requires explicit target-state and implementation artifacts, run [`../workflows/spec-plans-generation.md`](../workflows/spec-plans-generation.md:1).
3. Do not archive protocol-local steps, rejected ideas, or raw chat logs into Memory Bank.
4. Before closing a protocol, update Memory Bank only if product, architecture, or technical context changed durably.

## Related sources

- Memory Bank usage: [`memory-bank-instructions.md`](memory-bank-instructions.md:1)
- Workflow split: [`../patterns/brief-vs-spec-vs-plans.md`](../patterns/brief-vs-spec-vs-plans.md:1)
- Protocol flow: [`../workflows/protocol-new.md`](../workflows/protocol-new.md:1)

