# План

## Шаги
- [x] F1: Проанализировать текущую документацию и найти место для Codex JSON-шаблонов.
- [x] F2: Определить LiteLLM handler и цепочку до UI, где нужно добавить reasoning/reasoning_effort.
- [x] F3: Внести изменения в документацию и код, обновить план/лог.
- [x] F4: Самопроверка: просмотреть изменения и отметить риски/тесты.
- [x] F5: Добавить пример /v1/model/info для Codex (reasoning fields).

## Файлы к изменению
- docs/openai-litellm-agent-integration.md
- src/api/providers/lite-llm.ts
- src/api/providers/fetchers/litellm.ts
- src/api/providers/__tests__/lite-llm.spec.ts
- src/api/providers/fetchers/__tests__/litellm.spec.ts
- .protocols/2026-01-24-codex-json-templates/plan.md
- .protocols/2026-01-24-codex-json-templates/execution.md

## Матрица покрытия требований
| Требование | Задачи |
|---|---|
| R1 | F1, F3 |
| R2 | F2, F3 |
