# Workflow: spec-plans-generation

## Goal

Turn an approved `brief` into a clear target-state `Spec` and implementation-oriented `Plans` without mixing either of them into Memory Bank or raw protocol chatter.

## When to use

- after [`brief-refinement.md`](brief-refinement.md:1)
- before multi-step implementation or orchestration
- when a task is large enough to benefit from explicit target-state and execution artifacts

## Artifact split

- `brief` = task entry and contract
- `Spec` = target-state description of the intended system or change
- `Plans` = implementation blueprints and execution order
- `Memory Bank` = durable project context only

Reference: [`../patterns/brief-vs-spec-vs-plans.md`](../patterns/brief-vs-spec-vs-plans.md:1).

## Process

### 1. Start from the approved brief

Read the cleaned `brief` and confirm:

- goal is stable
- constraints are explicit
- acceptance criteria are good enough to shape design and execution

If not, return to [`brief-refinement.md`](brief-refinement.md:1).

### 2. Generate `Spec`

`Spec` should describe the intended end state, for example:

- behavior to add or change
- main subsystem boundaries
- important interfaces, inputs, outputs, or data shape
- acceptance-relevant technical decisions
- known exclusions

`Spec` should not become a task log or step-by-step checklist.

### 3. Generate `Plans`

`Plans` should describe how the change will be delivered, for example:

- feature slices or work packages
- ordered steps
- verification points
- dependencies and sequencing
- handoff boundaries for specialists

`Plans` should not redefine the target state already captured by `Spec`.

### 4. Prepare orchestration-safe outputs

If multiple specialists are needed:

1. keep `Spec` as the stable technical target
2. split `Plans` into delegation-sized chunks
3. pass only the relevant slice through [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1)

### 5. Protect Memory Bank boundaries

Do not write task-local `Spec` or `Plans` into Memory Bank.
Only promote durable project knowledge after implementation and verification.

## Output

- a stable `Spec` draft or document
- an implementation `Plans` draft or document
- a clear boundary between target state, execution plan, and durable context

## Next step

- execute directly if one specialist can handle the work
- use [`agent-orchestration.md`](agent-orchestration.md:1) if the plan must be delegated across modes
- after verified changes, update durable context using [`update-memory-bank.md`](update-memory-bank.md:1)

