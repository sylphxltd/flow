---
name: SQL & Relational DBs
description: Postgres/MySQL patterns, indexing, transactions, migrations, query optimization
---

# SQL & Relational Databases

## When SQL vs NoSQL

**SQL (Postgres, MySQL)**: Clear relationships, ACID transactions, complex queries with joins, strong consistency, stable schema

**NoSQL (MongoDB)**: Flexible schema, horizontal scaling, document data, simple queries

**Default: SQL (Postgres)** - More powerful, safer for most use cases

## Schema Design

### Foreign Keys & Relationships
Always use foreign keys with `ON DELETE CASCADE/SET NULL`. Prevents orphaned records.

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);
```

### Many-to-Many
Use junction table with composite primary key to prevent duplicates:

```sql
CREATE TABLE likes (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);
```

## Indexes

```sql
-- Single column
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Composite (order matters!)
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
```

**When to index:**
- ✅ Foreign keys (always), WHERE clauses, ORDER BY, JOIN conditions
- ❌ Frequently changing columns (slows writes), small tables (< 1000 rows)

## Query Optimization

### N+1 Problem
```sql
-- BAD: N+1 queries
SELECT * FROM users;
-- Then for each user:
SELECT * FROM posts WHERE user_id = ?;

-- GOOD: 1 query with JOIN
SELECT u.*, p.id as post_id, p.title FROM users u
LEFT JOIN posts p ON p.user_id = u.id;
```

### Use EXPLAIN
```sql
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 123;

-- Look for: Index Scan (good), Seq Scan (bad - full table)
```

### Pagination
```sql
-- BAD: OFFSET slow for large offsets
SELECT * FROM posts ORDER BY created_at LIMIT 20 OFFSET 10000;
-- Reads and discards 10000 rows!

-- GOOD: Cursor-based
SELECT * FROM posts
WHERE created_at < '2024-01-01'
ORDER BY created_at DESC LIMIT 20;
```

## Transactions (ACID)

**Use for**: Money transfers, inventory, related records that must stay consistent

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT; -- Both succeed or both fail
```

**Isolation Levels:**
- READ COMMITTED (default, good for most)
- SERIALIZABLE (strongest, slowest - critical ops)

## Common Patterns

**Soft Deletes**: Add `deleted_at TIMESTAMP NULL`, filter with `WHERE deleted_at IS NULL`

**Timestamps**: Add `created_at`, `updated_at` with triggers for auto-update

**Enums**: Use CHECK constraint or ENUM type for fixed values (status, role)

## Migrations

### Add Column (Safe)
```sql
-- Safe: nullable
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Safe: with default
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
```

### Change Column (Risky)
```sql
-- Safer: Add new, migrate data, drop old
ALTER TABLE users ADD COLUMN email_new VARCHAR(500);
UPDATE users SET email_new = email;
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_new TO email;
```

### Add Index (Lock-Free)
```sql
-- Postgres: doesn't block writes
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
```

## Performance Tips

### Connection Pooling
```typescript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Use pool.query(), not new Client() per request
```

### Prepared Statements (Prevent Injection)
```typescript
// BAD: SQL injection vulnerable
db.query(`SELECT * FROM users WHERE email = '${userInput}'`)

// GOOD: Prepared
db.query('SELECT * FROM users WHERE email = $1', [userInput])
```

### Batch Operations
```sql
-- BAD: 1000 separate inserts
INSERT INTO posts (title) VALUES ('Post 1');

-- GOOD: Batch
INSERT INTO posts (title) VALUES ('Post 1'), ('Post 2'), ('Post 3');
```

## Full-Text Search

Add `tsvector` column, create GIN index, use `@@` operator:

```sql
ALTER TABLE posts ADD COLUMN search_vector tsvector;
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);
SELECT * FROM posts WHERE search_vector @@ to_tsquery('react & typescript');
```

## Common Mistakes

❌ **Not using foreign keys** → Orphaned records
❌ **Not indexing foreign keys** → Slow joins
❌ **VARCHAR without limit** → Use VARCHAR(255)
❌ **Not handling NULL** → Use IS NULL, not = NULL
❌ **String concatenation** → SQL injection, use prepared statements

## ORMs (Prisma, Drizzle, TypeORM)

**Pros**: Type safety, easier migrations, less SQL
**Cons**: Less control, can generate inefficient SQL, overhead

**Recommendation**: ORM for CRUD, raw SQL for complex queries

```typescript
// Prisma
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
})

// Raw when needed
const result = await prisma.$queryRaw`SELECT ... complex query ...`
```

## Monitoring

**Slow Query Log**: Enable logging for queries > 100ms, identify bottlenecks

**Check Index Usage**: Find unused indexes with `pg_stat_user_indexes WHERE idx_scan = 0`

**Check Query Stats**: Use `pg_stat_statements` to find slow queries

## Decision Guide

**Normalize vs Denormalize**: Normalize by default, denormalize for read-heavy, use materialized views for expensive aggregations

**JSON column**: Flexible schema-less data (user preferences), data you won't query often. NOT for filtering/sorting.

**Add index**: Column in WHERE on large table, foreign keys (always), after identifying slow queries. NOT on every column.
