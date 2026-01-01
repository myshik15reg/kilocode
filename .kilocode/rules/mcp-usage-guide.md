# MCP Usage Guide

> **КРИТИЧЕСКИ ВАЖНО:** Руководство по использованию MCP серверов в субагентах для максимальной эффективности.

## Доступные MCP Серверы

### 1. context7global - Документация библиотек

**Назначение:** Поиск актуальной документации и примеров кода для любых библиотек и фреймворков.

**Инструменты:**
- `resolve-library-id` - Поиск ID библиотеки (ВЫЗЫВАТЬ ПЕРВЫМ!)
- `query-docs` - Получение документации по ID библиотеки

**Когда использовать:**
- Поиск примеров кода для библиотек
- Проверка актуального API библиотеки
- Изучение best practices фреймворка
- Решение проблем с библиотеками

**Workflow:**
```
1. resolve-library-id(libraryName: "react", query: "хуки useEffect")
2. query-docs(libraryId: "/facebook/react", query: "useEffect cleanup")
```

**Ограничения:**
- Максимум 3 вызова на вопрос
- Сначала ВСЕГДА `resolve-library-id`
- Не передавать секреты в query

**Подходящие режимы:**
- `code` - для поиска документации при разработке
- `code-fixer` - для понимания правильного использования API
- `*-dev` (все разработчики) - для изучения специфики библиотек
- `api-architect` - для проектирования API по документации

---

### 2. sequentialthinkingglobal - Пошаговое мышление

**Назначение:** Детальный анализ и решение сложных проблем через последовательные шаги мышления.

**Инструменты:**
- `sequentialthinking` - Пошаговый анализ с возможностью ревизии

**Когда использовать:**
- Декомпозиция сложных задач
- Планирование архитектуры
- Анализ root cause проблем
- Принятие решений с trade-offs
- Проблемы с неясным scope

**Параметры:**
```yaml
thought: "Текущий шаг размышления"
thoughtNumber: 1
totalThoughts: 5  # Можно корректировать
nextThoughtNeeded: true
isRevision: false  # true если пересматриваем предыдущий шаг
revisesThought: null  # номер пересматриваемого шага
branchFromThought: null  # для ветвления
needsMoreThoughts: false
```

**Workflow:**
```
Шаг 1: Определить проблему → thoughtNumber: 1
Шаг 2: Анализ контекста → thoughtNumber: 2
Шаг 3: Генерация гипотезы → thoughtNumber: 3
Шаг 4: Верификация → thoughtNumber: 4
Шаг 5: Финальный ответ → nextThoughtNeeded: false
```

**Особенности:**
- Можно увеличивать totalThoughts по ходу
- Можно возвращаться и пересматривать решения (isRevision: true)
- Можно создавать ветки решений (branchFromThought)

**Подходящие режимы:**
- `orchestrator` - для планирования сложных задач
- `decomposer` - для декомпозиции
- `solution-architect` - для архитектурных решений
- `debug` - для root cause analysis
- `performance-analyst` - для анализа производительности

---

### 3. memoryglobal - Knowledge Graph

**Назначение:** Хранение и поиск знаний о проекте в виде графа сущностей и связей.

**Инструменты:**
- `create_entities` - Создание сущностей
- `create_relations` - Создание связей (active voice!)
- `add_observations` - Добавление наблюдений к сущностям
- `search_nodes` - Поиск по графу
- `open_nodes` - Получение конкретных сущностей
- `read_graph` - Чтение всего графа
- `delete_entities` / `delete_relations` / `delete_observations` - Удаление

**Типы сущностей (рекомендуемые):**
```yaml
- Project: основной проект
- Feature: функциональность
- Component: компонент системы
- Decision: архитектурное решение
- Problem: обнаруженная проблема
- Solution: решение проблемы
- Dependency: зависимость
- Pattern: используемый паттерн
```

**Формат связей (active voice):**
```
Project CONTAINS Feature
Feature USES Component
Component DEPENDS_ON Dependency
Decision AFFECTS Component
Problem SOLVED_BY Solution
```

