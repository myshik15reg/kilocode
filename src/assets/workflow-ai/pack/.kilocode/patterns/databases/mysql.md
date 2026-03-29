# MySQL pattern

## Purpose

Provide a compact baseline for safe and efficient MySQL usage.

## Rules

1. Use prepared statements for all external input.
2. Use connection pooling.
3. Wrap multi-step writes in transactions.
4. Add indexes from query patterns, then confirm with `EXPLAIN`.
5. Select only needed columns and paginate large reads.
6. Grant least privilege to application accounts.
7. Manage schema changes through migrations.

## Performance checklist

- no `SELECT *` in hot paths
- indexes match filters and sort order
- slow queries logged and reviewed
- cache only after query shape is already reasonable

## Testing checklist

- repository or query logic tested
- transaction rollback paths covered
- migration up/down verified where applicable
