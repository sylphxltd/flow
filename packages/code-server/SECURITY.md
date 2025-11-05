# Security Features

This document describes the security features implemented in the CodeServer package.

## OWASP API Security Top 10 Compliance

### API2: Broken Authentication ✅

**Implementation**: Authentication middleware with dual-mode support

#### Architecture

The server operates in two modes:

1. **In-process mode** (TUI/CLI): Trusted local process
   - Auto-authenticated (no API key required)
   - Zero overhead
   - Used by TUI and CLI clients

2. **HTTP mode** (Web GUI): Untrusted network
   - API key authentication required
   - Bearer token in Authorization header
   - Environment variable configuration

#### Usage

##### In-process (TUI/CLI)

```typescript
import { CodeServer } from '@sylphx/code-server';
import { createTRPCClient } from '@trpc/client';
import { inProcessLink } from '@sylphx/code-client';

const server = new CodeServer();
await server.initialize();

const client = createTRPCClient({
  links: [inProcessLink({
    router: server.getRouter(),
    createContext: server.getContext(),
  })],
});

// All mutations are automatically authenticated
await client.session.create.mutate({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});
```

##### HTTP (Web GUI)

**Server setup:**

```bash
# Set API key
export SYLPHX_API_KEY="your-secret-api-key"

# Start server
bun run server
```

**Client setup:**

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';

const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers: {
        Authorization: 'Bearer your-secret-api-key',
      },
    }),
  ],
});

// Authenticated requests
await client.session.create.mutate({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});
```

**Without API key:**

```bash
# Unauthenticated HTTP requests will fail with:
# TRPCError: UNAUTHORIZED
# "Authentication required. Provide API key via Authorization header (Bearer <key>)"
```

#### Protected vs Public Procedures

**Protected procedures** (require authentication):
- All mutations (create, update, delete operations)
- All subscriptions (streaming, real-time updates)
- Sensitive queries

**Public procedures** (no authentication):
- Read-only queries (get recent sessions, get session by ID, etc.)
- Count operations
- Search operations

Example protected procedures:
```typescript
// Session mutations
client.session.create.mutate(...)      // ✅ Protected
client.session.updateTitle.mutate(...) // ✅ Protected
client.session.delete.mutate(...)      // ✅ Protected

// Message mutations
client.message.add.mutate(...)         // ✅ Protected
client.message.updateParts.mutate(...) // ✅ Protected
client.message.streamResponse.subscribe(...) // ✅ Protected

// Config mutations
client.config.updateDefaultProvider.mutate(...) // ✅ Protected
client.config.save.mutate(...)         // ✅ Protected

// Todo mutations
client.todo.update.mutate(...)         // ✅ Protected
```

Example public procedures:
```typescript
// Queries
client.session.getRecent.query(...)    // ⚪ Public
client.session.getById.query(...)      // ⚪ Public
client.session.getCount.query(...)     // ⚪ Public
client.message.getBySession.query(...) // ⚪ Public
client.config.load.query(...)          // ⚪ Public
```

#### Implementation Details

**Context Creation** (`packages/code-server/src/trpc/context.ts`):
- Detects request source (in-process vs HTTP)
- For in-process: Auto-authenticates as trusted local user
- For HTTP: Validates API key from Authorization header

**Authentication Middleware** (`packages/code-server/src/trpc/trpc.ts`):
- Checks `ctx.auth.isAuthenticated`
- Throws `UNAUTHORIZED` error if not authenticated
- Refines context type for TypeScript safety

**Protected Procedure**:
```typescript
export const protectedProcedure = t.procedure.use(isAuthenticated);
```

#### Security Best Practices

1. **Generate strong API keys**:
   ```bash
   # Good: Random, long, high entropy
   export SYLPHX_API_KEY="$(openssl rand -base64 32)"

   # Bad: Short, predictable
   export SYLPHX_API_KEY="secret123"
   ```

2. **Never commit API keys to version control**:
   ```bash
   # Use .env file (gitignored)
   echo "SYLPHX_API_KEY=..." >> .env

   # Load in production
   source .env
   ```

3. **Rotate keys regularly**:
   - Change API keys every 90 days
   - Immediately revoke compromised keys

4. **Use HTTPS in production**:
   - HTTP exposes API keys in transit
   - Always use HTTPS for web deployments

5. **Principle of least privilege**:
   - In-process: Trusted (local user)
   - HTTP: Untrusted (requires API key)

#### Testing

Run authentication tests:
```bash
cd packages/code-server
bun test src/trpc/__tests__/authentication.test.ts
```

#### Future Enhancements

- JWT authentication with expiration
- Multi-tenant support with user roles
- OAuth2 integration
- Session management
- Rate limiting per user

## API1: Broken Object Level Authorization ✅

**Status**: Implemented (sessionId validation in all endpoints)

## API4: Unrestricted Resource Consumption ✅

**Implementation**: Token bucket rate limiting with automatic cleanup

### Architecture

Rate limiting protects against:
- Resource exhaustion attacks
- Denial of Service (DoS)
- API abuse
- Cost overruns (AI API calls)

**Dual-mode behavior**:
1. **In-process mode** (TUI/CLI): No rate limiting (trusted local process)
2. **HTTP mode** (Web GUI): Token bucket algorithm with sliding window

### Rate Limit Tiers

Different endpoints have different rate limits based on resource consumption:

**Strict** (10 req/min):
- `session.create` - Creates new sessions (database write + init)
- `session.delete` - Deletes sessions (cascade delete, expensive)

**Moderate** (30 req/min):
- `session.updateTitle` - Updates session metadata
- `session.updateModel` - Updates session model
- `session.updateProvider` - Updates session provider
- `message.add` - Adds messages (database write)
- `message.updateParts` - Updates message content
- `message.updateStatus` - Updates message status
- `message.updateUsage` - Updates token usage
- `todo.update` - Updates todo list
- `config.updateDefaultProvider` - Updates default provider
- `config.updateDefaultModel` - Updates default model
- `config.updateProviderConfig` - Updates provider config
- `config.removeProvider` - Removes provider
- `config.save` - Saves config to file system

**Lenient** (100 req/min):
- Reserved for read-heavy queries (not yet applied)

**Streaming** (5 streams/min):
- `message.streamResponse` - AI streaming responses (most expensive)

### HTTP Response Headers

Rate limit info is included in HTTP response headers:

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1704067200
```

