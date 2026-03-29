# Workflow: OpenSpec archive (`openspec-archive`)

## Purpose

Archive a completed OpenSpec change and move accepted deltas into the long-lived spec set.

## Workflow

1. Confirm all items in `openspec/changes/CHANGE_ID/tasks.md` are complete.
2. Run `openspec archive CHANGE_ID --yes`.
3. If the change is tooling-only, use `--skip-specs` when appropriate.
4. Run `openspec validate --strict`.
5. Update the active protocol and Memory Bank if the archive changes project understanding.

## Exit criteria

- change archived
- specs validated
- task records updated
