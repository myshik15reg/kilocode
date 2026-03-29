# Workflow: Beads task tracking (`beads-task-tracking`)

## Purpose

Use `bd` only for long-running or multi-session work where persistent task state reduces coordination cost.

## When it helps

- work spans multiple sessions
- dependencies between tasks matter
- several agents or contributors need shared state

## Prerequisites

- `bd` is installed and available in `PATH`
- `.beads/` or `BEADS_DIR` is configured for the project

## Workflow

1. Initialize once with `bd init` or point `BEADS_DIR` to shared storage.
2. Start a session with `bd ready` and pick an unblocked task.
3. Mark the task `in_progress` before implementation.
4. Add discovered work as separate tasks and connect dependencies.
5. Close tasks with a short summary.
6. End the session with `bd sync`.

## Rules

- `bd` does not replace `.protocols/`.
- Memory Bank and protocol state stay task-specific in the workspace.
- Use external `BEADS_DIR` for multi-worktree or multi-agent coordination when possible.

## Checklist

- tracker initialized
- active task selected
- dependencies recorded
- session synced
