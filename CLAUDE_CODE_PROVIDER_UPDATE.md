# Claude Code Provider 更新

## 問題

之前使用 `ai-sdk-provider-claude-code` 第三方 package，有以下限制：
- 返回 `LanguageModelV1`（舊版本），唔兼容 AI SDK v5
- **無法使用 Vercel AI SDK 自己嘅 custom tools**
- 依賴第三方 package，唔夠靈活

## 解決方案

直接使用 **@ai-sdk/anthropic** provider，取代 `ai-sdk-provider-claude-code`：

### 優點

✅ **完全兼容 AI SDK v5** - 使用 `LanguageModelV2`
✅ **完整支援 Vercel AI SDK tools** - 所有 custom tools 都可以正常使用
✅ **官方支援** - Vercel 官方 Anthropic provider，穩定可靠
✅ **自動處理 tool execution** - AI SDK framework 自動處理 tool calls 同 results
✅ **使用 Claude CLI authentication** - 從 `ANTHROPIC_API_KEY` 環境變數讀取 API key

### 實現細節

**檔案修改：**
- `src/providers/claude-code-provider.ts` - 改用 `@ai-sdk/anthropic`

**核心改變：**

```typescript
import { anthropic } from '@ai-sdk/anthropic';

createClient(config: ProviderConfig, modelId: string): LanguageModelV2 {
  // 從 config 或環境變數獲取 API key
  const apiKey = (config.apiKey as string) || process.env.ANTHROPIC_API_KEY;

  // 映射 short model ID 到完整 model name
  const fullModelId = MODEL_ID_MAP[modelId] || modelId;

  // 創建 Anthropic provider
  const provider = anthropic(apiKey);

  // 返回 language model (LanguageModelV2)
  return provider(fullModelId);
}
```

## 使用方法

### 1. 確保已登入 Claude CLI

```bash
claude login
```

這會設定 `ANTHROPIC_API_KEY` 環境變數。

### 2. 正常使用 claude-code provider

```typescript
import { generateText } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

// 定義 custom tool
const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string().describe('Location name'),
  }),
  execute: async ({ location }) => {
    return {
      temperature: 22,
      condition: 'sunny',
      location,
    };
  },
});

// 使用 claude-code provider with custom tools
const result = await generateText({
  model: claudeCodeModel, // 從 claude-code provider 創建
  messages: [
    {
      role: 'user',
      content: 'What is the weather in Hong Kong?',
    },
  ],
  tools: {
    getWeather: weatherTool, // ✅ Custom tools 完全支援！
  },
});
```

### 3. Tool Execution Flow

1. **User message** → Claude model
2. **Model decides** to use `getWeather` tool
3. **AI SDK executes** the tool automatically
4. **Tool result** returned to model
5. **Model generates** final response

所有 tool execution 都由 **Vercel AI SDK framework** 自動處理，完全透明！

## Model Mapping

| Short ID | Full Model ID |
|----------|---------------|
| `opus` | `claude-opus-4-20250514` |
| `sonnet` | `claude-sonnet-4-20250514` |
| `haiku` | `claude-haiku-4-20250415` |

## 環境變數

- `ANTHROPIC_API_KEY` - Claude API key（通過 `claude login` 自動設定）

或者在 provider config 中設定：

```typescript
{
  apiKey: 'your-api-key-here'
}
```

## 與 Claude Agent SDK 的比較

| Feature | Claude Agent SDK | @ai-sdk/anthropic |
|---------|------------------|-------------------|
| Tool System | MCP tools (provider-executed) | Vercel AI SDK tools (framework-executed) |
| Tool Compatibility | ❌ 唔支援 Vercel tools | ✅ 完全支援 |
| Built-in Tools | ✅ Bash, Read, Write, etc. | ❌ 需要自己定義 |
| AI SDK v5 | ⚠️ 需要 wrapper | ✅ Native 支援 |
| Agent Capabilities | ✅ Full agent features | ⚠️ 基本 LLM features |

## 總結

如果你需要：
- ✅ **使用 Vercel AI SDK custom tools** → 用 `@ai-sdk/anthropic`（current implementation）
- ❌ 使用 Claude Code built-in tools (Bash, Read, etc.) → 需要用 Claude Agent SDK

當前實現選擇咗 **完全兼容 Vercel AI SDK tools**，因為呢個係你主要嘅需求。

如果將來需要 Claude Code 的 built-in tools，可以考慮：
1. 自己用 `tool()` 重新實現呢啲 built-in tools
2. 或者混合使用兩個 providers（一個用 Anthropic，一個用 Claude Agent SDK）
