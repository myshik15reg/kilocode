# Close protocol

This workflow should be run in **Code** mode (it edits files and may remove folders).

## Goal

Close a workspace protocol safely after review/verification are complete.

## Relationship to other workflows

- Use [`protocol-review-merge.md`](protocol-review-merge.md:1) as the canonical review, quality-gate, and merge workflow.
- Use this workflow as the final close/archive/remove step after that process is done.

## Steps

1. Identify the protocol folder to close:
    - If the user names it, use that.
    - Otherwise, list `.protocols/` and choose the target workspace protocol.
2. Confirm the protocol is ready to close:
    - `brief.md` and `plan.md` are complete.
    - Required review/verification already happened.
    - Memory Bank is already updated if long-lived context changed.
3. Add a short completion note if useful:
    - Update `execution.md` or append a completion note in `brief.md`.
4. Remove or archive the workspace protocol folder:
    - Delete it only when the project process explicitly allows deletion.
    - Otherwise keep it as workspace-local history.
5. Confirm the final result:
    - State which protocol was closed.
    - State whether it was deleted or retained as history.
