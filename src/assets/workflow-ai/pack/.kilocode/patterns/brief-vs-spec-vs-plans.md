# Brief vs Spec vs Plans vs Memory Bank

Purpose: keep artifact boundaries simple and predictable.

## Quick split

| Artifact      | Main question                                      | Minimum content                         |
| ------------- | -------------------------------------------------- | --------------------------------------- |
| `brief`       | what are we trying to achieve?                     | goal, DoD, AC, constraints              |
| `Spec`        | what should the system look like after the change? | target behavior, interfaces, boundaries |
| `Plans`       | how will we deliver it?                            | ordered steps, verification, sequencing |
| `Memory Bank` | what durable context should future tasks remember? | long-lived project facts                |

## Transition rules

1. Start with `brief`.
2. If the brief is noisy, refine it before planning.
3. Generate `Spec` from the approved brief when target-state clarity is needed.
4. Generate `Plans` from the approved brief and `Spec` when implementation needs sequencing.
5. Promote only durable lessons into Memory Bank after verification.

## Minimal templates

### `brief`

- Goal
- Definition of Done
- Acceptance Criteria
- Constraints

### `Spec`

- Intended behavior or target state
- Main boundaries and interfaces
- Important decisions and exclusions

### `Plans`

- Ordered steps
- Verify points
- Dependencies and handoffs

### `Memory Bank`

- Product context
- Architecture context
- Technical conventions
- Current durable focus

## Anti-patterns

- using chat history as the task contract
- storing task-local plans in Memory Bank
- turning `Spec` into a task log
- turning `Plans` into a second copy of the `Spec`
