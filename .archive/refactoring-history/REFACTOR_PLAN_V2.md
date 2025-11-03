# Sylphx Flow - Feature-Based 重構計劃

## 🎯 設計哲學

### Feature-First (不是 DDD)
- **按功能組織**：chat, input, streaming, commands
- **功能自包含**：每個 feature 有自己的 components/hooks/utils/store
- **實用主義**：不過度設計，保持簡單
- **Functional + Composition**：純函數 + 組合

## 🏗️ 新架構

### 簡潔的 Feature 結構
```
src/
├── features/                      # 功能模組（核心）
│   ├── chat/                     # 💬 聊天功能
│   │   ├── components/
│   │   │   ├── ChatLayout.tsx
│   │   │   ├── ChatMessages.tsx
│   │   │   └── ChatHeader.tsx
│   │   ├── hooks/
│   │   │   ├── useChatState.ts
│   │   │   └── useMessageFlow.ts
│   │   ├── utils/
│   │   │   ├── message-formatter.ts    # 純函數
│   │   │   └── conversation.ts         # 純函數
│   │   ├── store/
│   │   │   └── chat-slice.ts
│   │   └── index.ts
│   │
│   ├── input/                    # ⌨️ 輸入功能
│   │   ├── components/
│   │   │   ├── TextInput.tsx
│   │   │   ├── InputHint.tsx
│   │   │   └── CursorDisplay.tsx
│   │   ├── hooks/
│   │   │   ├── useTextInput.ts
│   │   │   ├── useCursor.ts
│   │   │   └── useKeyboard.ts
│   │   ├── utils/
│   │   │   ├── cursor.ts               # 純函數：游標邏輯
│   │   │   ├── wrapping.ts             # 純函數：換行邏輯
│   │   │   ├── text-ops.ts             # 純函數：文字操作
│   │   │   └── keyboard.ts             # 純函數：快捷鍵
│   │   ├── store/
│   │   │   └── input-slice.ts
│   │   └── index.ts
│   │
│   ├── streaming/                # 📡 串流功能
│   │   ├── components/
│   │   │   ├── StreamDisplay.tsx
│   │   │   ├── ReasoningDisplay.tsx
│   │   │   └── ToolDisplay.tsx
│   │   ├── hooks/
│   │   │   ├── useStreaming.ts
│   │   │   └── useStreamBuffer.ts
│   │   ├── utils/
│   │   │   ├── buffer.ts               # 純函數：緩衝邏輯
│   │   │   ├── chunks.ts               # 純函數：chunk 處理
│   │   │   ├── debounce.ts             # 純函數：防抖
│   │   │   └── flush.ts                # 純函數：刷新
│   │   ├── store/
│   │   │   └── streaming-slice.ts
│   │   └── index.ts
│   │
│   ├── commands/                 # 🔧 命令功能
│   │   ├── components/
│   │   │   ├── CommandMenu.tsx
│   │   │   ├── CommandItem.tsx
│   │   │   └── CommandExecutor.tsx
│   │   ├── hooks/
│   │   │   ├── useCommands.ts
│   │   │   └── useCommandFlow.ts
│   │   ├── utils/
│   │   │   ├── parser.ts               # 純函數：解析命令
│   │   │   ├── matcher.ts              # 純函數：匹配命令
│   │   │   └── executor.ts             # 純函數：執行邏輯
│   │   ├── store/
│   │   │   └── command-slice.ts
│   │   ├── definitions/                # 命令定義（保留）
│   │   └── index.ts
│   │
│   ├── autocomplete/             # 🔍 自動完成
│   │   ├── components/
│   │   │   ├── AutocompleteMenu.tsx
│   │   │   ├── FileItem.tsx
│   │   │   └── CommandItem.tsx
│   │   ├── hooks/
│   │   │   ├── useAutocomplete.ts
│   │   │   └── useFileSuggestions.ts
│   │   ├── utils/
│   │   │   ├── filter.ts               # 純函數：過濾
│   │   │   ├── matcher.ts              # 純函數：匹配
│   │   │   ├── scorer.ts               # 純函數：評分
│   │   │   └── file-finder.ts          # 純函數：查找文件
│   │   ├── store/
│   │   │   └── autocomplete-slice.ts
│   │   └── index.ts
│   │
│   ├── attachments/              # 📎 文件附件
│   │   ├── components/
│   │   │   ├── AttachmentList.tsx
│   │   │   └── AttachmentTag.tsx
│   │   ├── hooks/
│   │   │   ├── useAttachments.ts
│   │   │   └── useFileTokens.ts
│   │   ├── utils/
│   │   │   ├── parser.ts               # 純函數：解析標籤
│   │   │   ├── validator.ts            # 純函數：驗證
│   │   │   ├── tokenizer.ts            # 純函數：token 計算
│   │   │   └── cache.ts                # 純函數：緩存
│   │   ├── store/
│   │   │   └── attachment-slice.ts
│   │   └── index.ts
│   │
│   └── session/                  # 💾 Session 管理
│       ├── hooks/
│       │   ├── useSession.ts
│       │   └── usePersistence.ts
│       ├── utils/
│       │   ├── lifecycle.ts            # 純函數：生命週期
│       │   ├── migration.ts            # 純函數：遷移
│       │   └── serializer.ts           # 純函數：序列化
│       ├── store/
│       │   └── session-slice.ts
│       └── index.ts
│
├── shared/                           # 共享代碼
│   ├── components/                   # 共享組件
│   │   ├── Button.tsx
│   │   ├── Spinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/                        # 共享 hooks
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   ├── utils/                        # 共享工具
│   │   ├── functional/               # FP 工具
│   │   │   ├── pipe.ts
│   │   │   ├── compose.ts
│   │   │   └── curry.ts
│   │   ├── string.ts
│   │   ├── array.ts
│   │   └── object.ts
│   └── types/                        # 共享類型
│       ├── common.ts
│       └── api.ts
│
├── store/                            # Store 根目錄
│   ├── index.ts                      # 組合所有 slices
│   └── middleware/                   # Store 中間件
│       └── logger.ts
│
└── ui/                               # 舊 UI 代碼（漸進遷移）
    ├── screens/                      # 屏幕（保留，慢慢重構）
    ├── components/                   # 組件（保留，慢慢遷移到 features）
    └── hooks/                        # Hooks（保留，慢慢遷移到 features）
```

