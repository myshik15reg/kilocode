# Рабочий процесс: Глобальная установка пакета WorkFlowAI для Kilo Code (global-install)

Цель: установить этот пакет воркфлоу **глобально** для Kilo Code (в `~/~/.kilocode/`) и инициализировать новые проекты так, чтобы:

- правила/воркфлоу были общими (глобально)
- Memory Bank, `temp/`, `docs/` создавались **внутри проекта** (на уровне проекта)

## Что ожидает Kilo Code (важно)

- **Глобальные правила:** `~/~/.kilocode/rules/` (загружается автоматически)
- **Глобальные воркфлоу:** `~/~/.kilocode/workflows/` (используется как библиотека воркфлоу)
- **Правила/воркфлоу проекта:** `ПУТЬ_К_ПРОЕКТУ/~/.kilocode/rules/` и `ПУТЬ_К_ПРОЕКТУ/~/.kilocode/workflows/` (перекрывают глобальные при необходимости)
- **Точка входа проекта:** `AGENTS.md` (или `AGENT.md`) в корне проекта

## Шаг 1: Установить pack глобально

Запустите из репозитория WorkFlowAI:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/workflowai-install-global.ps1
```

Полезные параметры:

- `-OnConflict Skip` — не перезаписывать существующие файлы
- `-OnConflict BackupAndOverwrite` — сделать бэкап и перезаписать (по умолчанию)
- `-OnConflict Overwrite` — перезаписать без бэкапа
- `-WhatIf` — показать, что будет сделано (без изменений)

Результат:

- `~/~/.kilocode/rules/` - правила из pack
- `~/~/.kilocode/workflows/` - воркфлоу из пакета
- `~/~/.kilocode/workflowai/templates/` - шаблоны для инициализации проектов (включая `memory-bank/`, `patterns/`, `skills/`)
- `~/~/.kilocode/workflowai/templates/quality-gates/` - шаблоны для CI/PR enforcement (опционально ставятся в проект)
- `~/~/.kilocode/workflowai/scripts/` - копии скриптов (удобно запускать из любого проекта)
    - включая: `workflowai-init-project.ps1`, `workflowai-doctor.ps1`, `workflowai-new-protocol.ps1`

## Шаг 2: Инициализировать проект (Memory Bank + temp/docs)

В нужном проекте выполните:

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME/~/.kilocode/workflowai/scripts/workflowai-init-project.ps1" -ProjectPath .
```

Что создаётся:

- `.kilocode/memory-bank/` (шаблоны Memory Bank)
- `~/.kilocode/patterns/` (паттерны и стандарты; при global install обычно создаётся как junction/ссылка на `~/~/.kilocode/workflowai/templates/patterns`)
- `~/.kilocode/skills/` (skills; при global install обычно создаётся как junction/ссылка на `~/~/.kilocode/workflowai/templates/skills`)
- `.protocols/README.md`, `.protocols/index.md` (шаблоны протоколов)
- `temp/` (включая `temp/scripts`, `temp/screenshot`, `temp/cache`)
- `docs/`
- (опционально) шаблоны гейтов качества для CI/PR, если запускаете init с `-InitQualityGates` (см. `~/.kilocode/workflows/quality-enforcement.md`)
- обновление `.gitignore` (добавляет `.protocols/`, `temp/`, и при использовании глобальных шаблонов для `patterns/skills` - `~/.kilocode/patterns/`, `~/.kilocode/skills/`)

## Шаг 2.1 (рекомендуется): Создать первый протокол

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME/~/.kilocode/workflowai/scripts/workflowai-new-protocol.ps1" -ProjectPath . -Name "feature-name" -WithContext
```

## Шаг 3: Проверка совместимости

1. Откройте проект в VS Code с Kilo Code.
2. Убедитесь, что в корне проекта есть `AGENTS.md`.
3. В первой задаче агент должен прочитать `.kilocode/memory-bank/index.md` и подтвердить `[MB: OK]`.
4. (Опционально) Прогоните диагностику:

```powershell
powershell -ExecutionPolicy Bypass -File "$HOME/~/.kilocode/workflowai/scripts/workflowai-doctor.ps1" -ProjectPath .
```

## Локальные переопределения (если нужно)

Если проект требует отклонений от глобальных правил - добавьте локальные файлы в:

- `ПУТЬ_К_ПРОЕКТУ/~/.kilocode/rules/` (локальные правила)
- `ПУТЬ_К_ПРОЕКТУ/~/.kilocode/workflows/` (локальные воркфлоу)

Kilo Code загрузит глобальные + локальные (локальные могут перекрывать глобальные).
