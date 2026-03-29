# Workflow: context-priming

## Goal

Prepare only the context needed for safe planning, delegation, or implementation.
The workflow exists to improve autonomy without wasting tokens.

## When to use

- before any non-trivial task
- before delegating through `new_task`
- when the agent has lost the project picture
- when task scope is broad but only part of the repo matters

## Process

### 1. Read the minimum startup corridor

1. Read [`../../AGENTS.md`](../../AGENTS.md:1).
2. Read [`../QUICK.md`](../QUICK.md:1).
3. Read [`../memory-bank/index.md`](../memory-bank/index.md:1).
4. Confirm Memory Bank with `[MB: OK]`.

### 2. Narrow the target

Write down three things before reading more:

- `AREA` - subsystem or topic touched by the task
- `CHANGE` - what behavior, text, or structure must change
- `RISK` - what may break if the understanding is wrong

### 3. Load context lazily

Read only what is needed:

- `context.md` for current focus
- `architecture.md` for durable structure
- `tech.md` for tooling or script behavior
- the smallest set of repo files that explains the task

Prefer indexes, registries, and entrypoints before deep references.

### 4. Produce a compact capsule

For complex work, create a short context capsule in the protocol or embed it into the handoff.
Use [`../patterns/orchestration/context-capsule.md`](../patterns/orchestration/context-capsule.md:1).

Minimum capsule fields:

- task goal
- key files to inspect
- constraints and boundaries
- main risks
- verification plan

### 5. Move to a clean brief

After context is warm and focused:

1. rewrite the task into a clean `brief`
2. remove chat noise and rejected ideas
3. treat the rewritten brief as the next source of truth

Use [`brief-refinement.md`](brief-refinement.md:1).

## Fallback if Memory Bank is missing

1. Initialize or repair minimal Memory Bank files in the consuming workspace.
2. Keep them concise and project-specific.
3. Use [`init-memory-bank.md`](init-memory-bank.md:1) if the workspace Memory Bank needs setup guidance.
4. Then resume the normal startup corridor and confirm `[MB: OK]`.

## Anti-waste rules

1. Do not recursively read the whole repo by default.
2. Do not load domain references unless the task clearly needs them.
3. Stop reading when the next safe action is clear.
4. Prefer summaries and source-of-truth docs over duplicated narrative files.
