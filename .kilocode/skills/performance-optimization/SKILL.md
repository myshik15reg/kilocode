---
name: performance-optimization
description: Identify, analyze, and resolve performance bottlenecks.
---

# Performance Optimization Skill

## Purpose
This skill provides systematic approaches to identify, analyze, and resolve performance bottlenecks in applications, ensuring optimal speed, responsiveness, and resource utilization.

## Triggers
Use this skill when:
- Application performance is slow
- High resource consumption detected
- User complaints about speed
- Need to optimize before scaling
- Periodic performance audits
- Before production deployment

## Context
Before optimizing performance, this skill reads:
- `.kilocode/memory-bank/tech.md` - Technology stack and constraints
- `.kilocode/memory-bank/architecture.md` - Architecture patterns
- `.kilocode/patterns/` - Language-specific optimization patterns

## Workflow

### Step 1: Identify Performance Issues (Profiling)

#### Establish Baseline Metrics

**Key Performance Indicators (KPIs):**
- Response time (API endpoints)
- Time to First Byte (TTFB)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Memory usage
- CPU usage
- Database query time
- Network requests

**Tools for Measurement:**

```bash
# Frontend Performance
npm install --save-dev lighthouse
lighthouse https://your-app.com --view

# Backend Performance (Node.js)
npm install --save-dev clinic
clinic doctor -- node app.js

# Database Profiling
# PostgreSQL
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

# MongoDB
db.collection.find().explain("executionStats")
```

#### Profile the Application

**Node.js/JavaScript:**
```bash
# CPU Profiling
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Memory Profiling
node --inspect app.js
# Then use Chrome DevTools Memory Profiler
```

**Python:**
```python
# CPU Profiling
import cProfile
import pstats

cProfile.run('main()', 'output.prof')

stats = pstats.Stats('output.prof')
stats.sort_stats('cumulative')
stats.print_stats(20)

# Memory Profiling
from memory_profiler import profile

@profile
def my_function():
    # Your code here
    pass
```

**Rust:**
```bash
# Profiling with cargo-flamegraph
cargo install flamegraph
cargo flamegraph --bin my-app

# Benchmarking
cargo bench
```

### Step 2: Analyze Bottlenecks

#### Common Performance Issues

**1. Database Performance**

**N+1 Query Problem:**
```typescript
// ❌ BAD: N+1 queries (1 + N queries)
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}

// ✅ GOOD: Single query with join (1 query)
const users = await User.findAll({
  include: [Post]
});
```

**Missing Indexes:**
```sql
-- ❌ Slow: Full table scan
SELECT * FROM users WHERE email = 'test@example.com';

-- ✅ Fast: Index scan
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'test@example.com';
```

**Inefficient Queries:**
```sql
-- ❌ BAD: Loading all columns
SELECT * FROM users WHERE id = 1;

-- ✅ GOOD: Select only needed columns
SELECT id, name, email FROM users WHERE id = 1;

-- ❌ BAD: Using LIKE with leading wildcard
SELECT * FROM products WHERE name LIKE '%widget%';

-- ✅ GOOD: Full-text search
CREATE INDEX idx_products_name_fts ON products USING GIN(to_tsvector('english', name));
SELECT * FROM products WHERE to_tsvector('english', name) @@ to_tsquery('widget');
```

**2. Memory Issues**

**Memory Leaks:**
```typescript
// ❌ BAD: Event listener not removed
class Component {
  constructor() {
    window.addEventListener('resize', this.handleResize);
  }
  // Leak: listener never removed!
}

// ✅ GOOD: Proper cleanup
class Component {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
```

