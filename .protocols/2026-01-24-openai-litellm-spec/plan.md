# План

## Шаги
- [x] Инвентаризировать интеграцию OpenAI/ChatGPT Plus/Pro (входы, провайдеры, модели, конфиги) и собрать ссылки на код.
- [x] Проследить полный поток сообщений (UI → Core → Provider → Core → UI), описать форматы и ключевые поля.
- [x] Выявить и описать `reasoning effort`: источник настройки, маппинг параметров, отражение в ответах/usage.
- [x] Сформировать требования к LiteLLM backend для совместимости с агентом (контракты, streaming, tool calls, errors).
- [x] Подготовить артефакт-документ и записать ключевые выводы в `execution.md`.
- [x] Добавить таблицы лимитов/остатков (model info + rate limit headers).

## Файлы к изменению
- .protocols/2026-01-24-openai-litellm-spec/brief.md
- .protocols/2026-01-24-openai-litellm-spec/plan.md
- .protocols/2026-01-24-openai-litellm-spec/execution.md
- docs/openai-litellm-agent-integration.md

## Матрица покрытия требований
| Требование | Задачи |
|---|---|
| R1 | Шаг 1 |
| R2 | Шаг 2 |
| R3 | Шаг 3 |
| R4 | Шаг 4 |
| R5 | Шаг 5 |
