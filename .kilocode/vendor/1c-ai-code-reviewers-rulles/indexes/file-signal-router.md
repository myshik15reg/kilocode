# Маршрутизатор по сигналам диффа

Выбирайте минимально достаточный Alfa-first маршрут и усиливайте official 1C только при необходимости.

| Сигнал                                                                               | Загрузить первым                              | Усилить при необходимости                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| changed objects, release readiness, design review, scope drift                       | `indexes/alfa-governance-and-traceability.md` | `indexes/architecture-index.md`, `indexes/official-1c-release-and-lifecycle.md`                                                                                                             |
| JSON, RabbitMQ, HTTP, integration settings, packet fields                            | `indexes/alfa-integration-and-delivery.md`    | `indexes/official-1c-exchange-and-integration.md`                                                                                                                                           |
| KD3 rules, algorithms, expressions, PKD, queues, search                              | `indexes/alfa-kd3.md`                         | `indexes/official-1c-queries-and-data-access.md`, `indexes/official-1c-performance.md`                                                                                                      |
| new helper/module, wrong source of truth, extension path, missing BSP reuse          | `indexes/alfa-reuse-and-customization.md`     | `rules/55-duplicate-and-reuse.md`, `indexes/official-1c-api-and-modules.md`, `indexes/official-1c-security-and-privileges.md`                                                               |
| roles, privileges, interactive delete, overly broad access                           | `indexes/alfa-access-and-roles.md`            | `indexes/official-1c-rights-and-roles.md`, `indexes/official-1c-security-and-privileges.md`                                                                                                 |
| query text, repeated reads, indexes, client/server churn, forms, transactions, locks | `indexes/alfa-performance.md`                 | `indexes/official-1c-performance.md`, `indexes/official-1c-queries-and-data-access.md`, `indexes/official-1c-client-server-and-forms.md`, `indexes/official-1c-transactions-and-locking.md` |
| exported API, comments, metadata docs drift                                          | `indexes/jdocstring-index.md`                 | `indexes/official-1c-api-and-modules.md`                                                                                                                                                    |
| module regions or analyzer-backed module structure issue                             | `indexes/v8std-core-index.md`                 | `indexes/official-tooling-bsl-ls.md`                                                                                                                                                        |
| missing architecture evidence or approved solution mismatch                          | `indexes/architecture-index.md`               | `indexes/alfa-governance-and-traceability.md`                                                                                                                                               |

## Правило остановки

1. Сначала подтвердить Alfa-based finding.
2. Добавлять official 1C или tooling только если нужен второй слой доказательности.
3. В `evidence_refs` сначала указывать Alfa-source, затем official 1C, затем tooling.
