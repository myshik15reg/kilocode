# Workflow: local-first-setup

## Goal

Поднять и проверить local-first контур для AlfaCode без отдельной архитектуры оркестрации: локальные профили должны встраиваться в существующие `main chat`, helper-routing и code-index surfaces, а не дублировать их.

Связанные документы: [`../../docs/local-first-stack.md`](../../docs/local-first-stack.md:1), [`research-retrieval.md`](research-retrieval.md:1), [`planner-executor.md`](planner-executor.md:1).

## When to use

Используй workflow, когда нужно:

1. перевести helper-задачи на локальные профили `Ollama` или `LiteLLM`;
2. проверить, что локальные модели реально доступны, а не только выбраны в UI;
3. запустить локальный embedder или reranker для code index;
4. зафиксировать безопасный degraded mode, если local stack временно недоступен.

## Steps

|   # | Step                        | INPUT                                                                | OUTPUT                                                                       | VERIFY                                                           |
| --: | --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
|   1 | Выбрать режим               | текущие требования по качеству/стоимости                             | один из режимов: `fully local` или `cloud main + local helpers`              | режим выбран явно, без скрытого переключения main chat           |
|   2 | Настроить профили           | provider settings для `Ollama` и/или `LiteLLM`                       | сохранённые локальные профили                                                | локальные профили видны в списке конфигураций                    |
|   3 | Привязать helper routing    | `enhancement`, `condense`, `search assist` и related helper surfaces | helper paths указывают на локальный профиль либо на safe fallback            | helper locality не ломает основной профиль                       |
|   4 | Проверить retrieval surface | настройки embedder/reranker/code index                               | локальный embedder/reranker подключён только если реально доступен           | retrieval не зависит от локального стека, если он выключен       |
|   5 | Прогнать diagnostics        | кнопка `Run Local AI Diagnostics` в `AlfaCode` settings              | детерминированный отчёт по Ollama, LiteLLM, helper route, embedder, reranker | нет ложного "всё настроено", если модель или endpoint недоступны |
|   6 | Зафиксировать degraded mode | результаты diagnostics                                               | понятный fallback: cloud main, local helpers optional                        | при сбое local stack основной workflow остаётся рабочим          |

## Guardrails

1. Local-first MUST оставаться настройкой поверх существующего runtime, а не второй оркестрационной системой.
2. Main chat MUST NOT переключаться на локальный профиль без явного выбора пользователя.
3. Helper routing SHOULD предпочитать локальный профиль только если он реально доступен и проходит smoke path.
4. Diagnostics MUST проверять достижимость endpoint и модели, а не только наличие полей в settings.
5. Если локальный stack недоступен, система MUST безопасно деградировать к основному профилю без prompt bloat и ручного recovery.

## Verification

Минимальная проверка после настройки:

1. `Run Local AI Diagnostics` возвращает ожидаемые `ok/warning/failed` статусы.
2. Helper single-completion smoke проходит через локальный helper-профиль либо честно падает с диагностикой.
3. Если настроен локальный embedder или reranker, их endpoint/model видны в diagnostics.
4. При выключенном или сломанном local stack основной облачный сценарий остаётся рабочим.
