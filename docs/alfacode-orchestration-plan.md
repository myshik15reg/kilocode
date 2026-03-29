# AlfaCode assistant orchestration plan

This document preserves the accepted implementation plan for AlfaCode assistant orchestration.

## Scope

- Modular orchestration without a monolithic hub
- `subtooling` for safe read-only batching
- background `subagent` support through existing agent manager runtime
- pause / resume / branch task UX
- local helper model routing
- `Tech Debt` backlog surfacing
- UX-visible rebrand from `KiloCode` to `AlfaCode assistant`

## Delivery principles

- Additive-first changes only
- Preserve current `new_task` behavior when new parameters are omitted
- Keep internal `kilocode` package/runtime identifiers stable in v1
- Prefer narrow services and shared contracts over central orchestration classes

## Initial implementation slice

- Save orchestration protocol and stable plan docs
- Add shared orchestration and activity contracts
- Add task execution controls and branching metadata
- Add minimal activity store / projection helpers
- Add UI controls for pause / resume / branch
- Extend `new_task` with optional execution/isolation metadata

## Notes

- This file is intended to be durable across future fork updates.
- Detailed engineering steps live in `.protocols/2026-03-11-subtooling-subagent-mvp/plan.md`.