**Workflow:**
```
1. read_graph() - посмотреть текущее состояние
2. search_nodes(query: "authentication") - найти релевантное
3. create_entities([{name: "OAuth2", entityType: "Feature", observations: ["JWT tokens"]}])
4. create_relations([{from: "Project", to: "OAuth2", relationType: "IMPLEMENTS"}])
```

**Подходящие режимы:**
- `orchestrator` - для отслеживания состояния проекта
- `business-analyst` - для хранения требований
- `solution-architect` - для архитектурных решений
- `code-reviewer` - для отслеживания issues

---

### 4. playwrightglobal - Browser Automation

**Назначение:** Автоматизация браузера для E2E тестирования и web scraping.

**Основные инструменты:**
```yaml
Навигация:
- browser_navigate - Переход по URL
- browser_navigate_back - Назад
- browser_tabs - Управление вкладками

Взаимодействие:
- browser_click - Клик
- browser_type - Ввод текста
- browser_fill_form - Заполнение формы
- browser_select_option - Выбор из dropdown
- browser_press_key - Нажатие клавиши
- browser_hover - Наведение
- browser_drag - Drag and drop
- browser_file_upload - Загрузка файлов

Анализ:
- browser_snapshot - Accessibility snapshot (ЛУЧШЕ чем screenshot!)
- browser_take_screenshot - Скриншот
- browser_console_messages - Console логи
- browser_network_requests - Network requests

Ожидание:
- browser_wait_for - Ожидание текста/времени

Управление:
- browser_close - Закрыть
- browser_resize - Изменить размер
- browser_handle_dialog - Обработка диалогов
- browser_evaluate - Выполнение JS
```

**Workflow для E2E теста:**
```
1. browser_navigate(url: "https://app.example.com/login")
2. browser_snapshot() - получить структуру страницы
3. browser_fill_form(fields: [{ref: "input#email", value: "test@example.com"}])
4. browser_click(element: "Login button", ref: "button[type=submit]")
5. browser_wait_for(text: "Dashboard")
6. browser_take_screenshot(filename: "dashboard.png")
7. browser_close()
```

**КРИТИЧНО:**
- Используй `browser_snapshot` вместо screenshot для действий
- Всегда указывай `element` (human-readable) И `ref` (selector)
- Используй `browser_wait_for` перед проверками

**Подходящие режимы:**
- `e2e-tester` - E2E тестирование
- `playwright-specialist` - Playwright тесты
- `qa-engineer` - QA автоматизация
- `ui-ux-analyst` - UI анализ

---

## Стратегия использования MCP в субагентах

### Принцип максимальной декомпозиции

**КРИТИЧНО:** Разбивай задачи на минимальные шаги и делегируй субагентам с нужными MCP!

**Пример правильной декомпозиции:**

```yaml
Задача: "Добавить OAuth2 аутентификацию"

Шаг 1: Планирование
  Агент: decomposer
  MCP: sequentialthinking
  Результат: Детальный план

Шаг 2: Исследование библиотек
  Агент: code
  MCP: context7
  Задача: "Найти лучшую библиотеку для OAuth2 в Node.js"

Шаг 3: Архитектура
  Агент: solution-architect
  MCP: sequentialthinking, memory
  Задача: "Спроектировать auth flow"

Шаг 4: Сохранение решений
  Агент: orchestrator
  MCP: memory
  Задача: "Сохранить архитектурные решения в knowledge graph"

Шаг 5: Реализация
  Агент: nodejs-dev
  MCP: context7
  Задача: "Реализовать OAuth2 endpoints"

Шаг 6: E2E тестирование
  Агент: e2e-tester
  MCP: playwright
  Задача: "Написать E2E тесты для login flow"
```

### Передача MCP в new_task

