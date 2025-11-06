# Debug Logging Guide

> 使用 industry-standard [`debug`](https://www.npmjs.com/package/debug) package
>
> 同樣嘅工具用於：Express, Socket.io, Mongoose, 等等

## 🎯 Quick Start

```bash
# Enable all sylphx debug logs
DEBUG=sylphx:* bun ./packages/code/src/index.ts

# Enable specific namespace
DEBUG=sylphx:subscription:* bun ./packages/code/src/index.ts

# Enable multiple namespaces
DEBUG=sylphx:subscription:*,sylphx:stream:* bun ./packages/code/src/index.ts

# Production (no debug logs)
bun ./packages/code/src/index.ts
```

## 📝 Usage in Code

```typescript
import { createLogger } from '@sylphx/code-core';

// Create logger for your namespace
const log = createLogger('subscription:session');

// Use it
log('Session created:', sessionId);
log('Loading session:', { id: sessionId, provider });
```

## 🎨 Features (from `debug` package)

### 1. Color-coded Namespaces

每個 namespace 自動有唔同顏色，易分辨：

```bash
DEBUG=sylphx:* bun ./packages/code/src/index.ts
```

Output:
```
  sylphx:subscription:session Session created: session-123 +0ms
  sylphx:subscription:message Message created: msg-456 +2ms
  sylphx:stream:ai Streaming response +150ms
```

### 2. Timestamps

自動顯示相對時間 (`+Xms`)：

```
  sylphx:subscription:session Session created +0ms
  sylphx:subscription:message Message added +2ms
  sylphx:subscription:content Reasoning start +150ms
```

### 3. Wildcard Matching

```bash
# All sylphx logs
DEBUG=sylphx:*

# Only subscription logs
DEBUG=sylphx:subscription:*

# Specific logger
DEBUG=sylphx:subscription:session

# Multiple namespaces
DEBUG=sylphx:subscription:*,sylphx:stream:*
```

### 4. No Performance Impact When Disabled

```bash
# No DEBUG env var = zero overhead
bun ./packages/code/src/index.ts
```

## 📊 Available Namespaces

### Subscription
- `sylphx:subscription:session` - Session creation/loading
- `sylphx:subscription:message` - Message handling
- `sylphx:subscription:content` - Content streaming

### Streaming
- `sylphx:stream:session` - Server-side session management
- `sylphx:stream:provider` - Provider configuration
- `sylphx:stream:ai` - AI model interactions

### tRPC
- `sylphx:trpc:link` - In-process link
- `sylphx:trpc:subscription` - Subscription events

## 🔧 Advanced Usage

### Disable Colors

```bash
DEBUG_COLORS=no DEBUG=sylphx:* bun ./packages/code/src/index.ts
```

### Hide Timestamp

```bash
DEBUG_HIDE_DATE=yes DEBUG=sylphx:* bun ./packages/code/src/index.ts
```

### Save to File

```bash
# Redirect stderr to file
DEBUG=sylphx:* bun ./packages/code/src/index.ts 2> debug.log

# Or use standard output redirection
DEBUG=sylphx:* bun ./packages/code/src/index.ts 2>&1 | tee debug.log
```

## 📖 Examples

### Example 1: Debug Subscription Flow

```bash
DEBUG=sylphx:subscription:* bun ./packages/code/src/index.ts
```

Output:
```
  sylphx:subscription:session Created skeleton session: session-123 +0ms
  sylphx:subscription:message Message created: msg-456 session: session-123 +2ms
  sylphx:subscription:message Added assistant message, total: 1 +0ms
  sylphx:subscription:content Reasoning start, session: session-123 +150ms
```

### Example 2: Debug Everything

```bash
DEBUG=sylphx:* bun ./packages/code/src/index.ts
```

### Example 3: Debug Specific Issue

```bash
# Only session-related logs
DEBUG=sylphx:*:session bun ./packages/code/src/index.ts
```

## 🤖 For LLMs / Automated Testing

### Option 1: Use Vitest (推薦)

```bash
# Run tests with JSON output
bun test --reporter=json > results.json

# Check results
cat results.json | jq '.success'
```

### Option 2: Use Test Harness + Debug

```bash
# Run with debug logging
DEBUG=sylphx:* bun ./packages/code/src/test-harness.ts "test" 2> debug.log

# Read result
cat ~/.sylphx-code/logs/test-result-*.json

# Read debug logs
cat debug.log
```

## 📚 Why `debug` Package?

1. **Industry Standard** ✅
   - Used by Express, Socket.io, Mongoose, Koa, etc.
   - 20M+ weekly downloads on npm
   - Battle-tested in production

2. **Zero Learning Curve** ✅
   - Developers already know it
   - Standard DEBUG env var
   - Familiar patterns

3. **Feature-Rich** ✅
   - Color-coded output
   - Timestamps
   - Wildcard matching
   - No overhead when disabled

4. **Well Documented** ✅
   - [Official docs](https://www.npmjs.com/package/debug)
   - Tons of examples online
   - Large community

## 🔗 Resources

- [debug package on npm](https://www.npmjs.com/package/debug)
- [GitHub repository](https://github.com/debug-js/debug)
- [Our Testing Guide](./TESTING.md)

## 🎯 Migration from Custom Logger

舊方式 (custom):
```typescript
const log = createLogger('subscription');
log('Session created:', sessionId);
```

新方式 (debug package):
```typescript
const log = createLogger('subscription:session');
log('Session created:', sessionId);
```

Enable:
```bash
# Old
DEBUG=subscription:*

# New
DEBUG=sylphx:subscription:*
```

完全向後兼容！只需要 prefix `sylphx:` 就得了。
