# Phase 4: Extract @sylphx/code-client - IN PROGRESS (80%)

## Overview

Began extraction of shared React code into `@sylphx/code-client` package for use by both Web and TUI clients. Package structure is set up, files migrated, and imports partially updated.

---

## ✅ Completed Work

### 1. Package Structure Created

```
packages/code-client/src/
├── stores/
│   └── app-store.ts          # Zustand store with tRPC integration
├── hooks/
│   ├── useAIConfig.ts         # AI configuration management
│   ├── useChat.ts             # Main chat hook
│   ├── useSessionPersistence.ts # Session state persistence
│   ├── useTokenCalculation.ts # Token counting
│   └── ... (12 hooks total)
├── utils/
│   ├── todo-formatters.ts     # Todo display formatting
│   ├── tool-configs.ts        # Tool configuration
│   ├── text-rendering-utils.tsx # Text rendering helpers
│   └── ... (6 utils total)
└── types/
    └── tool.types.ts          # Tool type definitions
```

### 2. Files Migrated

- ✅ Copied 20 files from `src/ui/` to `packages/code-client/src/`
- ✅ Store: app-store.ts (global state management)
- ✅ Hooks: 12 React hooks
- ✅ Utils: 6 utility modules
- ✅ Types: 1 type definition file

### 3. Import Path Migration (Partial)

**Completed Replacements**:
```bash
# Replace core imports
find src -name "*.ts" -exec sed -i '' "s|from '../../core/|from '@sylphx/code-core'|g" {} \;

# Replace config imports
find src -name "*.ts" -exec sed -i '' "s|from '../../config/|from '@sylphx/code-core'|g" {} \;

# Replace types imports
find src -name "*.ts" -exec sed -i '' "s|from '../../types/|from '@sylphx/code-core'|g" {} \;

# Replace tools imports
find src -name "*.ts" -exec sed -i '' "s|from '../../tools/|from '@sylphx/code-core'|g" {} \;

# Replace utils imports
find src -name "*.ts" -exec sed -i '' "s|from '../../utils/|from '@sylphx/code-core'|g" {} \;

# Replace provider imports
find src -name "*.ts" -exec sed -i '' "s|from '../../providers/|from '@sylphx/code-core'|g" {} \;

# Clean up core imports
find src -name "*.ts" -exec sed -i '' "s|from '@sylphx/code-core'[^']*'|from '@sylphx/code-core'|g" {} \;
```

### 4. Package Configuration

Updated `packages/code-client/package.json`:

```json
{
  "name": "@sylphx/code-client",
  "version": "0.1.0",
  "description": "Shared React code for Web and TUI clients",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target node --format esm --sourcemap",
    "dev": "bun --watch src/index.ts"
  },
  "dependencies": {
    "@sylphx/code-core": "workspace:*",
    "@sylphx/code-server": "workspace:*",
    "@trpc/client": "^11.7.1",
    "react": "^19.2.0",
    "zustand": "^5.0.8",
    "immer": "^10.2.0"
  }
}
```

### 5. Created Export Index

Created `src/index.ts` with organized exports:

```typescript
// State Management
export { useAppStore, type AppState, type Screen }

// React Hooks
export { useAIConfig, useChat, useSessionPersistence, ... }

// Utilities
export * from './utils/todo-formatters.js'
export * from './utils/tool-configs.js'
```

---

## ⚠️ Known Issues (Need Fixing)

### Build Errors

The package currently has build errors due to missing dependencies:

1. **Missing Code-Core Exports**:
   ```
   - setUserInputHandler / clearUserInputHandler / setQueueUpdateCallback
   - scanProjectFiles
   - sendNotification
   ```

2. **Code-Server Path Issues**:
   ```
   - '@sylphx/code-server/server/trpc/client' not resolving
   ```

3. **TUI-Specific Dependencies**:
   ```
   - '../components/DefaultToolDisplay.js' (Ink component)
   - '../commands/registry.js' (TUI commands)
   ```

### Root Causes

1. **Incomplete Core SDK**: Some utilities used by hooks aren't yet exported from code-core
2. **TUI-Specific Code**: Some hooks depend on Ink components (TUI-specific)
3. **Module Resolution**: Workspace dependencies need proper resolution setup

---

