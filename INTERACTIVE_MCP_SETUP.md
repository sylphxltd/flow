# Interactive MCP Setup

全新嘅 Interactive MCP Setup 提供更自然嘅用戶體驗：

## 特色

### 1. **一體化選擇 + 設定流程**
唔需要分開選擇同設定，而係：
- 選擇 MCP tools
- 即時顯示邊啲需要設定
- 點擊進入設定介面
- 設定完即時顯示 ✓ OK 狀態
- 全部 OK 先可以完成 setup

### 2. **即時狀態反饋**
```
▸ Select MCP Tools (3 selected)

❯ ◉ sylphx-flow (required)    [✓ OK]
  ◉ gpt-image-1-mcp           [⚙ Configure]  ← 需要設定
  ◯ perplexity-ask            [－]           ← 未選擇
  ◉ context7                  [✓ OK]         ← 已設定好
  ◯ gemini-google-search      [－]
```

**狀態說明：**
- `✓ OK` - 已設定好，可以使用
- `⚙ Configure` - 需要設定 API keys
- `－` - 未選擇

### 3. **流暢嘅鍵盤操作**

#### Selection View (選擇介面)
- `Space` - Toggle 選擇 MCP tool
- `↑↓` - 上下移動
- `Enter` - 進入設定介面 (如果選中且需要設定)
- `Ctrl+S` - 完成 setup (所有選中的都設定好先可以)
- `Esc` - 取消

#### Config View (設定介面)
- `↑↓` - 上下移動 field
- `Enter` - 下一個 field / 選擇 dropdown option / 保存
- `Esc` - 返回選擇介面

### 4. **Smart Validation**
- Required fields 會有 `*` 標記
- 未設定 required fields 會顯示 `⚙ Configure`
- 設定完成自動變成 `✓ OK`
- 未完成設定唔俾 finish setup

### 5. **支援多種 Input 類型**
- **Text Input** - 普通文字輸入
- **Secret Input** - API keys (顯示 `•••••`)
- **Dropdown** - 預設選項 (如 model selection)

## 使用方法

### 在 Init Command 中使用
```typescript
import { InteractiveMCPSetup } from './components/InteractiveMCPSetup.js';

const configs = await new Promise((resolve, reject) => {
  const { waitUntilExit } = render(
    React.createElement(InteractiveMCPSetup, {
      availableServers: ['sylphx-flow', 'gpt-image', 'perplexity'],
      existingConfigs: {},
      onComplete: (configs) => {
        resolve(configs);
        waitUntilExit();
      },
      onCancel: () => {
        reject(new Error('Setup cancelled'));
        waitUntilExit();
      },
    })
  );
});
```

### 測試
```bash
bun test-interactive-setup.ts
```

## 實現細節

### Component 結構
```
InteractiveMCPSetup
├── Selection View (選擇 + 狀態顯示)
│   ├── MCP list with status
│   └── Controls hint
└── Config View (設定介面)
    ├── Field list
    ├── Text inputs
    ├── Dropdown selectors
    └── Save/Cancel controls
```

### State Management
```typescript
interface MCPState {
  id: MCPServerID;
  name: string;
  description: string;
  selected: boolean;        // 是否選中
  configured: boolean;      // 是否已設定
  healthy: boolean;         // 設定是否 valid
  fields: ConfigField[];    // 設定 fields
  config: Record<string, string>; // 實際 config values
}
```

### Key Features
1. **Real-time validation** - 每次修改即時檢查
2. **Stateful navigation** - 記住用戶操作狀態
3. **Smart defaults** - Required servers 自動選中
4. **Progressive disclosure** - 只顯示需要嘅資訊

## 優勢對比舊 Flow

### 舊 Flow
1. 選擇 MCP tools
2. 逐個設定 (唔知邊個設定咗)
3. 無即時反饋
4. 唔知幾時先完成

### 新 Flow
1. 一體化介面
2. 即時狀態顯示
3. 清晰知道進度
4. 設定完即時反饋
5. 全部 OK 先可以 finish

## 未來改進

1. **Health Check** - 設定完自動驗證 API key
2. **Bulk Config** - 批量設定相同 API key
3. **Import/Export** - 保存/載入設定
4. **Templates** - 預設設定模板
5. **Dependency Check** - 自動檢查相依 MCP tools

---

**Built with**: React + Ink (Terminal UI)
