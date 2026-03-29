# Workflow: brief-refinement

## Goal

Turn a raw task request into a clean, reusable `brief` that can safely drive protocol work, spec shaping, planning, and delegation.

## When to use

- after [`context-priming.md`](context-priming.md:1) for any non-trivial task
- before creating or rewriting protocol `brief.md`
- before broad orchestration across multiple specialists
- when the current chat contains too much noise, drift, or conflicting ideas

## Core rule

Do not treat a long chat session as the source of truth.
Rewrite the task into a clean `brief` that keeps only approved intent, constraints, and acceptance criteria.

Reference: [`../rules/brief-spec-memory-bank.md`](../rules/brief-spec-memory-bank.md:1).

## Process

### 1. Start from a focused context

1. Run [`context-priming.md`](context-priming.md:1).
2. Confirm the target area, change, and main risk.
3. Gather only the smallest set of facts needed to understand the request.

### 2. Extract the stable task signal

Capture the parts that should survive session resets:

- goal
- user-visible outcome or measurable result
- constraints and boundaries
- non-goals
- risks and open questions

Drop or quarantine:

- temporary brainstorming noise
- rejected ideas
- speculative implementation details
- repeated chat history

### 3. Rewrite the brief

Produce or update protocol `brief.md` so it is usable without the original chat.

Minimum fields:

- Goal
- Definition of Done
- Acceptance Criteria
- Constraints

Prefer observable outcomes over solution guesses.

### 4. Resolve brief-level gaps

If a missing fact blocks a safe brief:

1. inspect the repo or source-of-truth docs first
2. ask only the smallest blocking question if needed
3. record safe defaults as explicit assumptions

### 5. Freeze the cleaned brief

Before moving to spec or implementation:

1. make sure the `brief` contains only approved content
2. ensure rejected ideas are not carried forward
3. treat the cleaned `brief` as the main task contract

## Output

- a clean protocol `brief.md`, or
- a compact brief draft ready to be copied into `brief.md`

## Next step

- If the repository will change and no protocol exists, use [`protocol-new.md`](protocol-new.md:1).
- If the brief is stable, generate `Spec` and `Plans` using [`spec-plans-generation.md`](spec-plans-generation.md:1).

