# Testing Standards

> Требования к тестированию. Код без тестов = технический долг.

## Принципы

1. **Тесты обязательны** — новый код покрывается тестами
2. **TDD приветствуется** — тест до кода, где возможно
3. **Пирамида тестов** — много unit, меньше integration, мало e2e

---

## Пирамида тестирования

```
        /\
       /  \      E2E (5-10%)
      /----\     Критические user flows
     /      \
    /--------\   Integration (20-30%)
   /          \  Взаимодействие компонентов
  /------------\ Unit (60-70%)
 /              \Отдельные функции/классы
```

---

## Unit Tests

### Что тестировать
- Публичные методы
- Граничные случаи (edge cases)
- Обработку ошибок
- Бизнес-логику

### Структура теста (AAA)
```
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

### Именование тестов
```
// Формат: should [expected behavior] when [condition]
test('should return empty array when input is null')
test('should throw error when user not found')
test('should calculate discount for premium users')
```

---

## Integration Tests

### Что тестировать
- API endpoints
- Database operations
- External service interactions
- Component interactions

### Пример
```
describe('UserService', () => {
    test('should create user and send welcome email', async () => {
        // Arrange
        const userData = { email: 'test@example.com' };

        // Act
        const user = await userService.create(userData);

        // Assert
        expect(user.id).toBeDefined();
        expect(emailService.sendWelcome).toHaveBeenCalledWith(user.email);
    });
});
```

---

## E2E Tests

### Когда использовать
- Критические user flows (регистрация, оплата)
- Smoke tests перед деплоем
- Регрессионное тестирование

### Принципы
- Минимум e2e тестов (дорогие в поддержке)
- Изолированное окружение
- Стабильные селекторы (data-testid)

---

## Покрытие кода (Coverage)

### Минимальные требования
| Метрика | Минимум | Цель |
|---------|---------|------|
| Lines | 70% | 85% |
| Branches | 60% | 80% |
| Functions | 70% | 85% |

### Важно
- Покрытие — метрика, не цель
- 100% покрытие ≠ качественные тесты
- Важнее тестировать критичный код

---

## Mocking

### Когда мокать
- External APIs
- Database calls (в unit тестах)
- Time-dependent code
- Randomness

### Когда НЕ мокать
- Собственный код (в большинстве случаев)
- Простые утилиты
- В integration тестах (используй реальные зависимости)

---

## Test Data

### Принципы
1. **Фабрики** — для создания тестовых объектов
2. **Fixtures** — для статичных данных
3. **Минимум данных** — только необходимое для теста

### Пример фабрики
```
function createUser(overrides = {}) {
    return {
        id: generateId(),
        email: 'test@example.com',
        name: 'Test User',
        ...overrides
    };
}

// Использование
const user = createUser({ name: 'Custom Name' });
```

---

## CI/CD Integration

### Обязательно
- Тесты запускаются на каждый PR
- Блокировка merge при failing tests
- Coverage report в PR

### Pre-commit hooks
```bash
# Перед коммитом:
npm run lint
npm run test:unit
```

---

## Checklist перед merge

- [ ] Unit тесты написаны для нового кода
- [ ] Тесты проходят локально
- [ ] Coverage не упал
- [ ] Нет flaky тестов
- [ ] Edge cases покрыты
- [ ] Ошибки обрабатываются и тестируются
