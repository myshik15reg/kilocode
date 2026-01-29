# MySQL Patterns

## Основные принципы работы с MySQL

MySQL — одна из самых популярных реляционных СУБД с отличной производительностью и надежностью.

## Connection Management

```javascript
// Node.js с mysql2
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Использование connection pool
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}
```

## Best Practices

### 1. Используй Prepared Statements

```javascript
// ХОРОШО - защита от SQL injection
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE email = ?',
  [email]
);

// ПЛОХО - уязвимость SQL injection
const [rows] = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### 2. Транзакции

```javascript
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();

  await connection.execute(
    'INSERT INTO orders (user_id, total) VALUES (?, ?)',
    [userId, total]
  );

  await connection.execute(
    'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
    [quantity, productId]
  );

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### 3. Индексы

```sql
-- Создание индекса
CREATE INDEX idx_users_email ON users(email);

-- Composite index
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Проверка использования индексов
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

### 4. Connection Pooling

```python
# Python с mysql-connector-python
import mysql.connector.pooling

config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password',
    'database': 'mydb',
    'pool_name': 'mypool',
    'pool_size': 10
}

pool = mysql.connector.pooling.MySQLConnectionPool(**config)

def execute_query(query, params=None):
    conn = pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        result = cursor.fetchall()
        conn.commit()
        return result
    finally:
        cursor.close()
        conn.close()
```

## Performance Optimization

### Query Optimization

```sql
-- Используй LIMIT для пагинации
SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- Избегай SELECT *
SELECT id, name, price FROM products WHERE category = 'electronics';

-- Используй EXISTS вместо COUNT
SELECT EXISTS(SELECT 1 FROM users WHERE email = 'test@example.com');
```

### Кэширование

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function getUser(userId) {
  // Проверяем cache
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // Запрос к БД
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (rows.length > 0) {
    // Сохраняем в cache на 1 час
    await redis.setex(`user:${userId}`, 3600, JSON.stringify(rows[0]));
    return rows[0];
  }

  return null;
}
```

## Error Handling

```javascript
async function safeQuery(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return { success: true, data: results };
  } catch (error) {
    console.error('MySQL Error:', error);

    // Обработка специфичных ошибок
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, error: 'Duplicate entry' };
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return { success: false, error: 'Foreign key violation' };
    }

    return { success: false, error: 'Database error' };
  }
}
```

## Testing

```javascript
// Jest tests
const mysql = require('mysql2/promise');

describe('User Repository', () => {
  let connection;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'test_user',
      password: 'test_pass',
      database: 'test_db'
    });
  });

  afterAll(async () => {
    await connection.end();
  });

  beforeEach(async () => {
    await connection.execute('TRUNCATE TABLE users');
  });

  test('should insert user', async () => {
    const [result] = await connection.execute(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      ['test@example.com', 'Test User']
    );

    expect(result.affectedRows).toBe(1);
    expect(result.insertId).toBeGreaterThan(0);
  });
});
```

## Security

### SQL Injection Protection

```javascript
// ВСЕГДА используй параметризованные запросы
const safeEmail = req.body.email;
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE email = ?',
  [safeEmail]
);

// НИКОГДА не конкатенируй SQL напрямую
// ПЛОХО:
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
```

### Минимальные привилегии

```sql
-- Создание пользователя с ограниченными правами
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'secure_password';

-- Только необходимые привилегии
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_user'@'localhost';

-- Без доступа к DROP, ALTER, и т.д.
```

## Migrations

```javascript
// db-migrate пример
exports.up = function(db) {
  return db.createTable('products', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    name: { type: 'string', length: 255, notNull: true },
    price: { type: 'decimal', precision: 10, scale: 2, notNull: true },
    created_at: { type: 'timestamp', defaultValue: 'CURRENT_TIMESTAMP' }
  });
};

exports.down = function(db) {
  return db.dropTable('products');
};
```

## Monitoring

```javascript
// Мониторинг slow queries
const slowQueryThreshold = 1000; // ms

pool.on('connection', (connection) => {
  connection.on('query', (query) => {
    const startTime = Date.now();

    query.on('end', () => {
      const duration = Date.now() - startTime;

      if (duration > slowQueryThreshold) {
        console.warn(`Slow query (${duration}ms):`, query.sql);
      }
    });
  });
});
```

## Ресурсы

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [mysql2 package](https://github.com/sidorares/node-mysql2)
- [MySQL Performance Blog](https://www.percona.com/blog/)

---

**Последнее обновление:** 2025-12-30
**Версия:** 1.0
