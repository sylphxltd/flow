# Architecture Review - 架構檢查報告

> 日期: 2025-11-05
> 檢查範圍: 整體架構、依賴關係、責任邊界

---

## 📋 Executive Summary

檢查咗成個 codebase 嘅架構，搵到幾個主要問題：

1. ❌ **循環依賴 (Circular Dependency)**: `code-server` 測試檔 import `code-client`
2. ❌ **自我引用 (Self-Import)**: `code-client` 入面嘅檔案 import 自己個 package
3. ❌ **Business Logic 放錯層 (Misplaced Business Logic)**: `useChat.ts` 有大量 business logic 應該喺 `code-core`
4. ⚠️  **全域狀態 (Global State)**: `code-core` 仲有 module-level 全域變數

---

## 🏗️ Package Architecture Overview

### 當前架構層級 (Current Layers)

```
┌──────────────────────────────────────┐
│  code (TUI) / code-web (Web UI)      │  ← UI Layer
├──────────────────────────────────────┤
│  code-client (Shared React Logic)    │  ← Client Layer
├──────────────────────────────────────┤
│  code-server (tRPC API)              │  ← Server/API Layer
├──────────────────────────────────────┤
│  code-core (Business Logic/SDK)      │  ← Core/Domain Layer
└──────────────────────────────────────┘
```

### 理想嘅依賴方向 (Ideal Dependency Direction)

依賴應該**由上至下**，唔可以反向：

```
UI Layer → Client Layer → Server Layer → Core Layer
   ✅           ✅             ✅            ✅
```

❌ **絕對唔可以嘅依賴**:
- Core → Server/Client/UI
- Server → Client/UI
- Client → Server (只可以 import types)

---

## 🔍 Issues Found

### Issue #1: 循環依賴 - code-server 依賴 code-client

**位置**: `/packages/code-server/src/trpc/__tests__/authentication.test.ts:10`

```typescript
// ❌ 問題: code-server 嘅測試檔 import code-client
import { inProcessLink } from '@sylphx/code-client';
```

**點解有問題**:
- `code-server` (下層) 依賴 `code-client` (上層)
- 而 `code-client` 本身依賴 `code-server` (import types)
- 形成循環: `server → client → server`

**影響**:
- 違反分層架構原則
- 可能導致打包問題
- 測試環境可能出現依賴解析問題

**建議解決方案**:

**方案 1: 搬 `inProcessLink` 去 code-server** (推薦)
```typescript
// 將 inProcessLink 由 code-client 搬去 code-server
// packages/code-server/src/links/in-process-link.ts

// code-server 可以自己 export 個 link
export { inProcessLink } from './links/in-process-link';
```

**方案 2: 獨立 package** (如果多個 package 都用到)
```
packages/
  code-trpc-links/     ← 新 package
    src/
      in-process-link.ts
```

**方案 3: 測試用 inline implementation**
```typescript
// 喺測試檔入面直接實現，唔 import
const testInProcessLink = (options) => { ... };
```

---

### Issue #2: Self-Import 自我引用

**位置**: `/packages/code-client/src/components/DefaultToolDisplay.tsx:10-12`

```typescript
// ❌ 問題: 檔案喺 code-client 入面但 import @sylphx/code-client
import { useElapsedTime } from '@sylphx/code-client';
import type { ToolDisplayProps } from '@sylphx/code-client';
```

**點解有問題**:
- 檔案喺 package 入面 import 自己個 package
- 可能造成 bundler 問題
- 增加不必要嘅 module resolution 開銷

**建議解決方案**:

```typescript
// ✅ 改用相對路徑
import { useElapsedTime } from '../hooks/useElapsedTime.js';
import type { ToolDisplayProps } from '../types/tool.types.js';
```

---

### Issue #3: Business Logic 放錯層 (CRITICAL)

**位置**: `/packages/code-client/src/hooks/useChat.ts`

**問題**: `useChat.ts` 入面有大量 business logic，應該喺 `code-core`:

#### 3.1 FileContentCache Class (Lines 30-115)

```typescript
// ❌ 問題: Caching logic 應該喺 core layer
class FileContentCache {
  private cache = new Map<string, { content: string; size: number; mtime: number }>();
  // ... 115 lines of caching logic
}
```