**Large Object Retention:**
```typescript
// ❌ BAD: Keeping large objects in memory
const cache = new Map();

function processData(id: string) {
  if (!cache.has(id)) {
    cache.set(id, loadHugeDataset(id)); // Never cleared!
  }
  return cache.get(id);
}

// ✅ GOOD: LRU cache with size limit
import LRU from 'lru-cache';

const cache = new LRU({
  max: 100,
  maxAge: 1000 * 60 * 60 // 1 hour
});

function processData(id: string) {
  if (!cache.has(id)) {
    cache.set(id, loadHugeDataset(id));
  }
  return cache.get(id);
}
```

**3. CPU-Intensive Operations**

**Inefficient Algorithms:**
```typescript
// ❌ BAD: O(n²) complexity
function findDuplicates(arr: number[]): number[] {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

// ✅ GOOD: O(n) complexity
function findDuplicates(arr: number[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const num of arr) {
    if (seen.has(num)) {
      duplicates.add(num);
    } else {
      seen.add(num);
    }
  }

  return Array.from(duplicates);
}
```

**4. Network Performance**

**Too Many Requests:**
```typescript
// ❌ BAD: Sequential requests
async function loadUserData(userId: string) {
  const user = await fetch(`/api/users/${userId}`);
  const posts = await fetch(`/api/users/${userId}/posts`);
  const comments = await fetch(`/api/users/${userId}/comments`);
  return { user, posts, comments };
}

// ✅ GOOD: Parallel requests
async function loadUserData(userId: string) {
  const [user, posts, comments] = await Promise.all([
    fetch(`/api/users/${userId}`),
    fetch(`/api/users/${userId}/posts`),
    fetch(`/api/users/${userId}/comments`)
  ]);
  return { user, posts, comments };
}

// ✅ EVEN BETTER: Single endpoint with aggregated data
async function loadUserData(userId: string) {
  return fetch(`/api/users/${userId}?include=posts,comments`);
}
```

**Large Payloads:**
```typescript
// ❌ BAD: No pagination
async function getUsers() {
  return fetch('/api/users'); // Could return 100k records!
}

// ✅ GOOD: Pagination
async function getUsers(page = 1, limit = 50) {
  return fetch(`/api/users?page=${page}&limit=${limit}`);
}

// ✅ GOOD: Compression
app.use(compression()); // Gzip/Brotli compression
```

### Step 3: Apply Optimizations

#### Database Optimizations

**1. Add Indexes**
```sql
-- Identify slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add appropriate indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Composite index for multiple columns
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);
```

**2. Query Optimization**
```typescript
// ❌ BAD: Loading all data
const users = await db.users.findAll();

// ✅ GOOD: Pagination and selective fields
const users = await db.users.findAll({
  attributes: ['id', 'name', 'email'],
  limit: 50,
  offset: page * 50,
  order: [['created_at', 'DESC']]
});
```

**3. Caching**
```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function getUser(id: string): Promise<User> {
  // Check cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss: fetch from database
  const user = await db.users.findById(id);

  // Store in cache
  await redis.set(
    `user:${id}`,
    JSON.stringify(user),
    'EX', 3600 // Expire in 1 hour
  );

  return user;
}
```

**4. Connection Pooling**
```typescript
// ❌ BAD: New connection per request
const db = new Database({
  host: 'localhost',
  database: 'myapp'
});

// ✅ GOOD: Connection pool
const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  max: 20,          // Maximum connections
  min: 5,           // Minimum connections
  idle: 10000       // Connection idle timeout
});
```

#### Backend Optimizations

**1. Async Processing**
```typescript
// ❌ BAD: Synchronous heavy operation
app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);
  await sendWelcomeEmail(user); // Blocks response!
  await updateAnalytics(user);  // Blocks response!
  res.json(user);
});

// ✅ GOOD: Queue background jobs
app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);

  // Queue background jobs (don't wait)
  queue.add('send-email', { userId: user.id });
  queue.add('update-analytics', { userId: user.id });

  res.json(user);
});
```

