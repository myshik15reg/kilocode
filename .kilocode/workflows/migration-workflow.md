# Workflow: Database Migration (migration-workflow)

## Описание
Workflow для безопасного создания, тестирования и применения database migrations. Обеспечивает zero-downtime deployments и возможность rollback.

## Когда использовать
- Изменение database schema (add/modify/drop tables, columns)
- Создание/изменение индексов
- Data migrations (трансформация данных)
- Изменение constraints и foreign keys
- Database refactoring

---

## Принципы Database Migrations

### Zero-Downtime Migrations
- Не ломать работающее приложение
- Backward compatible изменения
- Graceful degradation

### Safety First
- Тестирование на копии production данных
- Rollback plan для каждой миграции
- Backup перед применением

### Incremental Changes
- Маленькие, атомарные миграции
- Одна логическая задача = одна миграция
- Легко откатываемые изменения

---

## Phase 1: Планирование миграции

### Шаг 1.1: Анализ требований
**Агент:** data-architect

**Действия:**
1. Определить тип изменения:
   - **Schema change** (DDL) - структура таблиц
   - **Data migration** (DML) - трансформация данных
   - **Index optimization** - производительность
   - **Constraint modification** - business rules

2. Оценить impact:
   - Затронутые таблицы и объем данных
   - Зависимые сервисы и queries
   - Время выполнения миграции
   - Downtime requirements

3. Определить стратегию:
   - **Online migration** (zero downtime)
   - **Offline migration** (scheduled downtime)
   - **Multi-phase migration** (complex changes)

**Выход:**
```markdown
# Migration Plan: Add email_verified column

## Type
Schema change (DDL) + Data migration (DML)

## Impact Analysis
- Table: users (5M rows)
- Estimated time: 30 seconds (online)
- Affected queries: 12 read queries, 3 write queries
- Downtime: zero (online migration)

## Strategy
Multi-phase online migration:
1. Add nullable column
2. Backfill data
3. Add NOT NULL constraint
4. Update application code
```

### Шаг 1.2: Определение rollback strategy
**Агент:** data-architect

**Действия:**
1. Создать план отката для каждого шага
2. Определить точки невозврата (point of no return)
3. Подготовить rollback скрипты
4. Определить SLA для rollback

**Rollback Plan Template:**
```markdown
## Rollback Strategy

### Safe Rollback Window
- Phase 1: До backfill - instant rollback
- Phase 2: До NOT NULL constraint - 5 min rollback
- Phase 3: После constraint - data loss possible

### Rollback Steps
1. Remove NOT NULL constraint
2. Stop backfill process
3. Drop column
4. Verify data integrity

### Point of No Return
After Phase 3 completes - old data format lost.
Decision point: Before Phase 3.
```

---

## Phase 2: Создание миграции

### Шаг 2.1: Написание migration файла
**Агент:** {database}-specialist (postgresql, mongodb, mysql)

**Naming Convention:**
```
{timestamp}_{description}.{up|down}.sql

Examples:
20240115120000_add_email_verified_column.up.sql
20240115120000_add_email_verified_column.down.sql
```

**PostgreSQL Example:**