**責任錯誤**:
- Client layer 唔應該有 file system I/O
- Caching strategy 係 business logic
- 應該喺 core layer 實現，client layer 只係調用

#### 3.2 Message Transformation Logic (Lines 296-461)

```typescript
// ❌ 問題: Complex transformation logic 應該喺 core
const messages: ModelMessage[] = await Promise.all(
  updatedSession.messages.map(async (msg) => {
    // 166 lines of transformation logic
    // - System status injection
    // - Todo context building
    // - File attachment reading
    // - Content format conversion
  })
);
```

**責任錯誤**:
- SessionMessage → ModelMessage 轉換係核心業務邏輯
- System status injection 係 domain logic
- File attachment processing 係 business logic
- 應該有個 `MessageTransformer` 或者 `SessionService` 喺 core layer

#### 3.3 Title Generation Orchestration (Lines 263-294)

```typescript
// ❌ 問題: Orchestration logic 應該喺 core/server
if (updatedSession.messages.length === 1 && !updatedSession.title) {
  const autoGenerateTitle = notificationSettings.autoGenerateTitle;

  if (autoGenerateTitle) {
    generateSessionTitleWithStreaming(/* ... */);
  } else {
    const simpleTitle = generateSessionTitle(message);
  }
}
```

**責任錯誤**:
- Title generation 嘅 orchestration 應該喺 server layer
- Client hook 只應該觸發操作，唔係決定點樣做

#### 3.4 Stream Processing (Lines 466-559)

```typescript
// ❌ 問題: Stream orchestration 應該喺 core/server
const stream = createAIStream({ /* ... */ });
const { fullResponse, messageParts, usage, finishReason } = await processStream(stream, {
  // 90+ lines of callback handlers
});
```

**責任錯誤**:
- Stream processing orchestration 係 business logic
- 應該喺 server layer 處理，client 只係接收 events

---

### Issue #4: 全域狀態喺 Core Layer

**位置**: `/packages/code-core/src/tools/interaction.ts:26,40-42`

```typescript
// ⚠️  問題: Module-level global state
let userInputHandler: ((request: UserInputRequest) => Promise<...>) | null = null;
let askQueue: AskCall[] = [];
let isProcessingAsk = false;
let queueUpdateCallback: ((count: number) => void) | null = null;
```

**點解有問題**:
- Core layer 應該係 pure functions/stateless
- Global state 令 testing 困難
- 多 instance 會互相影響

**Context**:
- 根據 `code-core/src/index.ts` 嘅註釋，佢哋已經將其他 global state 搬去 `code-server/AppContext`
- `interaction.ts` 係殘留嘅 global state

```typescript
// From code-core/src/index.ts:29-31
// NOTE: Global state functions removed (moved to code-server AppContext):
// - initializeAgentManager, getAllAgents, getAgentById, reloadAgents
// Use AgentManagerService from code-server/src/context.ts instead
```

**建議解決方案**:

```typescript
// ✅ 改用 service class 喺 server layer
// packages/code-server/src/services/interaction.service.ts
export class InteractionService {
  private userInputHandler: Handler | null = null;
  private askQueue: AskCall[] = [];

  setUserInputHandler(handler: Handler) { ... }
  // ...
}

// AppContext 管理 instance
export interface AppContext {
  interactionService: InteractionService;
  // ...
}
```

---

## 📊 Detailed Responsibility Analysis

### ✅ code-core (SDK Layer) - 目前正確嘅部分

**正確嘅責任**:
- ✅ AI provider abstractions
- ✅ Database schema & repositories
- ✅ Configuration loading/saving
- ✅ Tool definitions
- ✅ Message type definitions
- ✅ Pure utility functions (formatters, validators)

**Dependencies**:
- ✅ 冇 import 其他 sylphx packages (正確!)
- ✅ 只用 external libraries (AI SDK, Drizzle, Zod)

**問題**:
- ⚠️  仍有 global state (`interaction.ts`)
- ⚠️  缺少 message transformation logic (家陣喺 client layer)

---

### ⚠️  code-server (API Layer) - 有改進空間

**正確嘅責任**:
- ✅ tRPC router definitions
- ✅ HTTP server setup
- ✅ Request/response handling
- ✅ Service composition (AppContext)

**Dependencies**:
- ✅ Only imports from `code-core` (correct!)
- ❌ Tests import from `code-client` (violation!)

