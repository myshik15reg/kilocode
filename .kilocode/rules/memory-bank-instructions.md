# AlfaFlow: Memory Bank & Context Priming

> Методология управления контекстом для AI-агентов.

## Quick Start
**При старте сессии:**
1. Читай ТОЛЬКО `.kilocode/memory-bank/index.md`
2. Следуй навигации по своему режиму
3. Подтверди: `[MB: OK]`

## 1. Core Principles
1. **Memory First** — начинай с `.kilocode/memory-bank/index.md`
2. **No Protocol, No Code** — без протокола код не пишем
3. **Update Plan** — обновляй `plan.md` после каждого шага
4. **Log Decisions** — нестандартные решения в `execution.md`
5. **Clean Finish** — тесты пройдены → обнови Memory Bank

## 2. Структура Memory Bank
Расположение: `.kilocode/memory-bank/`
- `index.md`: Точка входа
- `product.md`: Цели, UX
- `architecture.md`: Архитектура
- `tech.md`: Стек
- `context.md`: Статус

## 3. Навигация по режимам
- **Architect**: Читает index, product, architecture, context. Создает протоколы.
- **Code**: Читает index, architecture, tech. Реализует по плану.
- **Reviewer**: Читает index, architecture, standards. Проверяет код.

## 4. Protocols
Расположение: `.protocols/YYYY-MM-DD-feature-name/`
Содержит: `brief.md`, `plan.md`, `execution.md`.

## 5. Операции
- **Initialize**: Создать файлы Memory Bank при старте проекта.
- **Update**: Обновлять после завершения задач.