**UP Migration (20240115120000_add_email_verified_column.up.sql):**
```sql
-- Migration: Add email_verified column to users table
-- Strategy: Multi-phase online migration (zero downtime)

-- Phase 1: Add nullable column
-- Safe: Can be rolled back instantly
-- Impact: Locks table briefly (< 100ms for 5M rows)

BEGIN;

-- Add column as nullable first (fast operation)
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Add index for queries (CONCURRENTLY to avoid locks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified
ON users(email_verified)
WHERE email_verified = TRUE;

COMMIT;

-- Phase 2: Backfill existing data
-- Safe: Can be interrupted and restarted
-- Impact: I/O intensive, run during low traffic

-- Update in batches to avoid long-running transactions
DO $$
DECLARE
  batch_size INTEGER := 10000;
  rows_updated INTEGER;
  total_updated INTEGER := 0;
BEGIN
  LOOP
    -- Update batch
    WITH batch AS (
      SELECT id FROM users
      WHERE email_verified IS NULL
      LIMIT batch_size
    )
    UPDATE users u
    SET email_verified = (u.email_confirmed_at IS NOT NULL)
    FROM batch b
    WHERE u.id = b.id;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;

    -- Log progress
    RAISE NOTICE 'Updated % rows (total: %)', rows_updated, total_updated;

    -- Exit if no more rows
    EXIT WHEN rows_updated = 0;

    -- Sleep to reduce I/O pressure (100ms)
    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE NOTICE 'Backfill complete. Total rows: %', total_updated;
END $$;

-- Phase 3: Add NOT NULL constraint
-- WARNING: Point of no return after this step
-- Impact: Fast operation (metadata only with valid check)

BEGIN;

-- Add constraint (validates all data)
ALTER TABLE users
ALTER COLUMN email_verified SET NOT NULL;

-- Add constraint for default value
ALTER TABLE users
ALTER COLUMN email_verified SET DEFAULT FALSE;

COMMIT;

-- Verify migration
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM users
  WHERE email_verified IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration verification failed: % NULL values found', null_count;
  END IF;

  RAISE NOTICE 'Migration verified successfully';
END $$;
```

**DOWN Migration (20240115120000_add_email_verified_column.down.sql):**
```sql
-- Rollback: Remove email_verified column
-- WARNING: This will lose data

BEGIN;

-- Remove index
DROP INDEX IF EXISTS idx_users_email_verified;

-- Remove column
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

COMMIT;

-- Verify rollback
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE EXCEPTION 'Rollback failed: Column still exists';
  END IF;

  RAISE NOTICE 'Rollback completed successfully';
END $$;
```

### Шаг 2.2: Data Migration (для сложных трансформаций)
**Агент:** {database}-specialist

**Пример сложной data migration:**
```sql
-- Migration: Normalize address data (split into components)

-- Create temporary staging table
CREATE TABLE IF NOT EXISTS users_address_staging AS
SELECT
  id,
  address_full,
  -- Extract components using regex
  (regexp_matches(address_full, '^([^,]+),'))[1] AS street,
  (regexp_matches(address_full, ', ([^,]+),'))[1] AS city,
  (regexp_matches(address_full, ', ([A-Z]{2}) '))[1] AS state,
  (regexp_matches(address_full, ' (\d{5})$'))[1] AS zip
FROM users
WHERE address_full IS NOT NULL;

-- Validate extracted data
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM users_address_staging
  WHERE street IS NULL OR city IS NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % rows with invalid address parsing', invalid_count;
  END IF;
END $$;

-- Create new columns
ALTER TABLE users
  ADD COLUMN street VARCHAR(255),
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN state CHAR(2),
  ADD COLUMN zip CHAR(5);

-- Copy validated data
UPDATE users u
SET
  street = s.street,
  city = s.city,
  state = s.state,
  zip = s.zip
FROM users_address_staging s
WHERE u.id = s.id;

-- Drop staging table
DROP TABLE users_address_staging;

-- Drop old column (after application deployment)
-- ALTER TABLE users DROP COLUMN address_full;
```

### Шаг 2.3: Migration для ORM
**Агенты:** {framework}-specialist (prisma, typeorm, django, etc.)

**Prisma Example:**
```prisma
// schema.prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  emailVerified Boolean  @default(false) @map("email_verified")
  // ...
}
```

```bash
# Generate migration
npx prisma migrate dev --name add_email_verified

# Review generated SQL in prisma/migrations/
# Edit if needed for optimization (add indexes, batching)

# Apply migration
npx prisma migrate deploy
```

