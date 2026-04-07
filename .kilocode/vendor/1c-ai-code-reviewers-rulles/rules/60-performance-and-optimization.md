---
rule_id: performance-optimization
title: Производительность и эксплуатационная оптимизация
scope: performance
priority: high
tags: [performance, optimization, 1c]
---

# Производительность и эксплуатационная оптимизация

1. Сначала применять Alfa performance rules.
2. Затем усиливать official 1C sources по запросам, client/server, forms, transactions, locks, indexes, SSL/BSP performance monitor и tooling.
3. Ключевые smells: repeated queries, object reads in loops, лишние server round-trips, тяжёлые form handlers, oversized payloads, длинные транзакции, risky locks, repeated KD3 request execution.
4. Performance finding должен по возможности указывать cheapest safe path: batching, caching, reuse, shorter transaction, better placement, smaller payload, long action or standard subsystem.
