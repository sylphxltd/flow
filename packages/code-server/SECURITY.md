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

## Other OWASP API Security Items

- API4: Unrestricted Resource Consumption - ⏳ Pending
- API5: Broken Function Level Authorization - ⏳ Pending
- API9: Improper Inventory Management - ⏳ Pending