**TypeORM Example:**
```typescript
// migrations/1705320000000-AddEmailVerified.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerified1705320000000 implements MigrationInterface {
  name = 'AddEmailVerified1705320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Phase 1: Add nullable column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        isNullable: true,
        default: false,
      })
    );

    // Phase 2: Backfill data in batches
    let hasMore = true;
    while (hasMore) {
      const result = await queryRunner.query(`
        UPDATE users
        SET email_verified = (email_confirmed_at IS NOT NULL)
        WHERE id IN (
          SELECT id FROM users
          WHERE email_verified IS NULL
          LIMIT 10000
        )
      `);
      hasMore = result.affectedRows > 0;

      // Sleep between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Phase 3: Add NOT NULL constraint
    await queryRunner.changeColumn(
      'users',
      'email_verified',
      new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        isNullable: false,
        default: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'email_verified');
  }
}
```

---

## Phase 3: Тестирование миграции

### Шаг 3.1: Локальное тестирование
**Агент:** database-specialist + integration-tester

**Действия:**
1. **Setup test database:**
   ```bash
   # Create test database with production-like schema
   createdb migration_test
   pg_restore -d migration_test production_dump.sql
   ```

2. **Test UP migration:**
   ```bash
   # Apply migration
   npm run migrate:up

   # Verify schema
   psql migration_test -c "\d+ users"

   # Verify data integrity
   npm run db:verify
   ```

3. **Test DOWN migration (rollback):**
   ```bash
   # Rollback migration
   npm run migrate:down

   # Verify rollback
   psql migration_test -c "\d+ users"
   ```

4. **Test idempotency:**
   ```bash
   # Apply migration twice (should not fail)
   npm run migrate:up
   npm run migrate:up
   ```

**Test Script Example:**
```typescript
// tests/migrations/add-email-verified.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestDatabase, dropTestDatabase } from './test-utils';
import { runMigration, rollbackMigration } from '../db/migrator';

describe('Migration: Add email_verified column', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
    // Seed with test data
    await db.seed('users', 1000);
  });

  afterAll(async () => {
    await dropTestDatabase(db);
  });

  test('should add email_verified column', async () => {
    await runMigration('20240115120000_add_email_verified_column');

    const columns = await db.getColumns('users');
    expect(columns).toContain('email_verified');
  });

  test('should backfill email_verified based on email_confirmed_at', async () => {
    const verified = await db.query(`
      SELECT COUNT(*) as count FROM users
      WHERE email_verified = TRUE
      AND email_confirmed_at IS NOT NULL
    `);

    const total = await db.query('SELECT COUNT(*) FROM users');

    expect(verified.count).toBeGreaterThan(0);
    expect(verified.count).toBeLessThanOrEqual(total.count);
  });

  test('should not allow NULL values after migration', async () => {
    await expect(
      db.query(`INSERT INTO users (email, email_verified) VALUES ('test@test.com', NULL)`)
    ).rejects.toThrow('violates not-null constraint');
  });

  test('should rollback cleanly', async () => {
    await rollbackMigration('20240115120000_add_email_verified_column');

    const columns = await db.getColumns('users');
    expect(columns).not.toContain('email_verified');
  });

  test('should be idempotent', async () => {
    await runMigration('20240115120000_add_email_verified_column');
    await expect(
      runMigration('20240115120000_add_email_verified_column')
    ).resolves.not.toThrow();
  });
});
```

### Шаг 3.2: Performance Testing
**Агент:** performance-tester

**Действия:**
1. **Measure migration time:**
   ```sql
   -- Test on production-size dataset
   \timing on
   \i migrations/20240115120000_add_email_verified_column.up.sql
   ```

2. **Analyze locks:**
   ```sql
   -- Monitor locks during migration
   SELECT
     locktype,
     relation::regclass,
     mode,
     granted
   FROM pg_locks
   WHERE pid = pg_backend_pid();
   ```

3. **Measure impact on queries:**
   ```bash
   # Run load test during migration
   npm run load-test &
   npm run migrate:up
   ```

**Performance Report:**
```markdown
## Performance Test Results

### Migration Time
- 5M rows: 32 seconds
- 10M rows: 64 seconds (linear scaling)

### Locks Held
- ALTER TABLE: AccessExclusiveLock (< 100ms)
- CREATE INDEX CONCURRENTLY: ShareUpdateExclusiveLock (non-blocking)

### Query Impact
- Read queries: +2% latency during backfill
- Write queries: +5% latency during backfill
- No blocked queries

### Recommendation
✅ Safe for production deployment
- Run during low-traffic window
- Monitor query performance
```

