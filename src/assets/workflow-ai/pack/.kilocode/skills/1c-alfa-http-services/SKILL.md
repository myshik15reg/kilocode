---
name: 1c-alfa-http-services
description: Focused guidance for 1C HTTP services, covering contract clarity, error handling, and safe boundary behavior.
---

# 1C HTTP Services

Use this skill for 1C tasks that expose, change, or review HTTP service behavior.

## Goal

Keep HTTP service contracts explicit, safe, and maintainable across clients and integrations.

## Core rules

1. Treat request and response shapes as contracts.
2. Keep validation and error behavior explicit.
3. Separate transport concerns from business logic where possible.
4. Avoid undocumented side effects in service handlers.

## Recommended process

| Step | Outcome                                      |
| ---- | -------------------------------------------- |
| 1    | identify service endpoint and consumers      |
| 2    | define request, response, and error contract |
| 3    | check authentication or authorization impact |
| 4    | verify boundary handling and compatibility   |
| 5    | document any contract-sensitive changes      |

## Main risk areas

- breaking response shape for existing consumers
- weak validation or ambiguous error semantics
- transport logic tightly coupled to business rules
- hidden auth or permission regressions

## Related sources

- JSON contracts: [`../1c-alfa-json-contracts/SKILL.md`](../1c-alfa-json-contracts/SKILL.md:1)
- 1C workflow entry: [`../1c-workflow/SKILL.md`](../1c-workflow/SKILL.md:1)
