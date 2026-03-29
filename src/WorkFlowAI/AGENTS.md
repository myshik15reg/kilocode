# AlfaFlowAI for AI agents

## Corridor

| Step | File | Purpose |
|---:|---|---|
| 1 | `.kilocode/QUICK.md:1` | Minimal startup rules |
| 2 | `.kilocode/memory-bank/index.md:1` | Project context |
| 3 | `.kilocode/workflows/quickref.md:1` | Operational menu |
| 4 | `.kilocode/rules/index.md:1` | Source-of-truth navigation |

After reading Memory Bank, the agent MUST print `[MB: OK]`.

## Non-negotiables

| Rule | Requirement | Source |
|---|---|---|
| No Protocol, No Code | Any repo change MUST use `.protocols/YYYY-MM-DD-name/` | `.kilocode/workflows/protocol-new.md:1` |
| Quality gates | Coverage MUST be 100%; lint MUST be 0 errors and 0 warnings; TDD MUST be used | `.kilocode/rules/quality-gates.md:1` |
| Specialist-first | Use the narrowest suitable specialist; `code` is fallback | `.kilocode/skills/mode-selection/SKILL.md:1` |
| Zero-analytics orchestrator | Orchestrator routes and delegates, not performs deep analysis | `.kilocode/rules/agent-routing.md:1` |
| Strict handoff | Delegation MUST use `new_task` and `CONTEXT HANDOFF` | `.kilocode/patterns/orchestration/context-handoff.md:1` |
| Evidence discipline | Facts MUST be source-backed; assumptions MUST be explicit | `.kilocode/rules/evidence-rules.md:1` |
| Artifact boundary | Keep `brief`, `Spec`, `Plans`, and `Memory Bank` distinct | `.kilocode/rules/brief-spec-memory-bank.md:1` |

## Task model

1. Read the startup corridor.
2. Confirm Memory Bank with `[MB: OK]`.
3. Prime context and clean the task contract for non-trivial work.
4. If the repo changes, create a protocol before implementation.
5. Shape `Spec` and `Plans` when needed.
6. Select mode by `.kilocode/skills/mode-selection/SKILL.md:1`.
7. Delegate only through `new_task` with strict handoff.
8. Close work only after required quality gates are satisfied.

## Fast path

| Situation | Action | Source |
|---|---|---|
| Exact micro-change with clear code fragment | Use quick-fix workflow | `.kilocode/workflows/quick-fix.md:1` |
| Any repository change | Protocol is still required | `.kilocode/workflows/protocol-new.md:1` |

## Repository note

1. `.kilocode/evidence/` is primarily archive-style material.
2. Operational context should come from corridor files, not from the evidence archive unless the task explicitly needs it.
