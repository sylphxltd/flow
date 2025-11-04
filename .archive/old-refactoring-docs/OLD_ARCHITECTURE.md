# Sylphx Monorepo Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS (No Logic)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  @sylphx/web │  │  @sylphx/tui │  │  @sylphx/cli │         │
│  │              │  │              │  │              │         │
│  │  React 19    │  │  React Ink   │  │  Headless    │         │
│  │  Vite        │  │              │  │              │         │
│  │  TailwindCSS │  │  Terminal    │  │  Commands    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └────────┬────────┴──────────────────┘                  │
│                  │                                              │
│         ┌────────▼────────┐                                     │
│         │ @sylphx/client  │                                     │
│         │                 │                                     │
│         │ Shared React    │                                     │
│         │ - Hooks         │                                     │
│         │ - Components    │                                     │
│         │ - Adapters      │                                     │
│         │ - Stores        │                                     │
│         └────────┬────────┘                                     │
│                  │                                              │
└──────────────────┼──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                    SERVER (Stateless API)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ┌───────────────────────┐                          │
│              │   @sylphx/server      │                          │
│              │                       │                          │
│              │  ┌─────────────────┐  │                          │
│              │  │  tRPC Router    │  │                          │
│              │  │                 │  │                          │
│              │  │  - Sessions     │  │                          │
│              │  │  - Messages     │  │                          │
│              │  │  - Config       │  │                          │
│              │  │  - Streaming    │  │                          │
│              │  └────────┬────────┘  │                          │
│              │           │           │                          │
│              │  ┌────────▼────────┐  │                          │
│              │  │  Web Server     │  │                          │
│              │  │                 │  │                          │
│              │  │  Express        │  │                          │
│              │  │  SSE Streaming  │  │                          │
│              │  │  CORS           │  │                          │
│              │  └─────────────────┘  │                          │
│              └───────────┬───────────┘                          │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CORE (All Logic)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌────────────────┐                           │
│                    │  @sylphx/core  │                           │
│                    │                │                           │
│  ┌─────────────────┼────────────────┼─────────────────┐        │
│  │                 │                │                 │        │
│  ▼                 ▼                ▼                 ▼        │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│ │    AI    │  │ Session  │  │ Message  │  │ Database │       │
│ │          │  │          │  │          │  │          │       │
│ │ Stream   │  │ CRUD     │  │ Stream   │  │ SQLite   │       │
│ │ Provider │  │ Manage   │  │ Title    │  │ Repos    │       │
│ │ Models   │  │ Lifecycle│  │ Parts    │  │ Migration│       │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│ │  Tools   │  │  Config  │  │  Utils   │  │  Types   │       │
│ │          │  │          │  │          │  │          │       │
│ │ Bash     │  │ Load     │  │ Format   │  │ Shared   │       │
│ │ Read     │  │ Validate │  │ Parse    │  │ Schemas  │       │
│ │ Write    │  │ Persist  │  │ Transform│  │ Zod      │       │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Real-Time Streaming Flow

```
User Input (Client)
       │
       ▼
┌──────────────────┐
│  InputArea.tsx   │  (Web/TUI)
│  - Capture input │
│  - Clear input   │
└────────┬─────────┘
         │ tRPC Subscription
         ▼
┌──────────────────┐
│ @sylphx/server   │
│ streamResponse   │
│ subscription     │
└────────┬─────────┘
         │ Call SDK
         ▼
┌──────────────────┐
│  @sylphx/core    │
│ streamAIResponse │  ← Main logic here
│                  │
│ 1. Create/Load   │
│    session       │
│ 2. Add user msg  │
│ 3. Build context │
│ 4. Stream AI     │
│ 5. Save result   │
│ 6. Generate      │
│    title         │
└────────┬─────────┘
         │ Events
         ▼
┌──────────────────┐
│ Observable<      │
│  StreamEvent>    │
│                  │
│ - session-created│
│ - text-start     │
│ - text-delta     │
│ - text-end       │
│ - tool-call      │
│ - tool-result    │
│ - title-delta    │
│ - complete       │
└────────┬─────────┘
         │ SSE/WebSocket
         ▼
┌──────────────────┐
│ @sylphx/client   │
│ Subscription     │
│ Adapter          │
│                  │
│ - Handle events  │
│ - Update state   │
│ - Notify UI      │
└────────┬─────────┘
         │ React State
         ▼
┌──────────────────┐
│  UI Components   │
│  - MessageList   │
│  - InputArea     │
│  - Sidebar       │
└──────────────────┘
```

## 📦 Package Dependencies

