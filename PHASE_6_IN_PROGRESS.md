# Phase 6: Extract @sylphx/code-tui - IN PROGRESS (60% Complete) ⏳

## Overview

Started extraction of Terminal User Interface into `@sylphx/code-tui` package. Package structure created and most files migrated, but build blocked by missing code-core exports. TUI has significantly deeper integration with core systems compared to Web GUI.

---

## ✅ Completed Work (60%)

### 1. Package Structure Created

```
packages/code-tui/
├── src/
│   ├── App.tsx                           # Main TUI application (Ink + React)
│   ├── index.ts                          # Package entry point
│   ├── screens/                          # 24 screen files
│   │   ├── Chat.tsx                      # Main chat interface
│   │   ├── Dashboard.tsx                 # Session dashboard
│   │   ├── ModelSelection.tsx            # AI model selector
│   │   ├── ProviderManagement.tsx        # Provider configuration
│   │   ├── CommandPalette.tsx            # Command palette UI
│   │   ├── Logs.tsx                      # Log viewer
│   │   ├── MainMenu.tsx                  # Main menu
│   │   └── chat/                         # Chat sub-components (17 files)
│   │       ├── autocomplete/             # File/command autocomplete
│   │       ├── components/               # Chat UI components
│   │       ├── hooks/                    # Chat-specific hooks
│   │       ├── handlers/                 # Message handlers
│   │       ├── streaming/                # Streaming adapter
│   │       └── session/                  # Session management
│   ├── components/                       # 18 Ink components
│   │   ├── MessageList.tsx               # Message display
│   │   ├── MessagePart.tsx               # Individual message parts
│   │   ├── ToolDisplay.tsx               # Tool execution display
│   │   ├── DefaultToolDisplay.tsx        # Fallback tool display
│   │   ├── StatusBar.tsx                 # Status information
│   │   ├── TodoList.tsx                  # Todo display
│   │   ├── ControlledTextInput.tsx       # Text input with control
│   │   ├── TextInputWithHint.tsx         # Input with hints
│   │   ├── SelectionUI.tsx               # Selection interface
│   │   ├── CommandAutocomplete.tsx       # Command completion
│   │   ├── FileAutocomplete.tsx          # File path completion
│   │   ├── PendingCommandSelection.tsx   # Command queue
│   │   ├── ProviderCard.tsx              # Provider info card
│   │   ├── MarkdownText.tsx              # Markdown renderer
│   │   ├── LogPanel.tsx                  # Log display panel
│   │   ├── FullScreen.tsx                # Full screen wrapper
│   │   ├── ErrorBoundary.tsx             # Error handling
│   │   └── Spinner.tsx                   # Loading spinner
│   ├── commands/                         # 19 command files
│   │   ├── types.ts                      # Command type definitions
│   │   ├── registry.ts                   # Command registry
│   │   ├── definitions/                  # 15 command definitions
│   │   │   ├── help.command.ts
│   │   │   ├── new.command.ts
│   │   │   ├── model.command.ts
│   │   │   ├── provider.command.ts
│   │   │   ├── agent.command.ts
│   │   │   ├── dashboard.command.ts
│   │   │   ├── sessions.command.ts
│   │   │   ├── context.command.ts
│   │   │   ├── rules.command.ts
│   │   │   ├── bashes.command.ts
│   │   │   ├── logs.command.ts
│   │   │   ├── compact.command.ts
│   │   │   ├── notifications.command.ts
│   │   │   └── survey.command.ts
│   │   └── helpers/                      # 3 provider helpers
│   │       ├── provider-selection.ts
│   │       ├── provider-config.ts
│   │       └── provider-set-value.ts
│   └── utils/                            # TUI-specific utilities
│       ├── scroll-viewport.ts            # Viewport calculations
│       ├── cursor-utils.ts               # Cursor positioning
│       └── tool-formatters.ts            # Tool output formatting
├── package.json                          # Package configuration
├── tsup.config.ts                        # Build configuration
└── bin/                                  # CLI entry (placeholder)
```

### 2. Files Migrated

- ✅ Copied 62 TypeScript/React files from `src/ui/`
- ✅ Main app: App.tsx
- ✅ Screens: 24 files (7 main + 17 chat sub-components)
- ✅ Components: 18 Ink-based components
- ✅ Commands: 19 command files
- ✅ Utils: 3 TUI-specific utilities

