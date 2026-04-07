# Failure Recovery (Что делать, если что-то пошло не так)

> Playbook для восстановления из ошибочных состояний в процессе разработки.
> Для инцидентов в production см. `/hotfix-emergency.md`.

---

## Quick Decision Tree

```
Что сломалось?
|
+-- [Git проблема?]
|   |
|   +-- Закоммитил не туда -> Сценарий 1
|   +-- Запушил лишнее -> Сценарий 2
|   +-- Merge conflict -> Сценарий 3
|   +-- Потерял изменения -> Сценарий 4
|
+-- [Quality Gate упал?]
|   |
|   +-- Coverage < 100% -> Сценарий 5
|   +-- Lint errors -> Сценарий 6
|   +-- Tests fail -> Сценарий 7
|
+-- [Процесс нарушен?]
|   |
|   +-- Протокол потерян -> Сценарий 8
|   +-- Memory Bank сломан -> Сценарий 9
|   +-- Не знаю что делать -> Сценарий 10
|
+-- [Агент ошибся?]
    |
    +-- Выбрал неправильный режим -> Сценарий 11
    +-- Написал неправильный код -> Сценарий 12
    +-- Потерял контекст -> Сценарий 13
```

---

## Git Recovery

### Сценарий 1: Закоммитил не в ту ветку

**Ситуация:** Сделал коммит в `main` вместо feature branch.

**Решение (если НЕ запушил):**

```bash
# 1. Запомни хеш коммита
git log -1 --format="%H"

# 2. Откати main
git reset HEAD~1 --soft  # сохранит изменения в staging

# 3. Создай правильную ветку
git checkout -b feature/correct-branch

# 4. Закоммить заново
git commit -m "feat: correct commit"
```

**Решение (если запушил в main):**

```bash
# ОСТОРОЖНО: требует force push

# 1. Создай ветку с коммитом
git branch feature/correct-branch

# 2. Откати main
git checkout main
git reset --hard HEAD~1

# 3. Force push main (ТОЛЬКО после согласования с командой!)
git push --force-with-lease origin main

# 4. Запушь feature branch
git checkout feature/correct-branch
git push -u origin feature/correct-branch
```

---

### Сценарий 2: Запушил лишний/ошибочный коммит

**Ситуация:** Запушил коммит с секретами, debug кодом, или неправильными изменениями.

**Решение A: Revert (безопасно, сохраняет историю):**

```bash
# Создаёт новый коммит, отменяющий изменения
git revert HEAD
git push
```

**Решение B: Reset + Force Push (переписывает историю):**

```bash
# ТОЛЬКО если ветка персональная и никто не fetch'ил!
git reset --hard HEAD~1
git push --force-with-lease origin branch-name
```

**Если запушил секреты:**

1. НЕМЕДЛЕННО ротируй все скомпрометированные credentials
2. Используй `git filter-branch` или `bfg` для полного удаления из истории
3. Force push во все ветки
4. Уведоми команду о ротации ключей

---

### Сценарий 3: Merge Conflict

**Ситуация:** При merge/rebase возник конфликт.

**Решение:**

```bash
# 1. Посмотри конфликтующие файлы
git status

# 2. Открой каждый файл и разреши конфликты
# Ищи маркеры:
# <<<<<<< HEAD
# твои изменения
# =======
# входящие изменения
# >>>>>>> branch-name

# 3. После разрешения
git add resolved-file.ts
git commit -m "fix: resolve merge conflict in resolved-file.ts"

# ИЛИ если делал rebase
git rebase --continue
```

**Если всё сломалось при rebase:**

```bash
# Отмени rebase и вернись к исходному состоянию
git rebase --abort
```

---

### Сценарий 4: Потерял изменения

**Ситуация:** Случайно удалил файл или сделал `git reset --hard`.

**Решение A: Файл был закоммичен:**

```bash
# Найди коммит с файлом
git log --all --full-history -- path/to/file.ts

# Восстанови файл из коммита
git checkout <commit-hash> -- path/to/file.ts
```

**Решение B: Файл был в staging:**

```bash
# Посмотри reflog (история всех операций)
git reflog

# Восстанови состояние
git checkout HEAD@{N}  # где N — номер записи из reflog
```

**Решение C: Файл никогда не был в git:**

- Проверь корзину ОС
- Проверь IDE local history (VSCode: File > Local History)
- Проверь backup систему

---

## Quality Gate Recovery

### Сценарий 5: Coverage < 100%

**Ситуация:** Build падает из-за недостаточного покрытия.

**Решение:**

```bash
# 1. Посмотри coverage report
npm run test:coverage  # или аналог

# 2. Найди непокрытые строки
# Report покажет file:line

# 3. Напиши недостающие тесты
# Используй TDD: Red -> Green -> Refactor

# 4. Проверь снова
npm run test:coverage
```

**Если coverage невозможен по объективным причинам:**

1. Создай waiver через `/waiver-workflow.md`
2. Обоснуй причину
3. Создай тикет для future fix
4. Получи approval

---

### Сценарий 6: Lint Errors

**Ситуация:** Линтер выдаёт ошибки или warnings.

**Решение:**

```bash
# 1. Запусти lint с auto-fix
npm run lint -- --fix  # ESLint
ruff check --fix .     # Python

# 2. Оставшиеся ошибки исправь вручную
# НЕ отключай правила через eslint-disable!

# 3. Проверь
npm run lint
```

**Частые ошибки и решения:**

