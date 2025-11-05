# Client Configuration Guide

This guide shows how to configure different client types to connect to the CodeServer with proper authentication.

## Client Types

CodeServer supports three client types:

1. **In-Process (CLI/TUI)** - Zero overhead, auto-authenticated
2. **HTTP (Web GUI)** - Browser-based, requires API key
3. **HTTP (Remote CLI)** - Command-line remote connection, requires API key

---

## 1. In-Process Client (CLI/TUI)

**Use case**: Local development, TUI interface, CLI tools

**Authentication**: Automatic (trusted local process)

**Role**: admin (full access)

### Setup

```typescript
import { CodeServer } from '@sylphx/code-server';
import { createTRPCClient } from '@trpc/client';
import { inProcessLink } from '@sylphx/code-client';

// Initialize server
const server = new CodeServer();
await server.initialize();

// Create client with zero-overhead in-process link
const client = createTRPCClient({
  links: [
    inProcessLink({
      router: server.getRouter(),
      createContext: server.getContext(),
    }),
  ],
});

// Use client - no API key needed!
const session = await client.session.create.mutate({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});

// Admin operations work
const stats = await client.admin.getSystemStats.query();
```

**Performance**: ~0.1ms per call (direct function invocation)

**Security**: Full admin access (trusted local process)

---

## 2. HTTP Client (Web GUI)

**Use case**: Web-based GUI, browser access

**Authentication**: API key via Authorization header

**Role**: user (standard access, no admin operations)

### Server Setup

```bash
# Set API key on server
export SYLPHX_API_KEY="your-secret-api-key"

# Start server
cd packages/code-server
bun run dev
```

### Client Setup (React)

```typescript
import { createTRPCClient } from './trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './trpc';

// Create clients
const queryClient = new QueryClient();
const trpcClient = createTRPCClient('your-secret-api-key');

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**Using environment variables** (recommended):

```bash
# .env
VITE_SYLPHX_API_KEY=your-secret-api-key
```

```typescript
// No need to pass apiKey - reads from import.meta.env.VITE_SYLPHX_API_KEY
const trpcClient = createTRPCClient();
```

### Usage in Components

```typescript
function SessionList() {
  // Queries work (public endpoint)
  const { data: sessions } = trpc.session.getRecent.useQuery({
    limit: 20,
  });

  // Mutations work (user role required)
  const createSession = trpc.session.create.useMutation();

  const handleCreate = async () => {
    await createSession.mutateAsync({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
    });
  };

  // Admin operations fail (requires admin role)
  const deleteAll = trpc.admin.deleteAllSessions.useMutation();
  // ❌ Will fail with: FORBIDDEN - Required role: admin
}
```

**Performance**: ~3-10ms per call (HTTP round-trip)

**Security**: User role (authenticated via API key, limited to standard operations)

---

## 3. HTTP Client (Remote CLI)

**Use case**: Remote CLI access, headless servers

**Authentication**: API key via Authorization header

**Role**: user (standard access)

### Server Setup

```bash
# On remote server
export SYLPHX_API_KEY="your-secret-api-key"
bun run server
```

### Client Setup

```bash
# On local machine
export SYLPHX_API_KEY="your-secret-api-key"
export CODE_SERVER_URL="https://your-server.com:3000"
```

```typescript
import { createHTTPClient } from './trpc-client';

// Create HTTP client
const client = createHTTPClient();

// Or with explicit parameters
const client = createHTTPClient(
  'https://your-server.com:3000',
  'your-secret-api-key'
);

// Use client
const session = await client.session.create.mutate({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});

// Admin operations fail
try {
  await client.admin.deleteAllSessions.mutate({ confirm: true });
} catch (error) {
  // FORBIDDEN - Required role: admin
}
```

**Performance**: ~10-50ms per call (network latency + HTTP round-trip)

**Security**: User role (authenticated via API key, limited to standard operations)

---

## Authentication Matrix

| Client Type | Authentication | Role | Admin Access | Rate Limited |
|-------------|---------------|------|--------------|--------------|
| In-Process | Automatic | admin | ✅ Yes | ❌ No |
| HTTP (Web) | API Key | user | ❌ No | ✅ Yes |
| HTTP (CLI) | API Key | user | ❌ No | ✅ Yes |

## Role Permissions

### Admin Role (In-Process Only)

**Can access**:
- All standard operations (CRUD)
- Admin operations:
  - `admin.deleteAllSessions`
  - `admin.getSystemStats`
  - `admin.forceGC`

**Rate limits**: None (trusted local process)

### User Role (HTTP with API Key)

**Can access**:
- All CRUD operations
- AI streaming
- Config updates

**Cannot access**:
- Admin operations (FORBIDDEN error)

**Rate limits**:
- Strict: 10 req/min (create, delete)
- Moderate: 30 req/min (updates)
- Streaming: 5 streams/min

### Guest Role (HTTP without API Key)

**Can access**:
- Public queries (read-only)
- Health check

**Cannot access**:
- Mutations (UNAUTHORIZED error)
- Admin operations (UNAUTHORIZED error)

**Rate limits**: Same as user role for queries

---

## Error Handling

### UNAUTHORIZED (401)

```typescript
// Missing or invalid API key
try {
  await client.session.create.mutate({...});
} catch (error) {
  // TRPCError: UNAUTHORIZED
  // Authentication required. Provide API key via Authorization header
}
```

**Solution**: Provide valid API key via environment variable or parameter

### FORBIDDEN (403)

```typescript
// Wrong role (e.g., user trying to access admin endpoint)
try {
  await client.admin.deleteAllSessions.mutate({...});
} catch (error) {
  // TRPCError: FORBIDDEN
  // Access denied. Required role: admin. Your role: user
}
```

**Solution**: Use in-process client for admin operations

### TOO_MANY_REQUESTS (429)

```typescript
// Rate limit exceeded
try {
  for (let i = 0; i < 100; i++) {
    await client.session.create.mutate({...});
  }
} catch (error) {
  // TRPCError: TOO_MANY_REQUESTS
  // Rate limit exceeded for strict endpoint. Try again in 60 seconds.
}
```

**Solution**: Respect rate limits, implement exponential backoff

---

## Security Best Practices

### API Key Management

**Generate strong keys**:
```bash
# Good: Random, high entropy
openssl rand -base64 32