### Шаг 3.3: Staging Environment Testing
**Агент:** qa-engineer + devops-engineer

**Действия:**
1. **Deploy to staging:**
   ```bash
   # Restore production snapshot to staging
   pg_restore -d staging_db production_snapshot.sql

   # Run migration
   npm run migrate:staging
   ```

2. **Smoke tests:**
   ```bash
   # Run integration tests against staging
   npm run test:integration --env=staging

   # Manual testing of affected features
   ```

3. **Verify application compatibility:**
   - Deploy новый код с миграцией
   - Deploy старый код (должен работать с новой схемой - backward compatibility)

---

## Phase 4: Deployment

### Шаг 4.1: Pre-deployment Checklist
**Агент:** devops-engineer

**Checklist:**
- [ ] Migration tested locally
- [ ] Migration tested on staging with production data size
- [ ] Performance impact measured and acceptable
- [ ] Rollback plan documented and tested
- [ ] Backup strategy confirmed
- [ ] Monitoring alerts configured
- [ ] Team notified about deployment window
- [ ] Deployment runbook prepared
- [ ] On-call engineer assigned

### Шаг 4.2: Backup Database
**Агент:** devops-engineer

**Действия:**
```bash
# Full database backup
pg_dump -Fc production_db > backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_*.dump | head

# Upload to secure storage
aws s3 cp backup_*.dump s3://backups/migrations/
```

### Шаг 4.3: Apply Migration (Online)
**Агент:** devops-engineer

**Deployment Strategy:**

**Option 1: Blue-Green Deployment (Zero Downtime)**
```bash
# 1. Apply schema changes (backward compatible)
npm run migrate:up

# 2. Deploy new application version (uses new schema)
kubectl apply -f deployment.yaml

# 3. Wait for new version to be healthy
kubectl rollout status deployment/app

# 4. Route traffic to new version
kubectl set image deployment/app app=app:v2

# 5. Monitor errors
kubectl logs -f deployment/app

# 6. If issues: rollback application
kubectl rollout undo deployment/app
```

**Option 2: Multi-Phase Migration**
```bash
# Phase 1: Add column (compatible with old code)
npm run migrate:up -- --until=phase1

# Verify old app still works
curl https://api.example.com/health

# Phase 2: Deploy new application code
kubectl apply -f deployment.yaml

# Phase 3: Complete migration (add constraints)
npm run migrate:up -- --from=phase2
```

**Monitoring during deployment:**
```bash
# Monitor query performance
psql production -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE query LIKE '%users%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Monitor locks
psql production -c "
  SELECT pid, usename, query, state
  FROM pg_stat_activity
  WHERE wait_event_type = 'Lock';
"

# Monitor error rate
kubectl logs -f deployment/app | grep ERROR | wc -l
```

### Шаг 4.4: Verification
**Агент:** qa-engineer

**Post-deployment Verification:**
```bash
# 1. Verify schema changes
psql production -c "\d+ users"

# 2. Run smoke tests
npm run test:smoke --env=production

# 3. Check data integrity
psql production -c "
  SELECT
    COUNT(*) as total,
    COUNT(email_verified) as non_null,
    COUNT(*) FILTER (WHERE email_verified IS NULL) as nulls
  FROM users;
"

# 4. Monitor application metrics
curl https://api.example.com/metrics | grep error_rate

# 5. Check logs for errors
kubectl logs deployment/app --since=10m | grep -i error
```

**Acceptance Criteria:**
- [ ] Schema changes applied successfully
- [ ] All data migrated correctly (no NULLs if NOT NULL constraint)
- [ ] Application working without errors
- [ ] Query performance within SLA
- [ ] No increase in error rate
- [ ] Smoke tests passing

---

## Phase 5: Rollback (if needed)

