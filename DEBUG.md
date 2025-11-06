# Debug Logging Guide

## Overview

我哋用環境變數控制 debug logging，可以喺唔影響 production 嘅情況下啟用詳細嘅 logs。

## Usage

### Enable All Debug Logs

```bash
DEBUG=* bun ./packages/code/src/index.ts
```

### Enable Specific Namespaces

```bash
# 只顯示 subscription 相關嘅 logs
DEBUG=subscription:* bun ./packages/code/src/index.ts

# 只顯示 session 同 message logs
DEBUG=subscription:session,subscription:message bun ./packages/code/src/index.ts

# 顯示 streaming 相關嘅 logs
DEBUG=stream:* bun ./packages/code/src/index.ts
```

### No Debug Logs (Production)

```bash
# Normal usage - no debug logs
bun ./packages/code/src/index.ts
```

## Available Namespaces

### Subscription Adapter
- `subscription:session` - Session creation/loading
- `subscription:message` - Message creation/updates
- `subscription:content` - Content streaming (reasoning/text)

### Streaming Service
- `stream:session` - Session management
- `stream:provider` - Provider configuration
- `stream:message` - Message processing
- `stream:ai` - AI model interactions

### tRPC
- `trpc:link` - In-process link operations
- `trpc:subscription` - Subscription events

## Examples

### Debug Session Issues

```bash
DEBUG=subscription:session,stream:session bun ./packages/code/src/index.ts
```

Output:
```
[subscription:session] Created skeleton session: session-1762438412068
[stream:session] Loading session: session-1762438412068
[stream:session] Session loaded successfully
```

### Debug Message Streaming

```bash
DEBUG=subscription:message,subscription:content bun ./packages/code/src/index.ts
```

Output:
```
[subscription:message] Message created: 59d159e3-beb3-44ae-8b9c-c71521d2b5d0
[subscription:message] Added assistant message, total: 1
[subscription:content] Reasoning start
[subscription:content] Adding reasoning part, existing parts: 0
```

### Debug Everything (Nuclear Option)

```bash
DEBUG=* bun ./packages/code/src/index.ts
```

## Testing Without TUI

### 1. Headless Mode (For LLM Testing)

```bash
# Run in headless mode with debug logs
DEBUG=subscription:*,stream:* bun ./packages/code/src/headless.ts <<< "hihi"
```

### 2. Unit Tests with Debug Logs

```bash
DEBUG=* bun test
```

### 3. Integration Tests

```bash
DEBUG=subscription:*,stream:* bun test:integration
```

## Adding Debug Logs to Your Code

```typescript
import { createLogger } from '@sylphx/code-core';

// Create a logger for your namespace
const log = createLogger('myfeature');

// Use it
log('Processing data:', data);
log('Error occurred:', error);
```

## Best Practices

1. **使用有意義嘅 namespace** - 例如 `feature:component` format
2. **唔好 log sensitive data** - API keys, tokens, etc.
3. **Production 時 disable** - 唔好 set DEBUG environment variable
4. **測試時用 specific namespaces** - 唔好成日用 `DEBUG=*`

## For LLMs / Automated Testing

你可以用呢個方式測試同 debug：

```bash
# 1. Enable debug logs
export DEBUG=subscription:*,stream:*

# 2. Run headless mode with input
echo "test message" | bun ./packages/code/src/headless.ts

# 3. Check the output logs
# All debug info will be in stderr, actual output in stdout
```

呢個方法俾你：
- ✅ 睇到 internal state changes
- ✅ Debug without UI
- ✅ Automate testing
- ✅ No production impact
