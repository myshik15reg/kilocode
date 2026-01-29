# Технический контекст

## Стек
- **Языки:** PowerShell, Markdown
- **Среда выполнения:** Windows PowerShell 5.1 / PowerShell 7
- **Фреймворки:** нет (пакет состоит из документации и скриптов)
- **Хранилище:** файловая система (Git-репозиторий)
- **Инфраструктура:** локальная разработка + опциональные шаблоны CI

## Инструменты
- **Пакетный менеджер:** нет (иногда используется npm, например для changesets)
- **Проверки:** `scripts/workflowai-doctor.ps1` (целостность docs/структуры)
- **Lint/Format:** опционально PSScriptAnalyzer / markdown lint (по проекту)
- **CI/CD:** шаблоны гейтов качества:
  - embedded: `.kilocode/templates/quality-gates/`
  - global install: `~/.kilocode/workflowai/templates/quality-gates/`

## Локальная разработка
- **ОС:** Windows (основная), macOS/Linux (по возможности)
- **Оболочка:** PowerShell
- **Переменные окружения:** нет

## Ограничения
- Все файлы пакета: UTF-8 без BOM.
- Скрипты должны быть безопасны при запуске из корня репозитория (побочные эффекты — только создание/обновление шаблонов).

## Пути (embedded vs global)
- embedded (в репозитории): `.kilocode/…`, `scripts/…`
- global install (в домашней директории): `~/.kilocode/…`