**Not Copied** (already in code-client):
- stores/app-store.ts → @sylphx/code-client
- hooks/ (12 files) → @sylphx/code-client
- utils/todo-formatters.ts → @sylphx/code-client
- utils/text-rendering-utils.tsx → @sylphx/code-client
- utils/tool-configs.ts → @sylphx/code-client
- types/tool.types.ts → @sylphx/code-client

### 3. Import Path Migration (80% Complete)

**Successfully Updated**:

```bash
# Store imports
's|from './stores/app-store\.js'|from '@sylphx/code-client'|g'
's|from '../stores/app-store\.js'|from '@sylphx/code-client'|g'

# Hooks imports
's|from './hooks/|from '@sylphx/code-client'|g'
's|from '../hooks/|from '@sylphx/code-client'|g'

# Client utils
's|from '../utils/todo-formatters\.js'|from '@sylphx/code-client'|g'
's|from '../utils/text-rendering-utils\.js'|from '@sylphx/code-client'|g'
's|from '../utils/tool-configs\.js'|from '@sylphx/code-client'|g'

# Core imports (general pattern)
's|from '../core/|from '@sylphx/code-core'|g'
's|from '../../core/|from '@sylphx/code-core'|g'
's|from '../../../core/|from '@sylphx/code-core'|g'

# Config imports
's|from '../../config/ai-config\.js'|from '@sylphx/code-core'|g'

# Types, providers, utils (general patterns)
's|from '../../types/|from '@sylphx/code-core'|g'
's|from '../../providers/|from '@sylphx/code-core'|g'
's|from '../../utils/|from '@sylphx/code-core'|g'
```

**Import Examples**:

```typescript
// Before
import { useAppStore } from './stores/app-store.js';
import { useAIConfig } from './hooks/useAIConfig.js';
import type { ProviderId } from '../../config/ai-config.js';
import { getProvider } from '../../providers/index.js';

// After
import { useAppStore } from '@sylphx/code-client';
import { useAIConfig } from '@sylphx/code-client';
import type { ProviderId } from '@sylphx/code-core';
import { getProvider } from '@sylphx/code-core';
```

### 4. Package Configuration

**package.json**:

```json
{
  "name": "@sylphx/code-tui",
  "version": "0.1.0",
  "description": "Sylphx Code TUI - Terminal user interface",
  "type": "module",
  "scripts": {
    "build": "tsup",
    "dev": "bun src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@sylphx/code-client": "workspace:*",
    "@sylphx/code-core": "workspace:*",
    "ink": "^6.4.0",
    "ink-select-input": "^6.2.0",
    "ink-text-input": "^6.0.0",
    "@jescalan/ink-markdown": "^2.0.0",
    "react": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "tsup": "^8.3.5",
    "typescript": "^5.9.3"
  }
}
```

