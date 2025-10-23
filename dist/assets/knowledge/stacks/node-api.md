---
name: Node.js API
description: Express/Fastify, REST/GraphQL, authentication, middleware, error handling
category: stacks
---

# Backend Development

## API Design

### REST Principles
**Resource-oriented URLs:**
- Collections: `GET /users`, `POST /users`
- Resources: `GET /users/123`, `PUT /users/123`, `DELETE /users/123`
- Nested: `GET /users/123/posts` for relationships

**HTTP Methods:**
- GET: Read (idempotent, cacheable)
- POST: Create (not idempotent)
- PUT: Replace (idempotent)
- PATCH: Update (partial)
- DELETE: Remove (idempotent)

**Status Codes:**
- 200 OK: Success
- 201 Created: Resource created
- 204 No Content: Success, no body
- 400 Bad Request: Client error (validation)
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Authenticated but not authorized
- 404 Not Found: Resource doesn't exist
- 500 Internal Server Error: Server error

### Request/Response
**Request:**
- Validate all inputs (schema validation: Zod, Joi)
- Sanitize inputs (prevent injection)
- Rate limit by IP/user
- Accept Content-Type header

**Response:**
- Consistent format: `{ data, error, meta }`
- Include pagination: `{ items, total, page, limit }`
- Proper Content-Type header
- CORS headers if cross-origin

### Error Handling
```javascript
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid email format",
    field: "email"  // for field-level errors
  }
}
```

## Database

### SQL Best Practices
**Queries:**
- Use prepared statements (prevent SQL injection)
- Index frequently queried columns
- Avoid SELECT * (specify columns)
- Use LIMIT for pagination
- Explain query plans for optimization

**Transactions:**
- ACID compliance for critical operations
- Keep transactions short
- Handle deadlocks with retry logic

**Schema:**
- Foreign keys for referential integrity
- NOT NULL where appropriate
- Unique constraints for business rules
- Timestamps: created_at, updated_at

### NoSQL (MongoDB, etc.)
**When to use:**
- Flexible schema requirements
- Horizontal scaling needs
- Document-oriented data

**Patterns:**
- Embed related data (avoid joins)
- Index frequently queried fields
- Use aggregation pipeline for complex queries
- Shard for horizontal scaling

### Caching
**Layers:**
1. Application cache (in-memory: Redis, Memcached)
2. Database query cache
3. CDN for static assets

**Strategies:**
- Cache-aside: App checks cache, then DB
- Write-through: Update cache on write
- TTL-based expiration
- Invalidate on update

**What to cache:**
- Database query results
- Expensive computations
- External API responses
- Session data

## Authentication & Authorization

### Authentication (Who you are)
**Session-based:**
- Server stores session, client gets cookie
- Good for: Traditional web apps
- Stateful (requires session store)

**Token-based (JWT):**
- Client stores token, sends in headers
- Good for: SPAs, mobile apps, microservices
- Stateless (self-contained)

**Best practices:**
- Hash passwords with bcrypt/argon2
- Implement rate limiting on login
- Support 2FA for sensitive apps
- Use refresh tokens (short-lived access + long-lived refresh)

### Authorization (What you can do)
**RBAC (Role-Based):**
- Assign roles to users (admin, editor, viewer)
- Roles have permissions
- Good for: Defined organizational structure

**ABAC (Attribute-Based):**
- Policies based on attributes (user.department == resource.owner)
- More flexible, more complex

**Middleware pattern:**
```javascript
requireAuth()       // Must be logged in
requireRole('admin') // Must have role
requireOwnership()  // Must own resource
```

## Error Handling & Logging

### Error Categories
**Operational errors (expected):**
- Validation failures
- Network timeouts
- Resource not found
- Handle gracefully, return to client

**Programmer errors (bugs):**
- Null reference
- Type errors
- Logic bugs
- Log and alert, don't expose to client

### Logging
**What to log:**
- Errors with stack traces
- Security events (failed logins)
- Performance metrics
- Business events

**What NOT to log:**
- Passwords, tokens, secrets
- Personal data (GDPR)
- Full request bodies (may contain sensitive data)

**Levels:**
- ERROR: Failures requiring attention
- WARN: Potential issues
- INFO: Significant events
- DEBUG: Detailed for troubleshooting

## Performance

### N+1 Query Problem
**Problem:** Loading relations in loop
**Solution:** Eager loading, data loader pattern

### Connection Pooling
- Reuse DB connections (don't open/close per request)
- Configure max pool size
- Monitor connection usage

### Async/Parallel Processing
- Use async/await for I/O operations
- Run independent operations in parallel
- Use job queues for background tasks (Bull, BullMQ)

### Response Time
- Database queries: < 100ms
- API endpoints: < 200ms
- Use APM tools to monitor (New Relic, Datadog)

## Testing

### Unit Tests
- Test business logic in isolation
- Mock external dependencies (DB, APIs)
- Test edge cases and error paths

### Integration Tests
- Test API endpoints end-to-end
- Use test database
- Test authentication/authorization

### Load Testing
- Simulate realistic traffic
- Identify bottlenecks
- Tools: k6, Artillery, JMeter

## Common Patterns

### Repository Pattern
Separate data access from business logic
```javascript
class UserRepository {
  findById(id) { /* DB logic */ }
  save(user) { /* DB logic */ }
}
```

### Service Layer
Business logic separate from controllers
```javascript
class UserService {
  async createUser(data) {
    // Validation, business rules
    return userRepo.save(data)
  }
}
```

### Middleware Chain
Request processing pipeline
```javascript
app.use(cors())
app.use(auth())
app.use(validate())
app.use(handler())
app.use(errorHandler())
```
