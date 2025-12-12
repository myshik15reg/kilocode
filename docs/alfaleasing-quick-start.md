# AlfaLeasing Quick Start Guide

## Быстрый старт

### Создание новой фичи

```bash
# 1. Переключитесь на alfaleasing и обновите
git checkout alfaleasing
git pull origin alfaleasing

# 2. Создайте feature ветку
git checkout -b feature/alfaleasing-<название>

# 3. Разрабатывайте и коммитьте
git add .
git commit -m "feat(alfaleasing): ваше описание"

# 4. Отправьте в репозиторий
git push origin feature/alfaleasing-<название>

# 5. После завершения - merge в alfaleasing
git checkout alfaleasing
git merge feature/alfaleasing-<название>
git push origin alfaleasing

# 6. Удалите feature ветку
git branch -d feature/alfaleasing-<название>
git push origin --delete feature/alfaleasing-<название>
```

### Синхронизация с upstream

```bash
# Обновите main
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# Обновите alfaleasing
git checkout alfaleasing
git rebase origin/main
git push origin alfaleasing --force-with-lease
```

### Структура веток

- **main** → синхронизация с Kilo-Org/kilocode
- **alfaleasing** → основная ветка для всех кастомизаций
- **feature/alfaleasing-*** → индивидуальные фичи

### Полная документация

См. [`alfaleasing-branching-strategy.md`](alfaleasing-branching-strategy.md) для подробной информации.

### Важные правила

1. ✅ Всегда создавайте feature ветки от `alfaleasing`
2. ✅ Используйте префикс `feature/alfaleasing-` для feature веток
3. ✅ Тестируйте перед merge (см. `.kilocode/rules/rules.md`)
4. ✅ Используйте conventional commits с префиксом `alfaleasing`
5. ❌ Никогда не коммитьте напрямую в `main`
6. ❌ Не делайте merge в `main` кастомизации

### Текущая конфигурация

```
origin:   https://github.com/myshik15reg/kilocode.git
upstream: https://github.com/Kilo-Org/kilocode.git

Ветки:
- main (синхронизирована с upstream)
- alfaleasing (ваша основная ветка)