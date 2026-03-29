---
name: tool-access
description: Tool access matrix for all AlfaFlowAI modes - what each mode can read, write, execute. Single source of truth for mode restrictions.
---

# Tool Access Matrix

## Quick Reference

| Mode | read_file | write_file | execute_command | new_task | MCP |
|------|-----------|------------|-----------------|----------|-----|
| `orchestrator` | Yes | No | Diagnostics | Yes | Yes |
| `architect` | Yes | Docs only | No | Yes | Yes |
| `code` | Yes | Yes | Yes | No | Yes |
| `*-dev` | Yes | Yes | Yes | No | Yes |
| `reviewer` | Yes | No | No | No | Yes |
| `*-tester` | Yes | Tests | Yes | No | Yes |

## File Operations

| Mode | Read | Write | Scope |
|------|------|-------|-------|
| `orchestrator` | All | None | Read-only |
| `architect` | All | `.md`, `.protocols/` | Documentation |
| `code` | All | All | Full access |
| `reviewer` | All | None | Read-only |

## Command Execution

| Mode | Allowed | Forbidden |
|------|---------|-----------|
| `orchestrator` | `git status`, `npm test --dry-run` | Any mutating |
| `code` | All | Destructive without confirmation |
| `reviewer` | None | All |

## Delegation Rules

- `orchestrator` → delegates to specialists via `new_task`
- `code` → cannot delegate, must complete
- `architect` → delegates implementation to `code`
