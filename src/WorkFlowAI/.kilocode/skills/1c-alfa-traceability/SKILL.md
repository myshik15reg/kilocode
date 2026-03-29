---
name: 1c-alfa-traceability
description: Firm guidance for 1C change traceability through changed objects and optional XML evidence.
---

# Skill: 1C (firm) — Change traceability

## When to use
- any 1C task that changes metadata, modules, reports, processing units, or integration contracts

## Source of truth
- [`REG`](../../sources/1c-alfa/reg.md#traceability)

## Rules
1. Every change is recorded for `<TICKET>`.
2. The record states what changed and where.
3. Mark new vs existing.
4. Attach XML evidence for substantial changes when required.
5. Do not approve release if traceability and implementation diverge.

## Related
- [`../../workflows/1c-alfa-traceability.md`](../../workflows/1c-alfa-traceability.md)
