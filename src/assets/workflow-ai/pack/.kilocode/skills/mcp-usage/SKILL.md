---
name: mcp-usage
description: Complete guide for using MCP servers - context7 (documentation), sequentialthinking (analysis), memoryglobal (knowledge graph), playwrightglobal (browser automation).
---

# MCP Usage Guide

> Руководство по использованию MCP серверов для максимальной эффективности.

## Доступные MCP Серверы

### 1. context7global - Документация библиотек

**Назначение:** Поиск актуальной документации и примеров кода.

**Инструменты:**
- `resolve-library-id` - Поиск ID библиотеки (ВЫЗЫВАТЬ ПЕРВЫМ!)
- `query-docs` - Получение документации по ID

**Workflow:**
```
1. resolve-library-id(libraryName: "react", query: "хуки useEffect")
2. query-docs(libraryId: "/facebook/react", query: "useEffect cleanup")
```

**Ограничения:**
- Максимум 3 вызова на вопрос
- Сначала ВСЕГДА `resolve-library-id`

**Режимы:** `code`, `code-fixer`, `*-dev`, `api-architect`

---

### 2. sequentialthinkingglobal - Пошаговое мышление

**Назначение:** Анализ сложных проблем через последовательные шаги.

**Инструмент:** `sequentialthinking`

**Параметры:**
```yaml
thought: "Текущий шаг размышления"
thoughtNumber: 1
totalThoughts: 5
nextThoughtNeeded: true
isRevision: false
revisesThought: null
branchFromThought: null
needsMoreThoughts: false
```

**Workflow:**
```
Шаг 1: Определить проблему
Шаг 2: Анализ контекста
Шаг 3: Генерация гипотезы
Шаг 4: Верификация
Шаг 5: Финальный ответ (nextThoughtNeeded: false)
```

**Режимы:** `orchestrator`, `decomposer`, `solution-architect`, `debug`

---

### 3. memoryglobal - Knowledge Graph

**Назначение:** Хранение знаний о проекте в виде графа.

**Инструменты:**
- `create_entities` - Создание сущностей
- `create_relations` - Создание связей (active voice!)
- `add_observations` - Добавление наблюдений
- `search_nodes` - Поиск по графу
- `read_graph` - Чтение всего графа

**Типы сущностей:**
```yaml
- Project, Feature, Component
- Decision, Problem, Solution
- Dependency, Pattern
```

**Формат связей:**
```
Project CONTAINS Feature
Feature USES Component
Decision AFFECTS Component
Problem SOLVED_BY Solution
```

**Workflow:**
```
1. read_graph() - текущее состояние
2. search_nodes(query: "authentication")
3. create_entities([...])
4. create_relations([...])
```

**Режимы:** `orchestrator`, `business-analyst`, `solution-architect`

---

### 4. playwrightglobal - Browser Automation

**Назначение:** Автоматизация браузера для E2E тестирования.

**Инструменты:**
```yaml
Навигация:
- browser_navigate - Переход по URL
- browser_navigate_back - Назад
- browser_tabs - Управление вкладками

Взаимодействие:
- browser_click - Клик по элементу
- browser_type - Ввод текста
- browser_fill - Заполнение поля

Извлечение:
- browser_snapshot - Скриншот состояния
- browser_take_screenshot - Скриншот страницы
```

**Workflow:**
```
1. browser_navigate(url)
2. browser_snapshot() - получить состояние
3. browser_click(selector)
4. browser_fill(selector, value)
5. browser_take_screenshot()
```

**Режимы:** `e2e-tester`, `playwright-specialist`, `qa-engineer`

---

## Правила использования

### Resolve First
Всегда сначала `resolve-library-id`, затем `query-docs`.

### Лимит вызовов
Не более 3 вызовов MCP на один вопрос.

### Точность запросов
Формулируйте максимально конкретно:
- ✅ "How to implement infinite scroll with useInfiniteQuery"
- ❌ "infinite scroll"

### Не передавать секреты
Никогда не передавайте API ключи и токены в параметры MCP.
