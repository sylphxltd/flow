# Sylphx Monorepo - Final Structure

## 📦 Final Package Names

| Package | Binary | Purpose |
|---------|--------|---------|
| `@sylphx/code-core` | - | SDK with all business logic |
| `@sylphx/code-server` | - | tRPC + Web server |
| `@sylphx/code-client` | - | Shared React hooks/components |
| `@sylphx/code-web` | - | Web GUI (React + Vite) |
| `@sylphx/code-tui` | - | Terminal UI (React Ink) |
| `@sylphx/code-cli` | `sylphx-code` | Headless CLI tool |
| `@sylphx/flow` | `sylphx-flow` | Legacy project (init, run commands) |
| `@sylphx/flow-mcp` | `sylphx-flow-mcp` | MCP server integration |

## 🏗️ Directory Structure

```
sylphx-flow/                          (monorepo root)
├── packages/
│   ├── code-core/                    @sylphx/code-core
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
│   ├── code-server/                  @sylphx/code-server
│   │   ├── src/
│   │   │   ├── trpc/                 # tRPC router
│   │   │   │   ├── routers/
│   │   │   │   │   ├── session.ts
│   │   │   │   │   ├── message.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   └── mcp.ts
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
│   ├── code-client/                  @sylphx/code-client
│   │   ├── src/
│   │   │   ├── hooks/                # React hooks
│   │   │   │   ├── useSession.ts
│   │   │   │   ├── useStreaming.ts
│   │   │   │   ├── useMessages.ts
│   │   │   │   └── useConfig.ts
│   │   │   ├── components/           # Shared components
│   │   │   │   ├── Message/
│   │   │   │   ├── MessageList/
│   │   │   │   └── MarkdownContent/
│   │   │   ├── adapters/             # Platform adapters
│   │   │   │   ├── subscription.ts
│   │   │   │   └── streaming.ts
│   │   │   ├── stores/               # Zustand stores
│   │   │   │   ├── sessionStore.ts
│   │   │   │   └── configStore.ts
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── code-web/                     @sylphx/code-web
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
│   ├── code-tui/                     @sylphx/code-tui
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
│   ├── code-cli/                     @sylphx/code-cli
│   │   ├── src/
│   │   │   ├── commands/             # CLI commands
│   │   │   │   ├── chat.ts           # Interactive chat
│   │   │   │   ├── serve.ts          # Start server
│   │   │   │   ├── init.ts           # Initialize config
│   │   │   │   └── config.ts         # Manage config
│   │   │   ├── cli.ts                # CLI entry
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── bin/
│   │       └── sylphx-code.js
│   │
│   ├── flow/                         @sylphx/flow
│   │   ├── src/
│   │   │   ├── commands/             # Old commands
│   │   │   │   ├── init.ts           # Project initialization
│   │   │   │   ├── run.ts            # Run guidelines
│   │   │   │   └── legacy.ts
│   │   │   └── cli.ts
│   │   ├── package.json
│   │   └── bin/
│   │       └── sylphx-flow.js
│   │
│   └── flow-mcp/                     @sylphx/flow-mcp
│       ├── src/
│       │   ├── server/               # MCP server
│       │   │   ├── tools/            # MCP tool implementations
│       │   │   ├── resources/        # MCP resources
│       │   │   └── prompts/          # MCP prompts
│       │   ├── index.ts
│       │   └── stdio.ts              # Stdio transport
│       ├── package.json
│       └── bin/
│           └── sylphx-flow-mcp.js
│
├── package.json                      (root package.json)
├── bun.workspaces                    (Bun workspace config)
├── turbo.json                        (build orchestration)
├── tsconfig.base.json               (shared tsconfig)
└── .gitignore
```

## 🔗 Package Dependencies

```
                    ┌──────────────┐
                    │  @sylphx/    │
                    │     flow     │ (Legacy: init, run)
                    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  @sylphx/    │    │  @sylphx/    │    │  @sylphx/    │
│  code-web   │    │  code-tui    │    │  code-cli    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └─────────┬─────────┴───────┬───────────┘
                 │                 │
           ┌─────▼─────┐     ┌─────▼─────┐
           │ @sylphx/  │     │ @sylphx/  │
           │   code-   │     │   code-   │
           │  client   │     │  server   │
           └─────┬─────┘     └─────┬─────┘
                 │                 │
                 └────────┬────────┘
                          │
                    ┌─────▼─────┐
                    │ @sylphx/  │
                    │   code-   │
                    │   core    │
                    └───────────┘

                    ┌──────────────┐
                    │  @sylphx/    │
                    │  flow-mcp    │ (Uses code-core)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  @sylphx/    │
                    │  code-core   │
                    └──────────────┘
```

## 📋 Package Details

