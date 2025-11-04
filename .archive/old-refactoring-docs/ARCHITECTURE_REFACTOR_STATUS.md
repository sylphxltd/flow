# 🏗️ Server-Client Architecture Refactor Status

**日期:** 2025-01-04
**目標:** 重構為 server-client 架構，支持多客戶端實時數據共享

---

## ✅ 已完成

### 1. 依賴關係修正
- ✅ 移除 flow 對 `@sylphx/code-core` 的依賴（完全獨立項目）
- ✅ 移除 flow-mcp 對 `@sylphx/code-core` 的依賴（完全獨立項目）
- ✅ 修改 code-web 使用 `@sylphx/code-client` 而非直接依賴 core/server
- ✅ code-client re-export AppRouter 類型

### 2. 包合併
- ✅ 合併 code-cli + code-tui → `@sylphx/code`（統一 CLI 工具）
- ✅ 支持 TUI 和 headless 兩種模式

### 3. code-server 獨立運行
- ✅ code-server 可以作為 background daemon 運行
- ✅ Server 啟動時初始化所有資源（database, agent/rule managers）
- ✅ 提供 HTTP + tRPC endpoint (`http://localhost:3000/trpc`)
- ✅ 支持 SSE (Server-Sent Events) for subscriptions

### 4. code-web 架構
- ✅ 完全使用 HTTP tRPC 與 server 通信
- ✅ 使用 tRPC React Query integration
- ✅ SSE streaming for real-time updates

---

## ⚠️ 待完成（需深度重構）

### 問題：code-client 設計為 in-process

**現狀：**
```typescript
// code-client/src/stores/app-store.ts
import { getTRPCClient } from '@sylphx/code-server';  // ❌ in-process client
```

code-client 內部直接使用 `getTRPCClient()`（in-process tRPC caller），這導致：
1. code TUI 必須 in-process 調用 server（無法與 code-web 共享數據）
2. 無法實現多客戶端實時數據同步

**目標架構：**
```
┌────────────────────────────┐
│  code-server (Daemon)      │ ← 獨立運行
│  - Database (SQLite)       │
│  - AI providers            │
│  - Session management      │
│  - HTTP Server (port 3000) │
└────────────┬───────────────┘
             │
      ┌──────┴──────┐
      │   tRPC      │ (HTTP/SSE)
      └──────┬──────┘
             │
    ┌────────┴─────────┐
    │                  │
┌───▼────┐       ┌────▼────┐
│ code   │       │code-web │
│ (TUI)  │       │ (GUI)   │
└────────┘       └─────────┘

實時數據共享：
- TUI 創建 session → Web 立即看到
- Web 發送 message → TUI 立即看到
```

### 需要重構的部分

#### 1. code-client 重構 ⚠️ 大工程

**問題：**
- `app-store.ts` 使用 `getTRPCClient()` (in-process)
- `useAIConfig.ts` 使用 `getTRPCClient()`
- `useSessionPersistence.ts` 使用 `getTRPCClient()`

**方案 A: 可配置 client（推薦）**
```typescript
// code-client/src/trpc-context.ts
let globalClient: any = null;

export function setTRPCClient(client: any) {
  globalClient = client;
}

export function getTRPC() {
  if (!globalClient) {
    throw new Error('tRPC client not initialized');
  }
  return globalClient;
}

// code (TUI) 啟動時
import { createClient } from './trpc-client.js'; // HTTP client
import { setTRPCClient } from '@sylphx/code-client';

const client = createClient(); // HTTP tRPC
setTRPCClient(client);

// code-web 使用 React Query wrapper
// 不需要改動
```

**方案 B: React Context（僅 React 環境）**
- 創建 TRPCContext
- code TUI 和 code-web 都使用 Provider
- 更符合 React 模式，但不支持非 React 環境

#### 2. code TUI 修改

**當前：**
```typescript
// App.tsx
import { initializeAgentManager } from '@sylphx/code-core'; // ❌ 直接使用 core
```