**2. Memoization**
```typescript
// ❌ BAD: Recalculating expensive operation
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// ✅ GOOD: Memoized
const memo = new Map<number, number>();

function fibonacci(n: number): number {
  if (n <= 1) return n;

  if (memo.has(n)) {
    return memo.get(n)!;
  }

  const result = fibonacci(n - 1) + fibonacci(n - 2);
  memo.set(n, result);
  return result;
}
```

**3. Lazy Loading**
```typescript
// ❌ BAD: Loading all modules upfront
import { HugeModule } from './huge-module';
import { AnotherHugeModule } from './another-huge';

// ✅ GOOD: Dynamic imports
async function processData() {
  const { HugeModule } = await import('./huge-module');
  return new HugeModule().process();
}
```

**4. Rate Limiting & Throttling**
```typescript
import rateLimit from 'express-rate-limit';

// Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Max 100 requests per window
});

app.use('/api/', limiter);
```

#### Frontend Optimizations

**1. Code Splitting**
```typescript
// ❌ BAD: Everything in one bundle
import Dashboard from './Dashboard';
import Profile from './Profile';
import Settings from './Settings';

// ✅ GOOD: Route-based code splitting
const Dashboard = lazy(() => import('./Dashboard'));
const Profile = lazy(() => import('./Profile'));
const Settings = lazy(() => import('./Settings'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

**2. Image Optimization**
```typescript
// ❌ BAD: Large unoptimized images
<img src="photo.jpg" alt="Photo" />

// ✅ GOOD: Optimized with responsive images
<picture>
  <source srcset="photo-small.webp" media="(max-width: 600px)" type="image/webp" />
  <source srcset="photo-medium.webp" media="(max-width: 1200px)" type="image/webp" />
  <source srcset="photo-large.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" loading="lazy" />
</picture>
```

**3. Virtualization for Long Lists**
```typescript
// ❌ BAD: Rendering 10,000 items
{items.map(item => <Item key={item.id} item={item} />)}

// ✅ GOOD: Virtual scrolling (only render visible items)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <Item style={style} item={items[index]} />
  )}
</FixedSizeList>
```

**4. Debouncing & Throttling**
```typescript
// ❌ BAD: Search on every keystroke
<input onChange={e => search(e.target.value)} />

// ✅ GOOD: Debounced search
import { debounce } from 'lodash';

const debouncedSearch = debounce(search, 300);
<input onChange={e => debouncedSearch(e.target.value)} />
```

**5. React Optimizations**
```typescript
// ❌ BAD: Re-rendering unnecessarily
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild data={data} /> {/* Re-renders on every count change! */}
    </>
  );
}

// ✅ GOOD: Memoized child
const MemoizedChild = memo(ExpensiveChild);

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <MemoizedChild data={data} /> {/* Only re-renders if data changes */}
    </>
  );
}

// ✅ GOOD: useMemo for expensive calculations
function Component({ items }) {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + item.value, 0);
  }, [items]);

  return <div>{expensiveValue}</div>;
}

// ✅ GOOD: useCallback for stable function references
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // Function identity stays stable

  return <MemoizedChild onClick={handleClick} />;
}
```

### Step 4: Measure Impact

#### Before & After Comparison

```typescript
// Benchmark helper
class PerformanceBenchmark {
  private start: number = 0;

  begin() {
    this.start = performance.now();
  }

