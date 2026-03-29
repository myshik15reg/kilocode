---
name: 1c-alfa-json-contracts
description: Focused guidance for JSON contracts in 1C integrations, with emphasis on stability, compatibility, and explicit schema ownership.
---

# 1C JSON Contracts

Use this skill when a 1C task defines, changes, validates, or reviews JSON payloads exchanged with other systems.

## Goal

Keep JSON contracts explicit, stable, and compatible enough to avoid silent integration breakage.

## Core rules

1. Treat the JSON schema as an integration contract.
2. Make field meaning, requiredness, and version behavior explicit.
3. Prefer additive, backward-compatible changes where possible.
4. Validate contract changes against real producers and consumers, not only local assumptions.

## Recommended process

| Step | Outcome                                      |
| ---- | -------------------------------------------- |
| 1    | identify contract owner and affected systems |
| 2    | define current vs desired payload shape      |
| 3    | classify compatibility risk                  |
| 4    | update validation, mapping, or documentation |
| 5    | verify examples and consuming behavior       |

## Main risk areas

- changing required fields without rollout coordination
- overloading field meaning without versioning
- relying on undocumented optional behavior
- mismatching 1C structures and external JSON expectations

## Related references

- RabbitMQ integration skill: [`../1c-alfa-rabbitmq/SKILL.md`](../1c-alfa-rabbitmq/SKILL.md:1)
- 1C workflow entry: [`../1c-workflow/SKILL.md`](../1c-workflow/SKILL.md:1)
