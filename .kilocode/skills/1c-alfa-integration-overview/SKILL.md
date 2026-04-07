---
name: 1c-alfa-integration-overview
description: Firm-рамка интеграций (REST + JSON + RabbitMQ) без деталей (детали заблокированы до извлечения источников).
---

# Навык: 1C (firm) — Интеграции (обзор)

## Когда использовать

- Любая задача, где затрагивается межсистемное взаимодействие.

## Источник (firm SoT)

- Минимальный подтверждённый стандарт интеграций: [`REG`](../../sources/1c-alfa/reg.md#integration-overview)

## Подтверждённый минимум (firm)

1. Интеграция принята на основе REST API (HTTP запросы).
2. Обмен данными — пакетами JSON.
3. Для гарантии доставки и маршрутизации используется RabbitMQ.

Основание: [`REG`](../../sources/1c-alfa/reg.md#integration-overview)

## Детали (firm)

Детальные правила RabbitMQ и смежных артефактов (пакеты обмена) зафиксированы в стабильных SoT-выжимках:

- RabbitMQ: [`rabbitmq.md`](../../sources/1c-alfa/rabbitmq.md)
- Пакеты обмена: [`exchange-packet.md`](../../sources/1c-alfa/exchange-packet.md)
- JSON: [`json.md`](../../sources/1c-alfa/json.md)

## Безопасность

- В примерах не использовать реальные URL/учётные данные: только `<HOST>`, `<USER>` и ссылки на SoT.

## Связанные материалы pack

- Паттерн RabbitMQ (non-firm до извлечения): [`patterns/1c/rabbitmq.md`](../../patterns/1c/rabbitmq.md)

## Связанные навыки

- `1c-alfa-rabbitmq`
- `1c-alfa-json-contracts`
