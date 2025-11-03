# Sylphx Flow - 全面重構計劃

## 🎯 重構目標

### Functional Programming + Domain-Driven Design
- **Pure Functions**: 提取所有業務邏輯成純函數
- **Composition**: 用小函數組合替代大型組件
- **Immutability**: 所有數據不可變
- **Domain Separation**: 按業務領域清晰分離

## 📊 當前問題分析

### 組件層面
- **Chat.tsx**: 1088 行，30+ hooks，職責過多
- **app-store.ts**: 432 行，混合多個關注點
- **useChat.ts**: 517 行，包含過多邏輯

### 核心問題
1. **God Component**: Chat.tsx 處理所有事情
2. **Mixed Concerns**: Store 混合 UI/業務/數據邏輯
3. **Tight Coupling**: 組件間高耦合
4. **Hard to Test**: 難以單元測試
5. **State Hell**: 過多相互依賴的狀態

## 🏗️ 新架構設計

### Domain 結構
```
src/domains/
├── input/              # 輸入處理
│   ├── core/
│   │   ├── cursor.ts          # 游標邏輯
│   │   ├── text-ops.ts        # 文字操作
│   │   └── wrapping.ts        # 換行邏輯
│   ├── utils/
│   │   ├── keyboard.ts        # 鍵盤快捷鍵
│   │   └── validation.ts      # 輸入驗證
│   ├── types/
│   │   └── index.ts           # 類型定義
│   └── index.ts               # 導出

├── streaming/          # 串流處理
│   ├── core/
│   │   ├── buffer.ts          # 緩衝管理
│   │   ├── chunks.ts          # Chunk 處理
│   │   └── state.ts           # 串流狀態
│   ├── utils/
│   │   ├── debounce.ts        # 防抖邏輯
│   │   └── flush.ts           # 刷新邏輯
│   └── index.ts

├── command/            # 命令系統
│   ├── core/
│   │   ├── executor.ts        # 命令執行
│   │   ├── parser.ts          # 命令解析
│   │   └── registry.ts        # 命令註冊
│   ├── utils/
│   │   ├── matcher.ts         # 命令匹配
│   │   └── validator.ts       # 命令驗證
│   └── index.ts

├── autocomplete/       # 自動完成
│   ├── core/
│   │   ├── filter.ts          # 過濾邏輯
│   │   ├── match.ts           # 匹配邏輯
│   │   └── suggest.ts         # 建議生成
│   ├── utils/
│   │   ├── file-finder.ts     # 文件查找
│   │   └── scorer.ts          # 評分算法
│   └── index.ts

├── attachment/         # 文件附件
│   ├── core/
│   │   ├── parser.ts          # 標籤解析
│   │   ├── validator.ts       # 文件驗證
│   │   └── tokenizer.ts       # Token 計算
│   ├── utils/
│   │   ├── file-reader.ts     # 文件讀取
│   │   └── cache.ts           # 緩存管理
│   └── index.ts

├── session/            # Session 管理
│   ├── core/
│   │   ├── lifecycle.ts       # 生命週期
│   │   ├── state.ts           # 狀態管理
│   │   └── persistence.ts     # 持久化
│   ├── utils/
│   │   ├── migration.ts       # 數據遷移
│   │   └── serializer.ts      # 序列化
│   └── index.ts

└── chat/               # 聊天邏輯
    ├── core/
    │   ├── message.ts         # 消息處理
    │   ├── conversation.ts    # 對話管理
    │   └── ai-interaction.ts  # AI 交互
    ├── utils/
    │   ├── formatter.ts       # 格式化
    │   └── transformer.ts     # 數據轉換
    └── index.ts
```

### Store 重構
```
src/ui/stores/
├── slices/
│   ├── session-slice.ts       # Session 狀態
│   ├── input-slice.ts         # 輸入狀態
│   ├── streaming-slice.ts     # 串流狀態
│   ├── command-slice.ts       # 命令狀態
│   ├── ui-slice.ts            # UI 狀態
│   └── config-slice.ts        # 配置狀態
├── app-store.ts               # 主 store（組合 slices）
└── index.ts
```

### Hook 重構
```
src/ui/hooks/
├── domain/                    # Domain hooks
│   ├── useInput.ts           # 輸入 hook
│   ├── useStreaming.ts       # 串流 hook
│   ├── useCommands.ts        # 命令 hook
│   └── useAutocomplete.ts    # 自動完成 hook
├── composition/              # 組合 hooks
│   ├── useChatState.ts      # 聊天狀態組合
│   └── useCommandFlow.ts    # 命令流程組合
└── index.ts
```

## 🔄 重構步驟

### Phase 1: 提取純函數 (1-2 天)
**目標**: 將所有業務邏輯提取成純函數

#### 1.1 Input Domain
- [ ] 提取 cursor 相關邏輯 → `domains/input/core/cursor.ts`
- [ ] 提取 text wrapping → `domains/input/core/wrapping.ts`
- [ ] 提取 keyboard shortcuts → `domains/input/utils/keyboard.ts`

#### 1.2 Streaming Domain
- [ ] 提取 buffer 邏輯 → `domains/streaming/core/buffer.ts`
- [ ] 提取 chunk 處理 → `domains/streaming/core/chunks.ts`
- [ ] 提取 debounce → `domains/streaming/utils/debounce.ts`

#### 1.3 Command Domain
- [ ] 提取 command parser → `domains/command/core/parser.ts`
- [ ] 提取 command executor → `domains/command/core/executor.ts`
- [ ] 提取 command matcher → `domains/command/utils/matcher.ts`

