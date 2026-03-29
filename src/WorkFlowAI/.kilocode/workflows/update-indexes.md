# Workflow: update-indexes

## Goal

Keep indexes, registries, and navigation files aligned with the current source-of-truth structure.

## Use when

- files were added, removed, renamed, or reclassified
- startup corridors or menus point to stale locations
- maintainers need navigation to match the real pack layout

## Core rules

1. Update the source-of-truth file first.
2. Then update indexes that point to it.
3. Keep indexes short and navigational.
4. Do not duplicate detailed guidance inside index files.

## Common targets

- `rules/index.md`
- `workflows/index.md`
- `workflows/quickref.md`
- `skills/index.md`
- `modes/index.md`
- maintainer maps such as `docs/audit-map.md`
