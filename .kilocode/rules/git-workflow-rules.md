# Git Workflow Rules

> Стандартизированный процесс работы с Git для всех агентов и разработчиков.

## Branch Naming Convention

### Формат: `<type>/<description>`

**Types:**
- `feat/` - Новая функциональность
- `fix/` - Исправление багов
- `refactor/` - Рефакторинг (без изменения функциональности)
- `docs/` - Документация
- `test/` - Тесты
- `chore/` - Рутинные задачи (dependencies, configs)
- `perf/` - Performance improvements
- `style/` - Форматирование, whitespace

**Примеры:**
```bash
feat/user-authentication
fix/payment-validation-error
refactor/extract-user-service
docs/api-endpoints
test/add-integration-tests
chore/update-dependencies
```

## Commit Message Convention (Conventional Commits)

### Формат: `<type>(<scope>): <subject>`

```
feat(auth): add JWT token validation
^--^ ^--^  ^----------------------^
│    │     │
│    │     └─⫸ Subject (краткое описание)
│    └──────⫸ Scope (опционально)
└───────────⫸ Type
```

### Types (как в branches):
- `feat:` - Новая функциональность
- `fix:` - Bug fix
- `refactor:` - Рефакторинг
- `docs:` - Документация
- `test:` - Тесты
- `chore:` - Рутина
- `perf:` - Performance
- `style:` - Formatting

### Примеры хороших коммитов:
```bash
feat(api): add user registration endpoint
fix(auth): resolve token expiration issue
refactor(user): extract validation logic to service
docs(readme): update installation instructions
test(api): add integration tests for auth endpoints
chore(deps): update dependencies to latest versions
perf(db): optimize user query with indexes
```

### Примеры ПЛОХИХ коммитов:
```bash
❌ fixed stuff
❌ update
❌ WIP
❌ asdfasdf
❌ commit
```

### Breaking Changes:
```bash
feat(api)!: change authentication to OAuth2

BREAKING CHANGE: Authentication now requires OAuth2 tokens instead of API keys.
Migration guide: see docs/migration.md
```

## Workflow Process

### 1. Начало работы (Protocol Initialization)

```bash
# 1. Убедись что на main
git checkout main
git pull origin main

# 2. Создай ветку по convention
git checkout -b feat/user-profile-page

# 3. Или используй git worktree (рекомендуется для AlfaFlow)
git worktree add ../worktrees/feat-user-profile main
cd ../worktrees/feat-user-profile
git checkout -b feat/user-profile-page
```

### 2. Разработка

```bash
# Коммит часто, атомарные изменения
git add src/components/UserProfile.tsx
git commit -m "feat(profile): add UserProfile component"

git add src/api/userApi.ts
git commit -m "feat(api): add getUserProfile endpoint"

git add tests/UserProfile.test.tsx
git commit -m "test(profile): add UserProfile component tests"
```

### 3. Перед Push

**Обязательные проверки:**
```bash
# 1. Запустить тесты
npm test                # или pytest, cargo test, etc.

# 2. Запустить линтер
npm run lint

# 3. Проверить coverage
npm run test:coverage

# 4. Security scan
npm audit               # или pip-audit, cargo audit

# Только если ВСЁ прошло - push
git push origin feat/user-profile-page
```

### 4. Pull Request

**PR Title:** Как commit message (Conventional Commits)
```
feat(profile): add user profile page with edit functionality
```

**PR Description Template:**
```markdown
## Summary
Brief description of changes (1-3 sentences)

## Changes
- Added UserProfile component
- Implemented profile editing
- Added validation

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Coverage ≥ 70%

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security issues
- [ ] Follows code standards
- [ ] Breaking changes documented (if any)

## Screenshots (if UI changes)
[Add screenshots here]
```

### 5. Code Review

**Reviewer Checklist:**
- [ ] Code follows `.kilocode/patterns/code-standards.md`
- [ ] Tests added and passing
- [ ] Coverage ≥ 70%
- [ ] No security issues
- [ ] Commit messages follow convention
- [ ] PR description complete

