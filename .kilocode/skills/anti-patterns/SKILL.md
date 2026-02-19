---
name: anti-patterns
description: Comprehensive guide to common anti-patterns and mistakes in AI-assisted development - what NOT to do and why, with correct approaches.
---

# Anti-Patterns (Как НЕ делать)

> Справочник типичных ошибок с объяснением последствий и правильным подходом.

---

## Process Anti-Patterns

### AP-01: Код без протокола

**❌ Что делают:**

```
Пользователь: "Быстро поправь эту строчку"
Агент: *сразу редактирует файл*
```

**Почему плохо:** Нет traceability, нет review, нет документации.

**✅ Как правильно:**

```
1. Создать .protocols/YYYY-MM-DD-quick-fix/
2. Минимальный brief.md + plan.md
3. Сделать изменение
4. Закрыть протокол
```

**Правило:** Протокол обязателен ВСЕГДА.

---

### AP-02: Пропуск Memory Bank

**❌ Что делают:** Сразу начинают писать код без чтения Memory Bank.

**Почему плохо:** Потеря контекста, повторение решений, hallucinations.

**✅ Как правильно:**

```
1. Прочитать .kilocode/memory-bank/index.md
2. Подтвердить [MB: OK]
3. Только потом начинать работу
```

**Правило:** Первое действие — Memory Bank.

---

### AP-03: "Потом напишу тесты"

**❌ Что делают:** Пишут реализацию, откладывая тесты.

**Почему плохо:** Нарушен TDD, Coverage < 100%, технический долг.

**✅ Как правильно:**

```
1. Написать падающий тест (Red)
2. Написать минимальный код (Green)
3. Рефакторить (Refactor)
```

**Правило:** Тест ПЕРЕД кодом.

---

### AP-04: Использование `code` вместо специалиста

**❌ Что делают:**

```xml
<new_task><mode>code</mode>
<message>Создай React компонент</message>
</new_task>
```

**✅ Как правильно:**

```xml
<new_task><mode>react-dev</mode>
<message>Создай React компонент</message>
</new_task>
```

**Правило:** Всегда используй самого узкого специалиста.

---

### AP-05: `switch_mode` вместо `new_task`

**❌ Что делают:** Используют `switch_mode` для переключения.

**Почему плохо:** Нарушена изоляция контекста, context leak.

**✅ Как правильно:** Используй только `new_task`.

**Правило:** `switch_mode` ЗАПРЕЩЁН.

---

## Code Anti-Patterns

### AP-06: Код в комментариях

**❌ Что делают:**

```js
// function oldImplementation() {
//   return legacyCode();
// }
```

**✅ Как правильно:** Удали. Git хранит историю.

---

### AP-07: Magic Numbers

**❌ Что делают:**

```js
if (count > 42) { ... }
```

**✅ Как правильно:**

```js
const MAX_RETRY_COUNT = 42;
if (count > MAX_RETRY_COUNT) { ... }
```

---

### AP-08: Catch-all без обработки

**❌ Что делают:**

```js
try { ... } catch (e) { console.log(e); }
```

**✅ Как правильно:**

```js
try { ... }
catch (e) {
  logger.error('Operation failed', { error: e, context });
  throw new OperationError('Failed', { cause: e });
}
```

---

### AP-09: TODO без тикета

**❌ Что делают:**

```js
// TODO: fix this later
```

**✅ Как правильно:**

```js
// TODO(#123): Implement retry logic when API rate limit is reached
```

**Правило:** TODO только с номером тикета.

---

## Testing Anti-Patterns

### AP-10: Тесты без assertions

**❌ Что делают:**

```js
test("should work", () => {
	doSomething() // No assertions!
})
```

**✅ Как правильно:**

```js
test("should return sum", () => {
	const result = add(2, 3)
	expect(result).toBe(5)
})
```

---

### AP-11: Flaky тесты

**❌ Что делают:** Тесты с race conditions, зависящие от времени.

**✅ Как правильно:**

- Мокать время (`jest.useFakeTimers()`)
- Использовать детерминированные данные
- Изолировать внешние зависимости

---

### AP-12: Тесты, зависящие друг от друга

**❌ Что делают:** Test B зависит от state после Test A.

**✅ Как правильно:**

- Каждый тест изолирован
- `beforeEach` для setup
- `afterEach` для cleanup

---

## Architecture Anti-Patterns

### AP-13: God Object

**❌ Что делают:** Один класс/модуль делает всё.

**✅ Как правильно:** Single Responsibility Principle.

---

### AP-14: Premature Optimization

**❌ Что делают:** Оптимизируют без профайлинга.

**✅ Как правильно:**

1. Measure first
2. Identify bottleneck
3. Optimize that specific part
4. Measure again

---

### AP-15: Hardcoded Secrets

**❌ Что делают:**

```js
const API_KEY = "sk-1234567890"
```

**✅ Как правильно:**

```js
const API_KEY = process.env.API_KEY
```

**Правило:** Секреты ТОЛЬКО из env vars / secrets manager.