**問題**:
- ❌ 測試檔有循環依賴

**缺少嘅責任**:
- Message transformation service
- Stream orchestration service
- Session lifecycle management

---

### ❌ code-client (Shared Client Logic) - 最多問題

**理想嘅責任**:
- React hooks (thin wrappers)
- Zustand stores (UI state only)
- tRPC client setup
- UI utility functions
- Shared components

**實際情況** (有問題):
- ❌ Complex business logic (`useChat.ts` - 610 lines!)
- ❌ File system I/O (`FileContentCache`)
- ❌ Message transformation logic
- ❌ Stream processing orchestration
- ❌ Caching strategies

**Dependencies**:
- ✅ Imports from `code-core` (types only - OK)
- ✅ Imports from `code-server` (types only - OK)
- ❌ Self-imports (`DefaultToolDisplay.tsx`)

---

### ✅ code (TUI) & code-web (Web UI) - 大致正確

**正確嘅責任**:
- ✅ UI components
- ✅ Screen layouts
- ✅ User input handling
- ✅ Rendering logic

**Dependencies**:
- ✅ Imports from `code-client` (correct!)
- ✅ Some imports from `code-core` (types/utils - acceptable)

---

## 🎯 Recommended Refactoring

### Priority 1: 修復循環依賴 (CRITICAL)

```bash
# 1. 搬 inProcessLink 去 code-server
mv packages/code-client/src/trpc-links/in-process-link.ts \
   packages/code-server/src/links/in-process-link.ts

# 2. 更新 code-server exports
# packages/code-server/src/index.ts
export { inProcessLink } from './links/in-process-link.js';

# 3. 更新所有 imports
# 由 '@sylphx/code-client' → '@sylphx/code-server'
```

### Priority 2: 修復 Self-Import

```typescript
// packages/code-client/src/components/DefaultToolDisplay.tsx
// Before:
import { useElapsedTime } from '@sylphx/code-client';

// After:
import { useElapsedTime } from '../hooks/useElapsedTime.js';
```

### Priority 3: 搬 Business Logic 去 Core/Server (MAJOR REFACTOR)

#### 3.1 Create MessageTransformer in code-core

```typescript
// packages/code-core/src/services/message-transformer.ts
export class MessageTransformer {
  async transformSessionMessagesToModelMessages(
    messages: SessionMessage[],
    options: TransformOptions
  ): Promise<ModelMessage[]> {
    // Move transformation logic here (160+ lines)
  }
}
```

#### 3.2 Create FileAttachmentService in code-core

```typescript
// packages/code-core/src/services/file-attachment.service.ts
export class FileAttachmentService {
  private cache: FileContentCache;

  async readAttachments(attachments: FileAttachment[]): Promise<...> {
    // Move file reading + caching logic here
  }
}
```

#### 3.3 Simplify useChat.ts

```typescript
// packages/code-client/src/hooks/useChat.ts
// After refactoring (should be ~100 lines, not 610!)
export function useChat() {
  const trpc = useTRPCClient();

  const sendMessage = async (message: string, options: SendMessageOptions) => {
    // Just call tRPC endpoint, let server handle everything
    await trpc.message.send.mutate({
      sessionId: currentSessionId,
      content: message,
      attachments: options.attachments,
    });
  };

  return { sendMessage, currentSession };
}
```

### Priority 4: 移除 Global State from Core

```typescript
// packages/code-server/src/services/interaction.service.ts
export class InteractionService {
  private userInputHandler: Handler | null = null;
  private askQueue: AskCall[] = [];

  // Instance methods instead of global functions
  setUserInputHandler(handler: Handler) { ... }
  processAsk(...) { ... }
}

// packages/code-core/src/tools/interaction.ts
// Change to factory function
export function createAskTool(interactionService: InteractionService) {
  return tool({
    execute: async ({ question, options }) => {
      return interactionService.processAsk(question, options);
    }
  });
}
```

---

## 📏 Architecture Guidelines

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer (code, code-web)                               │
│ - React components                                      │
│ - Screen layouts                                        │
│ - User input handling                                   │
│ - Rendering                                             │
└─────────────────────────────────────────────────────────┘
                        ↓ calls hooks/stores
