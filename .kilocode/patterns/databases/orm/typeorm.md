# TypeORM Patterns

> Паттерны работы с TypeORM

# TypeORM Patterns

## Entity Definition

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  email: string

  @Column()
  name: string

  @OneToMany(() => Post, post => post.author)
  posts: Post[]

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date
}

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column('text', { nullable: true })
  content: string

  @ManyToOne(() => User, user => user.posts)
  author: User
}
```

## Repository Pattern

```typescript
import { AppDataSource } from './data-source'

const userRepository = AppDataSource.getRepository(User)

// Create
const user = userRepository.create({
  email: 'john@example.com',
  name: 'John'
})
await userRepository.save(user)

// Find with relations
const users = await userRepository.find({
  relations: ['posts']
})

// Query Builder
const users = await userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'posts')
  .where('user.email = :email', { email: 'john@example.com' })
  .getMany()
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
