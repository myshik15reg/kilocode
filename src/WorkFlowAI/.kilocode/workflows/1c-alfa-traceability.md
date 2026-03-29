# 1C (firm): Change traceability (`1c-alfa-traceability`)

## Purpose
Make each 1C change reviewable and releasable through accurate changed-object tracking.

## Source of truth
- Traceability requirements: [`REG`](../sources/1c-alfa/reg.md#traceability)

## Inputs
- `<TICKET>`
- list of changed objects, modules, reports, or processing units

## Rules
1. Every change must be recorded in the changed objects table for the ticket.
2. The description must clearly state:
   - what changed
   - where it changed
   - whether it is new or existing
3. XML export is recommended for substantial changes.
4. For tiny changes, text description can be enough if allowed by the regulation.
5. Release stops if changed objects do not match the actual implementation or code review is missing.

## Minimal checklist
- each changed object recorded
- description is unambiguous
- new vs existing is marked
- XML or text evidence attached as needed