### Шаг 5.1: Decision to Rollback
**Агент:** devops-engineer + solution-architect

**Rollback Triggers:**
- Error rate > 5%
- Query latency > 2x baseline
- Data integrity issues detected
- Application crashes
- Critical bug discovered

### Шаг 5.2: Execute Rollback
**Агент:** devops-engineer

**Rollback Procedure:**
```bash
# 1. Stop incoming traffic (if critical)
kubectl scale deployment/app --replicas=0

# 2. Rollback application to previous version
kubectl rollout undo deployment/app

# 3. Rollback database migration
npm run migrate:down

# 4. Verify rollback
psql production -c "\d+ users"

# 5. Restore traffic
kubectl scale deployment/app --replicas=3

# 6. Monitor
kubectl logs -f deployment/app
```

**If rollback fails:**
```bash
# Restore from backup (last resort)
pg_restore -d production backup_*.dump

# Verify restoration
psql production -c "SELECT COUNT(*) FROM users"
```

### Шаг 5.3: Post-Rollback Analysis
**Агент:** solution-architect

**Root Cause Analysis:**
```markdown
## Rollback Post-Mortem

### What Happened
- Migration caused query timeout on users table
- 20% of read queries exceeded 5s SLA

### Root Cause
- Missing index on email_verified column
- Backfill process locked table longer than expected

### Why We Missed It
- Staging database had only 1M rows vs 5M in production
- Load testing not run during backfill phase

### Action Items
- [ ] Add index creation to migration script
- [ ] Test on full production data size
- [ ] Run load tests during migration
- [ ] Update migration checklist

### Next Attempt
Scheduled for next week with improvements.
```

---

## Phase 6: Post-Deployment

### Шаг 6.1: Monitoring
**Агент:** devops-engineer

**Мониторинг (первые 24 часа):**
```bash
# Query performance
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%email_verified%'
ORDER BY calls DESC;

# Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'idx_users_email_verified';

# Application errors
kubectl logs deployment/app --since=1h | grep ERROR
```

### Шаг 6.2: Cleanup
**Агент:** devops-engineer

**Cleanup Tasks:**
```sql
-- Remove old columns (if renamed)
ALTER TABLE users DROP COLUMN IF EXISTS old_column_name;

-- Remove temporary tables
DROP TABLE IF EXISTS migration_staging;

-- Vacuum table to reclaim space
VACUUM ANALYZE users;

-- Update statistics
ANALYZE users;
```

### Шаг 6.3: Documentation Update
**Агент:** technical-writer

**Update Documentation:**
1. **Schema documentation:**
   ```markdown
   ## Users Table

   ### email_verified
   - Type: BOOLEAN
   - Default: FALSE
   - Description: Indicates if user's email has been verified
   - Added: 2024-01-15 (Migration #123)
   - Related: email_confirmed_at timestamp
   ```

2. **Migration log:**
   ```markdown
   # Migration Log

   ## 2024-01-15: Add email_verified column
   - Migration: 20240115120000_add_email_verified_column
   - Duration: 32 seconds
   - Impact: Zero downtime
   - Rollback: Available (see down migration)
   ```

3. **Update Memory Bank:**
   - `.kilocode/rules/memory-bank/architecture.md` - схема БД
   - `.kilocode/rules/memory-bank/tech.md` - версия schema

---

## Common Migration Patterns

### Pattern 1: Adding Nullable Column
```sql
-- Safe, fast, zero downtime
ALTER TABLE users ADD COLUMN new_column VARCHAR(255);
```

### Pattern 2: Adding NOT NULL Column (with default)
```sql
-- Step 1: Add nullable with default
ALTER TABLE users ADD COLUMN new_column VARCHAR(255) DEFAULT 'default_value';

-- Step 2: Backfill existing rows (in batches)
-- (see backfill pattern above)

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN new_column SET NOT NULL;
```

### Pattern 3: Renaming Column (zero downtime)
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN new_name VARCHAR(255);

-- Step 2: Copy data
UPDATE users SET new_name = old_name;

