# Close protocol

This workflow should be run in **Code** mode (it edits files and may remove folders).

## Goal

Finish a protocol cleanly: verify work, update Memory Bank, and remove the protocol folder.

## Steps

1. Identify the protocol folder to close:
   - If the user names it, use that.
   - Otherwise, list `.protocols/` and ask which one to close.
2. Verify completion:
   - Ensure `brief.md` + `plan.md` tasks are done.
   - Run relevant tests/checks for the changed packages.
3. Update Memory Bank:
   - Update `.kilocode/memory-bank/context.md` with:
     - What changed
     - Risks / follow-ups
     - Next steps
4. Summarize in the protocol (optional but recommended):
   - Add a short completion note to `brief.md` or an `execution.md`
5. Clean up:
   - Delete the protocol folder under `.protocols/`

