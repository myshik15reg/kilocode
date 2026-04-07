---
name: testing-detailed
description: Complete testing guide - TDD methodology, coverage requirements (100%), test pyramid, AAA pattern, mocking strategies, and quality gates.
---

# Testing Rules (Detailed)

## Обязательные требования

### Coverage Requirements (ABSOLUTE)

| Метрика       | Требование | Блокирует     |
| ------------- | ---------- | ------------- |
| **Lines**     | 100%       | Merge + Build |
| **Branches**  | 100%       | Merge + Build |
| **Functions** | 100%       | Merge + Build |

**Zero Tolerance:** Код без 100% coverage = reject.

### Test Pyramid

```
      /\
     /  \    E2E (few)           <- Critical user flows
    /----\
   /      \  Integration (some)  <- Component interactions
  /--------\
 /          \ Unit (majority)    <- Functions, classes
/____________\
```

## TDD Cycle

```
1. RED    - Написать падающий тест
2. GREEN  - Минимальный код для прохождения
3. REFACTOR - Улучшить при зелёных тестах
```

**Запрещено:** Писать код без предварительного теста.

## AAA Pattern

```javascript
test("should calculate total with discount", () => {
	// Arrange - подготовка
	const items = [{ price: 100 }, { price: 200 }]
	const discount = 0.1

	// Act - действие
	const total = calculateTotal(items, discount)

	// Assert - проверка
	expect(total).toBe(270)
})
```

## Именование тестов

**Формат:** `should [expected behavior] when [condition]`

```javascript
// ✅ ХОРОШО
test("should return empty array when input is null")
test("should throw error when user not found")

// ❌ ПЛОХО
test("test1")
test("it works")
```

## Unit Tests

### Что тестировать:

- ✅ Публичные методы/функции
- ✅ Граничные случаи (edge cases)
- ✅ Обработка ошибок
- ✅ Бизнес-логика
- ❌ Private methods
- ❌ External libraries

### Требования:

- **Быстрые:** < 100ms per test
- **Изолированные:** Нет зависимостей между тестами
- **Deterministic:** Одинаковый результат
- **Focused:** Один тест = одно поведение

## Mocking Strategy

**Мокать:**

- External APIs
- Database calls
- File system
- Time/Random

**НЕ мокать:**

- Бизнес-логику
- Утилиты
- В integration тестах

## Integration Tests

- Тестируют взаимодействие компонентов
- Используют real dependencies где возможно
- Проверяют data flow между слоями

## E2E Tests

- Critical user journeys
- Happy path + key error scenarios
- Медленные, запускать в CI

## Quality Gates

```bash
# Pre-commit (обязательно)
npm test -- --coverage
# Coverage < 100% = commit rejected

# CI Pipeline
npm run lint        # 0 errors, 0 warnings
npm run test:unit   # 100% coverage
npm run test:e2e    # Critical paths
```
