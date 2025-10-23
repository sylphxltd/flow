---
name: SQL & Relational DBs
description: Postgres/MySQL patterns, indexing, transactions, migrations, query optimization
category: data
---

# SQL & Relational Databases

## When SQL vs NoSQL

**Use SQL (Postgres, MySQL) when:**
- Data has clear relationships (users → posts → comments)
- Need ACID transactions (money, inventory)
- Complex queries with joins
- Strong consistency required
- Schema is relatively stable

**Use NoSQL (MongoDB, etc.) when:**
- Flexible/evolving schema
- Horizontal scaling critical
- Document-oriented data
- Simple queries (key-value, single collection)

**Default choice: SQL** (Postgres) - More powerful, safer for most use cases.

## Schema Design Patterns

### One-to-Many
```sql
-- User has many posts
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Query: Get user with their posts
SELECT u.*, p.title, p.content
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE u.id = 1;
```

### Many-to-Many
```sql
-- Users can like many posts, posts can be liked by many users
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255));
CREATE TABLE posts (id SERIAL PRIMARY KEY, title VARCHAR(255));

-- Junction table
CREATE TABLE likes (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id) -- Composite key prevents duplicates
);

-- Query: Get posts liked by user
SELECT p.*
FROM posts p
JOIN likes l ON l.post_id = p.id
WHERE l.user_id = 1;
```

### Indexes (Critical for Performance)
```sql
-- Single column index
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Composite index (order matters!)
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- Unique index
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- When to index:
-- ✅ Foreign keys (user_id in posts)
-- ✅ Columns in WHERE clauses
-- ✅ Columns in ORDER BY
-- ✅ Columns in JOIN conditions
-- ❌ Columns that change frequently (slows writes)
-- ❌ Small tables (< 1000 rows)
```

## Query Optimization

### N+1 Problem
```sql
-- BAD: N+1 queries (1 for users, then 1 per user for posts)
SELECT * FROM users;
-- Then for each user:
SELECT * FROM posts WHERE user_id = ?;

-- GOOD: 1 query with JOIN
SELECT u.*, p.id as post_id, p.title, p.content
FROM users u
LEFT JOIN posts p ON p.user_id = u.id;
```

### Use EXPLAIN to Analyze
```sql
EXPLAIN ANALYZE
SELECT * FROM posts WHERE user_id = 123;

-- Look for:
-- ✅ Index Scan (good - using index)
-- ❌ Seq Scan (bad - scanning entire table)
-- Check "cost" and "rows" estimates
```

### Pagination (Efficient)
```sql
-- BAD: OFFSET becomes slow for large offsets
SELECT * FROM posts ORDER BY created_at LIMIT 20 OFFSET 10000;
-- Reads and discards 10000 rows!

-- GOOD: Cursor-based pagination
SELECT * FROM posts 
WHERE created_at < '2024-01-01 00:00:00'
ORDER BY created_at DESC
LIMIT 20;
-- Uses index, always fast
```

### Select Only What You Need
```sql
-- BAD
SELECT * FROM users; -- Returns all columns

-- GOOD
SELECT id, name, email FROM users; -- Only needed columns
```

## Transactions (ACID)

### When to Use Transactions
**Use for:**
- Money transfers (debit + credit must both succeed)
- Inventory management
- Creating related records that must stay consistent
- Any operation where partial completion is unacceptable

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT; -- Both succeed or both fail
```

### Isolation Levels
```sql
-- READ COMMITTED (default, good for most cases)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- SERIALIZABLE (strongest, slowest - use for critical operations)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

## Common Patterns

### Soft Deletes
```sql
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMP NULL;

-- "Delete" (actually just mark)
UPDATE posts SET deleted_at = NOW() WHERE id = 1;

-- Queries always filter out deleted
SELECT * FROM posts WHERE deleted_at IS NULL;

-- Create view to hide deleted
CREATE VIEW active_posts AS
SELECT * FROM posts WHERE deleted_at IS NULL;
```