**tsup.config.ts**:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'ink',
    '@sylphx/code-core',
    '@sylphx/code-client',
  ],
});
```

### 5. Entry Point Created

**src/index.ts**:

```typescript
export { default as App } from './App.js';
export { default as Chat } from './screens/Chat.js';
export { default as Dashboard } from './screens/Dashboard.js';
export { default as ModelSelection } from './screens/ModelSelection.js';
export { default as ProviderManagement } from './screens/ProviderManagement.js';
export { default as CommandPalette } from './screens/CommandPalette.js';
export { default as Logs } from './screens/Logs.js';
export const version = '0.1.0';
```

---

## ⏸️ Blocked Work (40% Remaining)

### Build Errors - Missing code-core Exports

The TUI build fails because `@sylphx/code-core` is missing several exports that the TUI depends on:

#### 1. Agent Manager (`core/agent-manager.ts`)

**Missing Exports**:
```typescript
- getAllAgents()
- initializeAgentManager()
- setAppStoreGetter()
- getAgentSystemPrompt()
```

**Usage in TUI**:
- `commands/definitions/agent.command.ts`: Lists and manages agents
- `commands/definitions/context.command.ts`: Gets agent system prompts
- `App.tsx`: Initializes agent system on startup

#### 2. Rule Manager (`core/rule-manager.ts`)

**Missing Exports**:
```typescript
- getRules()
- setEnabledRules()
- initializeRuleManager()
- setRuleAppStoreGetter()
- getEnabledRulesContent()
```

**Usage in TUI**:
- `commands/definitions/rules.command.ts`: Manages project rules
- `commands/definitions/context.command.ts`: Includes rules in context
- `App.tsx`: Initializes rule system on startup

#### 3. Bash Manager (`tools/bash-manager.ts`)

**Missing Exports**:
```typescript
- bashManager (singleton instance)
```

**Usage in TUI**:
- `commands/definitions/bashes.command.ts`: Lists and manages background bash shells

#### 4. Token Counter (`utils/token-counter.ts`)

**Missing Exports**:
```typescript
- formatTokenCount()
- getTokenizerInfo()
```

**Usage in TUI**:
- `commands/definitions/context.command.ts`: Display token usage
- `screens/chat/components/InputSection.tsx`: Show input token count
- `components/StatusBar.tsx`: Display tokenizer info

#### 5. Session Title (`utils/session-title.ts`)

**Partial Export** (already has `generateSessionTitleWithStreaming`):
```typescript
✅ generateSessionTitleWithStreaming() - already exported
+ getSessionDisplay() - MISSING
```

**Usage in TUI**:
- `commands/definitions/sessions.command.ts`: Format session list display

#### 6. File Scanner (`utils/file-scanner.ts`)

**Partial Export** (already has `scanProjectFiles`):
```typescript
✅ scanProjectFiles() - already exported
+ filterFiles() - MISSING
+ type FileInfo - MISSING
```

**Usage in TUI**:
- `screens/chat/autocomplete/fileAutocomplete.ts`: File path completion

#### 7. AI SDK (`core/ai-sdk.ts`)

**Partial Export**:
```typescript
✅ getSystemStatus() - already exported
✅ createAIStream() - already exported
+ getSystemPrompt() - MISSING
```

**Usage in TUI**:
- `commands/definitions/context.command.ts`: Display system prompt

#### 8. Tools Registry (`tools/index.ts`)

**Already Exported** but may need verification:
```typescript
✅ getAISDKTools() - already exported via tools/registry.ts
```

### Remaining Dynamic Imports (~20 instances)

Some files still use dynamic imports (`await import(...)`) that weren't caught by batch replacements:

```typescript
// Examples from build errors
src/screens/Chat.tsx:243
... { getTRPCClient } = await import('../../server/trpc/client.js');

src/screens/chat/streaming/subscriptionAdapter.ts:113
...{ getSystemStatus } = await import('../../../../core/ai-sdk.js');

src/commands/definitions/agent.command.ts:18
...{ getAllAgents } = await import('../../../core/agent-manager.js');
```

These need manual updates to use workspace packages.

---

## 📊 Statistics

- **Files Migrated**: 62 (100%)
- **Import Fixes**: ~150 (80% complete)
- **Missing code-core Exports**: 15
- **Remaining Dynamic Imports**: ~20
- **Progress**: 60% complete

---

## 🔧 Technology Stack

### UI Framework
- **Ink**: 6.4.0 (React for terminal UIs)
- **React**: 19.2.0
- **Ink Components**:
  - ink-select-input: 6.2.0 (selection menus)
  - ink-text-input: 6.0.0 (text input)
  - @jescalan/ink-markdown: 2.0.0 (markdown rendering)

### Build Tools
- **tsup**: 8.3.5 (TypeScript bundler)
- **TypeScript**: 5.9.3

### Dependencies
- **@sylphx/code-client**: workspace (shared React hooks/state)
- **@sylphx/code-core**: workspace (business logic)

---

## 🚀 Next Steps to Complete Phase 6

### Step 1: Add Missing Exports to @sylphx/code-core

**Update `packages/code-core/src/index.ts`**:

```typescript
// Agent Manager
export {
  getAllAgents,
  initializeAgentManager,
  setAppStoreGetter,
  getAgentSystemPrompt
} from './core/agent-manager.js';

// Rule Manager
export {
  getRules,
  setEnabledRules,
  initializeRuleManager,
  setRuleAppStoreGetter,
  getEnabledRulesContent
} from './core/rule-manager.js';

// Bash Manager
export { bashManager } from './tools/bash-manager.js';

// Token Counter
export {
  formatTokenCount,
  getTokenizerInfo
} from './utils/token-counter.js';

