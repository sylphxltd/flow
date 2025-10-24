# MCP Setup UI - React + Ink Implementation

## 最終決策

**✅ 採用：React + Ink**  
**❌ 拒絕：Inquirer fallback**

## 問題背景

原本嘅 MCP setup flow：
```typescript
// 1. inquirer checkbox - select servers
const { selectedServers } = await inquirer.prompt({ type: 'checkbox', ... });

// 2. MCPService.installServers() - 自動 prompt configs
await mcpService.installServers(selectedServers);
```

**問題：**
- Linear flow，唔夠互動
- 無即時 status feedback
- 選擇完先配置，唔夠自然
- 用戶唔知進度

## 解決方案

### React + Ink Interactive UI

**Component:** `src/components/MCPSetupUI.tsx`

**Features:**
1. **雙 View 模式**
   - Selection View: 選擇 + 狀態顯示
   - Config View: 逐個設定

2. **即時狀態反饋**
   - `✓ OK` - 已設定好
   - `⚙ Configure` - 需要設定
   - `－` - 未選擇
   - `(required)` - 必須安裝

3. **Stateful Navigation**
   - Space: toggle selection
   - Enter: 進入 config
   - Esc: 返回 / 取消
   - Ctrl+S: 完成 (所有 OK 先得)

4. **Smart Input Types**
   - Text input
   - Password (masked)
   - Dropdown (list)

## UI Flow

```
┌─────────────────────────────────────┐
│ 📦 Select MCP Tools (3 selected)    │
├─────────────────────────────────────┤
│ ❯ ◉ sylphx-flow      [✓ OK]        │
│   ◉ gpt-image        [⚙ Configure] │ ← Enter
│   ◯ perplexity       [－]          │
└─────────────────────────────────────┘
         ↓ Press Enter
┌─────────────────────────────────────┐
│ ⚙️  Configure: gpt-image            │
├─────────────────────────────────────┤
│ ❯ OPENAI_API_KEY*  sk-••••••••     │
│   MODEL            gpt-4 ▼          │
└─────────────────────────────────────┘
         ↓ Enter to save
┌─────────────────────────────────────┐
│ 📦 Select MCP Tools (3 selected)    │
├─────────────────────────────────────┤
│ ❯ ◉ sylphx-flow      [✓ OK]        │
│   ◉ gpt-image        [✓ OK]        │ ← Updated!
│   ◯ perplexity       [－]          │
└─────────────────────────────────────┘
         ↓ Ctrl+S
✓ Installed 2 MCP tools
```

## 技術實現

### Component Structure

```typescript
export function MCPSetupUI({
  availableServers,
  onComplete,
  onCancel,
}: MCPSetupUIProps) {
  const [mcpStates, setMCPStates] = useState<MCPState[]>(...)
  const [viewMode, setViewMode] = useState<'selection' | 'config'>('selection')
  
  useInput((input, key) => {
    // Keyboard event handlers
  })
  
  return viewMode === 'selection' 
    ? <SelectionView />
    : <ConfigView />
}
```

### State Management

```typescript
interface MCPState {
  id: MCPServerID;
  selected: boolean;      // User toggled
  configured: boolean;    // All required fields filled
  fields: ConfigField[];  // Env vars to configure
  config: Record<string, string>; // Actual values
}
```

### Integration

```typescript
// init-command.ts
const configs = await new Promise((resolve, reject) => {
  const { clear } = render(
    React.createElement(MCPSetupUI, {
      availableServers,
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

// Save configs to file
for (const [serverId, config] of Object.entries(configs)) {
  // ... save logic
}
```

## 為何選擇 React + Ink？

### ✅ 優勢

1. **Stateful UI** - React hooks 管理複雜 state
2. **即時反饋** - 每個操作即時更新畫面
3. **Flexible Navigation** - 可以前後跳轉，唔係 linear
4. **Better UX** - Modern terminal UI experience
5. **Component-based** - Easy to test and maintain
6. **Type-safe** - Full TypeScript support

### ❌ 唔用 Inquirer 原因

| Inquirer | React + Ink |
|----------|-------------|
| Linear prompts | ✅ Stateful views |
| 無即時反饋 | ✅ Real-time status |
| 唔夠靈活 | ✅ Full navigation |
| Callback hell | ✅ Clean async/await |

## 代碼對比

### Before (Inquirer)
```typescript
// 150+ lines in MCPService.installServers()
const { selectedServers } = await inquirer.prompt(...)
for (const server of servers) {
  const values = await this.configureServer(server)
  // ... save
}
```

### After (React + Ink)
```typescript
// ~460 lines in MCPSetupUI component
const configs = await new Promise((resolve) => {
  render(<MCPSetupUI onComplete={resolve} />)
})
// Clean, self-contained
```

## 運行要求

### ✅ 需要 TTY

```bash
# Good
bun dist/index.js init

# Bad (no TTY)
echo "" | bun dist/index.js init
```

**Why?** Ink needs `process.stdin.setRawMode()` for keyboard input.

**Check:**
```bash
node -e "console.log('TTY:', process.stdin.isTTY)"
# Should output: TTY: true
```

## 文件修改

### 新增
- ✅ `src/components/MCPSetupUI.tsx` (460 lines)
- ✅ `MCP_SETUP_UI.md` (documentation)

### 修改
- 🔧 `src/commands/init-command.ts` (use MCPSetupUI)

### 刪除
- ❌ `src/utils/interactive-mcp-setup.ts` (inquirer version)
- ❌ `src/components/InteractiveMCPSetup.tsx` (previous attempt)
- ❌ `src/components/ModernInitUI.tsx` (old UI)

## Dependencies

```json
{
  "ink": "^6.3.1",           // Already have
  "ink-text-input": "^6.0.0", // Already have
  "react": "^19.2.0"          // Already have
}
```

**Net change:** 0 new dependencies ✅

## 改進總結

### Before
```
1. Select servers (checkbox)
2. Configure server 1
3. Configure server 2
4. ...
5. Done (no status)
```

### After
```
1. Select + See status in one view
   ◉ Server 1 [✓ OK]
   ◉ Server 2 [⚙ Configure] ← Click to config
   
2. Configure → Auto return with ✓ OK

3. Ctrl+S when all OK

4. Done!
```

## 成果

✅ **Modern terminal UI** - React + Ink  
✅ **No fallback** - Clean, focused implementation  
✅ **Better UX** - Immediate feedback, flexible navigation  
✅ **Type-safe** - Full TypeScript support  
✅ **Maintainable** - Component-based architecture  
✅ **0 new dependencies** - Using existing packages  

---

**Implementation:** ~460 lines (MCPSetupUI.tsx)  
**Commits:** 2 (refactor inquirer → feat React+Ink)  
**Breaking Changes:** None (external API unchanged)  
**Dependencies:** +0  
