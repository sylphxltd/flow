# Phase 2: Extract @sylphx/code-core - IN PROGRESS

## ✅ Completed

### 1. Directory Structure Created
```
packages/code-core/src/
├── ai/
│   ├── providers/      # All AI providers (Anthropic, OpenAI, Google, etc.)
│   ├── streaming/      # Streaming utilities
│   ├── models/         # Model definitions
│   ├── formatting/     # Output formatting
│   ├── functional/     # Functional utilities
│   ├── validation/     # Validation logic
│   └── *.ts            # Core AI logic (ai-sdk.ts, stream-handler.ts)
├── database/
│   ├── repositories/   # Data access layer
│   └── sqlite/         # SQLite specific code
├── tools/              # AI tools (bash, read, write, etc.)
├── config/             # Configuration management
├── utils/              # Shared utilities
├── types/              # TypeScript types
├── session/            # Session management (TBD)
├── message/            # Message handling (TBD)
└── index.ts            # Clean exports
```

### 2. Files Copied
- ✅ `src/core/` → `packages/code-core/src/ai/`
- ✅ `src/providers/` → `packages/code-core/src/ai/providers/`
- ✅ `src/db/` → `packages/code-core/src/database/`
- ✅ `src/tools/` → `packages/code-core/src/tools/`
- ✅ `src/utils/` → `packages/code-core/src/utils/`
- ✅ `src/types/` → `packages/code-core/src/types/`
- ✅ `src/config/` → `packages/code-core/src/config/`

### 3. Clean Exports Created
Created `packages/code-core/src/index.ts` with organized exports:
- AI & Streaming
- Providers
- Database & Repositories
- Configuration
- Types
- Utils
- Tools

## ⚠️ Known Issues (Need Fixing)

### Import Path Errors
1. **Missing files**:
   - `../utils/models-dev.js` - Referenced by providers
   - `../features/session/utils/title.js` - Referenced by session-title.ts
   - `@anthropic-ai/claude-agent-sdk` - External dependency

2. **Broken references**:
   - `../core/` paths need to become `../ai/`
   - `../providers/` paths need to become `../ai/providers/`
   - UI dependencies in `tools/todo.ts` need removal

### Build Errors Summary
```
error: Could not resolve: "../utils/models-dev.js"
  → openrouter-provider.ts, openai-provider.ts, anthropic-provider.ts, google-provider.ts

error: Could not resolve: "../core/ai-sdk.js"
  → session-title.ts

error: Could not resolve: "../features/session/utils/title.js"
  → session-title.ts

error: Could not resolve: "../core/functional/result.js"
  → ai-config.ts

error: Could not resolve: "../providers/index.js"
  → ai-config.ts (multiple places)

error: Could not resolve: "@anthropic-ai/claude-agent-sdk"
  → claude-code-language-model.ts

error: Could not resolve: "../ui/stores/app-store.js"
  → tools/todo.ts

error: Could not resolve: "../ui/utils/todo-formatters.js"
  → tools/todo.ts
```

## 📋 Next Steps (Phase 2 Completion)

### 1. Fix Import Paths
- [ ] Update `../core/` → `../ai/` in all files
- [ ] Update `../providers/` → `../ai/providers/`
- [ ] Copy missing utility files (models-dev.js, etc.)
- [ ] Fix feature references (session/utils/title.js)

### 2. Remove UI Dependencies
- [ ] Refactor `tools/todo.ts` to not depend on UI stores
- [ ] Extract pure functions from UI utilities
- [ ] Make tools completely headless

### 3. Add Missing Dependencies
- [ ] Add `@anthropic-ai/claude-agent-sdk` if needed
- [ ] Or remove Claude Code features if not core

### 4. Extract Session/Message Logic
Currently empty directories. Need to:
- [ ] Create `session/create.ts`
- [ ] Create `session/update.ts`
- [ ] Create `session/query.ts`
- [ ] Create `message/add.ts`
- [ ] Create `message/stream.ts`
- [ ] Create `message/update.ts`

This logic is currently in:
- `src/server/services/streaming.service.ts` → Extract to core
- Various database repository methods → Extract pure functions

### 5. Test Build
- [ ] Fix all import errors
- [ ] Ensure clean build
- [ ] No UI dependencies
- [ ] All exports working

## 🎯 Goal

Create a **pure, headless SDK** that:
- ✅ Has NO UI dependencies
- ✅ Is completely framework-agnostic
- ✅ Can be used by anyone to build their own tools
- ✅ Exports clean, functional APIs
- ✅ Has proper TypeScript types

## 🚧 Current Status

**Progress**: ~60% complete

**Blockers**:
1. Import path fixes (mechanical work)
2. UI dependency removal (requires refactoring)
3. Missing utility files (need to copy)

**Estimated Time to Complete**: 4-6 hours

## 💡 Architecture Notes

### Current Structure Issues
Some files still have monolithic responsibilities. Need to refactor to:
- Pure functions (no side effects)
- Single responsibility
- Clear input/output
- No hidden dependencies

### Example Refactoring Needed
```typescript
// ❌ Current: Mixed concerns
function processStreamWithSideEffects(stream, db, ui) {
  // ... updates DB and UI
}

// ✅ Goal: Pure function
function processStream(stream): StreamResult {
  // ... returns data, no side effects
}

// Caller handles side effects:
const result = processStream(stream)
await db.save(result)
ui.update(result)
```

## 📚 Documentation

Once Phase 2 complete, create:
- [ ] API documentation
- [ ] Usage examples
- [ ] Integration guide
- [ ] Migration guide (from old src/)

## 🔄 Next Phase Preview

**Phase 3**: Extract `@sylphx/code-server`
- Move `src/server/` to `packages/code-server/`
- Import `@sylphx/code-core`
- Ensure stateless API
- Multi-session support

