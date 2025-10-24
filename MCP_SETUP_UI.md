# MCP Setup UI - React + Ink Implementation

## 概述

使用 **React + Ink** 實現嘅全新 interactive MCP setup UI，提供流暢嘅 terminal 體驗。

## 特色

### 🎨 雙 View 模式

#### 1. Selection View - 選擇 + 狀態顯示
```
📦 Select MCP Tools (3 selected)

❯ ◉ sylphx-flow (required)    [✓ OK]
  ◉ gpt-image-1-mcp           [⚙ Configure]
  ◯ perplexity-ask            [－]
  ◉ context7                  [✓ OK]
  ◯ gemini-google-search      [－]
  ◉ grep                      [✓ OK]

Space: toggle • ⏎: configure • ↑↓: navigate
⚠ Configure all selected tools before finishing
Esc: cancel
```

#### 2. Config View - 設定介面
```
⚙️  Configure: gpt-image-1-mcp

GPT Image generation MCP server

❯ OPENAI_API_KEY*   sk-••••••••
  MODEL             gpt-4 ▼

↑↓: navigate • ⏎: next • Esc: back
```

### ✨ 即時狀態反饋

| Icon | Status | 意思 |
|------|--------|------|
| `✓ OK` | Green | 已設定好，可以使用 |
| `⚙ Configure` | Yellow | 需要設定 API keys |
| `－` | Gray | 未選擇 |
| `(required)` | Red | 必須安裝 |

### ⌨️ 鍵盤操作

#### Selection View
- `Space` - Toggle 選擇/取消 MCP tool
- `↑↓` - 上下移動
- `Enter` - 進入設定 (只有 selected + 有 config 嘅先得)
- `Ctrl+S` - 完成 setup (所有 selected 都設定好先得)
- `Esc` - 取消

#### Config View
- `↑↓` - 上下移動 field
- `Enter` - 下一個 field / 選擇 dropdown / 保存
- `Esc` - 返回 selection view

### 🔧 Input Types

1. **Text Input** - 普通文字輸入
   ```
   ❯ OPENAI_BASE_URL   https://api.openai.com/v1
   ```

2. **Password Input** - Secret masked
   ```
   ❯ OPENAI_API_KEY*   sk-••••••••
   ```

3. **Dropdown Selector** - 預設選項
   ```
   ❯ EMBEDDING_MODEL   ▼
   
   # Press Enter to expand:
   ❯ text-embedding-3-small
     text-embedding-3-large
     text-embedding-ada-002
   ```

### 🎯 Smart Validation

- **Required fields** 有 `*` 標記
- 未設定 required fields → 顯示 `⚙ Configure`
- 設定完成 → 自動變 `✓ OK`
- 未完成設定 → 唔俾 `Ctrl+S` finish

## 技術實現

### Component: `MCPSetupUI`

**位置:** `src/components/MCPSetupUI.tsx`

**Props:**
```typescript
interface MCPSetupUIProps {
  availableServers: MCPServerID[];
  onComplete: (configs: Record<MCPServerID, Record<string, string>>) => void;
  onCancel: () => void;
}
```

**State Management:**
```typescript
interface MCPState {
  id: MCPServerID;
  selected: boolean;      // 是否選中
  configured: boolean;    // 是否已設點
  fields: ConfigField[];  // 設定 fields
  config: Record<string, string>; // 實際 values
}
```

### 使用方法

```typescript
import React from 'react';
import { render } from 'ink';
import { MCPSetupUI } from './components/MCPSetupUI.js';

const configs = await new Promise((resolve, reject) => {
  const { clear } = render(
    React.createElement(MCPSetupUI, {
      availableServers: ['sylphx-flow', 'gpt-image', ...],
      onComplete: (configs) => {
        clear();
        resolve(configs);
      },
      onCancel: () => {
        clear();
        reject(new Error('Setup cancelled'));
      },
    })
  );
});

console.log('Configs:', configs);
// {
//   'sylphx-flow': { OPENAI_API_KEY: 'sk-...', ... },
//   'gpt-image': { OPENAI_API_KEY: 'sk-...', ... },
// }
```

### Flow Control

```typescript
// 1. Render UI
const { clear } = render(<MCPSetupUI ... />);

// 2. User interacts
// - Select servers
// - Configure each one
// - Press Ctrl+S

// 3. onComplete called with configs
onComplete(configs);
clear(); // Clean up UI

// 4. Save configs to file
// (handled in init-command.ts)
```

## 優勢

### vs Inquirer

| Aspect | Inquirer | React + Ink |
|--------|----------|-------------|
| **UI 靈活度** | Limited (linear prompts) | ✅ Full control (stateful UI) |
| **即時反饋** | ❌ 無 (prompt → next) | ✅ 即時顯示 status |
| **Navigation** | Linear only | ✅ Back/forth, edit anytime |
| **狀態管理** | ❌ 難做 | ✅ React state 簡單 |
| **體驗** | 普通 | ✅ **Modern & smooth** |

### Code Quality

- **Type-safe** - Full TypeScript support
- **Reusable** - Component-based architecture
- **Testable** - Pure React component
- **Maintainable** - Clear separation of concerns

## Dependencies

```json
{
  "ink": "^6.3.1",
  "ink-text-input": "^6.0.0",
  "react": "^19.2.0"
}
```

**Already installed** - 唔需要額外 dependencies！

## 運行要求

### ✅ 需要 TTY
```bash
# Good - Direct terminal
bun dist/index.js init

# Good - With TTY
bun run init

# Bad - No TTY (會 error)
echo "" | bun dist/index.js init
```

### 檢查 TTY Support
```bash
node -e "console.log('TTY:', process.stdin.isTTY)"
# Should output: TTY: true
```

## 設計原則

### 1. **Progressive Disclosure**
- 只顯示相關資訊
- Selection → Config → Save
- 一步一步引導

### 2. **Immediate Feedback**
- 每個操作即時反饋
- 狀態即時更新
- Error 即時顯示

### 3. **Keyboard-First**
- 所有操作用鍵盤完成
- Vim-like navigation (h/j/k/l compatible)
- Intuitive shortcuts

### 4. **Graceful Degradation**
- Required servers 自動選中
- Default values 預填
- Skip 無 config 嘅 servers

## 未來改進

### Phase 2
- [ ] 即時 API validation (test API key)
- [ ] Bulk config (apply same key to multiple)
- [ ] Import/Export configs
- [ ] Config templates

### Phase 3
- [ ] Dependency auto-check
- [ ] Smart defaults from env vars
- [ ] Multi-profile support
- [ ] Config migration wizard

---

**Built with:** React + Ink  
**No fallback** - Pure terminal UI experience
