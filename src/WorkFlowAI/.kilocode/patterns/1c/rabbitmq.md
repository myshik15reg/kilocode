# 1C RabbitMQ Patterns

Purpose: provide a compact reference entry for 1C queue-integration patterns.

## Use this file for

- queue and routing-key design reminders
- payload and contract safety reminders
- retry, dead-letter, and monitoring considerations

## Key reminders

1. Queue naming should make ownership and direction clear.
2. Message payloads are contracts and should remain explicit.
3. Failure handling is part of the design, not an afterthought.
4. Operational visibility matters as much as happy-path delivery.

## Related sources

- RabbitMQ skill: [`../../skills/1c-alfa-rabbitmq/SKILL.md`](../../skills/1c-alfa-rabbitmq/SKILL.md:1)
- JSON contract skill: [`../../skills/1c-alfa-json-contracts/SKILL.md`](../../skills/1c-alfa-json-contracts/SKILL.md:1)
- 1C patterns index: [`index.md`](index.md:1)
