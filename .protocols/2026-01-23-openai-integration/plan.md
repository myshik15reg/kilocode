# План

## Шаги
- [x] Обнаружить точки интеграции OpenAI/ChatGPT (поиск по коду/конфигам, документации).
- [x] Проследить путь конфигурации и маппинг моделей/провайдеров.
- [x] Найти и описать параметр reasoning effort и его использование.
- [x] Сформировать детальную инструкцию и выводы с ссылками на файлы.

## Файлы к изменению
- .protocols/2026-01-23-openai-integration/brief.md
- .protocols/2026-01-23-openai-integration/plan.md
- .protocols/2026-01-23-openai-integration/execution.md

## Файлы к изучению
- cli/docs/PROVIDER_CONFIGURATION.md
- cli/docs/ENVIRONMENT_VARIABLES.md
- src/services/continuedev/core/llm/openai-adapters/apis/OpenAI.ts
- src/services/continuedev/core/llm/openai-adapters/types.ts
- src/services/continuedev/core/llm/openai-adapters/index.ts
- src/api/providers/openai.ts
- src/api/providers/openai-native.ts
- src/api/transform/reasoning.ts
- src/api/transform/model-params.ts
- src/api/transform/r1-format.ts
- packages/types/src/providers/openai.ts
- packages/types/src/model.ts
- packages/types/src/provider-settings.ts
- src/shared/api.ts

## Матрица покрытия требований
| Требование | Задачи |
|---|---|
| R1 | Шаг 1 |
| R2 | Шаг 2 |
| R3 | Шаг 3 |
| R4 | Шаг 4 |
