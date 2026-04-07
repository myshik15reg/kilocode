# Происхождение источников

Этот pack рассчитан на isolated runtime и не должен требовать интернет-доступа во время ревью.

## Слои источников

1. `sources/alfa/primary/` — полные локальные копии первичных Alfa-регламентов.
2. `sources/alfa/compact/` — низкотокенные routing-выжимки локальных правил.
3. `sources/alfa/reg.md`, `sources/alfa/kd3.md` — curated extracts поверх primary Alfa-layer.
4. `sources/v8std/` — локальный cache exact standards 1С.
5. `sources/official/1c/platform/` — локальные official notes по platform-level guidance.
6. `sources/official/1c/ssl/` — локальные official notes по SSL/BSP и performance-related guidance.
7. `sources/official/tooling/` — локальные official notes по tooling.
8. `sources/patterns/1c/` — локальные patterns для documentation/runtime checks.
9. `sources/tooling/bsl-language-server/` — локальные compact notes по analyzer-backed evidence.

## Приоритет

1. `alfa`
2. `task/architecture`
3. `1c-official`
4. `tooling`

## Политика хранения

1. Новые внешние источники сначала локализуются в `.md`, затем подключаются в indexes и rules.
2. В manifest должны присутствовать все источники pack.
3. Curator noise не должен участвовать в runtime.