## 🔄 重構策略

### 原則
1. **Feature 內聚**：相關代碼放在一起
2. **Pure Functions**：utils/ 都是純函數
3. **Thin Components**：組件只負責渲染
4. **Smart Hooks**：hooks 處理邏輯
5. **Sliced Store**：每個 feature 一個 slice

### 漸進式遷移（不是大爆炸）
不一次性重寫，而是：
1. 創建新結構
2. 逐個 feature 遷移
3. 保持舊代碼可用
4. 測試通過後刪除舊代碼

## 📝 詳細步驟

### Phase 1: 設置基礎 (0.5 天)

#### 1.1 創建目錄結構
```bash
mkdir -p src/features/{chat,input,streaming,commands,autocomplete,attachments,session}/{components,hooks,utils,store}
mkdir -p src/shared/{components,hooks,utils/functional,types}
```

#### 1.2 設置共享工具
```typescript
// src/shared/utils/functional/pipe.ts
export const pipe = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T) => fns.reduce((acc, fn) => fn(acc), value);

// src/shared/utils/functional/compose.ts
export const compose = <T>(...fns: Array<(arg: T) => T>) =>
  pipe(...fns.reverse());
```

### Phase 2: Input Feature (1 天)

#### 2.1 提取純函數
```typescript
// src/features/input/utils/cursor.ts
export const moveCursorLeft = (cursor: number): number =>
  Math.max(0, cursor - 1);

export const moveCursorRight = (text: string, cursor: number): number =>
  Math.min(text.length, cursor + 1);

export const moveCursorToStart = (): number => 0;

export const moveCursorToEnd = (text: string): number => text.length;

// src/features/input/utils/wrapping.ts
export const wrapText = (text: string, width: number): string[] => {
  if (width <= 0) return [text];
  // ... 純函數實現
};

export const getPhysicalCursorPos = (
  text: string,
  logicalCursor: number,
  width: number
): { line: number; col: number } => {
  // ... 純函數實現
};

// src/features/input/utils/text-ops.ts
export const insertChar = (text: string, cursor: number, char: string): string =>
  text.slice(0, cursor) + char + text.slice(cursor);

export const deleteChar = (text: string, cursor: number): string =>
  text.slice(0, cursor - 1) + text.slice(cursor);

export const deleteToEnd = (text: string, cursor: number): string =>
  text.slice(0, cursor);
```

