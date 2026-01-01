# Workflow: Documentation (documentation-workflow)

## Описание
Workflow для создания и обновления технической документации. Обеспечивает актуальность, полноту и качество документации для кода, API и архитектурных решений.

## Когда использовать
- Создание документации для новых фич
- Обновление документации после изменений кода
- Создание API документации
- Документирование архитектурных решений (ADR)
- Обновление README и getting started guides

---

## Принципы документации

### Documentation as Code
- Документация хранится рядом с кодом
- Версионируется вместе с кодом
- Проверяется в CI/CD
- Обновляется в тех же PR, что и код

### Layers of Documentation
1. **Code-level** (JSDoc, docstrings) - встроенная документация
2. **API-level** (OpenAPI, GraphQL schemas) - контракты API
3. **Architecture-level** (ADRs, diagrams) - дизайн решения
4. **User-level** (README, guides) - как использовать

### Качественная документация
- **Актуальная** - обновляется вместе с кодом
- **Точная** - без противоречий с реальностью
- **Полная** - покрывает все важные аспекты
- **Понятная** - для целевой аудитории
- **Примеры** - показывают реальное использование

---

## Phase 1: Планирование документации

### Шаг 1.1: Определение scope
**Агент:** business-analyst (анализ требований к документации)

**Действия:**
1. Определить целевую аудиторию:
   - Разработчики команды
   - External API consumers
   - DevOps/Infrastructure team
   - End users
2. Определить типы документации:
   - Code documentation (JSDoc/docstrings)
   - API documentation (OpenAPI/Swagger)
   - Architecture Decision Records (ADR)
   - User guides/README
   - Deployment documentation
3. Оценить текущее состояние документации

**Выход:**
```markdown
# Documentation Scope

## Audience
- Primary: Internal developers
- Secondary: External API consumers

## Types Required
- [ ] Code-level (JSDoc)
- [ ] API docs (OpenAPI)
- [ ] ADR for architecture decision
- [ ] README updates
- [ ] Deployment guide

## Current State
- Code coverage: 40%
- API docs: outdated
- ADR: missing
```

### Шаг 1.2: Создание documentation plan
**Агент:** technical-writer

**Действия:**
1. Создать структуру документации
2. Определить формат и стандарты
3. Установить ownership и review process
4. Создать чеклист для каждого типа

**Выход:** Documentation plan в `.protocols/{protocol}/docs-plan.md`

---

## Phase 2: Code-Level Documentation

### Шаг 2.1: JSDoc/Docstrings для функций
**Агенты:** {language}-developer (по языку проекта)

**Стандарты:**

**JavaScript/TypeScript (JSDoc):**
```typescript
/**
 * Calculates the total price with discount applied
 *
 * @description Applies percentage discount to cart total.
 * Handles edge cases like negative prices and invalid discounts.
 *
 * @param {CartItem[]} items - Array of cart items
 * @param {number} discount - Discount percentage (0-100)
 * @returns {number} Total price after discount
 * @throws {ValidationError} If discount is invalid or items are empty
 *
 * @example
 * ```typescript
 * const total = calculateTotal(
 *   [{ price: 100 }, { price: 200 }],
 *   10
 * );
 * // Returns: 270
 * ```
 */
function calculateTotal(items: CartItem[], discount: number): number {
  // Implementation
}
```

**Python (Docstrings):**
```python
def calculate_total(items: list[CartItem], discount: float) -> float:
    """
    Calculate the total price with discount applied.

    Applies percentage discount to cart total.
    Handles edge cases like negative prices and invalid discounts.

    Args:
        items: Array of cart items with price property
        discount: Discount percentage (0-100)

    Returns:
        Total price after discount as float

    Raises:
        ValidationError: If discount is invalid or items are empty

    Examples:
        >>> total = calculate_total(
        ...     [CartItem(price=100), CartItem(price=200)],
        ...     10
        ... )
        >>> total
        270.0
    """
    # Implementation
```

