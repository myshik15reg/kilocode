# Tool Usage Guide

> **⚠️ КРИТИЧЕСКИ ВАЖНО:** Этот документ описывает правильное использование инструментов в Kilo Code.

## Поддерживаемые протоколы

### 1. XML Protocol (Legacy)
```xml
<tool_name>
<parameter1>value1</parameter1>
<parameter2>value2</parameter2>
</tool_name>
```

### 2. Native Protocol (Modern, JSON)
```json
{
  "tool_name": {
    "parameter1": "value1",
    "parameter2": "value2"
  }
}
```

---

## Инструменты редактирования файлов

### apply_diff - Редактирование существующих файлов

**КРИТИЧЕСКИ ВАЖНО:** `:start_line:` ОБЯЗАТЕЛЕН!

**Формат:**
```xml
<apply_diff>
<path>relative/path/to/file.ts</path>
<diff>
<<<<<<< SEARCH
:start_line:10
-------
[точное содержимое для поиска - включая пробелы и отступы]
=======
[новое содержимое для замены]
>>>>>>> REPLACE
</diff>
</apply_diff>
```

**Пример:**
```xml
<apply_diff>
<path>src/utils/calculator.ts</path>
<diff>
<<<<<<< SEARCH
:start_line:15
-------
function calculateTotal(items: number[]): number {
    let total = 0;
    for (const item of items) {
        total += item;
    }
    return total;
}
=======
function calculateTotal(items: number[]): number {
    return items.reduce((sum, item) => sum + item, 0);
}
>>>>>>> REPLACE
</diff>
</apply_diff>
```

**Правила:**
1. Содержимое SEARCH должно ТОЧНО соответствовать файлу (whitespace-sensitive)
2. Можно использовать несколько SEARCH/REPLACE блоков в одном diff
3. Экранировать спецсимволы: `\<<<<<<< SEARCH`, `\=======`, `\>>>>>>> REPLACE`
4. ВСЕГДА читай файл перед редактированием!

### write_to_file - Создание новых файлов

**Формат:**
```xml
<write_to_file>
<path>relative/path/to/new-file.ts</path>
<content>
// Полное содержимое нового файла
export function newFunction() {
    return "Hello World";
}
</content>
</write_to_file>
```

**Когда использовать:**
- Создание нового файла с нуля
- Полная перезапись файла

---

## Инструменты чтения файлов

### read_file - Чтение файлов

**Формат:**
```xml
<read_file>
<args>
  <file>
    <path>src/app.ts</path>
    <line_range>1-50</line_range>
    <line_range>100-150</line_range>
  </file>
  <file>
    <path>src/utils.ts</path>
  </file>
</args>
</read_file>
```

**Или Native Protocol:**
```json
{
  "files": [
    {
      "path": "src/app.ts",
      "line_ranges": [[1, 50], [100, 150]]
    },
    {
      "path": "src/utils.ts"
    }
  ]
}
```

**Правила:**
- Можно читать несколько файлов в одном запросе (max 5)
- Для больших файлов используй line_range
- Вывод содержит номера строк: `1 | const x = 1`

---

## Выполнение команд

### execute_command - Запуск команд

**Формат:**
```xml
<execute_command>
<command>npm run test</command>
<cwd>/optional/working/directory</cwd>
</execute_command>
```

**Или Native Protocol:**
```json
{
  "command": "npm run test",
  "cwd": null
}
```

**Правила:**
- `cwd` опционален (по умолчанию - workspace directory)
- Используй относительные пути
- Учитывай timeout конфигурации

---

## Делегирование задач

### new_task - Создание подзадачи (РЕКОМЕНДУЕТСЯ)

**Формат:**
```json
{
  "mode": "code",
  "message": "Инструкции для подзадачи...",
  "todos": "- [ ] Задача 1\n- [ ] Задача 2"
}
```

**XML формат:**
```xml
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Реализовать аутентификацию
ПЛАН: .protocols/2025-12-31-auth/plan.md
РЕЗУЛЬТАТ: Завершенный код + attempt_completion
</message>
<todos>
- [ ] Прочитать requirements
- [ ] Реализовать код
- [ ] Написать тесты
</todos>
</new_task>
```

**Особенности:**
- Создаёт ИЗОЛИРОВАННЫЙ контекст (новая сессия)
- Родительская задача ПАУЗИТСЯ
- Результат передаётся через attempt_completion

### switch_mode - Смена режима (ТОЛЬКО ПРИ НЕОБХОДИМОСТИ)

**⚠️ ВНИМАНИЕ:** НЕ использовать для делегирования задач!

**Формат:**
```json
{
  "mode_slug": "debug",
  "reason": "Требуется отладка ошибки в коде"
}
```

**Когда использовать:**
- Смена режима в ТЕКУЩЕЙ задаче
- Контекст СОХРАНЯЕТСЯ
- Требуется подтверждение пользователя

**Когда НЕ использовать:**
- Делегирование задач другим агентам → используй `new_task`
- Передача контроля тестировщику → используй `new_task`

