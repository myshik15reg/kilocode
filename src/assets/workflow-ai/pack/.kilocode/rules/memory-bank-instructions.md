# Memory Bank Usage

Этот файл - краткий гайд. Структура и навигация описаны в `.kilocode/memory-bank/index.md`.

## Старт сессии
1. Прочитать `.kilocode/memory-bank/index.md`.
2. Подтвердить `[MB: OK]`.
3. Следовать `AGENTS.md` и `~/.kilocode/rules/project-rules.md`.

## Инициализация для нового проекта
1. Обновить метаданные в `index.md` (project, phase, updated).
2. Заполнить базовые файлы:
   - `brief.md` - цели и краткое описание.
   - `product.md` - проблема, ценность, пользователи.
   - `architecture.md` - архитектурные решения.
   - `tech.md` - стек и ограничения.
   - `context.md` - текущий фокус и следующий шаг.
3. Если нужно быстро понять «как должно выглядеть» — см. пример: `.kilocode/memory-bank/examples/example.md`.

## Поддержание актуальности
- После завершения протокола обновляй `context.md` и при необходимости `index.md`.
- При изменении архитектуры обновляй `architecture.md`.
- При изменении стека обновляй `tech.md`.
- При изменении целей/позиционирования обновляй `brief.md` и `product.md`.

## Принципы
- **Memory First** - всегда начинай с `index.md`.
- **Lazy Loading** - читай только нужные файлы.
- **Keep It Concise** - избегай длинных полотен.
- **Update After Milestones** - обновляй после значимых изменений.

## Context Capsule (fallback)
Если Memory Bank ограничен или недоступен, приложи Context Capsule.
См. `~/.kilocode/patterns/orchestration/context-capsule.md`.

## Протоколы
Работа только в `.protocols/YYYY-MM-DD-feature-name/` с `brief.md`, `plan.md`, `execution.md`.
