# Monorepo Refactoring Plan

## 🎯 Goals
- **Separation of Concerns**: Core logic completely independent of UI/clients
- **Reusability**: SDK can be used by anyone to build their own tools
- **Scalability**: Server supports multiple concurrent sessions + background work
- **Feature-First**: Organize by functionality, not by technical layers
- **Composition**: Functional programming, pure functions, immutability

## 📦 Package Structure

```
sylphx-flow/                          (monorepo root)
├── packages/
│   ├── core/                         @sylphx/core
│   │   ├── src/
│   │   │   ├── ai/                   # AI SDK integration
│   │   │   │   ├── streaming/
│   │   │   │   ├── providers/
│   │   │   │   └── models/
│   │   │   ├── session/              # Session management
│   │   │   │   ├── create.ts
│   │   │   │   ├── update.ts
│   │   │   │   └── query.ts
│   │   │   ├── message/              # Message handling
│   │   │   │   ├── add.ts
│   │   │   │   ├── stream.ts
│   │   │   │   └── title.ts
│   │   │   ├── database/             # DB layer
│   │   │   │   ├── sqlite/
│   │   │   │   └── repositories/
│   │   │   ├── tools/                # AI tools
│   │   │   │   ├── bash/
│   │   │   │   ├── read/
│   │   │   │   ├── write/
│   │   │   │   └── registry.ts
│   │   │   ├── config/               # Configuration
│   │   │   ├── utils/                # Shared utilities
│   │   │   └── types/                # Shared types
│   │   └── package.json
│   │
│   ├── server/                       @sylphx/server
│   │   ├── src/
│   │   │   ├── trpc/                 # tRPC router
│   │   │   │   ├── routers/
│   │   │   │   ├── context.ts
│   │   │   │   └── index.ts
│   │   │   ├── web/                  # Web server
│   │   │   │   ├── server.ts
│   │   │   │   └── sse.ts
│   │   │   ├── services/             # Server services
│   │   │   │   ├── streaming.ts
│   │   │   │   └── session-manager.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── client/                       @sylphx/client
│   │   ├── src/
│   │   │   ├── hooks/                # React hooks
│   │   │   │   ├── useSession.ts
│   │   │   │   ├── useStreaming.ts
│   │   │   │   └── useMessages.ts
│   │   │   ├── components/           # Shared components
│   │   │   │   ├── Message/
│   │   │   │   ├── MessageList/
│   │   │   │   └── MarkdownContent/
│   │   │   ├── adapters/             # Platform adapters
│   │   │   │   ├── subscription.ts
│   │   │   │   └── streaming.ts
│   │   │   ├── stores/               # Zustand stores
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── web/                          @sylphx/web
│   │   ├── src/
│   │   │   ├── components/           # Web-specific components
│   │   │   │   ├── ChatContainer/
│   │   │   │   ├── Sidebar/
│   │   │   │   ├── InputArea/
│   │   │   │   └── Settings/
│   │   │   ├── pages/                # Pages/routes
│   │   │   ├── styles/               # Global styles
│   │   │   ├── trpc.ts               # tRPC client
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   └── package.json
│   │
│   ├── tui/                          @sylphx/tui
│   │   ├── src/
│   │   │   ├── screens/              # TUI screens
│   │   │   │   ├── Chat/
│   │   │   │   ├── Settings/
│   │   │   │   └── SessionList/
│   │   │   ├── components/           # Ink components
│   │   │   ├── app.tsx               # Root component
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cli/                          @sylphx/cli
│   │   ├── src/
│   │   │   ├── commands/             # CLI commands
│   │   │   │   ├── init.ts
│   │   │   │   ├── run.ts
│   │   │   │   ├── chat.ts
│   │   │   │   └── serve.ts
│   │   │   ├── cli.ts                # CLI entry
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── flow/                         sylphx-flow (legacy)
│       ├── src/
│       │   ├── commands/             # Old commands (init, run)
│       │   └── cli.ts
│       └── package.json
│
├── apps/                             (Optional: example apps)
│   └── example-integration/
│
├── package.json                      (root package.json)
├── pnpm-workspace.yaml              (workspace config)
├── turbo.json                        (build orchestration)
├── tsconfig.base.json               (shared tsconfig)
└── .gitignore
```

## 📋 Package Details

### @sylphx/core (SDK)
**Purpose**: Complete headless SDK with all business logic

**Features**:
- AI streaming (provider-agnostic)
- Session management (CRUD + lifecycle)
- Message handling (add, stream, update)
- Database layer (SQLite/LibSQL)
- Tool execution (Bash, Read, Write, etc.)
- Configuration management
- Pure functions, no side effects
- Framework-agnostic

