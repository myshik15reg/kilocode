# Init protocol

This workflow should be run in **Code** mode (it creates files).

## Goal

Scaffold a new protocol folder under the current workspace `.protocols/` for a non-trivial task.

## Steps

1. Ask the user for:
   - `task-name` (2-3 keywords, kebab-case, <= 30 chars)
   - Optional UZ task number (e.g., `UZ-12345` or `12345`)
2. Create the protocol folder:
   - Format: `.protocols/YYYY-MM-DD-task-name/`
   - If UZ number exists: `.protocols/YYYY-MM-DD-UZNUMBER-task-name/`
3. Create files:
   - `brief.md` (Goal + Definition of Done + Acceptance Criteria (Given/When/Then) + Constraints)
   - `plan.md` (ordered steps with INPUT -> OUTPUT -> VERIFY)
   - `artifacts/` (empty folder for intermediate notes/files)
4. If the user provides the UZ task number later:
   - Rename the folder to include `UZNUMBER-` right after the date
   - Update any references to the old protocol path in notes/docs
5. Confirm by printing the created path and files.


## Boundary

- Create live protocol folders only in the current workspace.
- Do not create or update live task folders inside the WorkFlowAI template pack.