  end(label: string) {
    const duration = performance.now() - this.start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

// Usage
const benchmark = new PerformanceBenchmark();

benchmark.begin();
await slowOperation();
benchmark.end('Slow operation');

benchmark.begin();
await optimizedOperation();
benchmark.end('Optimized operation');
```

#### Metrics to Track

```markdown
## Performance Improvement Report

### Baseline Metrics (Before)
- API Response Time: 850ms
- Database Query Time: 420ms
- Memory Usage: 512 MB
- CPU Usage: 65%
- Page Load Time: 3.2s
- Lighthouse Score: 62/100

### Optimized Metrics (After)
- API Response Time: 120ms (-85%)
- Database Query Time: 45ms (-89%)
- Memory Usage: 256 MB (-50%)
- CPU Usage: 35% (-46%)
- Page Load Time: 1.1s (-66%)
- Lighthouse Score: 94/100 (+52%)

### Optimizations Applied
1. Added database indexes (3 indexes)
2. Implemented Redis caching
3. Fixed N+1 query issues (5 locations)
4. Added code splitting (3 routes)
5. Optimized images (WebP, lazy loading)
6. Implemented virtual scrolling (user list)
```

## Optimization Strategies by Technology

### Node.js / Express

**1. Enable Compression**
```typescript
import compression from 'compression';
app.use(compression());
```

**2. Use Cluster Mode**
```typescript
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Worker process
  startServer();
}
```

**3. Stream Large Responses**
```typescript
// ❌ BAD: Load entire file in memory
app.get('/download', (req, res) => {
  const file = fs.readFileSync('large-file.zip');
  res.send(file);
});

// ✅ GOOD: Stream the file
app.get('/download', (req, res) => {
  const stream = fs.createReadStream('large-file.zip');
  stream.pipe(res);
});
```

### Python / FastAPI

**1. Use Async/Await**
```python
# ❌ Synchronous (blocking)
@app.get("/users")
def get_users():
    users = db.query(User).all()
    return users

# ✅ Asynchronous (non-blocking)
@app.get("/users")
async def get_users():
    users = await db.query(User).all()
    return users
```

**2. Background Tasks**
```python
from fastapi import BackgroundTasks

@app.post("/users")
async def create_user(user: UserCreate, background_tasks: BackgroundTasks):
    user = await create_user_in_db(user)
    background_tasks.add_task(send_welcome_email, user.email)
    return user
```

### Rust

**1. Use Release Mode**
```bash
# ❌ Debug build (slow)
cargo build

# ✅ Release build (optimized)
cargo build --release
```

**2. Parallel Processing**
```rust
use rayon::prelude::*;

// ❌ Sequential
let results: Vec<_> = data.iter()
    .map(|x| expensive_operation(x))
    .collect();

// ✅ Parallel
let results: Vec<_> = data.par_iter()
    .map(|x| expensive_operation(x))
    .collect();
```

## Performance Monitoring

### Production Monitoring

**Application Performance Monitoring (APM):**
```typescript
// New Relic
import newrelic from 'newrelic';

// DataDog
import tracer from 'dd-trace';
tracer.init();

// Custom metrics
import prometheus from 'prom-client';
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});
```

### Logging Performance Issues

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'performance.log' })
  ]
});

// Log slow queries
function logSlowQuery(query: string, duration: number) {
  if (duration > 1000) { // > 1 second
    logger.warn('Slow query detected', {
      query,
      duration,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Best Practices

1. **Measure First** - Always profile before optimizing
2. **Focus on Bottlenecks** - Optimize the slowest parts first
3. **Incremental Changes** - One optimization at a time
4. **Test Impact** - Measure before and after
5. **Monitor Production** - Use APM tools
6. **Cache Wisely** - Cache expensive operations
7. **Optimize for User Experience** - Prioritize perceived performance

## Common Pitfalls

- **Premature Optimization** - Don't optimize before profiling
- **Micro-optimizations** - Focus on real bottlenecks
- **Caching Everything** - Cache invalidation is hard
- **Over-engineering** - Keep it simple
- **Ignoring Trade-offs** - Memory vs CPU, Speed vs Maintainability

## Checklist

### Performance Audit Checklist
- [ ] Profile application (CPU, Memory)
- [ ] Identify bottlenecks
- [ ] Check database query performance
- [ ] Review API response times
- [ ] Analyze bundle size (frontend)
- [ ] Test with production-like data
- [ ] Monitor real user metrics
- [ ] Document findings
- [ ] Apply optimizations
- [ ] Measure improvements
- [ ] Deploy and monitor