### Timestamps
```sql
-- Always include these
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Enums (Status Fields)
```sql
-- Using CHECK constraint
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) CHECK (status IN ('pending', 'paid', 'shipped', 'delivered'))
);

-- OR using ENUM type
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered');
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  status order_status DEFAULT 'pending'
);
```

## Migrations (Schema Changes)

### Add Column (Safe)
```sql
-- Safe: nullable column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Safe: with default
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
```

### Change Column (Risky)
```sql
-- Risky: data might not fit
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(500);

-- Safer: add new column, migrate data, drop old
ALTER TABLE users ADD COLUMN email_new VARCHAR(500);
UPDATE users SET email_new = email;
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_new TO email;
```

### Add Index (Lock-Free)
```sql
-- Postgres: create index concurrently (doesn't block writes)
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
```

## Performance Tips

### Connection Pooling
```typescript
// Use connection pool, not new connection per request
import { Pool } from 'pg'

const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Use pool.query(), not new Client() per request
```

### Prepared Statements (Prevent SQL Injection)
```typescript
// BAD: SQL injection vulnerable
db.query(`SELECT * FROM users WHERE email = '${userInput}'`)

// GOOD: Prepared statement
db.query('SELECT * FROM users WHERE email = $1', [userInput])
```

### Batch Operations
```sql
-- BAD: 1000 separate inserts
INSERT INTO posts (title) VALUES ('Post 1');
INSERT INTO posts (title) VALUES ('Post 2');
-- ... 998 more

-- GOOD: Batch insert
INSERT INTO posts (title) VALUES 
  ('Post 1'),
  ('Post 2'),
  ('Post 3');
  -- All at once
```

## Full-Text Search
```sql
-- Add search vector column
ALTER TABLE posts ADD COLUMN search_vector tsvector;

-- Index it
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

-- Update on insert/update
CREATE TRIGGER update_posts_search
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, content);

-- Search query
SELECT * FROM posts
WHERE search_vector @@ to_tsquery('react & typescript');
```

## Common Mistakes

### Not Using Foreign Keys
```sql
-- BAD: No constraint, orphaned records possible
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER
);

-- GOOD: Foreign key enforces relationship
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);
```

### Not Using Indexes on Foreign Keys
```sql
-- Always index foreign keys!
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### Using VARCHAR Without Limit
```sql
-- BAD: unbounded
CREATE TABLE users (email VARCHAR);

-- GOOD: set reasonable limit
CREATE TABLE users (email VARCHAR(255));
```

### Not Handling NULL
```sql
-- Check for NULL explicitly
SELECT * FROM users WHERE deleted_at IS NULL;

-- NOT this (won't work as expected)
SELECT * FROM users WHERE deleted_at = NULL; -- Always false!
```

## ORMs (Prisma, Drizzle, TypeORM)

### When to Use ORM
**Pros:**
- Type safety (TypeScript)
- Easier migrations
- Less SQL to write
- Prevents some SQL injection

**Cons:**
- Less control over queries
- Can generate inefficient SQL
- Learning curve
- Overhead

**Recommendation:** Use ORM (Prisma) for CRUD, raw SQL for complex queries.

```typescript
// Prisma example
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true } // Auto-join
})

// Raw SQL when needed
const result = await prisma.$queryRaw`
  SELECT ... complex query ...
`
```

## Monitoring & Debugging

### Slow Query Log
```sql
-- Enable slow query log (Postgres)
ALTER DATABASE mydb SET log_min_duration_statement = 100; -- Log queries > 100ms

-- Check pg_stat_statements for query stats
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Check Index Usage
```sql
-- Are indexes being used?
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0; -- Unused indexes (consider dropping)
```

## Decision Guide

**Normalize vs Denormalize:**
- Normalize by default (avoid duplication)
- Denormalize for read-heavy queries (cache computed values)
- Use materialized views for expensive aggregations

**When to use JSON column:**
- Flexible, schema-less data (user preferences)
- Data you won't query often
- NOT for data you'll filter/sort by (use real columns)

**When to add index:**
- Column in WHERE clause on large table
- Foreign keys (always)
- After identifying slow queries
- NOT on every column (slows writes)
