---
name: Node.js API
description: Express/Fastify, REST/GraphQL, authentication, middleware, error handling
---

# Backend API Development

## REST Structure

```
GET    /users              List
POST   /users              Create
GET    /users/:id          Get
PATCH  /users/:id          Update
DELETE /users/:id          Delete
GET    /users/:id/posts    Nested
```

**Status**: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

**Response format (project standard):**
```json
{ "data": {...}, "meta": {...} }
{ "items": [...], "total": 100, "page": 1, "limit": 20 }
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "..." } }
```

## N+1 Problem

```javascript
// BAD - N+1 queries
for (user of users) { user.posts = await getPosts(user.id) }

// GOOD - Join
await db.users.findMany({ include: { posts: true } })

// GOOD - Batch fetch
const userIds = users.map(u => u.id)
const posts = await db.posts.findMany({ where: { userId: { in: userIds } } })

// GraphQL: DataLoader
const loader = new DataLoader(async (ids) => {
  const items = await db.find({ where: { id: { in: ids } } })
  return ids.map(id => items.filter(i => i.parentId === id))
})
```

## Database

**Connection pooling:**
```javascript
const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 })
```

**Caching pattern:**
```javascript
async function getUser(id) {
  const cached = await redis.get(`user:${id}`)
  if (cached) return JSON.parse(cached)

  const user = await db.users.findUnique({ where: { id } })
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600)
  return user
}

// Invalidate on update
async function updateUser(id, data) {
  const user = await db.users.update({ where: { id }, data })
  await redis.del(`user:${id}`)
  return user
}
```

## Authentication

**Session vs Token:**
- Session: Traditional web apps, need fine-grained control
- Token (JWT): SPAs, mobile apps, microservices

**JWT middleware (project standard):**
```javascript
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: { code: 'NO_TOKEN' } })

  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).userId
    next()
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN' } })
  }
}
```

**Authorization patterns:**
```javascript
// Role check
function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await db.users.findUnique({ where: { id: req.userId } })
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } })
    }
    next()
  }
}

// Ownership check
function requireOwnership(getter) {
  return async (req, res, next) => {
    const resource = await getter(req)
    if (resource.userId !== req.userId) {
      return res.status(403).json({ error: { code: 'NOT_OWNER' } })
    }
    next()
  }
}
```

## Error Handling

**Project standard:**
```javascript
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
  }
}

// Error middleware (last!)
app.use((err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message }
    })
  }

  console.error('PROGRAMMER ERROR:', err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR' } })
})

// Usage
if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found')
```

## Performance

**Targets**: DB < 100ms, API < 200ms

**Optimize:**
- N+1 → Joins / DataLoader
- Connection pooling
- Redis caching
- Job queues (background tasks)
- Pagination (always LIMIT)

## GraphQL Basics

**When**: Complex relationships, flexible queries
**vs REST**: Simple CRUD → REST

**DataLoader (required for N+1):**
```javascript
const postLoader = new DataLoader(async (userIds) => {
  const posts = await db.posts.findMany({ where: { userId: { in: userIds } } })
  return userIds.map(id => posts.filter(p => p.userId === id))
})

// In resolver
User: {
  posts: (user) => postLoader.load(user.id)
}
```

## Common Patterns

**Repository:**
```javascript
class UserRepo {
  findById(id) { return db.users.findUnique({ where: { id } }) }
  save(data) { return db.users.create({ data }) }
}
```

**Service:**
```javascript
class UserService {
  async createUser(data) {
    if (!data.email) throw new Error('Email required')
    return await this.repo.save(data)
  }
}
```

**Middleware chain:**
```javascript
app.use(cors())
app.use(express.json())
app.use(rateLimit())
app.use(auth())
app.use(errorHandler()) // Last!
```

## Best Practices

✅ Prepared statements (prevent injection)
✅ Connection pooling
✅ Index foreign keys
✅ Rate limit auth endpoints
✅ Hash passwords (bcrypt/argon2)
✅ HTTPS only
✅ Validate server-side

❌ SQL injection (string concat)
❌ Plain text passwords
❌ N+1 queries
❌ No error handling
