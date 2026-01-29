# Quick Diagnosis (Триаж проблем)

> Быстрый гайд для определения причины проблемы и выбора решения.
> Для восстановления после ошибок см. `/failure-recovery.md`.

---

## Decision Tree: Что не работает?

```
START: Что происходит?
|
+-- [Build/Compile не проходит?]
|   -> Секция 1: Build Issues
|
+-- [Тесты падают?]
|   -> Секция 2: Test Failures
|
+-- [Lint ошибки?]
|   -> Секция 3: Lint Issues
|
+-- [Runtime ошибка?]
|   -> Секция 4: Runtime Errors
|
+-- [Работает локально, не в CI?]
|   -> Секция 5: Environment Differences
|
+-- [Медленно работает?]
|   -> Секция 6: Performance Issues
|
+-- [Непонятная ошибка?]
|   -> Секция 7: Unknown Errors
```

---

## 1. Build Issues

### Симптомы
- `npm run build` fails
- TypeScript compilation errors
- Module not found

### Диагностика

```bash
# 1. Проверь версии
node -v
npm -v

# 2. Очисти кэш и переустанови
rm -rf node_modules package-lock.json
npm install

# 3. Проверь TypeScript
npx tsc --noEmit

# 4. Проверь imports
# Ищи circular dependencies
npx madge --circular src/
```

### Частые причины

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `Cannot find module` | Не установлена зависимость | `npm install` |
| `Type X is not assignable` | Типы не совпадают | Исправь типы |
| `Circular dependency` | A imports B, B imports A | Рефакторинг |
| `Out of memory` | Heap overflow | `NODE_OPTIONS=--max-old-space-size=4096` |

---

## 2. Test Failures

### Диагностика

```bash
# 1. Запусти только упавший тест
npm test -- --grep "test name"

# 2. Запусти с verbose output
npm test -- --verbose

# 3. Проверь coverage
npm run test:coverage
```

### Частые причины

| Симптом | Причина | Решение |
|---------|---------|---------|
| Тест падает случайно (flaky) | Async issue, shared state | Изолируй тест, добавь await |
| `Expected X, received Y` | Баг в коде или в тесте | Сравни expected vs actual |
| Timeout | Долгая операция | Увеличь timeout или мокай |
| `Cannot read property of undefined` | Неправильный setup | Проверь beforeEach |

### Checklist

- [ ] Тест изолирован (не зависит от других)?
- [ ] Mocks сбрасываются между тестами?
- [ ] Async операции awaited?
- [ ] Test data корректна?

---

## 3. Lint Issues

### Диагностика

```bash
# 1. Запусти lint
npm run lint

# 2. Попробуй auto-fix
npm run lint -- --fix

# 3. Посмотри конфигурацию
cat .eslintrc.js
```

### Частые ошибки

| Правило | Ошибка | Решение |
|---------|--------|---------|
| `no-unused-vars` | Неиспользуемая переменная | Удали или используй |
| `prefer-const` | `let` где можно `const` | Замени на `const` |
| `@typescript-eslint/no-explicit-any` | Используется `any` | Добавь proper type |
| `import/order` | Неправильный порядок импортов | Перегруппируй |

**ВАЖНО:** НЕ отключай правила через `eslint-disable`! Исправь код.

---

## 4. Runtime Errors

### Диагностика

```bash
# 1. Посмотри stack trace
# Найди первую строку ТВОЕГО кода (не node_modules)

# 2. Добавь логирование
console.log('DEBUG:', variable)

# 3. Используй debugger
node --inspect-brk script.js
```

### Частые ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `TypeError: Cannot read property` | null/undefined access | Добавь optional chaining `?.` |
| `ReferenceError: X is not defined` | Переменная не объявлена | Объяви или импортируй |
| `SyntaxError` | Синтаксическая ошибка | Проверь синтаксис |
| `RangeError: Maximum call stack` | Бесконечная рекурсия | Добавь base case |

---

## 5. Environment Differences

### Симптомы
- Работает локально, падает в CI
- Работает в CI, падает локально
- Работает у коллеги, не работает у меня

### Диагностика

```bash
# 1. Сравни версии
node -v && npm -v

# 2. Сравни переменные окружения
printenv | grep -E "(NODE|PATH)"

# 3. Сравни OS
uname -a  # Linux/Mac
$PSVersionTable  # Windows
```

### Частые причины

| Симптом | Причина | Решение |
|---------|---------|---------|
| Разные результаты | Разные версии Node | Используй nvm + .nvmrc |
| Пути не находятся | Windows vs Unix paths | Используй `path.join()` |
| Encoding issues | UTF-8 vs другое | Укажи encoding явно |
| Permissions | File permissions | `chmod` или run as admin |

### Checklist для CI/CD

- [ ] `.nvmrc` или `engines` в package.json?
- [ ] `package-lock.json` в git?
- [ ] Environment variables заданы в CI?
- [ ] Кэш CI очищен?

---

## 6. Performance Issues

### Диагностика

```bash
# 1. Profile Node.js
node --prof script.js
node --prof-process isolate-*.log > profile.txt

# 2. Memory usage
node --expose-gc --inspect script.js

# 3. Benchmark
npm run benchmark  # если есть
```

### Частые причины

| Симптом | Причина | Решение |
|---------|---------|---------|
| Медленный startup | Много импортов | Lazy loading |
| Memory leak | Неочищенные listeners | Remove listeners |
| Долгие запросы | N+1 queries | Batch queries |
| CPU 100% | Синхронный код | Async/await |

---

## 7. Unknown Errors

Когда непонятно что происходит:

### Шаг 1: Собери информацию
```bash
# Полный error output
npm run <command> 2>&1 | tee error.log

# System info
node -v && npm -v && uname -a
```

### Шаг 2: Изолируй проблему
```bash
# Минимальный воспроизводящий пример
# Убирай код пока ошибка не исчезнет
# Последнее убранное — причина
```

### Шаг 3: Поиск
1. Скопируй точный текст ошибки
2. Поищи в issues репозитория зависимости
3. Поищи в Stack Overflow
4. Проверь changelog зависимости

### Шаг 4: Эскалация
Если ничего не помогло:
1. Создай minimal reproduction
2. Открой issue с:
   - Версии (node, npm, зависимости)
   - OS
   - Steps to reproduce
   - Expected vs Actual
   - Error log

---

## Quick Reference: Команды диагностики

### Node.js / npm
```bash
node -v                    # Версия Node
npm -v                     # Версия npm
npm ls                     # Дерево зависимостей
npm outdated               # Устаревшие пакеты
npm audit                  # Security issues
```

### TypeScript
```bash
npx tsc --noEmit           # Проверка типов
npx tsc --showConfig       # Текущий конфиг
```

### Git
```bash
git status                 # Текущее состояние
git log --oneline -5       # Последние коммиты
git diff                   # Незакоммиченные изменения
git bisect                 # Найти проблемный коммит
```

### PowerShell (Windows)
```powershell
$PSVersionTable            # Версия PowerShell
Get-ChildItem Env:         # Переменные окружения
Get-Process node           # Процессы Node
```

---

## When to Escalate

Обратись за помощью если:
- [ ] Потратил > 30 минут без прогресса
- [ ] Ошибка в чужом коде (зависимость)
- [ ] Требуются права, которых нет
- [ ] Проблема влияет на других

**Куда обращаться:**
- Production issue → `/hotfix-emergency.md`
- Process issue → `ask` режим
- Unknown error → Создай протокол для исследования