**Формат:**
```xml
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Найти документацию по React Query для кэширования

MCP ИНСТРУКЦИИ:
1. Использовать context7global
2. resolve-library-id(libraryName: "react-query")
3. query-docs для поиска caching patterns

РЕЗУЛЬТАТ: Список best practices с примерами кода
</message>
</new_task>
```

---

## Матрица MCP по режимам

| Режим | context7 | sequential | memory | playwright |
|-------|----------|------------|--------|------------|
| orchestrator | - | ✅ | ✅ | - |
| decomposer | - | ✅ | - | - |
| code | ✅ | - | - | - |
| code-fixer | ✅ | - | - | - |
| *-dev | ✅ | - | - | - |
| solution-architect | ✅ | ✅ | ✅ | - |
| api-architect | ✅ | ✅ | ✅ | - |
| debug | ✅ | ✅ | - | - |
| e2e-tester | - | - | - | ✅ |
| playwright-specialist | - | - | - | ✅ |
| qa-engineer | - | - | - | ✅ |
| business-analyst | - | ✅ | ✅ | - |
| code-reviewer | - | - | ✅ | - |
| performance-analyst | - | ✅ | - | - |

---

## Best Practices

### DO:
- ✅ Всегда указывай какие MCP использовать в new_task
- ✅ Разбивай на минимальные шаги с конкретными MCP
- ✅ Используй memory для сохранения важных решений
- ✅ Используй sequentialthinking для сложных анализов
- ✅ Используй context7 перед написанием кода с библиотеками

### DON'T:
- ❌ Не передавай секреты в MCP queries
- ❌ Не вызывай context7 больше 3 раз на вопрос
- ❌ Не используй screenshot вместо snapshot в playwright
- ❌ Не забывай resolve-library-id перед query-docs

---

## Примеры интеграции

### Пример 1: Исследование + Реализация

```xml
<!-- Шаг 1: Исследование -->
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Найти best practices для rate limiting в Express.js

MCP: context7global
1. resolve-library-id(libraryName: "express-rate-limit")
2. query-docs для middleware setup

РЕЗУЛЬТАТ: Конфигурация middleware с примерами
</message>
</new_task>

<!-- Шаг 2: Реализация (после получения результатов) -->
<new_task>
<mode>nodejs-dev</mode>
<message>
ЗАДАЧА: Реализовать rate limiting middleware

КОНТЕКСТ: [результаты предыдущего шага]

ФАЙЛ: src/middleware/rateLimiter.ts
</message>
</new_task>
```

### Пример 2: Сложный анализ

```xml
<new_task>
<mode>debug</mode>
<message>
ЗАДАЧА: Найти root cause performance проблемы

MCP: sequentialthinkingglobal
Использовать пошаговый анализ:
1. Определить симптомы
2. Собрать данные
3. Сформулировать гипотезы
4. Верифицировать
5. Предложить решение

ФАЙЛЫ: src/api/users.ts, logs/performance.log
</message>
</new_task>
```

### Пример 3: E2E тестирование

```xml
<new_task>
<mode>e2e-tester</mode>
<message>
ЗАДАЧА: Создать E2E тест для checkout flow

MCP: playwrightglobal
Сценарий:
1. browser_navigate → /products
2. browser_click → Add to cart
3. browser_navigate → /checkout
4. browser_fill_form → shipping info
5. browser_click → Place order
6. browser_wait_for → "Order confirmed"
7. browser_take_screenshot → confirmation.png

РЕЗУЛЬТАТ: Прошедший E2E тест
</message>
</new_task>
```

---

## Troubleshooting

### context7: "Library not found"
**Решение:** Попробуй другое название библиотеки или более общий запрос

### sequentialthinking: Зацикливание
**Решение:** Увеличь totalThoughts или установи needsMoreThoughts: true

### memory: Дубликаты сущностей
**Решение:** Используй search_nodes перед create_entities

### playwright: Element not found
**Решение:** Используй browser_wait_for перед взаимодействием

---

**Ключевой принцип:** Каждый субагент должен знать какие MCP использовать и как!
