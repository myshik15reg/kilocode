# Workflow: 1C full SDLC

## Goal

Describe the end-to-end delivery path for larger 1C tasks that need analysis, design, implementation, testing, and review.

## Use when

- the 1C task is non-trivial
- several 1C specialists or phases are involved
- architecture, integration, or business-flow risk is significant

## High-level flow

| Phase                    | Typical owner                     |
| ------------------------ | --------------------------------- |
| business clarification   | `1c-business-analyst`             |
| system analysis          | `1c-system-analyst`               |
| solution design          | `1c-architect`                    |
| implementation           | `1c-developer`                    |
| testing                  | `1c-tester` / `1c-vanessa-tester` |
| review and quality gates | `1c-quality-specialist`           |

## Rules

1. Treat substantial 1C work as protocol-worthy.
2. Keep handoffs explicit between 1C specialists.
3. Verify both local logic and critical business flows.
4. Separate design decisions from implementation details.

## Related sources

- 1C workflow skill: [`../skills/1c-workflow/SKILL.md`](../skills/1c-workflow/SKILL.md:1)
- 1C testing workflow: [`1c-testing-workflow.md`](1c-testing-workflow.md:1)
- 1C patterns index: [`../patterns/1c/index.md`](../patterns/1c/index.md:1)