**Exports**:
```typescript
// Session management
export { createSession, getSession, updateSession, deleteSession }
export { listSessions, searchSessions }

// Message handling
export { addMessage, streamMessage, generateTitle }
export { getMessages, updateMessage }

// AI operations
export { createAIStream, processStream }
export { getProviders, configureProvider }

// Tools
export { registerTool, executeTool, getTools }

// Database
export { createDatabase, getRepository }

// Types
export type * from './types'
```

**Dependencies**: Minimal - only essential libs (ai-sdk, drizzle, etc.)

---

### @sylphx/server
**Purpose**: tRPC server + Web server (HTTP/SSE)

**Features**:
- tRPC router (uses @sylphx/core)
- SSE streaming for web clients
- Session management API
- Multi-session support
- Background job processing
- CORS configuration

**Key Files**:
- `src/trpc/routers/` - All tRPC routers
- `src/web/server.ts` - Express + tRPC + SSE
- `src/services/streaming.ts` - Server-side streaming logic

**Dependencies**: `@sylphx/core`, `@trpc/server`, `express`

---

### @sylphx/client
**Purpose**: Shared React code for Web + TUI

**Features**:
- React hooks (useSession, useStreaming, useMessages)
- Shared components (Message, MessageList, MarkdownContent)
- tRPC integration adapters
- Subscription handlers
- Zustand stores
- Platform-agnostic utilities

**Exports**:
```typescript
// Hooks
export { useSession, useStreaming, useMessages }
export { useSessionList, useConfig }

// Components
export { Message, MessageList, MarkdownContent }

// Adapters
export { createSubscriptionAdapter }

// Stores
export { useSessionStore, useConfigStore }
```

**Dependencies**: `@sylphx/core` (types only), `react`, `zustand`, `@trpc/client`

---

### @sylphx/web
**Purpose**: Web GUI (React + Vite)

**Features**:
- Full-featured web interface
- Real-time streaming UI
- Settings management
- Session browser
- Markdown rendering
- File attachments

**Tech Stack**: React 19, Vite, TailwindCSS, tRPC, React Query

**Dependencies**: `@sylphx/client`, `@sylphx/core` (types)

---

### @sylphx/tui
**Purpose**: Terminal UI (React Ink)

**Features**:
- Terminal-based chat interface
- Same features as web (session mgmt, streaming)
- Keyboard shortcuts
- Responsive layout

**Tech Stack**: React 19, Ink, @sylphx/client

**Dependencies**: `@sylphx/client`, `@sylphx/core` (types), `ink`

---

### @sylphx/cli
**Purpose**: Headless CLI tool

**Features**:
- `chat` - Interactive chat session
- `serve` - Start tRPC server
- `init` - Initialize project
- `config` - Manage configuration

**Uses**: `@sylphx/core` directly (no server)

**Binary**: `sylphx` (global command)

---

### sylphx-flow (Legacy)
**Purpose**: Backwards compatibility

**Features**:
- Old `init` and `run` commands
- Redirects to new packages
- Deprecation warnings

---

## 🔄 Migration Strategy

### Phase 1: Setup Monorepo (Week 1)
1. ✅ Create `packages/` directory
2. ✅ Setup pnpm workspace (`pnpm-workspace.yaml`)
3. ✅ Setup Turborepo (`turbo.json`)
4. ✅ Create base TypeScript config (`tsconfig.base.json`)
5. ✅ Setup shared tooling (ESLint, Prettier, Biome)

### Phase 2: Extract Core (Week 1-2)
1. ✅ Create `packages/core`
2. ✅ Move core logic:
   - `src/core/` → `packages/core/src/ai/`
   - `src/providers/` → `packages/core/src/ai/providers/`
   - `src/db/` → `packages/core/src/database/`
   - `src/tools/` → `packages/core/src/tools/`
   - `src/utils/` → `packages/core/src/utils/`
   - `src/types/` → `packages/core/src/types/`
3. ✅ Refactor to pure functions
4. ✅ Remove UI dependencies
5. ✅ Write comprehensive tests

### Phase 3: Extract Server (Week 2)
1. ✅ Create `packages/server`
2. ✅ Move server code:
   - `src/server/` → `packages/server/src/`
3. ✅ Depend on `@sylphx/core`
4. ✅ Test multi-session support