#### 2.2 創建 Hook
```typescript
// src/features/input/hooks/useTextInput.ts
import { useState, useCallback } from 'react';
import * as Cursor from '../utils/cursor';
import * as TextOps from '../utils/text-ops';

export const useTextInput = (initialValue = '') => {
  const [text, setText] = useState(initialValue);
  const [cursor, setCursor] = useState(0);

  const insert = useCallback((char: string) => {
    setText(t => TextOps.insertChar(t, cursor, char));
    setCursor(c => c + 1);
  }, [cursor]);

  const deleteLeft = useCallback(() => {
    setText(t => TextOps.deleteChar(t, cursor));
    setCursor(c => Cursor.moveCursorLeft(c));
  }, [cursor]);

  const moveCursor = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      setCursor(Cursor.moveCursorLeft);
    } else {
      setCursor(c => Cursor.moveCursorRight(text, c));
    }
  }, [text]);

  return { text, cursor, insert, deleteLeft, moveCursor };
};
```

#### 2.3 創建組件
```typescript
// src/features/input/components/TextInput.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useTextInput } from '../hooks/useTextInput';

export const TextInput: React.FC = () => {
  const { text, cursor } = useTextInput();

  return (
    <Box>
      <Text>{text.slice(0, cursor)}</Text>
      <Text inverse>{text[cursor] || ' '}</Text>
      <Text>{text.slice(cursor + 1)}</Text>
    </Box>
  );
};
```

### Phase 3: Streaming Feature (1 天)

類似的結構...

### Phase 4: 其他 Features (2 天)

逐個遷移：commands → autocomplete → attachments → session

### Phase 5: 重構 Chat.tsx (1 天)

```typescript
// src/ui/screens/Chat.tsx - 簡化版
import React from 'react';
import { Box } from 'ink';
import { ChatLayout } from '@/features/chat/components/ChatLayout';
import { TextInput } from '@/features/input/components/TextInput';
import { StreamDisplay } from '@/features/streaming/components/StreamDisplay';
import { CommandMenu } from '@/features/commands/components/CommandMenu';

export default function Chat() {
  return (
    <ChatLayout>
      <StreamDisplay />
      <CommandMenu />
      <TextInput />
    </ChatLayout>
  );
}
```

## 📊 對比

### Before
```
Chat.tsx: 1088 lines (一團亂麻)
└── 所有邏輯混在一起
```

### After
```
features/
├── input/               150 lines
├── streaming/           120 lines
├── commands/            180 lines
├── autocomplete/        100 lines
└── Chat.tsx             ~50 lines (只協調)
```

## 🎯 關鍵優勢

### 1. 功能清晰
一看就知道有哪些功能

### 2. 易於修改
修改輸入？只看 features/input/

### 3. 易於測試
每個 util 都是純函數，輕鬆測試

### 4. 易於刪除
不要某功能？刪掉整個 feature/

### 5. 易於添加
新功能？加個新 feature/

## ⚡ 示例：完整的 Input Feature

```typescript
// features/input/utils/cursor.ts
export const move = (text: string, cursor: number, dir: 'left' | 'right') => {
  if (dir === 'left') return Math.max(0, cursor - 1);
  return Math.min(text.length, cursor + 1);
};

// features/input/hooks/useTextInput.ts
export const useTextInput = () => {
  const [state, setState] = useState({ text: '', cursor: 0 });

  return {
    ...state,
    move: (dir) => setState(s => ({
      ...s,
      cursor: move(s.text, s.cursor, dir)
    }))
  };
};

// features/input/components/TextInput.tsx
export const TextInput = () => {
  const { text, cursor, move } = useTextInput();

  useInput((input, key) => {
    if (key.leftArrow) move('left');
    if (key.rightArrow) move('right');
  });

  return <Box>{/* render */}</Box>;
};

// features/input/index.ts
export { TextInput } from './components/TextInput';
export { useTextInput } from './hooks/useTextInput';
```

## 🚀 開始執行？

準備好開始了嗎？從哪個 feature 開始？

建議順序：
1. **Input** (最獨立，影響小)
2. **Streaming** (較獨立)
3. **Commands** (依賴 input)
4. **其他**