┌─────────────────────────────────────────────────────────┐
│ Client Layer (code-client)                              │
│ - React hooks (thin wrappers)                           │
│ - Zustand stores (UI state)                             │
│ - tRPC client setup                                     │
│ - UI utilities (formatters for display)                 │
│ - NO business logic                                     │
│ - NO file I/O                                           │
│ - NO complex transformations                            │
└─────────────────────────────────────────────────────────┘
                        ↓ calls tRPC
┌─────────────────────────────────────────────────────────┐
│ Server Layer (code-server)                              │
│ - tRPC routers                                          │
│ - Request/response handling                             │
│ - Service composition (AppContext)                      │
│ - Orchestration logic                                   │
│ - Stream management                                     │
└─────────────────────────────────────────────────────────┘
                        ↓ calls services
┌─────────────────────────────────────────────────────────┐
│ Core Layer (code-core)                                  │
│ - Pure business logic                                   │
│ - Domain models                                         │
│ - Services (stateless or with DI)                       │
│ - Repositories                                          │
│ - Tool definitions                                      │
│ - NO global state                                       │
│ - NO UI concerns                                        │
└─────────────────────────────────────────────────────────┘
```

### Import Rules

```typescript
// ✅ ALLOWED
// UI Layer
import { useChat } from '@sylphx/code-client';        // OK
import { Session } from '@sylphx/code-core';          // OK (types)
import { formatToken } from '@sylphx/code-core';      // OK (utils)

// Client Layer
import type { AppRouter } from '@sylphx/code-server'; // OK (types only!)
import { createAIStream } from '@sylphx/code-core';   // OK

// Server Layer
import { SessionRepository } from '@sylphx/code-core'; // OK

// Core Layer
import { z } from 'zod';                              // OK (external)


// ❌ FORBIDDEN
// Server Layer
import { useChat } from '@sylphx/code-client';        // NO! (circular)

// Core Layer
import { AppRouter } from '@sylphx/code-server';      // NO! (upward dep)
import { useAppStore } from '@sylphx/code-client';    // NO! (upward dep)
```

---

## 📈 Metrics

### Current State

| Package      | Lines of Code | Business Logic Location | Status |
|-------------|---------------|------------------------|---------|
| code-core   | ~8,000        | 80% in core (good)     | ⚠️ Some issues |
| code-server | ~2,000        | 5% in server           | ⚠️ Needs more |
| code-client | ~3,500        | 15% in client (bad!)   | ❌ Too much logic |
| code (TUI)  | ~5,000        | 0% in UI (good)        | ✅ Clean |

### Target State

| Package      | Business Logic | Status |
|-------------|----------------|---------|
| code-core   | 90%            | ✅ Target |
| code-server | 10%            | ✅ Target |
| code-client | 0%             | ✅ Target |
| code (TUI)  | 0%             | ✅ Target |

---

## 🔧 Action Items

### Immediate (Next PR)

1. ✅ Fix circular dependency: Move `inProcessLink` to code-server
2. ✅ Fix self-imports: Use relative paths in DefaultToolDisplay.tsx

### Short-term (Next Sprint)

3. 🔄 Move FileContentCache to code-core
4. 🔄 Move message transformation logic to code-core
5. 🔄 Refactor useChat.ts to be thin wrapper (~100 lines)

### Medium-term (Next Quarter)

6. 🔄 Remove all global state from code-core
7. 🔄 Create InteractionService in code-server
8. 🔄 Add architecture tests to prevent violations

---

## 📚 References

- Current Architecture: `/ARCHITECTURE.md`
- Package Structure: `/package.json` workspaces
- Layered Architecture: https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/

---

## 總結 (Summary)

### 主要問題 (Main Issues)
1. ❌ **循環依賴**: code-server ↔ code-client
2. ❌ **Business Logic 放錯層**: code-client 有太多 business logic
3. ⚠️  **全域狀態**: code-core 仲有 module-level variables
4. ⚠️  **Self-import**: code-client 自己 import 自己

### 影響 (Impact)
- 難以測試
- 難以重用 core logic
- 可能有打包問題
- 違反 SOLID 原則

### 建議 (Recommendations)
- 立即修復循環依賴同 self-import
- 逐步將 business logic 搬返 core/server layer
- 移除 global state，改用 service instances
- 加 architecture tests 防止將來再犯

---

**審查完畢** ✅
