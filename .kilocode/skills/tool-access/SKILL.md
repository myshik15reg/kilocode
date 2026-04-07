---
name: tool-access
description: Tool access matrix for AlfaFlowAI modes. Source of truth for read, write, command, and delegation restrictions.
---

# Tool Access Matrix

This file is the Source of Truth for mode-level access restrictions. If another guide says otherwise, follow this file.

## Quick Reference

| Mode           | Repo Read            | Repo Write                                     | Shell Commands                                       | `new_task`                                            | MCP |
| -------------- | -------------------- | ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------- | --- |
| `orchestrator` | Routing context only | No                                             | Non-mutating diagnostics only                        | Yes                                                   | Yes |
| `architect`    | Yes                  | Docs and `.protocols/` only                    | Limited, only when a workflow explicitly requires it | Yes                                                   | Yes |
| `code`         | Yes                  | Yes, inside protocol scope                     | Yes, subject to safety and pre-action rules          | Yes, only to narrower specialists with strict handoff | Yes |
| `*-dev`        | Yes                  | Yes, inside assigned scope                     | Yes                                                  | Yes, only when a narrower specialist is required      | Yes |
| `reviewer`     | Yes                  | No                                             | Read-only verification commands only                 | No                                                    | Yes |
| `*-tester`     | Yes                  | Tests, fixtures, and test-local artifacts only | Test, lint, and coverage commands                    | No                                                    | Yes |

## File Operations

| Mode           | Read                                   | Write                                      | Scope                                  |
| -------------- | -------------------------------------- | ------------------------------------------ | -------------------------------------- |
| `orchestrator` | Only the context needed for routing    | None                                       | Zero-analytics coordination only       |
| `architect`    | All relevant docs and context          | `.md` and `.protocols/`                    | Planning, protocol work, and close-out |
| `code`         | All relevant files                     | Implementation files inside protocol scope | Full implementation responsibility     |
| `reviewer`     | All relevant files, diffs, and logs    | None                                       | Review only                            |
| `*-tester`     | All relevant files, fixtures, and logs | Test files and test-local artifacts        | Testing only                           |

## Command Execution

| Mode             | Allowed                                                                  | Forbidden                                                |
| ---------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `orchestrator`   | Non-mutating diagnostics needed for routing or degraded mode             | Mutating or analytical implementation work               |
| `architect`      | Read-only or scaffold-style commands required by a documented workflow   | Ad hoc implementation commands                           |
| `code` / `*-dev` | Build, test, lint, repro, migration, and implementation-support commands | Risky or destructive actions without the required checks |
| `reviewer`       | Read-only verification commands                                          | Mutating commands                                        |
| `*-tester`       | Test execution, coverage, lint, and repro commands                       | Unrelated implementation commands                        |

## Delegation Rules

- `orchestrator` delegates via `new_task` and MUST stay zero-analytics.
- `architect` delegates implementation and specialist work via `new_task`.
- `code` and `*-dev` may delegate only to a narrower specialist when needed, and MUST include `CONTEXT HANDOFF` plus `Result Contract`.
- `reviewer` and `*-tester` do not become ad hoc orchestrators; if coordination is needed, escalate explicitly.

## Local Overrides

- Specialist-first still applies. If a narrower specialist exists, use it before broad `code` or generic patterns.
- Any risky shell action still requires the pre-action check.
- Tool access does not override protocol creation, evidence discipline, Memory Bank policy, or quality gates.