# Bad: Short, predictable
"secret123"
```

**Store securely**:
```bash
# ✅ Good: Environment variable
export SYLPHX_API_KEY="$(cat ~/.sylphx/api-key)"

# ❌ Bad: Hardcoded in code
const apiKey = "my-secret-key";
```

**Rotate regularly**:
- Change API keys every 90 days
- Immediately revoke compromised keys

### Transport Security

**Use HTTPS in production**:
```typescript
// ✅ Production
const client = createHTTPClient('https://your-server.com:3000');

// ❌ Development only
const client = createHTTPClient('http://localhost:3000');
```

**Never expose API keys**:
```typescript
// ❌ Bad: Committing keys to Git
// .env
SYLPHX_API_KEY=my-key-123

// ✅ Good: Ignored file
// .env (in .gitignore)
SYLPHX_API_KEY=...
```

### Role Separation

**Use appropriate client for task**:
```typescript
// ✅ Admin operations: Use in-process
const localClient = inProcessClient();
await localClient.admin.deleteAllSessions.mutate({...});

// ✅ Standard operations: Use HTTP
const remoteClient = createHTTPClient();
await remoteClient.session.create.mutate({...});
```

---

## Troubleshooting

### Connection Issues

```typescript
import { checkServer, waitForServer } from './trpc-client';

// Check if server is running
const isRunning = await checkServer('http://localhost:3000');

// Wait for server to be ready
const ready = await waitForServer('http://localhost:3000', 5000);
if (!ready) {
  throw new Error('Server not ready after 5 seconds');
}
```

### Type Safety

```typescript
// Full TypeScript support
import type { AppRouter } from '@sylphx/code-client';
import type { inferRouterOutputs } from '@trpc/server';

// Infer types from router
type RouterOutput = inferRouterOutputs<AppRouter>;
type Session = RouterOutput['session']['create'];
```

### Debugging

```bash
# Enable debug logging
DEBUG=trpc:* bun run dev

# Check API key
echo $SYLPHX_API_KEY

# Test connection
curl http://localhost:3000/trpc/admin.getHealth
```

---

## Examples

### Example 1: Local CLI Tool

```typescript
import { CodeServer } from '@sylphx/code-server';
import { inProcessLink } from '@sylphx/code-client';

async function main() {
  const server = new CodeServer();
  await server.initialize();

  const client = createTRPCClient({
    links: [inProcessLink({
      router: server.getRouter(),
      createContext: server.getContext(),
    })],
  });

  // Full admin access
  const stats = await client.admin.getSystemStats.query();
  console.log(`Total sessions: ${stats.sessions.total}`);
}
```

### Example 2: Web Application

```typescript
// src/App.tsx
import { trpc, createTRPCClient } from './trpc';

const queryClient = new QueryClient();
const trpcClient = createTRPCClient(); // Uses VITE_SYLPHX_API_KEY

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// src/Dashboard.tsx
function Dashboard() {
  const sessions = trpc.session.getRecent.useQuery({ limit: 10 });
  const createSession = trpc.session.create.useMutation();

  return (
    <div>
      {sessions.data?.sessions.map(s => (
        <div key={s.id}>{s.title}</div>
      ))}
      <button onClick={() => createSession.mutate({...})}>
        New Session
      </button>
    </div>
  );
}
```

### Example 3: Remote CLI Access

```bash
#!/bin/bash
# deploy.sh

export SYLPHX_API_KEY="$(cat ~/.sylphx/api-key)"
export CODE_SERVER_URL="https://prod-server.com:3000"

node cli.js --remote
```

```typescript
// cli.js
import { createHTTPClient } from './trpc-client';

const client = createHTTPClient();

// Standard operations work
const session = await client.session.create.mutate({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});

console.log('Session created:', session.id);
```

---

## Summary

- **In-Process**: Fast, auto-authenticated, admin access (local only)
- **HTTP Web**: Browser-based, API key required, user access
- **HTTP CLI**: Remote access, API key required, user access

All clients are fully type-safe and support the same API surface (with role-based restrictions).