---

## Отслеживание прогресса

### update_todo_list - Обновление списка задач

**Формат:**
```xml
<update_todo_list>
<todos>
[x] Прочитать файлы
[-] Реализовать функцию
[ ] Написать тесты
[ ] Code review
</todos>
</update_todo_list>
```

**Статусы:**
- `[ ]` - pending (не начато)
- `[-]` - in_progress (в работе)
- `[x]` - completed (завершено)

**Правила:**
1. ВСЕГДА передавай ПОЛНЫЙ список (перезаписывает предыдущий)
2. Только ОДИН элемент может быть `[-]` одновременно
3. Отмечай `[x]` СРАЗУ после завершения
4. НЕ удаляй незавершённые задачи

### attempt_completion - Завершение задачи

**Формат:**
```xml
<attempt_completion>
<result>
## Результат

Выполнено:
1. Реализована функция аутентификации
2. Добавлены unit-тесты (coverage 85%)
3. Обновлена документация

Файлы изменены:
- src/auth/service.ts
- src/auth/__tests__/service.test.ts
</result>
<command>npm test -- --coverage</command>
</attempt_completion>
```

**Правила:**
- Используй для завершения задачи
- `command` опционален - для демонстрации результата
- Предоставь чёткое summary

---

## Поиск по файлам

### search_files - Поиск по содержимому

**Формат:**
```xml
<search_files>
<path>src</path>
<regex>function\s+calculate</regex>
<file_pattern>*.ts</file_pattern>
</search_files>
```

### list_files - Список файлов

**Формат:**
```xml
<list_files>
<path>src/components</path>
<recursive>true</recursive>
</list_files>
```

---

## Best Practices

### 1. Перед редактированием ВСЕГДА читай файл
```
1. read_file → получить текущее содержимое
2. apply_diff → внести изменения с правильным :start_line:
```

### 2. Делегирование = new_task, НЕ switch_mode
```
❌ НЕПРАВИЛЬНО: switch_mode для передачи задачи тестировщику
✅ ПРАВИЛЬНО: new_task(mode: "unit-tester", message: "...")
```

### 3. Используй update_todo_list для сложных задач
```
Более 3 шагов → создай todo list
Отмечай прогресс после КАЖДОГО шага
```

### 4. Минимизируй контекст
```
- Используй line_range для больших файлов
- Читай только нужные файлы
- Используй new_task для изоляции контекста
```

---

## Соответствие инструментов

| Kilo Code (VSCode) | Claude Code (CLI) | Описание |
|-------------------|-------------------|----------|
| `read_file` | `Read` | Чтение файлов |
| `apply_diff` | `Edit` | Редактирование файлов |
| `write_to_file` | `Write` | Создание файлов |
| `execute_command` | `Bash` | Выполнение команд |
| `search_files` | `Grep` | Поиск по содержимому |
| `list_files` | `Glob` | Поиск файлов |
| `new_task` | `Task` | Делегирование |
| `switch_mode` | N/A | Смена режима |
| `update_todo_list` | `TodoWrite` | Список задач |
| `attempt_completion` | N/A | Завершение |

---

## Частые ошибки

### ❌ apply_diff без :start_line:
```
<<<<<<< SEARCH
old content    ← НЕПРАВИЛЬНО! Нет :start_line:
=======
new content
>>>>>>> REPLACE
```

### ✅ Правильный apply_diff
```
<<<<<<< SEARCH
:start_line:10
-------
old content
=======
new content
>>>>>>> REPLACE
```

### ❌ switch_mode для делегирования
```xml
<switch_mode>
<mode_slug>code</mode_slug>
<reason>Нужно написать код</reason>
</switch_mode>
```

### ✅ new_task для делегирования
```xml
<new_task>
<mode>code</mode>
<message>Реализовать функционал...</message>
</new_task>
```

---

## MCP Серверы

> **Подробная документация:** `.kilocode/rules/mcp-usage-guide.md`

### Доступные MCP

| MCP | Назначение | Ключевые инструменты |
|-----|------------|---------------------|
| `context7global` | Документация библиотек | `resolve-library-id`, `query-docs` |
| `sequentialthinkingglobal` | Пошаговый анализ | `sequentialthinking` |
| `memoryglobal` | Knowledge Graph | `create_entities`, `search_nodes`, `read_graph` |
| `playwrightglobal` | Автоматизация браузера | `browser_navigate`, `browser_click`, `browser_snapshot` |

### Матрица режимов и MCP

```
orchestrator     → memory, sequentialthinking
decomposer       → sequentialthinking
code / *-dev     → context7
e2e-tester       → playwright
solution-architect → context7, sequentialthinking, memory
```

### При делегировании указывай MCP

```xml
<new_task>
<mode>code</mode>
<message>
ЗАДАЧА: Найти документацию по React Query

MCP: context7global
1. resolve-library-id(libraryName: "react-query")
2. query-docs для caching patterns

РЕЗУЛЬТАТ: Best practices с примерами
</message>
</new_task>
```
