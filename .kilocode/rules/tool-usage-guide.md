# Tool Usage Guide (Kilo Code / Codex CLI)

> Этот файл — короткая обёртка для стабильных ссылок в документации.
> **Source of truth:** skill `/tool-access` (матрица доступа) + `rules/ai-execution-rules.md`.

## Что читать

- [`tool-access-matrix.md`](tool-access-matrix.md) — какие режимы какие инструменты могут использовать.
- [`ai-execution-rules.md`](ai-execution-rules.md) — правила выполнения команд/правок.

## Коротко

- В Kilo Code делегирование — только через `new_task`.
- Команды выполняются только с явным подтверждением пользователя (если включён ручной approve).
- Деструктивные действия запрещены без отдельного подтверждения.