**Чеклист для code documentation:**
- [ ] Описание назначения функции
- [ ] Документация всех параметров с типами
- [ ] Документация return value
- [ ] Документация исключений (throws/raises)
- [ ] Минимум 1 пример использования
- [ ] Описание edge cases
- [ ] Links к связанным функциям/документации

### Шаг 2.2: Проверка code documentation
**Агент:** code-reviewer

**Действия:**
1. Проверить coverage документации:
   ```bash
   # TypeScript
   npm run docs:coverage

   # Python
   pydocstyle src/
   interrogate -v src/
   ```
2. Verify примеры работают (doctests)
3. Проверить соответствие стандартам

**Acceptance criteria:**
- Минимум 80% публичных функций документированы
- Все примеры проходят проверку
- Нет ошибок линтера документации

---

## Phase 3: API Documentation

### Шаг 3.1: OpenAPI/Swagger спецификация
**Агент:** api-architect

**Формат OpenAPI 3.0:**
```yaml
openapi: 3.0.0
info:
  title: User Management API
  version: 1.0.0
  description: |
    API for managing user accounts and profiles.

    ## Authentication
    All endpoints require Bearer token in Authorization header.

    ## Rate Limiting
    100 requests per minute per API key.

  contact:
    name: API Support
    email: api@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List all users
      description: |
        Returns paginated list of users with optional filtering.

        ## Permissions
        Requires `users:read` scope.

      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          description: Page number (1-based)
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          description: Items per page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
              examples:
                default:
                  value:
                    users:
                      - id: "user_123"
                        email: "john@example.com"
                        name: "John Doe"
                    pagination:
                      page: 1
                      total: 100
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          description: Unique user identifier
          example: "user_123"
        email:
          type: string
          format: email
          description: User's email address
        name:
          type: string
          description: Full name

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

**Действия:**
1. Создать/обновить OpenAPI спецификацию
2. Добавить примеры для каждого endpoint
3. Документировать все параметры и responses
4. Добавить описание authentication и authorization
5. Описать rate limiting и error handling

**Генерация документации:**
```bash
# Generate HTML docs from OpenAPI
npx @redocly/cli build-docs openapi.yaml

# Validate OpenAPI spec
npx @redocly/cli lint openapi.yaml
```

### Шаг 3.2: GraphQL Schema Documentation
**Агент:** api-architect

**Для GraphQL API:**
```graphql
"""
User account in the system.

## Permissions
Requires authentication to query user data.

## Examples
```graphql
query {
  user(id: "user_123") {
    id
    email
    profile {
      name
      avatar
    }
  }
}
```
"""
type User {
  "Unique identifier"
  id: ID!

  "User's email address (unique)"
  email: String!

  "Display name"
  name: String

  "User profile information"
  profile: UserProfile

  "User's roles and permissions"
  roles: [Role!]!

  "Timestamp of account creation"
  createdAt: DateTime!
}

"""
Query user by ID or email.

## Authentication
Requires valid JWT token.

## Rate Limiting
100 requests per minute.

## Examples
```graphql
query GetUser {
  user(id: "user_123") {
    id
    email
  }
}
```
"""
type Query {
  user(
    "User ID"
    id: ID

    "User email address"
    email: String
  ): User
}
```

---

## Phase 4: Architecture Decision Records (ADR)

### Шаг 4.1: Создание ADR
**Агент:** solution-architect

**Шаблон ADR:**
```markdown
# ADR-{number}: {Title}

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Deciders:** @username1, @username2
**Tags:** architecture, database, performance

## Context
<!-- Описание ситуации и проблемы -->

В нашем приложении требуется хранить данные пользователей с возможностью
быстрого поиска по различным атрибутам. Текущее решение (MySQL)
показывает деградацию производительности при росте данных.

**Требования:**
- Поддержка 1M+ пользователей
- Поиск по email, phone, username
- Latency < 50ms для 95 percentile
- Высокая доступность (99.9%)

**Constraints:**
- Бюджет на инфраструктуру ограничен
- Команда знакома с SQL и NoSQL
- Должна быть возможность self-hosting