-- Step 3: Deploy application (reads from both columns)

-- Step 4: Deploy application (writes to both columns)

-- Step 5: Verify data sync

-- Step 6: Deploy application (uses only new column)

-- Step 7: Drop old column
ALTER TABLE users DROP COLUMN old_name;
```

### Pattern 4: Changing Column Type
```sql
-- Step 1: Add new column with new type
ALTER TABLE users ADD COLUMN email_new CITEXT;

-- Step 2: Copy and transform data
UPDATE users SET email_new = LOWER(email);

-- Step 3: Swap columns (see rename pattern)

-- Step 4: Drop old column
```

### Pattern 5: Creating Index (non-blocking)
```sql
-- Use CONCURRENTLY to avoid locks
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Verify index is valid
SELECT indexname, indisvalid
FROM pg_indexes
JOIN pg_class ON indexname = relname
WHERE indexname = 'idx_users_email';
```

---

## Migration Tools

### Tool Comparison

| Tool | Language | Features | Best For |
|------|----------|----------|----------|
| **Prisma** | TypeScript | Auto-generate, type-safe | TypeScript projects |
| **TypeORM** | TypeScript | ORM integration | NestJS, Express apps |
| **Knex.js** | JavaScript | Migration builder | Node.js apps |
| **Django** | Python | Built-in migrations | Django projects |
| **Alembic** | Python | SQLAlchemy integration | Python apps |
| **Flyway** | Java | Version control | Java/Spring apps |
| **Liquibase** | Java/XML | Database-agnostic | Enterprise Java |
| **golang-migrate** | Go | CLI tool, library | Go applications |

### Tool Setup Examples

**Prisma:**
```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma migrate deploy # production
```

**TypeORM:**
```bash
npm install typeorm pg
npx typeorm migration:generate -n AddEmailVerified
npx typeorm migration:run
```

**Knex:**
```bash
npm install knex pg
npx knex migrate:make add_email_verified
npx knex migrate:latest
```

---

## Checklist: Migration Complete

### Development
- [ ] Migration файлы созданы (up + down)
- [ ] Rollback plan документирован
- [ ] Migration протестирован локально
- [ ] Idempotency проверена
- [ ] Code review migration files
- [ ] Performance тестирование выполнено

### Staging
- [ ] Migration deployed to staging
- [ ] Integration tests passed
- [ ] Manual testing completed
- [ ] Backward compatibility verified
- [ ] Performance acceptable

### Production
- [ ] Pre-deployment checklist completed
- [ ] Database backup created
- [ ] Migration applied successfully
- [ ] Application deployed
- [ ] Post-deployment verification passed
- [ ] Monitoring configured

### Post-Deployment
- [ ] Monitoring first 24h completed
- [ ] No performance degradation
- [ ] Cleanup tasks completed
- [ ] Documentation updated
- [ ] Memory Bank updated
- [ ] Post-mortem (if issues)

---

## Reference Materials

### Database-Specific Guides
- **PostgreSQL**: https://www.postgresql.org/docs/current/ddl.html
- **MySQL**: https://dev.mysql.com/doc/refman/8.0/en/sql-data-definition-statements.html
- **MongoDB**: https://docs.mongodb.com/manual/core/schema-validation/

### Migration Tools
- **Prisma**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **TypeORM**: https://typeorm.io/migrations
- **Flyway**: https://flywaydb.org/documentation/

### Best Practices
- [Zero Downtime Migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
- [PostgreSQL at Scale](https://www.cybertec-postgresql.com/en/zero-downtime-postgres-upgrades/)

### Related Workflows
- [deployment-workflow.md](.kilocode/workflows/deployment-workflow.md)
- [protocol-new.md](.kilocode/workflows/protocol-new.md)

### Related Agents
- **database-specialist** - `.kilocode/agents/infrastructure/database-specialist/`
- **devops-engineer** - `.kilocode/agents/infrastructure/devops-engineer/`
- **performance-tester** - `.kilocode/agents/testing/performance-tester/`
