# Sylphx Code Architecture

> **Last Updated:** 2025-01-05
> **Architecture Version:** v2.0 (In-Process tRPC)

---

## Overview

Sylphx Code uses an **embedded server architecture** with in-process tRPC for zero-overhead communication. The server can optionally expose HTTP endpoints for Web GUI or remote access.

### Design Philosophy

**Default: In-Process** (inspired by graphql-yoga, @trpc/server)
- ✅ **Fast**: Zero network overhead, direct function calls
- ✅ **Simple**: No daemon management, single process
- ✅ **Flexible**: Can expose HTTP for Web/Remote when needed

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  TUI (code)                                         │
│  ┌────────────────────────────────────────────┐    │
│  │  Embedded CodeServer                       │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │  tRPC Router (in-process)            │  │    │
│  │  │  - session.*, message.*, todo.*      │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │  SessionRepository + Database        │  │    │
│  │  │  SQLite (.sylphx-flow/sessions.db)   │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────┘    │
│           ↑ in-process caller link                 │
│  ┌────────┴───────────┐                            │
│  │  TUI Components    │                            │
│  │  (Ink + React)     │                            │
│  └────────────────────┘                            │
└─────────────────────────────────────────────────────┘
                    │
                    │ (Optional) HTTP Server
                    ↓
        ┌─────────────────────────┐
        │  Web GUI (Browser)      │
        │  localhost:3000         │
        └─────────────────────────┘
```

---

## Modes of Operation

### Mode 1: TUI Only (Default)

```bash
code  # Launches TUI with embedded server
```

**Architecture:**
```
TUI Process
├── Embedded CodeServer (in-process)
│   ├── tRPC Router
│   └── SQLite Database
└── Ink UI (Terminal Interface)
```

**tRPC Link:** `inProcessLink` (direct function calls, zero overhead)

### Mode 2: TUI + Web GUI

```bash
code --web  # Launches TUI + HTTP server for Web
```

**Architecture:**
```
TUI Process
├── Embedded CodeServer
│   ├── tRPC Router (in-process)
│   ├── HTTP Server :3000 (for Web)
│   └── SQLite Database
└── Ink UI

Browser → http://localhost:3000 → HTTP tRPC → CodeServer
```

**tRPC Links:**
- TUI → Server: `inProcessLink` (direct calls)
- Web → Server: `httpBatchLink` + `httpSubscriptionLink` (SSE)

### Mode 3: Remote Connection

```bash
# Terminal 1: Standalone server
code-server --port 3000

# Terminal 2-N: Connect to shared server
code --server-url http://localhost:3000
```

**Architecture:**
```
Server Process (code-server)
├── HTTP Server :3000
└── SQLite Database

Client 1 ─┐
Client 2 ─┼──> HTTP tRPC ──> Server
Client 3 ─┘
```

**tRPC Link:** `httpBatchLink` + `httpSubscriptionLink`

---

## Package Structure

### `@sylphx/code-server`

**Purpose:** Exportable server class for embedding

**Exports:**
```typescript
export class CodeServer {
  constructor(config: ServerConfig);

  // For in-process use
  getRouter(): AppRouter;
  getContext(): ServerContext;

  // Optional HTTP server
  async startHTTP(port?: number): Promise<void>;
  async close(): Promise<void>;
}

// Standalone CLI
// bin/code-server
```

**Key Files:**
- `src/server.ts` - CodeServer class
- `src/cli.ts` - Standalone server CLI
- `src/trpc/` - tRPC routers (session, message, todo, etc.)
- `src/services/` - Business logic (streaming, AI, etc.)

###  `@sylphx/code` (TUI)

**Purpose:** Terminal user interface with embedded server

**Architecture:**
```typescript
// Default: in-process
const server = new CodeServer({ dbPath: '...' });
const client = createTRPCClient({
  links: [inProcessLink({ router: server.getRouter() })]
});

// Optional: --web mode
if (options.web) {
  await server.startHTTP(3000);
  openBrowser('http://localhost:3000');
}

// Optional: remote mode
if (options.serverUrl) {
  const client = createTRPCClient({
    links: [httpBatchLink({ url: options.serverUrl })]
  });
}
```

**Key Files:**
- `src/index.ts` - CLI entry point + mode selection
- `src/screens/` - TUI screens (chat, providers, etc.)
- `src/components/` - Reusable UI components

### `@sylphx/code-client`

**Purpose:** Shared client logic (stores, hooks)

**Exports:**
```typescript
// tRPC provider
export function setTRPCClient(client: TRPCClient): void;
export function getTRPCClient(): TRPCClient;

// Zustand stores
export { useAppStore } from './stores/app-store';

// React hooks
export { useSession, useMessages } from './hooks';
```

**tRPC Links Supported:**
1. **In-Process Link** (new):
   ```typescript
   import { inProcessLink } from './trpc-links';
   links: [inProcessLink({ router: server.getRouter() })]
   ```

2. **HTTP Links** (existing):
   ```typescript
   import { httpBatchLink, httpSubscriptionLink } from '@trpc/client';
   links: [
     httpBatchLink({ url: 'http://localhost:3000/trpc' }),
     httpSubscriptionLink({ url: 'http://localhost:3000/trpc' })
   ]
   ```

### `@sylphx/code-web`

**Purpose:** Browser-based Web GUI

**Architecture:**
```typescript
// Always uses HTTP tRPC (connects to TUI or standalone server)
const client = createTRPCClient({
  links: [
    httpBatchLink({ url: '/trpc' }),
    httpSubscriptionLink({ url: '/trpc' })
  ]
});
```

---

## Data Flow

### 1. User Message Submission (In-Process Mode)

```
User types in TUI
  ↓
