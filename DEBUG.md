# Debug Logging & Testing Guide

## Overview

我哋用環境變數控制 debug logging，可以喺唔影響 production 嘅情況下啟用詳細嘅 logs。

## 🎯 Quick Start

### 1. Debug to stderr (睇 console)

```bash
DEBUG=* bun ./packages/code/src/index.ts
```

### 2. Debug to file (唔阻礙 TUI)

```bash
DEBUG=* DEBUG_FILE=debug.log bun ./packages/code/src/index.ts
# Logs written to: ~/.sylphx-code/logs/debug.log
```

### 3. Non-interactive testing (最適合自動化測試)

```bash
DEBUG=* bun ./packages/code/src/test-harness.ts "test message"
# Results: ~/.sylphx-code/logs/test-result-{timestamp}.json
# Debug logs: ~/.sylphx-code/logs/test-debug-{timestamp}.log
```

## Usage

### Enable All Debug Logs

```bash
# To stderr (will interfere with TUI)
DEBUG=* bun ./packages/code/src/index.ts

# To file (TUI remains clean)
DEBUG=* DEBUG_FILE=debug.log bun ./packages/code/src/index.ts
```

### Enable Specific Namespaces

```bash
# 只顯示 subscription 相關嘅 logs
DEBUG=subscription:* DEBUG_FILE=sub.log bun ./packages/code/src/index.ts

# 只顯示 session 同 message logs
DEBUG=subscription:session,subscription:message DEBUG_FILE=session.log bun ./packages/code/src/index.ts

# 顯示 streaming 相關嘅 logs
DEBUG=stream:* DEBUG_FILE=stream.log bun ./packages/code/src/index.ts
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

## 🤖 Non-Interactive Testing (For LLMs / CI/CD)

### Test Harness

專門為自動化測試而設計，完全 non-interactive：

```bash
# Basic test
bun ./packages/code/src/test-harness.ts "test message"

# With debug logging
DEBUG=* bun ./packages/code/src/test-harness.ts "test message"

# Custom output location
bun ./packages/code/src/test-harness.ts "test" --output my-test.json

# Read input from file
bun ./packages/code/src/test-harness.ts --input test-cases.txt
```

### Test Result Format

Result JSON:

```json
{
  "timestamp": "2025-01-06T10:30:00.000Z",
  "success": true,
  "sessionId": "session-1234567890",
  "events": ["session-created", "assistant-message-created", "reasoning-start", ...],
  "errors": [],
  "duration": 2500,
  "output": "AI response text here..."
}
```

### Where to Find Logs

| Type | Location | Usage |
|------|----------|-------|
| Debug logs (file) | `~/.sylphx-code/logs/test-debug-{timestamp}.log` | Detailed execution trace |
| Test results | `~/.sylphx-code/logs/test-result-{timestamp}.json` | Structured test output |
| Debug logs (stderr) | Console stderr | Quick debugging |

### Example: Complete Test Workflow

```bash
# 1. Run test with full debug logging
DEBUG=* bun ./packages/code/src/test-harness.ts "implement fibonacci function"

# 2. Check test result
cat ~/.sylphx-code/logs/test-result-*.json | jq '.success'

# 3. Read debug logs
tail -f ~/.sylphx-code/logs/test-debug-*.log

# 4. Grep for specific events
grep "subscription:message" ~/.sylphx-code/logs/test-debug-*.log
```

### Benefits

呢個方法俾你：
- ✅ 睇到 internal state changes (in log file)
- ✅ Debug without UI interference
- ✅ Programmatic result checking (JSON output)
- ✅ Automate testing in CI/CD
- ✅ No production impact
- ✅ LLMs can read structured output
