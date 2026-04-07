# Text Normalization Workflow (smart quotes / encoding cleanup)

Этот workflow описывает полный цикл нормализации кавычек, артефактов кодировки и «мусора» в репозитории.

## Цель

- Устранить типографские кавычки/артефакты кодировки.
- Привести файлы к UTF-8 без BOM.
- Очистить временный кэш `temp/cache`.
- Зафиксировать проверки и обновления Memory Bank.

## Перед началом

1. Создай/актуализируй протокол: `.protocols/YYYY-MM-DD-text-normalization/`.
2. Уточни область: только файлы репозитория, без `temp/`, `node_modules/`, `.git/`.
3. Запомни правило: **после каждой завершенной подзадачи субагента обновлять Memory Bank (минимум `.kilocode/memory-bank/context.md`) и фиксировать это в протоколе.**

## Шаг 1: Полный скан файлов

Ищи следующие категории проблем:

- Smart quotes: `« » “ ” „ ‟ ‹ › ‚ ‛ ‘ ’`
- BOM/FEFF: UTF-8 BOM, U+FEFF
- Replacement char: U+FFFD
- NBSP: U+00A0
- Control chars: `0x00-0x08`, `0x0B`, `0x0C`, `0x0E-0x1F`

Рекомендуемая команда (PowerShell):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File temp/wfai-scan.ps1
```

Требования:

- Сканируй **все файлы проекта** (минимум все tracked). Если Git недоступен — только файловая система.
- Исключи `.git/`, `temp/`, `node_modules/`.
- Результат сохраняй в `.protocols/.../artifacts/scan-raw.txt`.

## Шаг 2: Исправления

### Замены

- `« » “ ” „ ‟ ‹ › ‚ ‛` → `"`
- `‘ ’` → `'`

### Ограничения

- Не трогай backticks: `` ` ``
- Не трогай fenced code blocks: ```
- Не ломай синтаксис PowerShell/Markdown/JSON/YAML

### Кодировка

- Все файлы должны быть **UTF-8 без BOM**.
- Удалить `FEFF`, `FFFD`, `NBSP`, control chars.

## Шаг 3: Очистка temp/cache

`temp/cache` — внешний мусор (например, npx cache).

- **Не исправлять вручную.**
- Удалить `temp/cache` целиком.

## Шаг 4: Проверки

Запусти проверки и сохрани краткий результат в `execution.md`:

Примечание: repo-local `./scripts/` может отсутствовать. Источник истины по путям и где ожидаются скрипты: [`scripts-entrypoints.md`](scripts-entrypoints.md:1).

```powershell
# Doctor (если доступен global pack и скрипты)
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME/.kilocode/workflowai/scripts/workflowai-doctor.ps1" -ProjectPath .
```

Если в consuming project подключены quality gates templates, можно дополнительно прогнать guardrails из проекта: см. [`quality-enforcement.md`](quality-enforcement.md:1).

## Шаг 5: Обновить Memory Bank

Минимум: `.kilocode/memory-bank/context.md`

- Зафиксируй, что подзадача завершена.
- Отрази текущий статус нормализации.
- **Обязательно отметить обновление в `execution.md`.**

## Шаг 6: Итоговый отчёт

Подготовь для оркестратора:

- Список найденных проблем (файлы + строки).
- Список изменённых файлов.
- Полный diff/patch.
- Команды для повторения скана/исправлений.

## Шаблон handoff для `new_task`

```yaml
new_task:
    mode: devops
    capabilities:
        memory_bank: full
        subagents: no
        tools: full
    message: |
        TASK: Text normalization (quotes/encoding/cleanup).
        Protocol: .protocols/YYYY-MM-DD-text-normalization/
        Inputs: .protocols/YYYY-MM-DD-text-normalization/brief.md
        Outputs:
          - scan-raw.txt (artifacts)
          - execution.md updates (scan + checks)
          - updated Memory Bank context
          - full diff/patch
```
