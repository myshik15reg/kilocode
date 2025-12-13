# Neo4j Performance Benchmarks

Полная документация по performance тестированию Neo4j интеграции в Kilocode.

## Содержание

- [Обзор](#обзор)
- [Методология](#методология)
- [Эталонные результаты](#эталонные-результаты)
- [Метрики производительности](#метрики-производительности)
- [Сравнение с Semantic-Only поиском](#сравнение-с-semantic-only-поиском)
- [Рекомендации по оптимизации](#рекомендации-по-оптимизации)
- [Запуск benchmarks](#запуск-benchmarks)
- [Интерпретация результатов](#интерпретация-результатов)

---

## Обзор

Performance benchmarks для Neo4j интеграции измеряют производительность гибридной системы (Qdrant + Neo4j) и сравнивают её с semantic-only поиском.

### Цели benchmarking

1. **Валидация производительности** - проверка соответствия требованиям
2. **Выявление узких мест** - определение областей для оптимизации
3. **Прогнозирование масштабирования** - оценка поведения при росте кодовой базы
4. **Регрессионное тестирование** - отслеживание изменений производительности

### Измеряемые компоненты

- **Индексация** - скорость создания графа кода
- **Поиск** - латентность semantic, graph и hybrid поиска
- **Graph операции** - производительность traversal и analysis
- **Масштабирование** - поведение при увеличении размера кодовой базы

---

## Методология

### Тестовая среда

**Рекомендуемая конфигурация:**
- Neo4j 5.x (Community или Enterprise)
- Node.js 18+
- Минимум 8GB RAM
- SSD для Neo4j data directory

**Тестовая база данных:**
- Имя: `kilocode_benchmark_test`
- Изолирована от production данных
- Очищается перед каждым запуском

### Генерация тестовых данных

Benchmarks используют синтетические данные:

```typescript
// Каждый тестовый файл содержит:
- 10 entities (функции, классы)
- 9 relationships (вызовы между функциями)
- Реалистичные метаданные (имена, типы, позиции)

// Поддерживаемые языки:
- TypeScript
- Python
- Java
```

### Измерения

**Временные метрики:**
- `performance.now()` для точных замеров
- Усреднение по 3+ прогонам для стабильности
- Warm-up прогоны для JIT-оптимизации

**Метрики памяти:**
- `process.memoryUsage().heapUsed`
- Замер до и после операции
- Учёт garbage collection

**Throughput:**
- Операций в секунду
- Файлов в секунду для индексации

---

## Эталонные результаты

### Базовые ожидания

> **Примечание:** Результаты зависят от hardware, версии Neo4j и размера данных.

#### Индексация

| Операция | Файлы | Ожидаемое время | Threshold |
|----------|-------|-----------------|-----------|
| Batch indexing | 10 | 1-3s | < 5s |
| Batch indexing | 100 | 5-15s | < 30s |
| Batch indexing | 1000 | 60-180s | < 300s |
| Sequential indexing | 50 | 15-30s | - |

**Throughput:** 20-50 файлов/сек при batch индексации

#### Graph операции

| Операция | Ожидаемое время | Threshold |
|----------|-----------------|-----------|
| Create single entity | 2-5ms | < 10ms |
| Bulk create 100 entities | 30-60ms | < 100ms |
| Get dependencies (depth=2) | 10-30ms | < 50ms |
| Get dependents (depth=2) | 10-30ms | < 50ms |
| Impact analysis (depth=3) | 100-200ms | < 300ms |
| Find path (maxDepth=5) | 30-70ms | < 100ms |
| Search entities | 30-70ms | < 100ms |
| Get statistics | 10-30ms | < 50ms |

#### Память

| Операция | Ожидаемое использование |
|----------|-------------------------|
| 100 файлов | 20-40 MB |
| 1000 файлов | 150-250 MB |

### Сравнительная таблица

| Метрика | Semantic-Only | Hybrid (Qdrant+Neo4j) | Разница |
|---------|---------------|----------------------|---------|
| Search latency | 80-120ms | 120-180ms | +40-60ms |
| Result accuracy | Baseline | +15-25% | Лучше |
| Context awareness | Нет | Да | ✓ |
| Dependency tracking | Нет | Да | ✓ |
| Impact analysis | Нет | Да | ✓ |
| Memory overhead | Baseline | +50-100MB | Выше |

---

## Метрики производительности

### 1. Indexing Performance

**Что измеряем:**
- Время индексации N файлов
- Throughput (файлов/сек)
- Memory usage при индексации
- Batch vs Sequential сравнение
- Производительность по языкам

**Интерпретация:**
- ✅ **PASS**: < threshold времени
- ⚠️ **WARNING**: близко к threshold (>80%)
- ❌ **FAIL**: превышен threshold

**Факторы влияния:**
- Размер файлов
- Сложность AST
- Количество relationships
- Neo4j configuration
- Network latency (если remote Neo4j)

### 2. Search Performance

**Что измеряем:**
- Semantic search latency (Qdrant only)
- Graph search latency (Neo4j only)
- Hybrid search latency (комбинация)
- Точность результатов

**Целевые значения:**
- Semantic: < 150ms
- Graph: < 100ms
- Hybrid: < 200ms

### 3. Graph Operations

**Что измеряем:**
- CRUD операции (Create, Read, Update, Delete)
- Traversal операции (dependencies, dependents)
- Analysis операции (impact, path finding)
- Bulk операции vs single

**Оптимизация:**
- Используйте bulk операции где возможно
- Ограничивайте depth для traversal
- Кэшируйте часто используемые результаты

### 4. Scalability

**Проекции:**
- Линейное масштабирование: O(n)
- Логарифмическое: O(log n)
- Квадратичное: O(n²) - требует оптимизации

**Целевые метрики:**
- 10,000 файлов: < 10 минут индексации
- Search latency: стабильная независимо от размера
- Memory: < 500MB для 10,000 файлов

---

## Сравнение с Semantic-Only поиском

### Преимущества Hybrid подхода

#### 1. Точность результатов (+15-25%)

**Semantic-only:**
```
Query: "user authentication"
Results:
  1. login.ts (score: 0.85)
  2. auth-utils.ts (score: 0.78)
  3. user-service.ts (score: 0.72)
```

**Hybrid (Semantic + Graph):**
```
Query: "user authentication"
Results:
  1. login.ts (combined: 0.92) ← выше за счёт graph
     Dependencies: auth-utils.ts, user-service.ts
  2. auth-utils.ts (combined: 0.88)
     Used by: login.ts, signup.ts, password-reset.ts
  3. middleware/auth.ts (combined: 0.82) ← обнаружен через graph
     Calls: login.ts, session-manager.ts
```

#### 2. Context Awareness

- **Semantic:** находит похожий код
- **Hybrid:** находит похожий + связанный код

#### 3. Impact Analysis

Только в Hybrid:
```typescript
const impact = await getImpactGraph('auth-utils.ts:validateToken')
// Direct: 12 files
// Indirect: 47 files
// Impact score: 0.73 (high)
```

### Недостатки Hybrid подхода

#### 1. Увеличенная латентность (+40-60ms)

**Причины:**
- Дополнительный query к Neo4j
- Комбинирование результатов
- Graph traversal операции

**Mitigation:**
- Параллельные запросы к Qdrant и Neo4j
- Кэширование graph результатов
- Оптимизация Cypher queries

#### 2. Память (+50-100MB)

**Дополнительное использование:**
- Neo4j in-memory кэши
- Graph data structures
- Relationship индексы

#### 3. Сложность setup

- Требует Neo4j database
- Дополнительная конфигурация
- Поддержка двух систем

---

## Рекомендации по оптимизации

### 1. Neo4j Configuration

**Для production:**

```conf
# neo4j.conf

# Memory settings
dbms.memory.heap.initial_size=2G
dbms.memory.heap.max_size=4G
dbms.memory.pagecache.size=2G

# Transaction settings
dbms.transaction.timeout=60s

# Query settings
dbms.query.cache_size=1000

# Index settings
db.index_sampling.background_enabled=true
db.index_sampling.sample_size_limit=1000000
```

**Для development/benchmarks:**

```conf
# Меньше памяти
dbms.memory.heap.initial_size=512M
dbms.memory.heap.max_size=1G
dbms.memory.pagecache.size=512M

# Быстрее для testing
dbms.checkpoint.interval.time=15s
```

### 2. Индексация

**Best practices:**

```typescript
// ✅ DO: Bulk операции
await graphService.bulkCreateEntities(entities)
await graphService.bulkCreateRelationships(relationships)

// ❌ DON'T: Sequential single operations
for (const entity of entities) {
  await graphService.createEntity(entity) // Медленно!
}

// ✅ DO: Batch processing для больших наборов
const BATCH_SIZE = 1000
for (let i = 0; i < entities.length; i += BATCH_SIZE) {
  const batch = entities.slice(i, i + BATCH_SIZE)
  await graphService.bulkCreateEntities(batch)
}

// ✅ DO: Параллельная обработка когда возможно
await Promise.all([
  graphService.bulkCreateEntities(entities),
  qdrantService.indexDocuments(documents)
])
```

### 3. Query Optimization

**Ограничивайте depth:**

```typescript
// ❌ DON'T: Неограниченный traversal
const deps = await getDependencies(entityId) // может быть очень медленно

// ✅ DO: Ограниченный depth
const deps = await getDependencies(entityId, 3) // разумное ограничение
```

**Используйте фильтры:**

```typescript
// ✅ DO: Фильтрация на уровне базы
const results = await searchEntities(
  { type: 'function', language: 'typescript' },
  { limit: 50 }
)

// ❌ DON'T: Фильтрация в приложении
const all = await searchEntities({})
const filtered = all.filter(e => e.type === 'function') // Медленно!
```

### 4. Кэширование

**Стратегии:**

```typescript
// In-memory cache для частых queries
const cache = new Map<string, CacheEntry>()

async function getCachedImpact(entityId: string) {
  const cached = cache.get(entityId)
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data
  }
  
  const impact = await getImpactGraph(entityId)
  cache.set(entityId, { data: impact, timestamp: Date.now() })
  return impact
}
```

### 5. Monitoring

**Отслеживайте:**

- Query execution time
- Memory usage trends
- Cache hit rates
- Index efficiency

**Tools:**

```typescript
// Performance logging
console.time('indexing')
await indexFiles(files)
console.timeEnd('indexing')

// Memory tracking
const before = process.memoryUsage()
await operation()
const after = process.memoryUsage()
console.log(`Memory used: ${(after.heapUsed - before.heapUsed) / 1024 / 1024}MB`)
```

---

## Запуск benchmarks

### Быстрый старт

```bash
# Запуск всех benchmarks
npm run benchmark:neo4j

# или
pnpm benchmark:neo4j

# или напрямую
ts-node scripts/run-neo4j-benchmarks.ts
```

### Опции запуска

```bash
# Справка
npm run benchmark:neo4j -- --help

# Конкретный suite
npm run benchmark:neo4j -- --suite indexing
npm run benchmark:neo4j -- --suite graph
npm run benchmark:neo4j -- --suite memory
npm run benchmark:neo4j -- --suite scalability

# Сравнение с предыдущими результатами
npm run benchmark:neo4j -- --compare

# Экспорт результатов
npm run benchmark:neo4j -- --export ./my-results.json
```

### Environment переменные

```bash
# Neo4j connection
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=your_password

# Запуск
npm run benchmark:neo4j
```

### CI/CD Integration

```yaml
# .github/workflows/benchmarks.yml
name: Performance Benchmarks

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0' # Еженедельно

jobs:
  benchmark:
    runs-on: ubuntu-latest
    
    services:
      neo4j:
        image: neo4j:5-community
        env:
          NEO4J_AUTH: neo4j/benchmarkpass
        ports:
          - 7687:7687
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: pnpm install
      
      - name: Run benchmarks
        env:
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USERNAME: neo4j
          NEO4J_PASSWORD: benchmarkpass
        run: npm run benchmark:neo4j
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: src/services/neo4j/__tests__/benchmarks/results/
```

---

## Интерпретация результатов

### Понимание вывода

```
=== Neo4j Performance Benchmarks ===

Indexing Performance:
✅ PASS Index 10 TypeScript files: 2.34s (234ms/file) - 4.27 files/s - 23.5MB (threshold: 5s)
✅ PASS Index 100 TypeScript files: 18.92s (189ms/file) - 5.29 files/s - 156MB (threshold: 30s)
⚠️  WARN Index 1000 files (batched): 245.67s (246ms/file) - 4.07 files/s - 890MB (threshold: 300s)

Graph Operations:
✅ PASS Create single entity: 4.2ms (threshold: 10ms)
✅ PASS Bulk create 100 entities: 67.8ms - 1475/s (threshold: 100ms)
✅ PASS Impact analysis (depth=3): 187ms (threshold: 300ms)
  Found 8 direct + 23 indirect impacts

Memory Usage:
✅ PASS Memory usage (100 files): 0ms - 34.52MB
⚠️  WARN Memory usage (1000 files, batched): 0ms - 234.89MB

Verdict: ✅ 15/16 benchmarks PASSED (93.8%)
```

### Анализ результатов

**✅ PASS (Зелёный)**
- Производительность в норме
- Можно использовать в production
- Никаких действий не требуется

**⚠️ WARN (Жёлтый)**
- Близко к threshold (>80%)
- Рекомендуется оптимизация
- Мониторинг при росте данных

**❌ FAIL (Красный)**
- Превышен threshold
- Требуется оптимизация
- Не рекомендуется для production

### Сравнение с историей

```
Comparison:
  Current:  2024-01-15T10:30:00.000Z
  Previous: 2024-01-08T10:30:00.000Z

Improvements:
  ↓ Index 100 TypeScript files: -12.3% (21.6s → 18.9s)
  ↓ Impact analysis (depth=3): -8.7% (205ms → 187ms)

Regressions:
  ↑ Bulk create 100 entities: +15.2% (58.8ms → 67.8ms)
```

### Действия при регрессиях

1. **Проверьте изменения кода**
   - Что изменилось между версиями?
   - Новые features добавлены?

2. **Проверьте окружение**
   - Neo4j версия не изменилась?
   - Достаточно ресурсов?

3. **Профилирование**
   - Где именно тратится время?
   - Memory leaks?

4. **Оптимизация**
   - Применить рекомендации выше
   - Refactoring проблемных участков

---

## Заключение

Performance benchmarks - критически важный инструмент для:

- ✅ Валидации производительности Neo4j интеграции
- ✅ Выявления узких мест до production
- ✅ Отслеживания регрессий
- ✅ Планирования масштабирования

Регулярно запускайте benchmarks:
- При каждом PR с изменениями Neo4j кода
- Еженедельно в CI/CD
- Перед major releases

**Целевые метрики:**
- Индексация: < 30s для 100 файлов
- Search: < 200ms hybrid latency
- Graph ops: < 300ms impact analysis
- Memory: < 250MB для 1000 файлов

Следуйте рекомендациям по оптимизации для достижения этих целей.

---

## Дополнительные ресурсы

- [Neo4j Performance Tuning Guide](https://neo4j.com/docs/operations-manual/current/performance/)
- [Cypher Query Optimization](https://neo4j.com/docs/cypher-manual/current/query-tuning/)
- [Kilocode Neo4j Architecture](./neo4j-hybrid-architecture.md)
- [Neo4j Configuration Guide](./neo4j-configuration.md)