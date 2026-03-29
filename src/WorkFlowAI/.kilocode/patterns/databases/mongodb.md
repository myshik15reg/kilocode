# MongoDB Patterns

> Паттерны работы с MongoDB

# MongoDB Patterns

## Подключение

```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient('mongodb://localhost:27017')
db = client.mydatabase
collection = db.users
```

## CRUD операции

```python
# Create
await collection.insert_one({"name": "John", "age": 30})

# Read
user = await collection.find_one({"name": "John"})

# Update
await collection.update_one(
    {"name": "John"},
    {"$set": {"age": 31}}
)

# Delete
await collection.delete_one({"name": "John"})
```

## Агрегация

```python
pipeline = [
    {"$match": {"status": "active"}},
    {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]

results = await collection.aggregate(pipeline).to_list(length=100)
```

## Индексы

```python
# Одиночный индекс
await collection.create_index("email", unique=True)

# Составной индекс
await collection.create_index([("user_id", 1), ("created_at", -1)])

# Текстовый индекс
await collection.create_index([("title", "text"), ("description", "text")])
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
