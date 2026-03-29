# 1C (firm): Shared 1C storage workflow (`1c-alfa-storage`)

## Purpose
Standardize work with the shared 1C storage so parallel development stays safe and release-friendly.

## Source of truth
- Storage process: [`REG`](../sources/1c-alfa/reg.md#storage)

## Rules
1. Start from the latest storage state.
2. Capture only the objects or components you really change.
3. Keep captures short-lived.
4. Commit changes in the scope of one `<TICKET>`.
5. Before commit, run module checks and resolve all errors.

## Workflow
1. Refresh from storage.
2. Capture the minimal object or component.
3. Implement the change.
4. Run module validation.
5. Commit with:
   - label: `<TICKET>`
   - comment: short release-oriented summary

## Checklist
- latest storage state loaded
- minimal capture used
- module check passed
- commit tied to one ticket
