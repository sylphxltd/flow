# Claude Code Provider - 實現說明

## 問題分析

### 為什麼 `ai-sdk-provider-claude-code` 唔支援自己嘅 tools？

`ai-sdk-provider-claude-code` 做咗以下轉換：

```
Vercel AI SDK tools → MCP tools → Claude Agent SDK 執行
```

**問題**：Tools 由 **Claude Agent SDK** 執行，唔係由 **Vercel AI SDK framework** 執行。

咁樣導致：
- ❌ 你無法完全控制 tool execution
- ❌ Tool results 要經過 MCP 格式轉換
- ❌ 唔能夠用 Vercel AI SDK 嘅 tool lifecycle hooks
- ❌ 依賴 Claude Code 嘅 built-in tools (Bash, Read, Write 等)

## 當前實現方案

**使用 Claude Agent SDK 實現 LanguageModelV2**

當前實現使用 Claude Code CLI (通過 Claude Agent SDK):

```
Claude Agent SDK query() → Claude Code CLI → 返回 LanguageModelV2 格式
```

### 已實現功能

✅ **基本文本生成** - 無需 tools 的對話完全支援
✅ **使用 Claude Code CLI** - 通過 OAuth 認證，無需 API key
✅ **LanguageModelV2 介面** - 符合 Vercel AI SDK v5 規範
✅ **Streaming 支援** - `doGenerate()` 和 `doStream()` 已實現

### 限制

❌ **自定義 Vercel tools 支援不完整** - Claude Agent SDK 不支援通過 API 傳遞任意 tool schemas
- Claude Agent SDK 只支援 built-in tools (Bash, Read, Write 等) 和 MCP servers
- 無法直接傳遞 Anthropic API 格式的 tool schemas
- 要支援自定義 tools，需要用 MCP server 格式

## 完整 Tool 支援方案

如需完整支援 Vercel AI SDK 自定義 tools，推薦使用 `@ai-sdk/anthropic`

```
Vercel AI SDK tools → Vercel AI SDK framework 執行 → Anthropic API
```

### 核心優勢

✅ **Tools 由 Vercel AI SDK framework 執行** - 你完全控制
✅ **支援所有 Vercel AI SDK tools** - 包括你自己嘅 custom tools
✅ **返回 LanguageModelV2** - AI SDK v5 原生支援
✅ **無需依賴 Claude Code CLI** - 純 API 調用
✅ **完整 tool lifecycle** - 所有 Vercel AI SDK features

## 實現

### Provider 實現

```typescript
import { anthropic } from '@ai-sdk/anthropic';

createClient(config: ProviderConfig, modelId: string): LanguageModelV2 {
  const apiKey = (config.apiKey as string) || process.env.ANTHROPIC_API_KEY;
  const fullModelId = MODEL_ID_MAP[modelId] || modelId;

  // 返回原生 LanguageModelV2
  // Tools 由 Vercel AI SDK framework 執行
  const provider = anthropic(apiKey);
  return provider(fullModelId);
}
```

### 如何獲取 API Key

**選項 1: Anthropic Console (推薦)**
```bash
# 去 https://console.anthropic.com/
# 創建 API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

**選項 2: Claude Pro 用戶**
```bash
# 如果你有 Claude Pro subscription
claude setup-token
# 呢個會生成一個長期 token
```

**選項 3: 在 config 設定**
```json
{
  "providers": {
    "claude-code": {
      "apiKey": "sk-ant-..."
    }
  }
}
```

## 使用方法

### 完整支援 Vercel AI SDK Tools

```typescript
import { generateText } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

// 定義你自己嘅 custom tool
const weatherTool = tool({
  description: 'Get current weather',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  execute: async ({ location }) => {
    // 你嘅 custom logic
    const weatherData = await fetchWeather(location);
    return weatherData;
  },
});

const databaseTool = tool({
  description: 'Query database',
  inputSchema: z.object({
    query: z.string().describe('SQL query'),
  }),
  execute: async ({ query }) => {
    // 你嘅 database logic
    const results = await db.query(query);
    return results;
  },
});

// 使用 claude-code provider with custom tools
const result = await generateText({
  model: claudeCodeModel,  // 從 claude-code provider
  messages: [...],
  tools: {
    getWeather: weatherTool,      // ✅ 完全支援！
    queryDatabase: databaseTool,  // ✅ 完全支援！
  },
});
```

### Tool Execution Flow

```
1. User message → Claude model
2. Model decides to call tool (e.g., getWeather)
3. Vercel AI SDK framework calls weatherTool.execute()  ← 你嘅 code
4. Tool result returned to model
5. Model generates final response
```

**關鍵點**：Tool execution 完全由 **Vercel AI SDK framework** 控制，唔係由 provider 控制。

## 與其他方案比較

| 方案 | Tool Execution | Vercel Tools Support | 需要 |
|------|---------------|---------------------|------|
| **@ai-sdk/anthropic** | ✅ Vercel framework | ✅ 完全支援 | API key |
| ai-sdk-provider-claude-code | ❌ Claude Agent SDK | ❌ 轉成 MCP | Claude CLI |
| Claude Code SDK | ❌ Claude Agent SDK | ❌ 只支援 MCP | Claude CLI |
| Claude Code headless | ❌ Built-in tools only | ❌ 無 custom tools | Claude CLI |

## 配置範例

**User settings** (`~/.sylphx-flow/settings.json`):

```json
{
  "defaultProvider": "claude-code",
  "defaultModel": "sonnet",
  "providers": {
    "claude-code": {
      "apiKey": "sk-ant-api03-..."
    }
  }
}
```

**或者用環境變數**:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

## 注意事項

### API 使用費用

使用 Anthropic API 會產生費用：

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Opus | $15 | $75 |
| Sonnet | $3 | $15 |
| Haiku | $0.25 | $1.25 |

**建議**：
- 開發時用 Haiku (最平)
- Production 用 Sonnet (平衡)
- 複雜任務用 Opus

### 與 Claude Code CLI 的區別

**Claude Code CLI**:
- ✅ 免費 (用 Claude Pro subscription)
- ✅ Built-in tools (Bash, Read, Write 等)
- ❌ 唔支援 Vercel custom tools

**Anthropic API (呢個方案)**:
- ✅ 完全支援 Vercel custom tools
- ✅ 純 API 調用，無需 CLI
- ❌ 需要付費 (但費用合理)

## 總結

如果你需要：
- ✅ **使用自己嘅 Vercel AI SDK custom tools** → 用 `@ai-sdk/anthropic`
- ❌ 使用 Claude Code built-in tools (Bash, Read, etc.) → 用 `ai-sdk-provider-claude-code`

**當前實現選擇咗完全支援 Vercel AI SDK tools**，因為呢個係你嘅核心需求。

所有 tool execution 由 Vercel AI SDK framework 處理，你有完全控制權！🎉