ChatScreen.handleSubmit()
  ↓
client.message.streamResponse.subscribe() ←─ in-process link
  ↓
CodeServer.messageRouter.streamResponse ←─── direct function call
  ↓
StreamingService.streamAIResponse()
  ↓
SessionRepository.addMessage()
  ↓
SQLite Database
```

**Performance:** ~0.1ms overhead (vs ~2-5ms HTTP localhost)

### 2. User Message Submission (HTTP Mode)

```
User types in Web GUI
  ↓
ChatScreen.handleSubmit()
  ↓
client.message.streamResponse.subscribe() ←─ HTTP SSE
  ↓
HTTP Request → localhost:3000/trpc
  ↓
CodeServer.messageRouter.streamResponse
  ↓
StreamingService.streamAIResponse()
  ↓
SessionRepository.addMessage()
  ↓
SQLite Database
```

---

## State Management

### Server State (Source of Truth)

**Location:** SQLite Database (`~/.sylphx-flow/sessions.db`)

**Managed by:** `SessionRepository` in `@sylphx/code-core`

**Schema:**
- `sessions` - Chat sessions (id, title, provider, model, agentId)
- `messages` - Message history (role, content, usage, status)
- `todos` - Task lists per session

### Client State (UI State Only)

**Location:** Zustand stores in `@sylphx/code-client`

**Stores:**
- `useAppStore` - Current session, UI settings, selection state
- Optimistic updates for perceived performance
- Syncs back to server via tRPC mutations

**Pattern:**
```typescript
// Optimistic update
set((state) => {
  state.currentSession.title = newTitle;
});

// Persist to server
await client.session.updateTitle.mutate({ sessionId, title: newTitle });
```

---

## Migration from Old Architecture

### Old Architecture (Daemon + HTTP)

```
TUI  ────HTTP────┐
                 ├──> code-server daemon :3000 ──> DB
Web  ────HTTP────┘
```

**Problems:**
- ❌ Slow startup (spawn daemon)
- ❌ Network overhead (localhost HTTP)
- ❌ Complex daemon management
- ❌ Port conflicts

### New Architecture (Embedded + Optional HTTP)

```
TUI with embedded server ──in-process──> DB
         │
         └──HTTP (optional)──> Web GUI
```

**Benefits:**
- ✅ Instant startup
- ✅ Zero network overhead
- ✅ No daemon management
- ✅ Flexible deployment

---

## Configuration

### Database Location

**Default:** `~/.sylphx-flow/sessions.db`

**Override:**
```typescript
const server = new CodeServer({
  dbPath: '/custom/path/sessions.db'
});
```

### HTTP Server Port

**Default:** `3000`

**Override:**
```bash
code --web --port 8080
code-server --port 8080
```

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Watch build
bun run dev

# Terminal 2: Run TUI (in-process, fastest)
bun run packages/code/src/index.ts

# Terminal 3: Test Web GUI
bun run packages/code/src/index.ts --web
# Then open http://localhost:3000
```

### Testing Different Modes

```bash
# Test in-process (default)
code "What is 2+2?"

# Test with Web GUI
code --web

# Test remote connection
code-server --port 3000 &  # Background server
code --server-url http://localhost:3000 "What is 2+2?"
```

---

## Performance Comparison

| Mode | Startup Time | Request Latency | Memory Usage |
|------|-------------|-----------------|--------------|
| In-Process (new) | ~100ms | ~0.1ms | 80MB |
| HTTP Daemon (old) | ~2000ms | ~3ms | 120MB (2 processes) |
| Remote HTTP | ~100ms | ~3-10ms | 80MB (client) |

---

## Security Considerations

### In-Process Mode

- ✅ No network exposure
- ✅ File system permissions only
- ✅ Single-user by design

### HTTP Mode (--web or standalone server)

- ⚠️ Exposes localhost:3000
- ⚠️ No authentication (localhost only)
- ⚠️ Firewall should block external access

**Recommendation:** Only use HTTP mode on trusted local networks.

---

## Future Enhancements

1. **Multi-User Support**
   - Add authentication to HTTP server
   - User-scoped database access

2. **Cloud Deployment**
   - Docker image for `code-server`
   - Nginx reverse proxy
   - OAuth integration

3. **Performance Optimizations**
   - Database connection pooling
   - Query result caching
   - Incremental message loading

---

## FAQ

**Q: Why in-process instead of daemon?**
A: Faster startup, simpler architecture, zero network overhead. Daemon pattern is outdated for local-first apps.

**Q: Can multiple TUI instances share data?**
A: Yes, via shared SQLite database with WAL mode. Or use standalone server mode.

**Q: Does Web GUI require server restart?**
A: No. `code --web` starts HTTP server dynamically from TUI process.

**Q: What about process isolation?**
A: Trade-off accepted for performance. Crashes affect TUI only. Standalone mode available if needed.

---

## See Also

- [Old Architecture (Archived)](./ARCHIVE/2025-01-05-daemon-http-architecture/ARCHITECTURE.md)
- [tRPC Documentation](https://trpc.io/)
- [SQLite WAL Mode](https://www.sqlite.org/wal.html)