**Review процесс:**
1. Reviewer оставляет комментарии
2. Author исправляет и пушит новые коммиты
3. Reviewer approves или requests changes
4. После approval → merge

### 6. Merge Strategies

**Выбор стратегии:**

| Ситуация | Стратегия | Команда |
|----------|-----------|---------|
| Feature branch (clean history) | **Squash and Merge** | Recommended |
| Hotfix (1-2 commits) | **Rebase and Merge** | Fast-forward |
| Multiple authors | **Merge Commit** | Preserve history |

**Squash and Merge (рекомендуется):**
```bash
# GitHub/GitLab делает автоматически через UI
# Или вручную:
git checkout main
git merge --squash feat/user-profile-page
git commit -m "feat(profile): add user profile page with edit functionality"
git push origin main
```

### 7. После Merge

```bash
# Удалить локальную ветку
git branch -d feat/user-profile-page

# Удалить remote ветку (если не сделал GitHub)
git push origin --delete feat/user-profile-page

# Обновить Memory Bank (Architect Mode)
# См. `.kilocode/workflows/protocol-review-merge.md`
```

## Hotfix Workflow

**КРИТИЧНО:** Для production bugs:

```bash
# 1. Создать hotfix ветку от main
git checkout main
git pull
git checkout -b fix/critical-payment-bug

# 2. Исправить БАГ
# ... code changes ...

# 3. Коммит с ЯСНЫМ описанием
git commit -m "fix(payment): resolve null pointer in payment validation

- Added null check before accessing payment.user
- Added test to prevent regression
- Fixes #123"

# 4. FAST review и merge
# Минимальный review, но ОБЯЗАТЕЛЬНЫЙ

# 5. Deploy немедленно
# 6. Post-mortem после инцидента
```

См. `.kilocode/workflows/hotfix-emergency.md` для детального процесса.

## Защита от ошибок

### Pre-commit Hooks (.husky или pre-commit)

```bash
#!/bin/sh
# .husky/pre-commit

npm run lint
npm run test:unit
```

### Pre-push Hooks

```bash
#!/bin/sh
# .husky/pre-push

npm test
npm run test:coverage
```

### Защищенные ветки

**main/master:**
- ❌ Direct push ЗАПРЕЩЁН
- ✅ Только через PR
- ✅ Requires review approval
- ✅ Status checks must pass
- ❌ Force push ЗАПРЕЩЁН

## Работа с Conflicts

```bash
# 1. Fetch latest main
git fetch origin main

# 2. Rebase на main (предпочтительно)
git rebase origin/main

# 3. Resolve conflicts
# ... fix conflicts in files ...
git add .
git rebase --continue

# 4. Force push (но аккуратно!)
git push origin feat/my-feature --force-with-lease
```

**Важно:** `--force-with-lease` безопаснее чем `--force`

## Git Best Practices

### DO:
- ✅ Commit often (atomic commits)
- ✅ Write meaningful commit messages
- ✅ Pull перед началом работы
- ✅ Run tests перед push
- ✅ Используй branches для каждой задачи
- ✅ Delete merged branches
- ✅ Используй git worktree для параллельных задач

### DON'T:
- ❌ Commit большие binary files (используй Git LFS)
- ❌ Commit secrets (.env, credentials)
- ❌ Force push на shared branches
- ❌ Rewrite history на public branches
- ❌ Commit commented-out code
- ❌ Huge commits (> 500 lines)

## `.gitignore` Essentials

```gitignore
# Dependencies
node_modules/
venv/
target/

# Build outputs
dist/
build/
*.pyc

# Secrets
.env
.env.local
credentials.json

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

## Автоматизация через AI

**Для AI агентов:**
- Git operations должны следовать этим правилам
- ВСЕГДА проверять tests перед commit
- НИКОГДА не skip pre-commit hooks (--no-verify)
- Автоматически генерировать PR descriptions
- Следовать Conventional Commits

## References

- Conventional Commits: https://www.conventionalcommits.org/
- Git Workflow: https://nvie.com/posts/a-successful-git-branching-model/
- `.kilocode/workflows/protocol-new.md` - Protocol workflow
- `.kilocode/workflows/hotfix-emergency.md` - Hotfix process
