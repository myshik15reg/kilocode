# Prisma ORM Patterns

> Паттерны работы с Prisma

# Prisma ORM Patterns

## Schema Definition

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

## CRUD Operations

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Create
const user = await prisma.user.create({
  data: {
    email: 'john@example.com',
    name: 'John Doe',
    posts: {
      create: { title: 'First Post' }
    }
  }
})

// Read with relations
const userWithPosts = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
})

// Update
await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Jane Doe' }
})

// Delete
await prisma.user.delete({ where: { id: 1 } })
```

## Transactions

```typescript
await prisma.$transaction(async (tx) => {
  await tx.user.create({ data: { email: 'new@example.com' } })
  await tx.post.create({ data: { title: 'Post', authorId: 1 } })
})
```

---

## Best Practices

1. **Следуй официальной документации** - всегда проверяй актуальность паттернов
2. **Тестируй код** - все паттерны должны иметь unit-тесты
3. **Обрабатывай ошибки** - никогда не игнорируй исключения
4. **Логируй важные события** - для отладки и мониторинга
5. **Оптимизируй производительность** - профилируй критичные участки

## Дополнительные ресурсы

- Официальная документация
- Best practices от сообщества
- Актуальные примеры на GitHub