## Decision
<!-- Принятое решение -->

**Решение:** Использовать PostgreSQL с полнотекстовым поиском и Redis для кэширования.

**Rationale:**
1. PostgreSQL предоставляет ACID гарантии для критичных данных
2. Full-text search индексы решают проблему поиска
3. Redis cache снижает latency для частых запросов
4. Команда имеет опыт работы с обеими технологиями
5. Возможность self-hosting на собственной инфраструктуре

## Alternatives Considered
<!-- Рассмотренные альтернативы -->

### Alternative 1: MongoDB
**Pros:**
- Гибкая схема данных
- Встроенный full-text search
- Горизонтальное масштабирование

**Cons:**
- Отсутствие ACID транзакций (до версии 4.0)
- Команда менее опытна в MongoDB
- Сложнее гарантировать консистентность данных

**Rejected because:** Критичность ACID гарантий для пользовательских данных

### Alternative 2: Elasticsearch
**Pros:**
- Отличный full-text search
- Масштабируемость
- Analytics capabilities

**Cons:**
- Высокая стоимость инфраструктуры
- Overkill для наших требований
- Не primary database (нужен дополнительный storage)

**Rejected because:** Избыточность и стоимость

## Consequences
<!-- Последствия решения -->

### Positive
- Улучшение производительности поиска (95p latency < 30ms)
- Сохранение ACID гарантий
- Использование знакомых технологий
- Снижение затрат на инфраструктуру

### Negative
- Усложнение архитектуры (PostgreSQL + Redis)
- Необходимость синхронизации кэша
- Дополнительные операционные расходы на Redis

### Risks
- Cache invalidation complexity
- Возможные race conditions при обновлении
- Increased operational overhead

### Mitigation
- Использовать Redis pub/sub для инвалидации кэша
- Pessimistic locking для критических операций
- Мониторинг cache hit rate и latency

## Implementation
<!-- План реализации -->

### Phase 1: PostgreSQL Migration (Week 1-2)
1. Setup PostgreSQL cluster
2. Migrate schema from MySQL
3. Create full-text search indexes
4. Performance testing

### Phase 2: Redis Integration (Week 3)
1. Setup Redis cluster
2. Implement caching layer
3. Cache invalidation strategy
4. Load testing

### Phase 3: Monitoring (Week 4)
1. Setup metrics (latency, hit rate)
2. Alerting configuration
3. Performance benchmarks

## Compliance
<!-- Соответствие требованиям -->

- [ ] Security review completed
- [ ] Performance requirements validated
- [ ] Cost analysis approved
- [ ] Team training scheduled

## References
<!-- Ссылки -->

- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Redis Caching Patterns](https://redis.io/topics/lru-cache)
- Performance benchmark results: `docs/benchmarks/db-comparison.md`
- Related ADRs: ADR-005 (Database Schema Design)

## Notes
<!-- Дополнительные заметки -->

Decision made after 2-week evaluation period with prototyping.
Team voted 5:1 in favor of this approach.
```

**Чеклист для ADR:**
- [ ] Четкий контекст и проблема
- [ ] Обоснование решения
- [ ] Минимум 2 альтернативы рассмотрены
- [ ] Последствия (положительные и отрицательные)
- [ ] План реализации
- [ ] Метрики успеха определены
- [ ] Ссылки на related документацию

---

## Phase 5: User Documentation

### Шаг 5.1: README.md
**Агент:** technical-writer

**Структура README:**
```markdown
# Project Name

> One-line description of what this project does

[![Build Status](badge-url)](build-url)
[![Coverage](badge-url)](coverage-url)
[![License](badge-url)](license-url)

## Overview

Brief description (2-3 sentences) explaining:
- What problem this solves
- Who it's for
- Key benefits

## Features

- ✅ Feature 1 with brief description
- ✅ Feature 2 with brief description
- ✅ Feature 3 with brief description
- 🚧 Upcoming feature (in development)

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 7.0

### Installation

```bash
# Clone repository
git clone https://github.com/org/repo.git
cd repo

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Usage

```typescript
import { UserService } from './services';

const userService = new UserService();
const user = await userService.create({
  email: 'user@example.com',
  name: 'John Doe'
});
```

## Documentation

- [API Documentation](docs/api.md)
- [Architecture Decisions](docs/adr/)
- [Development Guide](docs/development.md)
- [Deployment Guide](docs/deployment.md)

## Development

### Project Structure

```
src/
├── components/     # UI components
├── services/       # Business logic
├── utils/          # Utility functions
├── types/          # TypeScript types
└── tests/          # Test files
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Formatting
npm run format
```

## Deployment

See [Deployment Guide](docs/deployment.md) for detailed instructions.

Quick deploy to production:
```bash
npm run build
npm run deploy:prod
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## Support

- Documentation: https://docs.example.com
- Issues: https://github.com/org/repo/issues
- Discussions: https://github.com/org/repo/discussions
- Email: support@example.com

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
```

### Шаг 5.2: Getting Started Guide
**Агент:** technical-writer

**Структура:**
```markdown
# Getting Started Guide

## Introduction

This guide will help you set up and run [Project Name] in 15 minutes.

## What You'll Build

By the end of this guide, you'll have:
- ✅ Local development environment
- ✅ Running application
- ✅ Created your first user
- ✅ Made your first API call

## Step 1: Prerequisites

### Required Software
- [ ] Node.js 18+ ([download](https://nodejs.org))
- [ ] PostgreSQL 14+ ([download](https://postgresql.org))
- [ ] Git ([download](https://git-scm.com))

### Verify Installation
```bash
node --version  # Should be >= 18.0.0
psql --version  # Should be >= 14.0
git --version
```

## Step 2: Clone and Install

```bash
git clone https://github.com/org/repo.git
cd repo
npm install
```

**Troubleshooting:**
- If `npm install` fails, try `npm install --legacy-peer-deps`
- On Windows, run as Administrator if permission errors occur

## Step 3: Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb

# Redis
REDIS_URL=redis://localhost:6379

# Application
PORT=3000
NODE_ENV=development
```

3. Create database:
```bash
npm run db:create
npm run db:migrate
```

## Step 4: Run the Application

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:3000
Database connected
Ready to accept requests
```

## Step 5: Test It Works

Open http://localhost:3000/health in your browser.

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Next Steps

✅ Your environment is ready! Here's what to explore next:

1. **Create Your First User**
   - Tutorial: [docs/tutorials/create-user.md](docs/tutorials/create-user.md)

2. **Explore the API**
   - API Documentation: [docs/api.md](docs/api.md)
   - Interactive API Explorer: http://localhost:3000/api-docs

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Read Architecture Docs**
   - [Architecture Overview](docs/architecture.md)
   - [Key Concepts](docs/concepts.md)

## Common Issues

### Port 3000 already in use
```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change PORT in .env
```

### Database connection failed
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l`

### Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Get Help

Stuck? We're here to help:
- 📖 [Documentation](https://docs.example.com)
- 💬 [Discord Community](https://discord.gg/example)
- 🐛 [Report Issue](https://github.com/org/repo/issues)
```

---

## Phase 6: Documentation Quality & Maintenance

### Шаг 6.1: Documentation Review
**Агент:** code-reviewer + technical-writer

**Review Checklist:**
- [ ] **Accuracy** - информация соответствует коду
- [ ] **Completeness** - все важные аспекты покрыты
- [ ] **Clarity** - понятно для целевой аудитории
- [ ] **Examples** - работающие примеры кода
- [ ] **Up-to-date** - нет outdated информации
- [ ] **Links** - все ссылки работают
- [ ] **Formatting** - корректная разметка Markdown
- [ ] **Spelling** - нет опечаток

**Automated checks:**
```bash
# Check markdown formatting
npm run docs:lint

# Check for broken links
npm run docs:check-links

# Spell check
npm run docs:spell-check

# Validate code examples
npm run docs:validate-examples
```

### Шаг 6.2: Documentation Testing
**Агент:** qa-engineer

**Действия:**
1. **Verify code examples:**
   - Extract code examples from documentation
   - Run them in isolated environment
   - Ensure they produce expected results

2. **Test getting started guide:**
   - Follow guide step-by-step in clean environment
   - Document any issues or unclear steps

3. **Validate API documentation:**
   - Compare with actual API responses
   - Test all documented endpoints
   - Verify error responses match docs

**Example test:**
```typescript
// Test that code example from docs works
describe('Documentation Examples', () => {
  test('User creation example from README works', async () => {
    // Copy-paste code from README
    const userService = new UserService();
    const user = await userService.create({
      email: 'user@example.com',
      name: 'John Doe'
    });

    // Verify it works
    expect(user.id).toBeDefined();
    expect(user.email).toBe('user@example.com');
  });
});
```

### Шаг 6.3: Documentation CI/CD
**Агент:** devops-engineer

**Automated Pipeline:**
```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  pull_request:
    paths:
      - 'docs/**'
      - '**/*.md'
      - 'openapi.yaml'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Lint Markdown
        run: npm run docs:lint

  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate OpenAPI
        run: npx @redocly/cli lint openapi.yaml
      - name: Check links
        run: npm run docs:check-links

  test-examples:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test code examples
        run: npm run docs:validate-examples

  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Build docs
        run: npm run docs:build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs-build
```

---

## Checklist: Завершение документации

### Pre-merge Checklist
- [ ] Code documentation (JSDoc/docstrings) для всех публичных API
- [ ] API documentation обновлена (OpenAPI/GraphQL)
- [ ] ADR создан (если архитектурные изменения)
- [ ] README обновлен (если изменился setup/usage)
- [ ] Getting started guide актуален
- [ ] Все примеры кода протестированы
- [ ] Нет broken links
- [ ] Spelling check пройден
- [ ] CI/CD checks passed
- [ ] Peer review документации выполнен

### Post-merge Tasks
- [ ] Documentation deployed to docs site
- [ ] Changelog обновлен
- [ ] Release notes created (если release)
- [ ] Team notified о changes
- [ ] Memory Bank обновлен (architecture.md, context.md)

---

## Integration with Memory Bank

### Обновление Memory Bank после документирования
**Агент:** orchestrator (Architect Mode)

**Действия:**
1. Update `.kilocode/rules/memory-bank/architecture.md`:
   - Добавить ссылки на ADRs
   - Обновить architecture decisions

2. Update `.kilocode/rules/memory-bank/tech.md`:
   - Обновить версии и зависимости
   - Добавить новые tech stack components

3. Update `.kilocode/rules/memory-bank/context.md`:
   - Отметить завершенные документационные задачи
   - Добавить links к новой документации

---

## Reference Materials

### Documentation Tools
- **JSDoc**: https://jsdoc.app/
- **TypeDoc**: https://typedoc.org/
- **Sphinx** (Python): https://www.sphinx-doc.org/
- **OpenAPI/Swagger**: https://swagger.io/
- **Redoc**: https://redocly.com/redoc/
- **GraphQL Playground**: https://github.com/graphql/graphql-playground

### Best Practices
- [Write the Docs](https://www.writethedocs.org/)
- [Google Technical Writing Guide](https://developers.google.com/tech-writing)
- [ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record)

### Related Workflows
- [protocol-new.md](.kilocode/workflows/protocol-new.md) - создание протокола
- [protocol-review-merge.md](.kilocode/workflows/protocol-review-merge.md) - review процесс

### Related Patterns
- [code-standards.md](.kilocode/patterns/code-standards.md)
- [testing.md](.kilocode/patterns/testing.md)

### Related Agents
- **technical-writer** - `.kilocode/agents/documentation/technical-writer/`
- **api-documentalist** - `.kilocode/agents/documentation/api-documentalist/`
- **solution-architect** - `.kilocode/agents/architecture/solution-architect/`