**需要改為：**
```typescript
// index.ts
import { createClient } from './trpc-client.js';
import { setTRPCClient } from '@sylphx/code-client';

// 檢查 server 是否運行
if (!await checkServer()) {
  console.error('請先啟動 code-server');
  process.exit(1);
}

// 設置 HTTP client
const client = createClient();
setTRPCClient(client);

// 啟動 TUI
render(<App />);
```

#### 3. code headless 修改

**當前：**
```typescript
// headless.ts
import { getProvider, createAIStream } from '@sylphx/code-core'; // ❌ 直接使用 core
```

**需要改為：**
```typescript
// 使用 tRPC client 調用 server
const client = createClient();
const response = await client.message.streamResponse.subscribe({
  sessionId: null,
  userMessage: prompt,
});
```

---

## 📋 剩餘工作清單

### Phase 1: code-client 重構（優先）
1. [ ] 創建 `src/trpc-context.ts` - 全局 client 配置
2. [ ] 修改 `app-store.ts` 使用可配置 client
3. [ ] 修改 `useAIConfig.ts` 使用可配置 client
4. [ ] 修改 `useSessionPersistence.ts` 使用可配置 client
5. [ ] 添加類型支持（in-process vs HTTP client）

### Phase 2: code TUI 重構
1. [ ] 修改 `src/index.ts` 設置 HTTP tRPC client
2. [ ] 移除 `src/App.tsx` 中的 code-core 直接調用
3. [ ] 測試 TUI 連接到 server
4. [ ] 添加 server 自動啟動邏輯（可選）

### Phase 3: code headless 重構
1. [ ] 修改 `src/headless.ts` 使用 tRPC client
2. [ ] 移除 code-core 直接調用
3. [ ] 測試 headless 連接到 server

### Phase 4: 多客戶端測試
1. [ ] 啟動 code-server
2. [ ] 同時打開 code TUI 和 code-web
3. [ ] 驗證：TUI 創建 session → Web 看到
4. [ ] 驗證：Web 發送 message → TUI 看到
5. [ ] 驗證：實時數據同步

---

## 🎯 最終架構（目標）

```
# Terminal 1: 啟動 server
$ sylphx-code-server
🚀 Sylphx Code Server (Background Daemon)
   HTTP Server: http://localhost:3000
   tRPC Endpoint: http://localhost:3000/trpc

📡 Accepting connections from:
   - code (TUI): HTTP tRPC
   - code-web (GUI): HTTP/SSE tRPC

💾 All clients share same data source

# Terminal 2: 啟動 TUI
$ sylphx-code
✅ Connected to code-server (http://localhost:3000)
[TUI 界面]

# Browser: 打開 Web GUI
http://localhost:3000
✅ Connected to code-server
[Web 界面]

# 數據共享測試
TUI 創建 session "測試" → Web 立即顯示 "測試" session
Web 發送 message → TUI 立即更新
```

---

## 💡 技術決策

### 為何使用 HTTP tRPC 而非 in-process?

**優點：**
1. ✅ 多客戶端實時數據共享（核心需求）
2. ✅ Server 可獨立運行（background daemon）
3. ✅ 客戶端可以隨時連接/斷開
4. ✅ 更好的隔離性（server crash 不影響 client）

**缺點：**
1. ❌ 需要網絡連接（即使 localhost）
2. ❌ 略微增加延遲（但 localhost 可忽略）
3. ❌ 需要 server 先啟動

### 為何不同時支持兩種模式？

可以，但會增加複雜度：
- 需要兩套 client 配置
- 需要模式切換邏輯
- 用戶體驗混亂

建議：**統一使用 HTTP模式**，簡化架構。

---

## 🚧 當前限制

1. **code TUI 仍使用 in-process** - 無法與 Web 共享數據
2. **code headless 直接調用 core** - 無法與其他客戶端共享數據
3. **需要手動啟動 server** - 未實現自動啟動

---

## 📝 Notes

- 這是一個**大型重構**，預計需要 4-8 小時
- 需要修改 code-client 的核心架構
- 建議分階段完成，每個 phase 獨立測試
- 完成後，所有客戶端將真正實現實時數據共享

**最後更新:** 2025-01-04 23:00
