# Testing Rules (Code Mode)

> Правила тестирования. Полный гайд: `.kilocode/rules/testing-rules.md`

## TDD Cycle
```
1. RED    - Написать падающий тест
2. GREEN  - Минимальный код для прохождения
3. REFACTOR - Улучшить при зелёных тестах
```

## Coverage Requirements
| Метрика | Требование |
|---------|-----------|
| Lines | 100% |
| Branches | 100% |
| Functions | 100% |

**Код без 100% покрытия НЕ мержится.**

## Правила
- Тест ПЕРЕД кодом
- Один тест = один цикл TDD
- Коммит после каждого Green
- Assertions обязательны
- Тесты изолированы друг от друга

## Структура теста
```js
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Anti-patterns
- ❌ Тесты без assertions
- ❌ Flaky тесты (race conditions)
- ❌ Тесты, зависящие друг от друга
- ❌ "Потом напишу тесты"
