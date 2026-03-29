# Mode Registry

Purpose: provide a compact human-readable index for runtime modes.

Runtime source of truth: [`.kilocodemodes`](../../.kilocodemodes:1).
Documentation in this folder should explain or summarize runtime modes, not drift away from them.

## Core principles

1. Prefer the narrowest suitable specialist.
2. Use `code` only as a fallback when no better specialist exists.
3. `orchestrator` routes and delegates; it does not do deep implementation work itself.
4. Mode changes must use `new_task` with the canonical handoff from [`../patterns/orchestration/context-handoff.md`](../patterns/orchestration/context-handoff.md:1).

## Primary mode groups

| Group | Typical modes | Use when |
|---|---|---|
| Coordination | `orchestrator`, `architect`, `ask` | routing, planning, protocol work, questions |
| Implementation | `code`, `code-fixer`, `refactorer`, `*-dev` | writing or changing code |
| Testing and QA | `qa-engineer`, `unit-tester`, `integration-tester`, `e2e-tester`, `performance-tester` | verification and test delivery |
| Security | `security-auditor`, `security-tester` | static or runtime security work |
| Architecture | `*-architect` | design, boundaries, ADR-style decisions |
| 1C domain | `1c-orchestrator`, `1c-*` specialists | 1C-specific analysis and implementation |

## Routing defaults

| Task shape | Preferred mode |
|---|---|
| Multi-step delegation | `orchestrator` |
| Planning, protocol, docs-only decisions | `architect` |
| Unknown-cause bug | `debug` |
| Known-cause fix | `code-fixer` or domain `*-dev` |
| New implementation | domain `*-dev`; otherwise `code` |
| Unit or integration tests | matching test specialist |
| Review or acceptance | `reviewer` |
| 1C task | `1c-orchestrator` or matching 1C specialist |

## Maintenance rules

1. Add or rename runtime modes in [`.kilocodemodes`](../../.kilocodemodes:1) first.
2. Then update this file and any affected role docs.
3. Remove deprecated mode references instead of leaving conflicting guidance.
4. Keep descriptions short; detailed behavior belongs in role cards, rules, or skills.
