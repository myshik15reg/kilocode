# Integration Guide

Назначение: переиспользовать этот workflow-pack в других проектах без переноса project-specific истории.

SoT по скриптам и путям: [`scripts-entrypoints.md`](../workflows/scripts-entrypoints.md:1).

## Option A (recommended): Global install + per-project init

| Step | Action |
|---:|---|
| 1 | Install pack into `~/.kilocode/` (Unix) or `$HOME/.kilocode/` (PowerShell) |
| 2 | Initialize each project (Memory Bank + `.protocols/` + `temp/` + optional templates) |
| 3 | Use local overrides only when needed (`<project>/.kilocode/rules/`, `<project>/.kilocode/workflows/`) |

## Option B: Embed the pack into the repo

| Category | Copy | Do not copy |
|---|---|---|
| Entrypoints | `AGENTS.md`, `.kilocode/`, `.kilocodemodes`, `.clinerules` | N/A |
| Templates only | `.protocols/README.md`, `.protocols/index.md` | `.protocols/YYYY-MM-DD-*/` task folders |
| Scratch | N/A | `temp/` |

## Compatibility notes

| Context | Root |
|---|---|
| Global | `~/.kilocode/` (Unix) or `$HOME/.kilocode/` (PowerShell) |
| Embedded | `<project>/.kilocode/` |
| Entrypoint | `AGENTS.md` at project root |

