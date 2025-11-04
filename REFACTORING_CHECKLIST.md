# Monorepo Refactoring Checklist

## 📋 Summary

**Goal**: Transform current codebase into well-organized monorepo with:
- ✅ Functional programming principles
- ✅ Feature-first organization
- ✅ Complete separation: Core (SDK) ← Server ← Clients
- ✅ Server can run independently, support multiple sessions
- ✅ Clients are pure UI, no business logic

## 🎯 Proposed Package Names

| Package | Purpose | Depends On |
|---------|---------|------------|
| `@sylphx/core` | SDK with all business logic | None (external libs only) |
| `@sylphx/server` | tRPC + Web server | `@sylphx/core` |
| `@sylphx/client` | Shared React hooks/components | `@sylphx/core` (types) |
| `@sylphx/web` | Web GUI (React + Vite) | `@sylphx/client` |
| `@sylphx/tui` | Terminal UI (React Ink) | `@sylphx/client` |
| `@sylphx/cli` | Headless CLI tool | `@sylphx/core` |
| `sylphx-flow` | Legacy package (backwards compat) | All packages |

## ✅ Phase 1: Setup Infrastructure

### 1.1 Monorepo Setup
- [ ] Install pnpm globally
- [ ] Create `pnpm-workspace.yaml`
- [ ] Create `turbo.json`
- [ ] Create `packages/` directory
- [ ] Update root `package.json`
- [ ] Create `tsconfig.base.json`

### 1.2 Directory Structure
```bash
mkdir -p packages/{core,server,client,web,tui,cli,flow}
```

### 1.3 Base Configuration
- [ ] Setup shared TypeScript config
- [ ] Setup shared Biome/ESLint config
- [ ] Setup shared test config (Vitest)
- [ ] Configure Turborepo pipelines

## ✅ Phase 2: Extract @sylphx/core

### 2.1 Initialize Package
- [ ] Create `packages/core/package.json`
- [ ] Create `packages/core/tsconfig.json`
- [ ] Create `packages/core/src/` structure

### 2.2 Move Core Logic
- [ ] Move `src/core/` → `packages/core/src/ai/`
- [ ] Move `src/providers/` → `packages/core/src/ai/providers/`
- [ ] Move `src/db/` → `packages/core/src/database/`
- [ ] Move `src/tools/` → `packages/core/src/tools/`
- [ ] Move `src/utils/` → `packages/core/src/utils/`
- [ ] Move `src/types/` → `packages/core/src/types/`
- [ ] Move `src/config/` → `packages/core/src/config/`

### 2.3 Refactor to Pure Functions
- [ ] Remove UI dependencies
- [ ] Extract session management (CRUD)
- [ ] Extract message handling
- [ ] Extract AI streaming logic
- [ ] Extract tool execution
- [ ] Create clean exports in `index.ts`

### 2.4 Testing
- [ ] Write unit tests for all functions
- [ ] Test session lifecycle
- [ ] Test message streaming
- [ ] Test AI integration

## ✅ Phase 3: Extract @sylphx/server

### 3.1 Initialize Package
- [ ] Create `packages/server/package.json`
- [ ] Add dependency: `@sylphx/core`
- [ ] Create `packages/server/tsconfig.json`
- [ ] Create `packages/server/src/` structure

### 3.2 Move Server Code
- [ ] Move `src/server/trpc/` → `packages/server/src/trpc/`
- [ ] Move `src/server/web/` → `packages/server/src/web/`
- [ ] Move `src/server/services/` → `packages/server/src/services/`

### 3.3 Refactor Server Logic
- [ ] Update imports to use `@sylphx/core`
- [ ] Ensure server is stateless
- [ ] Add multi-session support
- [ ] Add background job queue
- [ ] Create server entry point

### 3.4 Testing
- [ ] Test tRPC routes
- [ ] Test SSE streaming
- [ ] Test multi-session handling
- [ ] Integration tests with core

## ✅ Phase 4: Extract @sylphx/client

### 4.1 Initialize Package
- [ ] Create `packages/client/package.json`
- [ ] Add dependency: `@sylphx/core` (types only)
- [ ] Create `packages/client/tsconfig.json`
- [ ] Create `packages/client/src/` structure

### 4.2 Extract Shared React Code
- [ ] Extract hooks from `src/ui/hooks/` and `src/web/src/hooks/`
- [ ] Extract subscription adapter
- [ ] Extract shared components (Message, MessageList, MarkdownContent)
- [ ] Extract Zustand stores
- [ ] Make platform-agnostic

