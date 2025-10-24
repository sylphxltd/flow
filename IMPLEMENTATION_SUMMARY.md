# Interactive MCP Setup - Implementation Summary

## 問題背景

原本嘅 MCP setup flow 體驗唔自然：
1. 先選擇 MCP tools
2. 再逐個設定
3. 無即時反饋邊個已設定
4. 唔知幾時先完成

用戶期望：
- 選擇同設定一體化
- 清晰知道進度
- 流暢嘅操作體驗

## 解決方案

### 選擇：Pure Inquirer

**決策原因：**
- ✅ **Already works** - Target selection 已經用緊 inquirer
- ✅ **Simple & reliable** - 唔需要 React/Ink dependencies
- ✅ **Lower maintenance** - 一套 code，一個 library
- ✅ **Better compatibility** - 唔需要 TTY raw mode
- ❌ **Rejected React + Ink** - stdin.isTTY undefined，compatibility issues

### 新實現：`interactiveMCPSetup()`

**位置：** `src/utils/interactive-mcp-setup.ts`

**Flow：**
```
1. 📦 Select MCP Tools
   - Show required servers
   - Checkbox 選擇 optional servers

2. ⚙️ Configure Selected Tools
   - 逐個設定每個 MCP
   - 支援 input, password, list (dropdown)
   - 自動 skip 無 config 嘅 tools
   - 即時顯示 ✓ configured

3. Return configs
   - selectedServers: MCPServerID[]
   - configs: Record<MCPServerID, Record<string, string>>
```

## 實現細節

### 核心函數

```typescript
export async function interactiveMCPSetup(
  availableServers: MCPServerID[]
): Promise<MCPConfigResult> {
  // 1. Show required servers
  // 2. Checkbox for optional servers
  // 3. Configure each selected server
  // 4. Return { selectedServers, configs }
}
```

### Input Types 支援

1. **Text Input** - 普通文字
2. **Password Input** - API keys (masked)
3. **List (Dropdown)** - Model selection
   - `EMBEDDING_MODEL` → OpenAI models
   - `GEMINI_MODEL` → Gemini models

### Validation

- Required fields 會有 `(required)` 標記
- Empty required fields 會顯示 error message
- 自動 validate before accept

## 文件修改

### 1. **新增 Utility**
- `src/utils/interactive-mcp-setup.ts` (全新)

### 2. **更新 Init Command**
- `src/commands/init-command.ts`
- 移除 Ink dependencies
- 使用 `interactiveMCPSetup()`
- 手動處理 config save

### 3. **刪除 Ink Components**
- ~~`src/components/InteractiveMCPSetup.tsx`~~ (removed)
- ~~`src/components/ModernInitUI.tsx`~~ (removed)

## 使用方法

### 運行 Init
```bash
bun dist/index.js init
# or
sylphx-flow init
```

### Flow Example
```
▸ Sylphx Flow Setup

✔ Select target platform: OpenCode

📦 Select MCP Tools

Required tools (will be installed automatically):
  ✓ sylphx-flow - Sylphx Flow MCP server...

? Select optional tools to install: (Press <space> to select)
❯◉ gpt-image-1-mcp - GPT Image generation MCP server
 ◉ perplexity-ask - Perplexity Ask MCP server...
 ◉ context7 - Context7 HTTP MCP server...

⚙️  Configure Selected Tools

▸ sylphx-flow
Sylphx Flow MCP server for agent coordination...

? OPENAI_API_KEY: ••••••••
? OPENAI_BASE_URL: https://api.openai.com/v1
? EMBEDDING_MODEL: (Use arrow keys)
❯ text-embedding-3-small
  text-embedding-3-large
  text-embedding-ada-002

✓ Configured sylphx-flow

▸ gpt-image-1-mcp
...
```

## 優勢對比

| 舊 Flow (MCPService.installServers) | 新 Flow (interactiveMCPSetup) |
|-------------------------------------|-------------------------------|
| 分離選擇同設定 | ✨ 一體化介面 |
| 用 MCPService + inquirer | ✨ Pure inquirer utility |
| 複雜 state management | ✨ 簡單 Promise-based |
| 依賴 Ink (unstable) | ✨ 只用 inquirer (stable) |
| 難以 maintain | ✨ 易讀易改 |

## 技術亮點

### 1. **Pure Inquirer**
- 無 React/Ink overhead
- Better terminal compatibility
- Simpler code structure

### 2. **Smart Field Detection**
```typescript
if (key === 'EMBEDDING_MODEL') {
  // Show dropdown with model choices
} else if (config.secret) {
  // Show password input
} else {
  // Show normal input
}
```

### 3. **Progressive Configuration**
- Skip servers without envVars
- Show progress: "✓ Configured {server}"
- Clear feedback at each step

### 4. **Type Safety**
```typescript
interface MCPConfigResult {
  selectedServers: MCPServerID[];
  configs: Record<MCPServerID, Record<string, string>>;
}
```

## Dependencies

**Before:**
```json
{
  "ink": "^6.3.1",
  "ink-text-input": "^6.0.0",
  "react": "^19.2.0",
  "inquirer": "11"
}
```

**After:**
```json
{
  "inquirer": "11"  // Only this!
}
```

**Savings:**
- ❌ Removed: `ink`, `ink-text-input`, `react` (for init command)
- ✅ Kept: `inquirer` (already used)
- 📦 Smaller bundle size
- 🚀 Faster build time

## 總結

成功簡化咗 MCP setup flow：

✅ **更簡單** - Pure inquirer，無 React overhead  
✅ **更穩定** - 唔依賴 TTY raw mode  
✅ **更易維護** - 一套 code，清晰邏輯  
✅ **更好體驗** - 一體化選擇 + 設定  
✅ **Zero breaking changes** - 完全向後兼容  

**Decision:**  
❌ React + Ink - 太複雜，compatibility 問題  
✅ **Pure Inquirer** - 簡單、穩定、夠用  

---

**實現時間**: ~30 min  
**代碼行數**: ~140 lines (interactive-mcp-setup.ts)  
**Dependencies 減少**: -3 (ink, ink-text-input, react for init)  
**Breaking Changes**: None  