### Error Response

When rate limit is exceeded:

```typescript
// Error response
{
  code: 'TOO_MANY_REQUESTS',
  message: 'Rate limit exceeded for moderate endpoint. Try again in 30 seconds.'
}
```

### Usage Example

```typescript
// HTTP client
const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers: {
        Authorization: 'Bearer your-api-key',
      },
    }),
  ],
});

// First 10 requests succeed
for (let i = 0; i < 10; i++) {
  await client.session.create.mutate({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
  });
}

// 11th request fails with TOO_MANY_REQUESTS
try {
  await client.session.create.mutate({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
  });
} catch (error) {
  // TRPCError: Rate limit exceeded for strict endpoint. Try again in 60 seconds.
}
```

### Implementation Details

**Token Bucket Algorithm** (`packages/code-server/src/services/rate-limiter.service.ts`):
- Each client has a bucket of tokens
- Each request consumes 1 token
- Tokens refill over time based on window
- When bucket is empty, requests are denied

**Rate Limit Middleware** (`packages/code-server/src/trpc/trpc.ts`):
- Checks `ctx.auth.source` (skip if in-process)
- Uses identifier (userId or IP address)
- Returns 429 Too Many Requests when exceeded
- Adds rate limit headers to response

**Automatic Cleanup**:
- Unused buckets are removed after 2x window time
- Prevents memory leaks
- Runs every 5 minutes

### Configuration

Pre-configured rate limiters:

```typescript
// Strict: 10 req/min
export const strictRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
});

// Moderate: 30 req/min
export const moderateRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});

// Lenient: 100 req/min
export const lenientRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
});

// Streaming: 5 streams/min
export const streamingRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
});
```

Custom rate limiters can be created:

```typescript
const customLimiter = new RateLimiter({
  maxRequests: 50,
  windowMs: 5 * 60 * 1000, // 5 minutes
  keyGenerator: (id) => `custom:${id}`,
});
```

### Security Benefits

1. **DoS Protection**: Prevents single client from exhausting resources
2. **Fair Usage**: Ensures all clients get fair access
3. **Cost Control**: Limits expensive operations (AI API calls, database writes)
4. **Graceful Degradation**: System remains responsive under load

### Testing

Run rate limit tests:
```bash
cd packages/code-server
bun test src/services/__tests__/rate-limiter.test.ts
```

### Future Enhancements

- Dynamic rate limits based on user tier
- Burst allowance (allow short bursts above limit)
- Distributed rate limiting (Redis-based)
- Per-endpoint custom limits
- Rate limit bypass for admin users

## Other OWASP API Security Items

- API5: Broken Function Level Authorization - ⏳ Pending
- API9: Improper Inventory Management - ⏳ Pending
