# Workflow: init-memory-bank

This workflow should be run in **Code** mode when the consuming workspace needs Memory Bank setup or repair.

## Goal

Initialize or repair the minimal workspace Memory Bank so the normal non-trivial task loop can start safely.

## Steps

1. Confirm the target is the current workspace, not the `WorkFlowAI` template pack.
2. Ensure the workspace `.kilocode/memory-bank/` directory exists.
3. Create or repair the minimal files if missing:
   - `index.md`
   - `context.md`
   - `brief.md`
   - `product.md`
   - `architecture.md`
   - `tech.md`
4. Keep content concise and project-specific.
5. Read the workspace `index.md` and `context.md`, then confirm `[MB: OK]`.
6. Continue with [`context-priming.md`](context-priming.md:1) and [`brief-refinement.md`](brief-refinement.md:1).

## Boundary

- Create or repair Memory Bank only in the current workspace.
- Do not treat the template pack copy as live project state.
- Do not create live task state inside the template pack.

## Related sources

- Memory Bank structure: [`../memory-bank/index.md`](../memory-bank/index.md:1)
- Memory Bank usage: [`../rules/memory-bank-instructions.md`](../rules/memory-bank-instructions.md:1)

