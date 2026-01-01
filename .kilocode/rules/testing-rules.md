# Testing Rules

> Тестирование обязательно. Код без тестов = технический долг.

## Обязательные требования

### 1. Минимальное покрытие

| Метрика | Минимум | Цель | Блокирует Merge |
|---------|---------|------|-----------------|
| **Lines** | 70% | 85%+ | Да, если < 70% |
| **Branches** | 60% | 80%+ | Да, если < 60% |
| **Functions** | 70% | 85%+ | Да, если < 70% |

**Исключения:** Legacy code может иметь lower coverage, но новый код ОБЯЗАН соответствовать.

### 2. Типы тестов (Test Pyramid)

```
      /\
     /  \    E2E (5-10%)       ← Критические user flows
    /----\
   /      \  Integration (20-30%) ← Component interactions
  /--------\
 /          \ Unit (60-70%)     ← Functions, classes, modules
/____________\
```

**Обязательно:**
- Unit tests для всего нового кода
- Integration tests для критичных взаимодействий
- E2E tests для ключевых user flows

### 3. Структура тестов (AAA Pattern)

```javascript
test('should calculate total with discount', () => {
    // Arrange - подготовка
    const items = [{ price: 100 }, { price: 200 }];
    const discount = 0.1;

    // Act - действие
    const total = calculateTotal(items, discount);

    // Assert - проверка
    expect(total).toBe(270);
});
```

### 4. Именование тестов

**Формат:** `should [expected behavior] when [condition]`

**Примеры:**
```javascript
// ✅ ХОРОШО
test('should return empty array when input is null')
test('should throw error when user not found')
test('should calculate discount for premium users')

// ❌ ПЛОХО
test('test1')
test('it works')
test('user test')
```

## Unit Tests

### Что тестировать:
- ✅ Публичные методы/функции
- ✅ Граничные случаи (edge cases)
- ✅ Обработка ошибок
- ✅ Бизнес-логика
- ❌ Private methods (тестируем через public API)
- ❌ Trivial getters/setters
- ❌ External libraries (они уже протестированы)

### Требования к unit тестам:
- **Быстрые:** < 100ms per test
- **Изолированные:** Нет зависимостей между тестами
- **Deterministic:** Одинаковый результат каждый раз
- **Focused:** Один тест = одно поведение

### Mocking:
**Мокать:**
- External APIs
- Database calls
- File system operations
- Time-dependent code
- Random functions

**НЕ мокать:**
- Собственную бизнес-логику
- Простые утилиты
- В integration тестах

## Integration Tests

### Что тестировать:
- API endpoints (full request → response cycle)
- Database operations (real DB или testcontainers)
- Service interactions
- Message queues
- External API integrations (с mock server)

### Требования:
- Real dependencies (не моки)
- Setup/Teardown database state
- Test isolation (каждый тест независим)
- Realistic data

## E2E Tests

### Когда использовать:
- Критические user flows (регистрация, оплата, checkout)
- Smoke tests перед deploy
- Regression testing

### Принципы:
- **Минимум тестов** (дорогие в поддержке)
- **Стабильные селекторы** (`data-testid`, не CSS classes)
- **Wait for elements** (async operations)
- **Изолированное окружение** (test DB, test users)

### Tools:
- Playwright (рекомендуется)
- Cypress
- Selenium

## Test Data

### Фабрики и Fixtures:
```javascript
// Factory pattern
function createUser(overrides = {}) {
    return {
        id: generateId(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        ...overrides
    };
}

// Usage
const admin = createUser({ role: 'admin' });
const user = createUser({ email: 'custom@example.com' });
```

### Принципы:
1. **Минимум данных** - только необходимое для теста
2. **Realistic but not real** - похоже на production, но не копия
3. **Self-contained** - тест не зависит от external data

## Обязательные проверки перед Merge

### Testing Checklist:
- [ ] Unit tests написаны для всего нового кода
- [ ] Coverage ≥ 70% (lines), ≥ 60% (branches)
- [ ] Integration tests для критичных взаимодействий
- [ ] E2E tests для новых user flows (если есть)
- [ ] Все тесты проходят (`npm test` / `pytest`)
- [ ] Нет flaky tests (нестабильные тесты удалены/исправлены)
- [ ] Edge cases покрыты
- [ ] Error handling протестирован
- [ ] Performance tests (если критично)

## CI/CD Integration

### Pre-commit hooks:
```bash
npm run lint
npm run test:unit  # Только быстрые unit tests
```

### CI Pipeline:
```yaml
1. Lint
2. Unit tests (parallel)
3. Integration tests
4. E2E tests (staging environment)
5. Coverage report
6. Security scan
```

### Блокировка merge при:
- ❌ Failing tests
- ❌ Coverage < 70%
- ❌ Lint errors
- ❌ Security vulnerabilities

## Test-Driven Development (TDD)

**Рекомендуется** для критичной бизнес-логики:

1. **Red:** Написать failing test
2. **Green:** Написать минимальный код для прохождения
3. **Refactor:** Улучшить код, тесты остаются green

## Performance Testing

### Когда обязательно:
- API endpoints (response time < 200ms для 95th percentile)
- Database queries (< 100ms)
- Критичные алгоритмы

### Tools:
- k6 (load testing)
- Apache Bench
- Lighthouse (frontend)

## Обработка Legacy Code

Если покрытие < 70%:
1. **Новый код:** Обязан соответствовать 70%+
2. **Изменения legacy:** Добавлять тесты incrementally
3. **Критичные баги:** Сначала тест (репродукция), потом fix

## Best Practices

### DO:
- ✅ Write tests BEFORE code (TDD)
- ✅ Test edge cases и error paths
- ✅ Keep tests simple and readable
- ✅ Use meaningful assertions
- ✅ Mock external dependencies
- ✅ Clean up resources (teardown)

### DON'T:
- ❌ Skip tests ("я потом напишу")
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Duplicate test logic
- ❌ Have inter-dependent tests
- ❌ Ignore failing tests

## References

- `.kilocode/patterns/testing.md` - детальные паттерны
- `.kilocode/skills/project-tests.md` - стандартный process
- Testing frameworks: Jest, Pytest, JUnit, etc.
