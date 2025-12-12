# AlfaLeasing Branching Strategy

## Обзор

Этот документ описывает стратегию ветвления для разработки кастомизаций AlfaLeasing на основе форка Kilo-Org/kilocode.

## Структура веток

```
upstream/main (Kilo-Org/kilocode:main)
    ↓
origin/main (myshik15reg/kilocode:main) - синхронизируется с upstream
    ↓
alfaleasing - основная ветка разработки для AlfaLeasing
    ↓
feature/alfaleasing-* - индивидуальные фичи
```

## Основные ветки

### `main`
- **Назначение**: Синхронизация с upstream репозиторием Kilo-Org/kilocode
- **Правила**: 
  - Всегда соответствует upstream/main
  - Никаких прямых коммитов кастомизаций
  - Обновляется через `git pull upstream main`

### `alfaleasing`
- **Назначение**: Основная ветка для всех кастомизаций AlfaLeasing
- **Базируется на**: `main`
- **Правила**:
  - Содержит все стабильные кастомизации AlfaLeasing
  - Обновляется только через merge feature веток
  - Периодически ребейзится на актуальный main

## Feature ветки

Каждая новая функциональность или доработка создается в отдельной feature ветке:

### Именование
```
feature/alfaleasing-<краткое-описание>
```

Примеры:
- `feature/alfaleasing-custom-branding`
- `feature/alfaleasing-special-authentication`
- `feature/alfaleasing-reporting-module`
- `feature/alfaleasing-api-integration`

### Жизненный цикл feature ветки

1. **Создание**:
   ```bash
   git checkout alfaleasing
   git pull origin alfaleasing
   git checkout -b feature/alfaleasing-<название>
   ```

2. **Разработка**:
   - Делайте коммиты по мере разработки
   - Периодически синхронизируйте с alfaleasing:
     ```bash
     git fetch origin
     git rebase origin/alfaleasing
     ```

3. **Завершение**:
   ```bash
   git checkout alfaleasing
   git merge feature/alfaleasing-<название>
   git push origin alfaleasing
   ```

4. **Удаление** (после успешного merge):
   ```bash
   git branch -d feature/alfaleasing-<название>
   git push origin --delete feature/alfaleasing-<название>
   ```

## Синхронизация с upstream

Периодически необходимо синхронизировать ваш форк с upstream репозиторием:

### 1. Обновление main
```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Обновление alfaleasing
```bash
git checkout alfaleasing
git rebase origin/main
# Разрешите возможные конфликты
git push origin alfaleasing --force-with-lease
```

### 3. Обновление feature веток
```bash
git checkout feature/alfaleasing-<название>
git rebase origin/alfaleasing
# Разрешите возможные конфликты
git push origin feature/alfaleasing-<название> --force-with-lease
```

## Workflow для разработки новой функции

### Шаг 1: Создание feature ветки
```bash
git checkout alfaleasing
git pull origin alfaleasing
git checkout -b feature/alfaleasing-my-feature
```

### Шаг 2: Разработка
```bash
# Вносите изменения
git add .
git commit -m "feat(alfaleasing): описание изменений"
```

### Шаг 3: Тестирование
```bash
# Запускайте тесты согласно rules.md
cd src && pnpm test
cd ../webview-ui && pnpm test
```

### Шаг 4: Публикация
```bash
git push origin feature/alfaleasing-my-feature
```

### Шаг 5: Merge в alfaleasing
```bash
git checkout alfaleasing
git merge feature/alfaleasing-my-feature
git push origin alfaleasing
```

## Соглашения о коммитах

Используйте conventional commits с префиксом `alfaleasing`:

- `feat(alfaleasing): добавлена новая функция`
- `fix(alfaleasing): исправлена ошибка`
- `docs(alfaleasing): обновлена документация`
- `refactor(alfaleasing): рефакторинг кода`
- `test(alfaleasing): добавлены тесты`

## Разрешение конфликтов

При возникновении конфликтов во время rebase или merge:

1. **Определите источник конфликта**:
   ```bash
   git status
   ```

2. **Разрешите конфликты** в редакторе

3. **Завершите rebase/merge**:
   ```bash
   git add .
   git rebase --continue  # для rebase
   # или
   git commit  # для merge
   ```

## Best Practices

1. **Частые коммиты**: Делайте маленькие, логичные коммиты
2. **Актуальность**: Регулярно синхронизируйте с alfaleasing
3. **Тестирование**: Всегда тестируйте перед merge
4. **Code Review**: Используйте Pull Requests для важных изменений
5. **Документация**: Обновляйте документацию при добавлении функций

## Текущая конфигурация

### Remotes
```bash
origin    https://github.com/myshik15reg/kilocode.git
upstream  https://github.com/Kilo-Org/kilocode.git
```

### Активные ветки
- `main` - синхронизирована с upstream
- `alfaleasing` - основная ветка разработки AlfaLeasing

## Дополнительные команды

### Просмотр всех веток
```bash
git branch -a
```

### Просмотр истории
```bash
git log --oneline --graph --all
```

### Сброс к определенному состоянию
```bash
git reset --hard origin/alfaleasing
```

### Создание backup ветки
```bash
git checkout alfaleasing
git branch alfaleasing-backup