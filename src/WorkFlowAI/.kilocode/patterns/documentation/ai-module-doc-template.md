# AI-Only Module Doc Template

Use this template to document an existing module for AI agents: entry points, execution flow, dependencies, and public surface area.

## Rules
- One document describes one module.
- Create sections only when you have real content (no empty sections).
- Prefer facts from code over assumptions; when unsure, mark it explicitly.
- Keep it short: lists, flows, and explicit links beat prose.

## Required Section Order

1) Назначение
   - 1–2 предложения: что делает модуль

2) Ответственности
   - Список зон ответственности

3) Точки входа
   - Файлы/классы/функции, с которых начинается выполнение

4) Зависимости
   - Внешние библиотеки, модули, сервисы, системные API

5) Публичные функции / методы
   - Формат: `<name>` — `<описание>`

6) Поток выполнения
   - Высокоуровневый поток: `A → B → C`

7) Структура файлов
   - Дерево с краткими ролями файлов/папок

8) Связанные документы
   - Относительные ссылки на другие документы

## Template
```markdown
# <Module Name>

## Назначение
<1–2 предложения>

## Ответственности
- <responsibility>

## Точки входа
- `<path/to/file>` — <entry point>

## Зависимости
- <dependency>

## Публичные функции / методы
- `<symbol>` — <description>

## Поток выполнения
<A → B → C>

## Структура файлов
module/
├── file.ext   # роль
└── sub/       # роль

## Связанные документы
- <relative-link>
```