```
                    ┌──────────────┐
                    │ sylphx-flow  │ (Legacy Facade)
                    │   (v0.x)     │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌────▼────┐    ┌─────▼─────┐
    │@sylphx/web│    │@sylphx/ │    │@sylphx/cli│
    │           │    │   tui   │    │           │
    └─────┬─────┘    └────┬────┘    └─────┬─────┘
          │               │               │
          └───────┬───────┴───────┬───────┘
                  │               │
            ┌─────▼─────┐   ┌─────▼─────┐
            │@sylphx/   │   │@sylphx/   │
            │  client   │   │  server   │
            └─────┬─────┘   └─────┬─────┘
                  │               │
                  └───────┬───────┘
                          │
                    ┌─────▼─────┐
                    │@sylphx/   │
                    │   core    │ (No dependencies on UI)
                    └───────────┘
```

## 🎯 Core Design Principles

### 1. **Separation of Concerns**
- **Core**: Pure business logic, no UI
- **Server**: API layer, orchestration
- **Client**: Shared presentation logic
- **Web/TUI/CLI**: Platform-specific UI

### 2. **Functional Composition**
```typescript
// ✅ Pure functions
export function createSession(provider: string, model: string): Session {
  return {
    id: generateId(),
    provider,
    model,
    messages: [],
    createdAt: Date.now()
  }
}

// ✅ Composition
export const streamWithTitle = compose(
  streamAIResponse,
  generateTitle,
  saveToDatabase
)

// ❌ Avoid classes with state
class SessionManager { ... } // NO
```

### 3. **Feature-First Organization**
```
packages/core/src/
├── session/          # Session feature
│   ├── create.ts
│   ├── update.ts
│   ├── query.ts
│   └── types.ts
├── message/          # Message feature
│   ├── add.ts
│   ├── stream.ts
│   └── types.ts
└── ai/              # AI feature
    ├── streaming.ts
    ├── providers.ts
    └── types.ts
```

### 4. **Immutability**
```typescript
// ✅ Immutable updates
export function addMessage(session: Session, message: Message): Session {
  return {
    ...session,
    messages: [...session.messages, message]
  }
}

// ❌ Mutations
session.messages.push(message) // NO
```

### 5. **Explicit Dependencies**
```typescript
// ✅ Inject dependencies
export function streamMessage(
  sessionRepo: SessionRepository,
  aiConfig: AIConfig,
  sessionId: string
) { ... }

// ❌ Hidden dependencies
import { db } from './globals' // NO
```

## 🚀 Server Independence

The server can run completely independently:

```bash
# Start server
npm run server:start

# Multiple sessions simultaneously
curl http://localhost:3000/trpc/session.create
curl http://localhost:3000/trpc/message.stream

# Background work
# Server continues processing even if clients disconnect
```

**Features**:
- ✅ Multi-session support (concurrent users)
- ✅ Background jobs (title generation, etc.)
- ✅ Stateless API (horizontal scaling)
- ✅ Session persistence (database)
- ✅ WebSocket/SSE for real-time updates

## 🔌 Integration Example

Third-party developers can use the SDK:

```typescript
import {
  createSession,
  streamMessage,
  addMessage
} from '@sylphx/core'

// Create session
const session = await createSession('anthropic', 'claude-3-5-sonnet')

// Stream AI response
for await (const event of streamMessage(session.id, 'Hello!')) {
  console.log(event.type, event.data)
}

// Custom integration
import { getRepository } from '@sylphx/core'
const repo = getRepository()
const sessions = await repo.getAllSessions()
```

## 📊 Performance Benefits

### Build Performance
- **Incremental builds**: Only changed packages
- **Parallel builds**: Turborepo orchestration
- **Smart caching**: Never rebuild same code twice

### Runtime Performance
- **Code splitting**: Load only needed packages
- **Tree shaking**: Remove unused code
- **Lazy loading**: Dynamic imports

### Developer Experience
- **Fast tests**: Test packages independently
- **Type safety**: Shared types, compile-time checks
- **Clear boundaries**: Know where to add code

## 🎨 Naming Philosophy

### Packages: Short & Semantic
- `@sylphx/core` - The brain
- `@sylphx/server` - The API
- `@sylphx/client` - Shared UI
- `@sylphx/web` - Browser UI
- `@sylphx/tui` - Terminal UI
- `@sylphx/cli` - Commands

### Functions: Action + Subject
- `createSession` not `newSession`
- `streamMessage` not `stream`
- `formatMarkdown` not `markdown`

### Types: Descriptive
- `SessionCreateInput`
- `MessageStreamEvent`
- `AIProviderConfig`

