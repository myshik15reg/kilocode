# Memory Bank Usage

Structure source of truth: [`../memory-bank/index.md`](../memory-bank/index.md:1).

## Session start

1. Read [`../memory-bank/index.md`](../memory-bank/index.md:1).
2. Confirm readiness with `[MB: OK]`.
3. Follow startup entrypoints from [`../../AGENTS.md`](../../AGENTS.md:1) and [`../QUICK.md`](../QUICK.md:1).

## What belongs in Memory Bank

Memory Bank stores long-lived project context for the consuming workspace, such as:

- product and domain constraints
- architecture and subsystem boundaries
- important technical conventions
- current focus when it remains relevant beyond one task

## What does not belong there

Do not treat Memory Bank as a task log.
Keep these out unless they become durable project context:

- step-by-step execution history
- temporary debugging notes
- protocol-local experiments
- stale status that only mattered during one task

Do not store task-local `Spec` or `Plans` in Memory Bank.

Use protocols for task-local workspaces and evidence folders for durable artifacts.

## Portability rules

1. The reusable `WorkFlowAI` pack must stay template-safe.
2. Workspace-specific Memory Bank content belongs in the consuming project, not in the template pack.
3. If context is too large or task-local, summarize it in a capsule using [`../patterns/orchestration/context-capsule.md`](../patterns/orchestration/context-capsule.md:1).

## Protocol relationship

1. Any repo-changing task must use a protocol in `.protocols/YYYY-MM-DD-name/`.
2. Use a cleaned `brief` as the protocol task contract.
3. Keep `Spec` and `Plans` separate from Memory Bank unless part of the consuming project's own durable documentation model.
4. Before closing a protocol, move durable knowledge into stable source-of-truth or evidence paths when needed.
5. Do not archive raw protocol noise into Memory Bank.

Related rule: [`brief-spec-memory-bank.md`](brief-spec-memory-bank.md:1).
