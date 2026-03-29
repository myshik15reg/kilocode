# Repo Hygiene

Purpose: keep the repository predictable, reviewable, and free of stray task artifacts.

## Storage rules

| Concern | Preferred location | Avoid |
|---|---|---|
| workflow docs | `.kilocode/` | random root-level markdown dumps |
| protocols | `.protocols/` | `.kilocode/` |
| temporary artifacts | `temp/` or task-local artifact paths | repo root clutter |
| screenshots | `temp/screenshot/` | root folder screenshots |

## Hygiene rules

1. Keep task workspaces inside `.protocols/YYYY-MM-DD-name/`.
2. Keep long-lived project context in `.kilocode/memory-bank/`.
3. Do not store local IDE or machine-specific files unless the repo explicitly requires them.
4. Prefer markdown or plain-text documentation over opaque binary office files.
5. Remove stale scratch files before closure when they are not part of the intended deliverable.

## Naming conventions

| Item | Convention |
|---|---|
| Protocol folder | `.protocols/YYYY-MM-DD-name/` |
| Markdown docs | lowercase kebab-case where practical |
| Temporary screenshots | dated descriptive filenames |

## Review checklist

- no unrelated scratch files in the diff
- no live protocol content committed into template packs
- no duplicated source-of-truth docs created without need
- no machine-specific clutter added accidentally
