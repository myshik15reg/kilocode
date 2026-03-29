# AlfaFlowAI Quick Start

Read only this file to start. Details MUST stay in linked source-of-truth documents. Standard: [`docs-standards.md`](rules/docs-standards.md:1).

## Startup sequence

1. Read [`memory-bank/index.md`](memory-bank/index.md:1) and then [`context.md`](memory-bank/context.md:1).
2. Print `[MB: OK]`.
3. Prime context by [`context-priming.md`](workflows/context-priming.md:1).
4. Clean the task contract by [`brief-refinement.md`](workflows/brief-refinement.md:1).
5. If the repository changes, create a protocol by [`protocol-new.md`](workflows/protocol-new.md:1).
6. If needed, shape `Spec` and `Plans` by [`spec-plans-generation.md`](workflows/spec-plans-generation.md:1).
7. Select the narrowest suitable mode by [`mode-selection/SKILL.md`](skills/mode-selection/SKILL.md:1).
8. If delegating, use `new_task` with the strict format from [`context-handoff.md`](patterns/orchestration/context-handoff.md:1).
9. Finish only after the required gates from [`quality-gates.md`](rules/quality-gates.md:1) are satisfied.

## Fast path

| Situation                                   | Action                     | Source                                           |
| ------------------------------------------- | -------------------------- | ------------------------------------------------ |
| Exact micro-change with clear code fragment | Use quick-fix workflow     | [`quick-fix.md`](workflows/quick-fix.md:1)       |
| Any repository change                       | Protocol is still required | [`protocol-new.md`](workflows/protocol-new.md:1) |

## Quality gates

| Gate     | Requirement                             | Source                                                 |
| -------- | --------------------------------------- | ------------------------------------------------------ |
| Coverage | 100% lines, branches, functions         | [`quality-gates.md`](rules/quality-gates.md:1)         |
| Lint     | 0 errors and 0 warnings                 | [`quality-gates.md`](rules/quality-gates.md:1)         |
| TDD      | Red -> Green -> Refactor                | [`testing-rules.md`](rules/testing-rules.md:1)         |
| Waiver   | Exceptions only through waiver workflow | [`waiver-workflow.md`](workflows/waiver-workflow.md:1) |

## Read next

| Need            | File                                                           |
| --------------- | -------------------------------------------------------------- |
| Workflow menu   | [`quickref.md`](workflows/quickref.md:1)                       |
| Process map     | [`overview.md`](workflows/overview.md:1)                       |
| Script path SoT | [`scripts-entrypoints.md`](workflows/scripts-entrypoints.md:1) |
| Rules index     | [`rules/index.md`](rules/index.md:1)                           |
