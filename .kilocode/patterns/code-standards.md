# Code Standards

> Обязательные стандарты для всего кода в проекте.

## Core Philosophies

### 100% Quality & Zero Tolerance

- **100% Test Coverage:** Нет тестов — нет кода. Lines/Branches/Functions = 100%.
- **Strict Linting:** 0 errors, 0 warnings. НИКОГДА не отключай lint rules (`eslint-disable`, `@ts-ignore`).
- **No Technical Debt:** TODO разрешены только с ссылкой на issue tracker (`// TODO(#123)`). Если тикета нет — исправляй сейчас.

### Test Naming Convention

**Формат:** `should [expected behavior] when [condition]`

**Примеры:**

```javascript
✅ test('should return empty array when input is null')
✅ test('should throw error when user not found')
❌ test('test1') // ПЛОХО
❌ test('it works') // ПЛОХО
```

### Changesets & Markers

- **Changesets:** При изменении пакетов в монорепо выполняй `npx changeset add`
- **Markers:** Добавляй маркер изменения рядом с изменённым участком кода:
    - общий (не BSL) формат допускается как легаси: `// kilocode_change: [YYYY-MM-DD] Description`
    - **BSL (1С):** SoT — **маркер Альфа-Лизинг** (строгие шаблоны `// + ...` / `// - ...`, «Автор метода», комментарий объекта)
    - обратная совместимость: старые `kilocode_change`-маркеры в BSL допустимы в истории, но **новые добавлять нельзя**
    - подробнее: [`kilocode-change-marker.md`](1c/kilocode-change-marker.md)

### KISS (Keep It Simple, Stupid)

Самое простое решение почти всегда лучшее. Избегай ненужной сложности.

### YAGNI (You Ain't Gonna Need It)

Не пиши код "на будущее". Реализуй только то, что нужно сейчас для прохождения тестов.

### TRIZ & Emergent Design

- **TRIZ:** Стремись к Идеальному Конечному Результату (функция выполняется, затрат нет). При конфликте принципов TRIZ имеет приоритет.
- **Emergent Design:** Дизайн рождается эволюционно через цикл TDD (Red-Green-Refactor).

## Design Patterns & Frameworks

- Используй `design-patterns.md` для выбора паттернов (Observer, Factory, Strategy и др.).
- Выбирай фреймворки по умолчанию из `frameworks.md`; отклонения фиксируй в протоколе.

## SOLID Principles

### Single Responsibility (SRP)

Каждый модуль/класс/функция — одна ответственность.

```
// BAD: Делает слишком много
function createAndSendReport(data) {
    const report = generateReport(data);
    sendEmail(report);
    logToDatabase(report);
    return report;
}

// GOOD: Разделение ответственности
function generateReport(data) { /* только генерация */ }
function sendReport(report) { /* только отправка */ }
function logReport(report) { /* только логирование */ }
```

### Open/Closed (OCP)

Открыт для расширения, закрыт для модификации.

### Liskov Substitution (LSP)

Подтипы должны быть заменяемы базовыми типами.

### Interface Segregation (ISP)

Много специализированных интерфейсов лучше одного универсального.

### Dependency Inversion (DIP)

Зависимость от абстракций, не от конкретных реализаций.

```
// BAD: Жёсткая привязка
function sendNotification(message) {
    const email = new EmailService();
    email.send(message);
}

// GOOD: Зависимость от абстракции
function sendNotification(message, notifier: Notifier) {
    notifier.send(message);
}
```

---

## Документирование кода

### Обязательные комментарии

**Для функций/методов:**

```
/**
 * @description Краткое описание что делает функция
 * @param {Type} paramName - Описание параметра
 * @returns {Type} Описание возвращаемого значения
 * @throws {ErrorType} Когда выбрасывается исключение
 * @example
 *   const result = myFunction(arg);
 */
```

**Для сложной логики:**

```
// Объяснение ПОЧЕМУ, а не ЧТО
// Алгоритм использует бинарный поиск для O(log n) производительности
```

### Что НЕ комментировать

- Очевидный код (`i++; // инкремент i`)
- Геттеры/сеттеры без логики
- Самодокументируемый код

---

## Именование

### Переменные

- `camelCase` для переменных и функций
- `PascalCase` для классов и типов
- `UPPER_SNAKE_CASE` для констант
- Осмысленные имена: `userCount` вместо `n`

### Функции

- Глаголы для действий: `getUser()`, `calculateTotal()`, `validateInput()`
- Булевы функции: `isValid()`, `hasPermission()`, `canExecute()`

### Файлы и папки

- kebab-case для файлов: `user-service.ts`
- Группировка по функциональности, не по типу

---

## Обработка ошибок

### Принципы

1. **Fail fast** — падай рано, падай громко
2. **Информативные сообщения** — что случилось, где, как исправить
3. **Логирование** — все ошибки логируются

### Паттерн

```
try {
    // Опасная операция
} catch (error) {
    // 1. Залогировать
    logger.error('Operation failed', { error, context });

    // 2. Обработать или пробросить
    if (isRecoverable(error)) {
        return fallbackValue;
    }
    throw new CustomError('User-friendly message', error);
}
```

---

## Структура проекта

```
src/
├── components/     # UI компоненты
├── services/       # Бизнес-логика
├── utils/          # Утилиты
├── types/          # Типы/интерфейсы
├── tests/          # Тесты
└── index.ts        # Точка входа
```

---

## Code Review Checklist

- [ ] Core Philosophies (KISS, YAGNI, TRIZ) соблюдены
- [ ] SOLID принципы соблюдены
- [ ] Код документирован (JSDoc/docstrings)
- [ ] Нет дублирования (DRY)
- [ ] Ошибки обрабатываются корректно
- [ ] Именование понятное и консистентное
- [ ] Тесты написаны и проходят (100% coverage)
- [ ] Linter чист (0 errors, 0 warnings)
- [ ] Нет 'TODO' комментариев без тикетов
- [ ] Нет security issues (SQL injection, XSS, etc.)
- [ ] Производительность адекватная