| Ошибка                               | Решение                        |
| ------------------------------------ | ------------------------------ |
| `no-unused-vars`                     | Удали переменную или используй |
| `prefer-const`                       | Замени `let` на `const`        |
| `import/order`                       | Перегруппируй импорты          |
| `@typescript-eslint/no-explicit-any` | Добавь proper type             |

---

### Сценарий 7: Tests Fail

**Ситуация:** Тесты падают.

**Решение:**

```bash
# 1. Запусти только упавшие тесты
npm test -- --grep "failing test name"

# 2. Анализируй error message
# - Expected vs Actual
# - Stack trace

# 3. Определи причину:
# - Баг в коде -> исправь код
# - Баг в тесте -> исправь тест
# - Flaky test -> стабилизируй (async, mocks)
# - Environment issue -> проверь setup

# 4. После fix запусти все тесты
npm test
```

**Если тест flaky (иногда падает):**

```javascript
// Добавь retry или увеличь timeout
jest.setTimeout(10000)

// Или используй retry в CI
// jest --runInBand (sequential execution)
```

---

## Process Recovery

### Сценарий 8: Протокол потерян или повреждён

**Ситуация:** Файлы протокола удалены или в неправильном формате.

**Решение:**

```bash
# 1. Проверь git history
git log --all --full-history -- ".protocols/*"

# 2. Восстанови из git
git checkout <commit-hash> -- .protocols/YYYY-MM-DD-name/

# 3. Если протокола не было в git — создай заново
# Используй /protocol-new.md и восстанови информацию из:
# - commit messages
# - PR description
# - memory-bank/context.md
```

---

### Сценарий 9: Memory Bank сломан

**Ситуация:** Файлы Memory Bank повреждены, удалены, или содержат ошибки.

**Решение:**

```bash
# 1. Восстанови из git
git log --all --full-history -- ".kilocode/memory-bank/*"
git checkout <commit-hash> -- .kilocode/memory-bank/

# 2. Если git history пуста — восстанови из:
# - README.md (обычно содержит краткое описание)
# - package.json / pyproject.toml (tech stack)
# - Архитектурные диаграммы
# - Confluence / Notion документация

# 3. Пересоздай минимальный Memory Bank
# Начни с brief.md -> tech.md -> architecture.md
```

**Checklist для восстановления Memory Bank:**

- [ ] `index.md` — точка входа
- [ ] `brief.md` — цели и scope проекта
- [ ] `tech.md` — используемые технологии
- [ ] `architecture.md` — ключевые решения
- [ ] `context.md` — текущее состояние

---

### Сценарий 10: Не знаю что делать дальше

**Ситуация:** Застрял, не понимаю следующий шаг.

**Решение:**

1. **Прочитай Memory Bank:**

    ```
    .kilocode/memory-bank/context.md
    ```

    Там должен быть текущий фокус и next steps.

2. **Проверь активный протокол:**

    ```
    .protocols/*/plan.md
    ```

    Найди незавершённые задачи.

3. **Используй ask режим:**

    ```
    /ask "Какой следующий шаг для задачи X?"
    ```

4. **Обратись к quickref:**
    ```
    /quickref.md
    ```

---

## Agent Recovery

### Сценарий 11: Выбрал неправильный режим

**Ситуация:** Использовал `code` вместо `react-dev`, или наоборот.

**Решение:**

1. **Остановись** — не продолжай в неправильном режиме
2. **Создай новую подзадачу** с правильным режимом через `new_task`
3. **Передай контекст** через Context Capsule или Context Handoff
4. **Не используй `switch_mode`** — это запрещено!

```xml
<new_task>
<mode>react-dev</mode>
<message>
CONTEXT: Продолжение задачи из code режима
TASK: Реализовать компонент X
FILES: src/components/X.tsx
</message>
</new_task>
```

---

### Сценарий 12: Агент написал неправильный код

**Ситуация:** Код работает неправильно или нарушает требования.

**Решение:**

1. **Откати изменения:**

    ```bash
    git checkout -- path/to/file.ts
    ```

2. **Уточни требования** в `brief.md` или через ask режим

3. **Перепиши с TDD:**

    - Напиши тест, который фиксирует правильное поведение
    - Убедись, что тест падает
    - Напиши код, который проходит тест

4. **Проведи review** через `reviewer` режим

---

### Сценарий 13: Агент потерял контекст

**Ситуация:** Агент не помнит предыдущие решения или путает задачи.

**Решение:**

1. **Перечитай Memory Bank:**

    ```
    .kilocode/memory-bank/index.md
    ```

    Подтверди `[MB: OK]`

2. **Перечитай протокол:**

    ```
    .protocols/*/brief.md
    .protocols/*/plan.md
    .protocols/*/execution.md
    ```

3. **Используй Context Capsule** для передачи контекста:

    - Создай capsule по шаблону из `context-capsule.md`
    - Включи ключевые решения и ограничения

4. **Разбей задачу на меньшие части** через orchestrator

---

## Emergency Contacts

| Ситуация        | Действие                                                |
| --------------- | ------------------------------------------------------- |
| Production down | `/hotfix-emergency.md`                                  |
| Data loss       | Восстановление из backup + post-mortem                  |
| Security breach | Incident response + credential rotation                 |
| Total confusion | Остановись, прочитай Memory Bank, создай новый протокол |

---

## Prevention Checklist

Чтобы минимизировать ошибки:

- [ ] Всегда начинай с `[MB: OK]`
- [ ] Всегда создавай протокол
- [ ] Используй TDD (тест перед кодом)
- [ ] Коммить часто и атомарно
- [ ] Не пуш напрямую в main
- [ ] Review перед merge
- [ ] Обновляй plan.md после каждого шага
