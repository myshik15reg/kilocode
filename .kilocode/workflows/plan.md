# Plan

This workflow should be run in **Architect** mode (planning only - no code changes).

## Goal

Create an explicit, reviewable plan (and protocol folder) for a non-trivial task, then ask the user to approve before implementation.

## Steps

1. Socratic Gate (clarify before planning):
   - Ask 1-3 questions only if requirements are ambiguous (keep it minimal).
2. Choose protocol name:
   - Ask for `task-name` (2-3 keywords, kebab-case, <= 30 chars)
   - Optional UZ task number (e.g. `UZ-12345` or `12345`)
3. Create protocol folder under `.protocols/`:
   - `.protocols/YYYY-MM-DD-task-name/`
   - If UZ number exists: `.protocols/YYYY-MM-DD-UZNUMBER-task-name/`
4. Create (or update) files:
   - `brief.md`:
     - Goal
     - Definition of Done
     - Acceptance Criteria (Given/When/Then)
     - Constraints / assumptions
   - `plan.md`:
     - Ordered steps (no big jumps)
     - Each step includes: INPUT -> OUTPUT -> VERIFY
   - `artifacts/` directory (optional, but recommended)
5. If the user provides the UZ task number later:
   - Rename the folder to include `UZNUMBER-` right after the date
   - Update any references to the old protocol path in notes/docs
6. Ask for approval:
   - Confirm: `[OK] Plan created: <path>`
   - Ask the user to approve the plan before starting implementation