## 📋 Remaining Work (Phase 4 Completion)

### 1. Add Missing Exports to Code-Core

Need to export from `@sylphx/code-core`:

```typescript
// tools/interaction.ts
export { setUserInputHandler, clearUserInputHandler, setQueueUpdateCallback }

// Add these utilities:
export { scanProjectFiles } from './utils/file-scanner.js'
export { sendNotification } from './utils/notifications.js'
```

### 2. Fix Code-Server Import Path

Update how code-client imports from code-server:

```typescript
// Option 1: Add to code-server index.ts
export { getTRPCClient } from './server/trpc/client.js'

// Option 2: Use full path
import { getTRPCClient } from '@sylphx/code-server'
```

### 3. Separate TUI-Specific Code

Some hooks are TUI-specific and should stay in TUI package:
- `useKeyboardNavigation.ts` - Uses Ink-specific command registry
- Parts of `tool-configs.ts` - Uses Ink components

### 4. Test Build

After fixing missing exports:
```bash
cd packages/code-client
bun install  # Resolve workspace dependencies
bun run build
```

---

## 🎯 Architecture Decisions

### What Should Be in code-client?

**Included (Framework-Agnostic)**:
- ✅ State management (Zustand store)
- ✅ React hooks (non-UI specific)
- ✅ Utility functions (pure functions)
- ✅ Type definitions

**Excluded (Platform-Specific)**:
- ❌ Ink components (TUI-specific)
- ❌ DOM components (Web-specific)
- ❌ TUI command registry
- ❌ Terminal-specific keyboard handling

### Dependency Strategy

```
@sylphx/code-client
  ├─ depends on → @sylphx/code-core (SDK)
  ├─ depends on → @sylphx/code-server (tRPC client)
  └─ peer dependency → react (19.x)

@sylphx/code-tui
  ├─ depends on → @sylphx/code-client
  └─ depends on → ink (TUI framework)

@sylphx/code-web
  ├─ depends on → @sylphx/code-client
  └─ depends on → react-dom (DOM rendering)
```

---

## 📊 Statistics

- **Files Migrated**: 20
- **Import Fixes**: 100+ import statements updated
- **Package Structure**: Complete
- **Build Status**: ⚠️ Errors (missing dependencies)
- **Progress**: 80% complete

---

## 🔄 Next Steps

### Immediate (Complete Phase 4)

1. **Add Missing Exports to Code-Core** (~1 hour)
   - Export interaction handlers
   - Export file scanner
   - Export notifications

2. **Fix Code-Server Exports** (~30 mins)
   - Export getTRPCClient from index
   - Update code-client imports

3. **Test Build** (~30 mins)
   - Install workspace dependencies
   - Build code-client
   - Verify all exports work

### Future (Phase 5+)

1. **Extract @sylphx/code-web** - Web GUI
2. **Extract @sylphx/code-tui** - Terminal UI
3. **Extract @sylphx/code-cli** - Headless CLI
4. **Extract @sylphx/flow** - Legacy commands
5. **Extract @sylphx/flow-mcp** - MCP server

---

## 💡 Lessons Learned

### 1. Circular Dependencies Are Hard

The client depends on both core and server, which creates complex dependency chains. Need to be careful about what each layer exports.

### 2. Framework-Agnostic Is Tricky

Separating React hooks from their UI framework (Ink vs DOM) requires careful analysis of dependencies.

### 3. Workspace Dependencies Need Care

Bun's workspace protocol is powerful but requires that all packages export properly and dependencies are installed correctly.

### 4. Incremental Migration Is Better

Instead of migrating everything at once, it might be better to:
1. Start with just the store
2. Add hooks one by one
3. Test each addition

---

## 🎯 Current Status

**Phase 4 Progress**: 80% complete

**Quality Metrics**:
- Structure: ✅ Complete
- Files Migrated: ✅ 20 files
- Imports Updated: ⚠️ Partial
- Build: ❌ Errors
- Dependencies: ⚠️ Need fixes

**Blockers**:
1. Missing exports from code-core (30 mins to fix)
2. Code-server export structure (15 mins to fix)
3. Build testing (30 mins)

**Estimated Time to Complete**: 1-2 hours

---

Generated: 2025-01-XX
Author: Claude Code
Status: In Progress (80%) ⚠️
