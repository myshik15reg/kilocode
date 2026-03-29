---
name: 1c-alfa-rabbitmq
description: Focused guidance for RabbitMQ-backed 1C integrations, covering queue naming, message boundaries, reliability, and operational safety.
---

# 1C RabbitMQ

Use this skill for 1C tasks that publish to, consume from, or redesign queue-based integrations.

## Goal

Keep RabbitMQ integrations predictable, observable, and safe under retry, failure, and delayed-delivery conditions.

## Core rules

1. Treat queue naming and routing conventions as contracts, not cosmetic details.
2. Keep message schemas explicit and versionable.
3. Design for retries, dead-letter handling, and operational visibility.
4. Avoid hidden side effects inside publish or consume handlers.

## Recommended process

| Step | Outcome |
|---|---|
| 1 | identify producer, consumer, and business contract |
| 2 | define or confirm queue and routing-key conventions |
| 3 | validate payload shape and required headers |
| 4 | account for retry, DLQ, and monitoring behavior |
| 5 | verify both happy-path and failure-path handling |

## Main risk areas

- implicit contract drift in payload fields
- missing dead-letter or retry strategy
- queue naming that hides ownership or purpose
- publish logic tightly coupled to transactional side effects

## Use related references only when needed

- RabbitMQ pattern notes: [`../../patterns/1c/rabbitmq.md`](../../patterns/1c/rabbitmq.md:1)
- JSON contract guidance: [`../1c-alfa-json-contracts/SKILL.md`](../1c-alfa-json-contracts/SKILL.md:1)
