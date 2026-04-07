---
rule_id: firm-regulations
title: Локальные регламенты Alfa по 1С
scope: standards
priority: critical
tags: [alfa, firm, standards, traceability]
sources:
    - sources/alfa/primary/development-regulation-v1_17.md
    - sources/alfa/primary/kd3-regulation.md
    - sources/alfa/reg.md
    - sources/alfa/kd3.md
---

# Локальные регламенты Alfa по 1С

1. Это основной нормативный слой пакета.
2. В конфликте с `v8std` или official docs применяется Alfa-source.
3. Нужно проверять process gates, changed objects, design review, test confirmation, release readiness, extensions, Swagger, reuse, KD3 discipline и локальные performance rules.
4. Retrieval-first порядок: full Alfa source -> curated extract -> compact evidence -> official reinforcement.
