# Старт здесь

Используйте этот файл как основной runtime-entrypoint isolated pack.

## Базовый порядок загрузки

1. `rules/00-review-contract.md`
2. `rules/10-finding-format.md`
3. `indexes/file-signal-router.md`
4. relevant Alfa domain index
5. relevant official 1C index, если Alfa-layer уже недостаточен
6. `rules/70-evidence-and-uncertainty.md`
7. точечный evidence из `sources/**`

## Prompt contract reminder

1. Сначала извлечь задачу, входы, ограничения и output contract.
2. Не использовать persona-ярлык как замену маршрутизации, доказательности или архитектурного анализа.
3. При недостатке evidence снижать уверенность или сохранять `unknown`, а не заполнять пробелы догадками.
4. Предпочитать один сильный structural finding нескольким слабым косметическим замечаниям.

## Primary Alfa indexes

1. `indexes/firm-standards-index.md`
2. `indexes/alfa-governance-and-traceability.md`
3. `indexes/alfa-integration-and-delivery.md`
4. `indexes/alfa-kd3.md`
5. `indexes/alfa-reuse-and-customization.md`
6. `indexes/alfa-access-and-roles.md`
7. `indexes/alfa-performance.md`
8. `indexes/alfa-release-and-storage.md`

## Secondary official indexes

1. `indexes/v8std-core-index.md`
2. `indexes/official-1c-api-and-modules.md`
3. `indexes/official-1c-queries-and-data-access.md`
4. `indexes/official-1c-client-server-and-forms.md`
5. `indexes/official-1c-transactions-and-locking.md`
6. `indexes/official-1c-security-and-privileges.md`
7. `indexes/official-1c-rights-and-roles.md`
8. `indexes/official-1c-metadata-and-naming.md`
9. `indexes/official-1c-exchange-and-integration.md`
10. `indexes/official-1c-release-and-lifecycle.md`
11. `indexes/official-1c-performance.md`
12. `indexes/official-tooling-bsl-ls.md`

## Stop-rules

1. Не использовать official 1C раньше локальных Alfa-норм по той же теме.
2. Не bulk-load весь `sources/**`.
3. Не объявлять architecture compliance при отсутствии architecture evidence.
4. Не использовать tooling как замену локальному и официальному стандарту.
5. Не открывать удалённый архив: он отсутствует в итоговом pack.