### Phase 4: Extract Client (Week 2-3)
1. ✅ Create `packages/client`
2. ✅ Extract shared React code:
   - Hooks from `src/ui/hooks/` and `src/web/hooks/`
   - Shared components
   - Subscription adapters
3. ✅ Make platform-agnostic

### Phase 5: Split Web/TUI (Week 3)
1. ✅ Create `packages/web`
2. ✅ Move `src/web/` → `packages/web/src/`
3. ✅ Use `@sylphx/client`
4. ✅ Create `packages/tui`
5. ✅ Move `src/ui/` → `packages/tui/src/`
6. ✅ Use `@sylphx/client`

### Phase 6: Extract CLI (Week 3)
1. ✅ Create `packages/cli`
2. ✅ Move CLI commands
3. ✅ Use `@sylphx/core` directly

### Phase 7: Legacy Support (Week 4)
1. ✅ Create `packages/flow`
2. ✅ Keep old commands with deprecation
3. ✅ Test backwards compatibility

### Phase 8: Testing & Documentation (Week 4)
1. ✅ Write integration tests
2. ✅ Update documentation
3. ✅ Create migration guide
4. ✅ Publish to npm

---

## 🛠️ Tooling

### Monorepo Manager
**Choice**: **pnpm workspaces** + **Turborepo**

**Why?**
- pnpm: Fast, disk-efficient, strict dependency resolution
- Turborepo: Smart caching, parallel builds, task orchestration

### Build Tool
**Choice**: **Tsup** (for libraries) + **Vite** (for web)

### Package Manager
**Current**: Bun
**Migration**: pnpm (better monorepo support)

---

## 📝 Configuration Files

### `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "paths": {
      "@sylphx/core": ["./packages/core/src"],
      "@sylphx/server": ["./packages/server/src"],
      "@sylphx/client": ["./packages/client/src"]
    }
  }
}
```

---

## 🎨 Naming Conventions

### Package Names
- **Pattern**: `@sylphx/<name>`
- **Scoped**: All packages under `@sylphx` org
- **Semantic**: Clear purpose from name

### Directory Structure
- **Feature-first**: Group by feature/domain
- **Flat when possible**: Avoid deep nesting
- **Index exports**: Each directory exports via `index.ts`

### Function Naming
- **Pure functions**: `verb + Noun` (e.g., `createSession`, `formatMessage`)
- **Hooks**: `use + Noun` (e.g., `useSession`, `useStreaming`)
- **Components**: `PascalCase` (e.g., `MessageList`, `ChatContainer`)

---

## 🚀 Benefits

### For Developers
✅ **Clear separation**: Know exactly where code lives
✅ **Easy testing**: Test packages independently
✅ **Fast builds**: Only rebuild changed packages
✅ **Type safety**: Shared types across packages

### For Users
✅ **Use SDK directly**: Build custom integrations
✅ **Flexible deployment**: Server can run standalone
✅ **Multiple UIs**: Choose Web, TUI, or headless CLI

### For Maintainers
✅ **Independent versioning**: Update packages separately
✅ **Better CI/CD**: Parallel testing and deployment
✅ **Modular**: Easy to add new packages

---

## 📊 Dependency Graph

```
@sylphx/cli ────────┐
                    ├──→ @sylphx/core
@sylphx/server ─────┘

@sylphx/web ────┐
                ├──→ @sylphx/client ──→ @sylphx/core (types only)
@sylphx/tui ────┘

sylphx-flow (legacy) ──→ All packages (facade)
```

**Key Principle**: Core has NO dependencies on UI packages

---

## 🔐 Publishing Strategy

### NPM Org: `@sylphx`

### Versioning
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Synchronized releases**: All packages bump together initially
- **Independent later**: Once stable, allow independent versioning

### Publish Order
1. `@sylphx/core` (base)
2. `@sylphx/server` (depends on core)
3. `@sylphx/client` (depends on core types)
4. `@sylphx/web`, `@sylphx/tui`, `@sylphx/cli` (depend on client/core)
5. `sylphx-flow` (depends on all)

---

## 📚 Next Steps

1. **Review this plan** - Discuss with team
2. **Approve structure** - Finalize package names and organization
3. **Begin Phase 1** - Setup monorepo infrastructure
4. **Incremental migration** - Move code package by package
5. **Test continuously** - Ensure nothing breaks
6. **Document everything** - Keep docs updated

---

## ❓ Questions to Resolve

1. **Naming**: Approve final package names?
2. **Versioning**: Synchronized or independent?
3. **Testing**: Test strategy per package?
4. **CI/CD**: GitHub Actions setup?
5. **Documentation**: Docs site needed?

