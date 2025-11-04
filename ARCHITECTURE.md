# Sylphx Code Architecture

**Last Updated:** 2025-01-05
**Status:** ✅ Architecture Finalized

---

## 📦 Package Overview

```
@sylphx/code (CLI Tool)
  ├─ TUI mode (Ink + React)
  ├─ headless mode
  ├─ server manager (auto-spawn daemon)
  └─ web launcher (--web)

@sylphx/code-web (Web Application)
  ├─ Vite + React 19
  ├─ Modern browser UI
  └─ HTTP/SSE tRPC client

@sylphx/code-server (Background Daemon)
  ├─ HTTP/Express server
  ├─ tRPC router + SSE streaming
  ├─ Session management
  └─ Business logic

@sylphx/code-client (Shared Client Logic)
  ├─ React hooks
  ├─ tRPC provider
  ├─ Zustand stores
  └─ Type exports

@sylphx/code-core (SDK Core)
  ├─ AI providers (Anthropic, OpenAI, Google, etc.)
  ├─ Database (SQLite + Drizzle ORM)
  ├─ Session management
  └─ Tool definitions
```

---

## 🔄 Dependency Graph

```
┌────────────────┐    ┌────────────────┐
│   code (CLI)   │    │  code-web (Web)│
└────────┬───────┘    └────────┬───────┘
         │ import              │ import
         └──────────┬──────────┘
                    ↓
         ┌──────────────────┐
         │   code-client    │  ← Shared client logic
         │  (Client Logic)  │
         └──────────────────┘
                    │ HTTP tRPC
                    ↓
         ┌──────────────────┐
         │   code-server    │  ← Independent daemon
         │  (HTTP Daemon)   │
         └──────────┬───────┘
                    │ import
                    ↓
         ┌──────────────────┐
         │    code-core     │  ← SDK library
         │   (SDK Core)     │
         └──────────────────┘
```

---

## 🎯 Architecture Principles

### 1. Clear Separation of Concerns ✅

**code-server = Server daemon import code-core**
- Server implements business logic using core
- Provides HTTP/tRPC API
- Manages sessions, database, AI streaming

**code-client = Client logic**
- React hooks (useChat, useSession, etc.)
- tRPC client provider
- Shared logic for both TUI and Web

**code + code-web import code-client**
- Both UIs use shared client logic
- Connect via HTTP tRPC
- Real-time data synchronization

### 2. Independent Daemon ✅

**code-server runs independently:**
- Can be spawned by `code` (auto-start)
- Can run manually: `sylphx-code-server`
- Can be system service (systemd/launchd)
- Can be deployed in Docker/production

### 3. Modular and Reusable ✅

**Each package has clear responsibility:**
- `code-core`: SDK and business logic
- `code-server`: HTTP service layer
- `code-client`: Shared client logic
- `code`: CLI tool (TUI + headless)
- `code-web`: Web application

---

## 🚀 User Experience

### CLI Users (90%)

```bash
$ bun add -g @sylphx/code

$ code                    # TUI mode (auto-start server)
$ code "fix bug"          # headless mode (auto-start server)
$ code --web              # Launch Web GUI + browser
$ code --server           # Server-only mode (daemon)
$ code --no-auto-server   # Don't auto-start server
```

### Web-Only Users

```bash
$ bun add -g @sylphx/code-web

$ code-web                # Standalone Web application
```

### Advanced Users (Production)

```bash
$ bun add -g @sylphx/code-server

$ sylphx-code-server      # Manual daemon
$ systemctl start sylphx-code-server  # System service
```

---

## 📁 Database & Configuration

### Database Location

```
~/.sylphx-code/
  ├─ code.db              # Main database (SQLite)
  ├─ settings.json        # User configuration
  ├─ agents/              # Custom agents
  └─ rules/               # Custom rules
```

### Auto-Migration

**Automatic migration from JSON to SQLite:**
1. App startup → Initialize database
2. Run Drizzle migrations (schema)
3. Check for JSON files
4. Migrate JSON → SQLite (if exists)
5. Delete old JSON files
6. Create migration flag

---

## 🔧 Multi-Client Architecture

### Real-Time Data Sharing

```bash
# Terminal 1: Start server (daemon)
$ sylphx-code-server
🚀 Server running on http://localhost:3000

# Terminal 2: TUI
$ code
✓ Connected to server
[TUI interface]

# Terminal 3: headless
$ code "write hello world"
[Streaming output...]

# Browser: Web GUI
http://localhost:3000
✓ Connected to server
[Web interface]

# All clients share same data source
✓ TUI creates session → Web sees immediately
✓ Web sends message → TUI updates in real-time
```

---

## 📊 Technical Stack

### Backend
- **Runtime:** Bun
- **Server:** Express + tRPC
- **Database:** SQLite (libsql) + Drizzle ORM
- **Streaming:** Server-Sent Events (SSE)
- **AI:** Anthropic, OpenAI, Google, etc.

### Frontend
- **CLI:** Ink (React for terminal)
- **Web:** Vite + React 19
- **State:** Zustand
- **Queries:** TanStack Query (React Query)
- **Types:** TypeScript + tRPC

---

## ✅ Architecture Validation

### Checklist

- [x] **code-server imports code-core** ✅
  - Server uses core business logic

- [x] **code-client is shared client logic** ✅
  - Provides React hooks and tRPC provider

- [x] **code imports code-client** ✅
  - CLI uses shared client logic

- [x] **code-web imports code-client** ✅
  - Web uses shared client logic

- [x] **code spawns code-server** ✅
  - CLI can auto-start daemon

- [x] **Clear responsibility separation** ✅
  - Each package has clear role

- [x] **Independent deployment** ✅
  - Server can run standalone
  - Web can be deployed independently

---

## 🎉 Summary

**Architecture is finalized and ready for implementation!**

**Key Design:**
1. `code-server` = daemon import `code-core` ✅
2. `code-client` = shared client logic ✅
3. `code` + `code-web` import `code-client` ✅

**Advantages:**
- ✅ Modular: Clear separation of concerns
- ✅ Reusable: Shared client logic
- ✅ Scalable: Each layer can evolve independently
- ✅ Deployable: Server can run standalone

---

**Next Steps:**
1. Implement server auto-start (spawn daemon)
2. Implement `code --web` mode
3. Test complete user flow