### 4.3 Create Adapters
- [ ] tRPC subscription adapter
- [ ] Streaming event handler
- [ ] Session state manager

### 4.4 Testing
- [ ] Test hooks with React Testing Library
- [ ] Test components
- [ ] Test adapters

## ✅ Phase 5: Extract @sylphx/web

### 5.1 Initialize Package
- [ ] Create `packages/web/package.json`
- [ ] Add dependencies: `@sylphx/client`, `@sylphx/core` (types)
- [ ] Setup Vite config
- [ ] Setup TailwindCSS

### 5.2 Move Web Code
- [ ] Move `src/web/` → `packages/web/src/`
- [ ] Update imports to use `@sylphx/client`
- [ ] Remove duplicated logic

### 5.3 Testing
- [ ] Test UI components
- [ ] E2E tests with Playwright

## ✅ Phase 6: Extract @sylphx/tui

### 6.1 Initialize Package
- [ ] Create `packages/tui/package.json`
- [ ] Add dependencies: `@sylphx/client`, `ink`
- [ ] Setup TypeScript config

### 6.2 Move TUI Code
- [ ] Move `src/ui/` → `packages/tui/src/`
- [ ] Update imports to use `@sylphx/client`
- [ ] Remove duplicated logic

### 6.3 Testing
- [ ] Test Ink components
- [ ] Integration tests

## ✅ Phase 7: Extract @sylphx/cli

### 7.1 Initialize Package
- [ ] Create `packages/cli/package.json`
- [ ] Add dependency: `@sylphx/core`
- [ ] Setup binary entry

### 7.2 Move CLI Code
- [ ] Move `src/cli.ts` and commands
- [ ] Create new commands:
  - `sylphx chat` - Interactive chat
  - `sylphx serve` - Start server
  - `sylphx init` - Initialize config
  - `sylphx config` - Manage config

### 7.3 Testing
- [ ] Test CLI commands
- [ ] Test headless mode

## ✅ Phase 8: Create Legacy Package

### 8.1 Initialize Package
- [ ] Create `packages/flow/package.json`
- [ ] Add dependencies: All other packages
- [ ] Setup binary entry

### 8.2 Create Facade
- [ ] Keep old command names
- [ ] Add deprecation warnings
- [ ] Redirect to new packages

### 8.3 Testing
- [ ] Test backwards compatibility

## ✅ Phase 9: Documentation & Publishing

### 9.1 Documentation
- [ ] Update README for each package
- [ ] Create migration guide
- [ ] Create API documentation
- [ ] Create integration examples

### 9.2 Publishing
- [ ] Setup NPM org `@sylphx`
- [ ] Configure publishConfig in each package
- [ ] Setup GitHub Actions for publishing
- [ ] Create release workflow

### 9.3 Testing
- [ ] Full integration test
- [ ] Test installation from npm
- [ ] Test in fresh project

## 🚀 Execution Strategy

### Week 1: Infrastructure + Core
- Days 1-2: Setup monorepo (Phase 1)
- Days 3-5: Extract core (Phase 2)

### Week 2: Server + Client
- Days 1-3: Extract server (Phase 3)
- Days 4-5: Extract client (Phase 4)

### Week 3: UIs + CLI
- Days 1-2: Extract Web (Phase 5)
- Days 3-4: Extract TUI (Phase 6)
- Day 5: Extract CLI (Phase 7)

### Week 4: Polish + Release
- Days 1-2: Legacy package (Phase 8)
- Days 3-4: Documentation (Phase 9.1)
- Day 5: Publishing (Phase 9.2-9.3)

## 📊 Success Criteria

### Technical
- ✅ All tests passing
- ✅ Type-safe across packages
- ✅ Server runs independently
- ✅ Clients have no business logic
- ✅ Clean dependency graph

### User Experience
- ✅ Easy to use SDK
- ✅ Fast build times
- ✅ Clear documentation
- ✅ Backwards compatible

## 🎯 Next Action

**Ready to start?**

I can begin with:
1. ✅ Setting up pnpm workspace
2. ✅ Creating package directories
3. ✅ Initializing first package (@sylphx/core)

**Or we can:**
- Review and refine the plan
- Adjust package names
- Discuss specific concerns

What would you like to do?

