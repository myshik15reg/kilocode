# Offline Sources Registry

Назначение: фиксировать локальные official sources, используемые pack в isolated runtime.

## Official 1C platform

1. `sources/official/1c/platform/query-language.md`
2. `sources/official/1c/platform/queries.md`
3. `sources/official/1c/platform/client-server-mode.md`
4. `sources/official/1c/platform/server-and-clients.md`
5. `sources/official/1c/platform/database-index-structure.md`
6. `sources/official/1c/platform/database-model.md`
7. `sources/official/1c/platform/transaction-lock-management.md`
8. `sources/official/1c/platform/saas-optimization.md`

## Official 1C SSL/BSP

1. `sources/official/1c/ssl/ssl-overview.md`
2. `sources/official/1c/ssl/performance-monitor.md`

## Official tooling

1. `sources/official/tooling/bsl-language-server/diagnostics-index.md`
2. `sources/official/tooling/bsl-language-server/code-out-of-region.md`

## Existing local caches

1. `sources/v8std/` — local exact cache of `v8std` standards.
2. `sources/tooling/bsl-language-server/` — compact local analyzer evidence.

## Policy

1. Runtime pack uses local files only.
2. External URLs are kept as provenance, not runtime dependencies.
3. Alfa-layer remains primary over all official external sources.
