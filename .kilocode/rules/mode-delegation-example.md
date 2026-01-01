# Правило ONE MODE PER TASK - Примеры

## ❌ НЕПРАВИЛЬНО - Переключение режимов в одной задаче

```
Architect Mode:
1. Создаю протокол
2. Пишу план
3. "Switching to Code mode to implement..." ← ЗАПРЕЩЕНО!
4. Пишу код
5. "Switching to Tester mode..." ← ЗАПРЕЩЕНО!
6. Запускаю тесты
```

**Проблема:** Один агент выполняет работу нескольких ролей, нарушая Context Isolation.

## ✅ ПРАВИЛЬНО - Делегирование через подзадачи

```
Architect Mode (Task #1):
1. Создаю протокол
2. Пишу plan.md
3. Создаю НОВУЮ ПОДЗАДАЧУ для Code Mode
   new_task(mode: "code", message: "Implement according to plan.md")
4. Завершаю работу

Code Mode (Task #2 - новая подзадача):
1. Читаю plan.md
2. Пишу код
3. Создаю НОВУЮ ПОДЗАДАЧУ для Unit Tester
   new_task(mode: "unit-tester", message: "Test the implementation")
4. Завершаю работу

Unit Tester (Task #3 - новая подзадача):
1. Запускаю тесты
2. Фиксирую результаты
3. Завершаю работу

Architect Mode (Task #4 - ревью):
1. Проверяю результаты всех подзадач
2. Провожу code review
3. Мерж и закрытие протокола
```

## Ключевые правила

1. **Один таск = один режим** - никогда не переключайся в рамках задачи
2. **Используй new_task** - для делегирования создавай новую подзадачу
3. **Context Isolation** - каждый режим работает только со своей частью
4. **Явное делегирование** - четко указывай что должен сделать следующий агент

## Примеры делегирования

### Architect → Code
```yaml
new_task:
  mode: code
  message: |
    ЗАДАЧА: Реализовать функцию аутентификации
    ПЛАН: .protocols/2025-12-31-auth/plan.md
    ТРЕБОВАНИЯ: .protocols/2025-12-31-auth/brief.md
    РЕЗУЛЬТАТ: Завершенный код + attempt_completion
```

### Code → Unit Tester
```yaml
new_task:
  mode: unit-tester
  message: |
    ЗАДАЧА: Протестировать модуль auth
    ФАЙЛЫ: src/auth.ts
    ТРЕБОВАНИЯ: Coverage ≥ 70%
    РЕЗУЛЬТАТ: Отчет о тестах + attempt_completion
```

### Unit Tester → Architect (ревью)
```yaml
new_task:
  mode: architect
  message: |
    ЗАДАЧА: Code review завершенной фичи
    ПРОТОКОЛ: .protocols/2025-12-31-auth/
    РЕЗУЛЬТАТ: Approve или список исправлений
```

---

**Запомни:** Если хочешь переключиться на другой режим — создай `new_task`!