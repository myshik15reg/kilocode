# Архитектура

## Обзор
WorkFlowAI — workflow pack (документация + шаблоны + скрипты), который стандартизирует работу AI-агентов.

Ключевые компоненты:
- Входные точки: `AGENTS.md`, `README.md`.
- **Embedded-режим (этот репозиторий):** файлы пакета лежат в `.kilocode/`.
- **Global install:** файлы пакета установлены в `~/.kilocode/` (домашняя директория пользователя).
- `.kilocode/memory-bank/` — долговременный контекст проекта (Memory Bank).
- `.protocols/` — контекст конкретных задач (протоколы).
- `scripts/` — автоматизация (install/init/doctor/new-protocol).

## Ключевые решения
- Memory Bank = источник истины по контексту проекта.
- Каждая нетривиальная задача ведётся через протокол (`brief.md`/`plan.md`/`execution.md`).
- Гейты качества: TDD + 100% покрытие + 0 предупреждений линтера.

## Рекомендуемая структура (embedded)
```
.kilocode/
  memory-bank/
  rules/
  workflows/
  patterns/
  skills/
.protocols/
scripts/
```

> Примечание: при global install правила/воркфлоу живут в `~/.kilocode/`,
> но Memory Bank и `.protocols/` остаются на уровне проекта.