// Session Title
export { getSessionDisplay } from './utils/session-title.js';

// File Scanner
export { filterFiles, type FileInfo } from './utils/file-scanner.js';

// AI SDK
export { getSystemPrompt } from './core/ai-sdk.js';
```

### Step 2: Fix Remaining Dynamic Imports in TUI

Update ~20 dynamic imports to use workspace packages:

```typescript
// Before
const { getTRPCClient } = await import('../../server/trpc/client.js');

// After
import { getTRPCClient } from '@sylphx/code-server';
```

Or keep dynamic but update path:

```typescript
// Before
const { getSystemStatus } = await import('../../../../core/ai-sdk.js');

// After
const { getSystemStatus } = await import('@sylphx/code-core');
```

### Step 3: Add @sylphx/code-server to tsup externals

**Update `packages/code-tui/tsup.config.ts`**:

```typescript
export default defineConfig({
  // ...
  external: [
    'react',
    'ink',
    '@sylphx/code-core',
    '@sylphx/code-client',
    '@sylphx/code-server', // ADD THIS
  ],
});
```

### Step 4: Rebuild and Test

```bash
cd packages/code-tui
bun run build
```

Expected success output:
```
✓ 62 modules transformed
✓ built in ~2s
```

### Step 5: Create CLI Entry Point

**Create `packages/code-tui/bin/sylphx-code-tui.ts`**:

```typescript
#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import App from '../src/App.js';

render(React.createElement(App));
```

### Step 6: Update package.json with bin

```json
{
  "bin": {
    "sylphx-code-tui": "./bin/sylphx-code-tui.ts"
  }
}
```

### Step 7: Complete Phase 6 Documentation

Create `PHASE_6_COMPLETE.md` with full details.

---

## 💡 Key Differences from Phase 5 (Web GUI)

### Phase 5 (Web) - Simple Extraction

- **Complexity**: Low
- **Files**: 11 source files
- **Import Changes**: 8 (only AppRouter and MessagePart)
- **Missing Exports**: 0 (all dependencies already exported)
- **Build Time**: 934ms
- **Reason**: Web GUI was already well-separated, only used tRPC types

### Phase 6 (TUI) - Complex Extraction

- **Complexity**: High
- **Files**: 62 source files
- **Import Changes**: ~150
- **Missing Exports**: 15 from code-core
- **Estimated Build Time**: ~2s
- **Reason**: TUI has deep integration with:
  - Agent system (initialization, management, prompts)
  - Rule system (loading, enabling, content generation)
  - Bash manager (shell management)
  - Token counting (multiple locations)
  - Session management (titles, display)
  - File operations (autocomplete, scanning)
  - Command system (15 different commands with various integrations)

---

## 🔄 Architecture Impact

### Current Dependency Graph

```
@sylphx/code-tui (60% → needs code-core exports)
    ↓ ↓
    ↓ @sylphx/code-client (100%)
    ↓     ↓
    @sylphx/code-core (needs 15 additional exports)
        ↓
    External packages
```

### After Completion

```
@sylphx/code-tui (100%)
    ↓ ↓
    ↓ @sylphx/code-client (100%)
    ↓     ↓ ↓
    ↓     ↓ @sylphx/code-server (100%)
    ↓     ↓     ↓
    @sylphx/code-core (enhanced with 15 new exports)
        ↓
    External packages
```

---

## 📋 Estimated Completion Time

- **Add code-core exports**: 15 minutes
- **Fix dynamic imports**: 30 minutes
- **Test build**: 5 minutes
- **Create CLI entry**: 10 minutes
- **Documentation**: 20 minutes

**Total**: ~1.5 hours

---

## 🎯 Current Status

**Phase 6 Progress**: 60% complete ⏳

**Quality Metrics**:
- Structure: ✅ Complete
- Files Migrated: ✅ 62 files (100%)
- Imports Updated: ⏳ ~150 (80%)
- Missing Exports: ❌ 15 from code-core
- Build Success: ❌ Blocked by missing exports
- CLI Entry: ❌ Not created yet

**Blocked by**: Missing code-core exports (15 functions/types)

**Ready for**: Completion once code-core exports are added

---

Generated: 2025-01-XX
Author: Claude Code
Status: In Progress (60%) ⏳
Next: Add missing code-core exports to unblock build
