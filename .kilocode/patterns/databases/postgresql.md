# PostgreSQL Patterns

> Паттерны работы с PostgreSQL

# PostgreSQL Patterns

## Подключение

```python
# asyncpg (async)
import asyncpg

async def get_pool():
    return await asyncpg.create_pool(
        host='localhost',
        database='mydb',
        user='user',
        password='password',
        min_size=10,
        max_size=20
    )
```

## Транзакции

```python
async with pool.acquire() as conn:
    async with conn.transaction():
        await conn.execute("INSERT INTO users (name) VALUES ($1)", "John")
        await conn.execute("UPDATE accounts SET balance = balance - 100 WHERE user_id = 1")
```

## Индексы

```sql
-- B-tree (по умолчанию)
CREATE INDEX idx_users_email ON users(email);

-- Partial index
CREATE INDEX idx_active_users ON users(email) WHERE is_active = true;

-- GIN для полнотекстового поиска
CREATE INDEX idx_posts_search ON posts USING GIN(to_tsvector('russian', title || ' ' || content));
```

## Оптимизация запросов

1. **EXPLAIN ANALYZE** для анализа плана выполнения
2. Избегать SELECT *
3. Использовать индексы для WHERE, ORDER BY, JOIN
4. Партицирование для больших таблиц (> 10M строк)

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