### @sylphx/code-core
**Exports**:
```typescript
// Session
export { createSession, getSession, updateSession, deleteSession }

// Message
export { addMessage, streamMessage, generateTitle }

// AI
export { createAIStream, processStream }

// Tools
export { registerTool, executeTool }

// Database
export { createDatabase, getRepository }

// Types
export type * from './types'
```

### @sylphx/code-server
**Features**:
- tRPC router (sessions, messages, config, MCP)
- SSE streaming
- Multi-session support
- Background jobs

### @sylphx/code-client
**Exports**:
```typescript
// Hooks
export { useSession, useStreaming, useMessages, useConfig }

// Components
export { Message, MessageList, MarkdownContent }

// Adapters
export { createSubscriptionAdapter }

// Stores
export { useSessionStore, useConfigStore }
```

### @sylphx/code-web
**Tech**: React 19, Vite, TailwindCSS, tRPC

### @sylphx/code-tui
**Tech**: React 19, Ink, tRPC

### @sylphx/code-cli
**Binary**: `sylphx-code`
**Commands**:
```bash
sylphx-code chat          # Interactive chat
sylphx-code serve         # Start server
sylphx-code init          # Initialize config
sylphx-code config        # Manage config
```

### @sylphx/flow
**Binary**: `sylphx-flow`
**Commands**:
```bash
sylphx-flow init          # Initialize project
sylphx-flow run           # Run guidelines
```

### @sylphx/flow-mcp
**Binary**: `sylphx-flow-mcp`
**Purpose**: MCP server for Claude Desktop integration
**Features**:
- MCP tools (read, write, search)
- MCP resources (project files)
- MCP prompts (templates)

## 🛠️ Tooling

### Monorepo: Bun Workspaces + Turborepo
- **Bun workspaces**: Native workspace support
- **Turborepo**: Smart caching, parallel builds

### Build Tools
- **tsup**: For library packages (core, server, client)
- **Vite**: For web package
- **esbuild**: For CLI packages

### Configuration Files

#### `bun.workspaces`
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

#### `turbo.json`
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
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## 📝 Root package.json Scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules/.cache",

    "dev:web": "bun --cwd packages/code-web dev",
    "dev:tui": "bun --cwd packages/code-tui dev",
    "dev:server": "bun --cwd packages/code-server dev",

    "build:core": "bun --cwd packages/code-core build",
    "build:server": "bun --cwd packages/code-server build",
    "build:client": "bun --cwd packages/code-client build",
    "build:web": "bun --cwd packages/code-web build",
    "build:tui": "bun --cwd packages/code-tui build",
    "build:cli": "bun --cwd packages/code-cli build",
    "build:flow": "bun --cwd packages/flow build",
    "build:mcp": "bun --cwd packages/flow-mcp build"
  }
}
```

## 🎯 Migration Order

1. **Setup infrastructure** (bun workspaces + turbo)
2. **@sylphx/code-core** (extract all logic)
3. **@sylphx/code-server** (tRPC server)
4. **@sylphx/code-client** (shared React)
5. **@sylphx/code-web** (Web GUI)
6. **@sylphx/code-tui** (Terminal UI)
7. **@sylphx/code-cli** (CLI tool)
8. **@sylphx/flow** (legacy package)
9. **@sylphx/flow-mcp** (MCP server)

## 🚀 Usage Examples

### For SDK Users
```typescript
import { createSession, streamMessage } from '@sylphx/code-core'

const session = await createSession('anthropic', 'claude-3-5-sonnet')
for await (const event of streamMessage(session.id, 'Hello!')) {
  console.log(event)
}
```

### For Server Deployment
```bash
# Start standalone server
bun run --cwd packages/code-server start

# Or use docker
docker run -p 3000:3000 sylphx/code-server
```

### For Web Users
```bash
# Development
bun run dev:web

# Production
bun run build:web
```

### For TUI Users
```bash
# Development
bun run dev:tui

# Production
sylphx-code chat  # Uses code-tui under the hood
```

### For Legacy Flow Users
```bash
sylphx-flow init
sylphx-flow run
```

### For MCP Users
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "sylphx": {
      "command": "sylphx-flow-mcp",
      "args": []
    }
  }
}
```

## ✅ Benefits of This Structure

1. **Clear naming**: All "code" packages grouped together
2. **No conflicts**: Won't clash with future Sylphx projects
3. **Backwards compatible**: Old `sylphx-flow` still works
4. **MCP integration**: Separate package for Claude Desktop
5. **Flexible**: Can add more packages easily (e.g., `@sylphx/code-vscode`)

## 🎨 Future Packages

Possible additions:
- `@sylphx/code-vscode` - VSCode extension
- `@sylphx/code-figma` - Figma plugin integration
- `@sylphx/docs` - Sylphx documentation site
- `@sylphx/website` - Sylphx official website

All avoid naming conflicts! 🎉

