# Redis Patterns

> Паттерны работы с Redis

# Redis Patterns

## Подключение

```python
import aioredis

redis = await aioredis.create_redis_pool('redis://localhost')
```

## Паттерны использования

### 1. Кэширование

```python
# Set с TTL
await redis.setex('user:1', 3600, json.dumps(user_data))

# Get
cached = await redis.get('user:1')
if cached:
    user_data = json.loads(cached)
```

### 2. Счетчики

```python
# Increment
await redis.incr('page:views')

# Get
views = int(await redis.get('page:views'))
```

### 3. Pub/Sub

```python
# Publisher
await redis.publish('notifications', json.dumps(message))

# Subscriber
async for message in channel.iter():
    process_notification(message)
```

### 4. Очереди (Lists)

```python
# Push
await redis.lpush('queue:tasks', task_id)

# Pop (blocking)
task_id = await redis.brpop('queue:tasks', timeout=5)
```

### 5. Sets для уникальности

```python
# Add
await redis.sadd('users:online', user_id)

# Check
is_online = await redis.sismember('users:online', user_id)

# Count
count = await redis.scard('users:online')
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