#### 1.4 Autocomplete Domain
- [ ] 提取 file filter → `domains/autocomplete/core/filter.ts`
- [ ] 提取 command filter → `domains/autocomplete/core/matcher.ts`
- [ ] 提取 scoring → `domains/autocomplete/utils/scorer.ts`

### Phase 2: 重構 Store (1 天)
**目標**: 分離 store 成多個 slices

#### 2.1 創建 Slices
- [ ] `session-slice.ts` - Session CRUD
- [ ] `input-slice.ts` - 輸入狀態
- [ ] `streaming-slice.ts` - 串流狀態
- [ ] `command-slice.ts` - 命令狀態
- [ ] `ui-slice.ts` - UI 狀態

#### 2.2 重組 app-store
- [ ] 組合所有 slices
- [ ] 移除重複邏輯
- [ ] 使用 domain 函數

### Phase 3: 重構 Hooks (1 天)
**目標**: 創建 domain-specific hooks

#### 3.1 Domain Hooks
- [ ] `useInput` - 使用 input domain
- [ ] `useStreaming` - 使用 streaming domain
- [ ] `useCommands` - 使用 command domain
- [ ] `useAutocomplete` - 使用 autocomplete domain

#### 3.2 Composition Hooks
- [ ] `useChatState` - 組合多個 domain hooks
- [ ] `useCommandFlow` - 命令流程邏輯

### Phase 4: 重構 Chat.tsx (1 天)
**目標**: Chat.tsx 變成純協調器

#### 4.1 分離子組件
- [ ] `ChatInput.tsx` - 輸入區域
- [ ] `ChatMessages.tsx` - 消息列表
- [ ] `ChatStreaming.tsx` - 串流顯示
- [ ] `ChatCommands.tsx` - 命令界面

#### 4.2 簡化主組件
- [ ] 只保留協調邏輯
- [ ] 使用 composition hooks
- [ ] 移除所有業務邏輯

### Phase 5: 測試與驗證 (1 天)
**目標**: 確保功能完整

#### 5.1 單元測試
- [ ] 測試所有純函數
- [ ] 測試 domain 邏輯
- [ ] 測試 store slices

#### 5.2 集成測試
- [ ] 測試完整流程
- [ ] 測試邊界情況
- [ ] 性能測試

## 📈 預期成果

### 代碼質量
- **可測試性**: ⬆️ 90% (純函數易測試)
- **可維護性**: ⬆️ 80% (清晰的職責分離)
- **可擴展性**: ⬆️ 85% (模組化設計)
- **性能**: ⬆️ 20% (優化重渲染)

### 代碼量
- **Chat.tsx**: 1088 行 → ~200 行 (⬇️ 80%)
- **app-store.ts**: 432 行 → ~100 行 (⬇️ 75%)
- **新增 domain 代碼**: ~2000 行 (高質量、可測試)

### 維護成本
- **Bug 修復**: ⬇️ 60% (更容易定位問題)
- **新功能開發**: ⬇️ 50% (模組化易擴展)
- **重構時間**: ⬇️ 70% (解耦易修改)

## 🎨 設計原則

### 1. Single Responsibility
每個模組只負責一件事

### 2. Pure Functions First
優先使用純函數，副作用隔離

### 3. Composition over Inheritance
用組合替代繼承

### 4. Explicit Dependencies
明確的依賴關係

### 5. Immutable Data
所有數據結構不可變

## 💡 示例

### Before (Current)
```typescript
// Chat.tsx - 1088 lines
export default function Chat() {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  // ... 27 more states

  const handleSubmit = async (value: string) => {
    // 200+ lines of mixed logic
    // - Input validation
    // - Command parsing
    // - Streaming setup
    // - Error handling
    // - UI updates
  };

  return (
    // 800+ lines of JSX
  );
}
```

### After (Refactored)
```typescript
// domains/input/core/cursor.ts
export const moveCursor = (text: string, cursor: number, direction: 'left' | 'right'): number => {
  // Pure function - easy to test
  if (direction === 'left') return Math.max(0, cursor - 1);
  return Math.min(text.length, cursor + 1);
};

// ui/hooks/domain/useInput.ts
export const useInput = () => {
  const [state, setState] = useState(createInputState());

  return {
    ...state,
    moveCursor: (direction) => setState(s => ({
      ...s,
      cursor: moveCursor(s.text, s.cursor, direction)
    }))
  };
};

// ui/screens/Chat.tsx - ~200 lines
export default function Chat() {
  const input = useInput();
  const streaming = useStreaming();
  const commands = useCommands();

  return (
    <ChatLayout>
      <ChatMessages />
      <ChatStreaming state={streaming} />
      <ChatInput state={input} />
    </ChatLayout>
  );
}
```

## ⚠️ 風險與挑戰

### 技術風險
- **Breaking Changes**: 可能影響現有功能
- **Migration Cost**: 需要大量時間重構
- **Learning Curve**: 團隊需要適應新架構

### 緩解措施
- **Incremental Migration**: 逐步遷移，保持可用
- **Comprehensive Testing**: 完整的測試覆蓋
- **Documentation**: 詳細的文檔和示例

## 📝 後續行動

### 立即行動
1. **Review**: 團隊審查此計劃
2. **Approve**: 確認重構方向
3. **Schedule**: 安排重構時間

### 執行計劃
1. **Week 1**: Phase 1 + Phase 2
2. **Week 2**: Phase 3 + Phase 4
3. **Week 3**: Phase 5 + 文檔

---

**準備開始重構了嗎？** 🚀
