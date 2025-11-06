# Testing Guide

## 🎯 測試策略

我哋有**三種測試方法**，各有不同用途：

### 1. Vitest Unit Tests ⭐ 主要測試方法

**用途：**
- 單元測試 (functions, utilities)
- 整合測試 (API, database, streaming)
- CI/CD 自動化
- Code coverage

**優勢：**
- ✅ Fast, reliable, repeatable
- ✅ Assertions and expectations
- ✅ Mock support
- ✅ Coverage reports
- ✅ Watch mode for development

**運行：**
```bash
# Run all tests
bun test

# Run specific test file
bun test:streaming

# Watch mode (re-run on file changes)
bun test:watch

# Coverage report
bun test:coverage

# UI mode (interactive)
bun test:ui
```

### 2. Test Harness (Non-Interactive E2E)

**用途：**
- End-to-end testing
- Manual verification
- Real environment testing
- Debug complex scenarios

**優勢：**
- ✅ Tests real system (no mocks)
- ✅ JSON output for analysis
- ✅ Can test from command line
- ❌ Slower than unit tests
- ❌ Harder to assert programmatically

**運行：**
```bash
# Basic test
bun ./packages/code/src/test-harness.ts "test message"

# With debug logging
DEBUG=* bun ./packages/code/src/test-harness.ts "test message"

# Check result
cat ~/.sylphx-code/logs/test-result-*.json
```

### 3. Manual TUI Testing

**用途：**
- UI/UX validation
- Visual verification
- User acceptance testing

**運行：**
```bash
# Normal TUI
bun ./packages/code/src/index.ts

# With debug logs to file (TUI stays clean)
DEBUG=* DEBUG_FILE=debug.log bun ./packages/code/src/index.ts
```

---

## 📝 Vitest Test Examples

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Streaming Integration', () => {
  let appContext;
  let cleanup;

  beforeAll(async () => {
    const result = await createAppContext();
    appContext = result.context;
    cleanup = result.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('should stream AI response', async () => {
    const client = createInProcessClient({ appContext });

    const events = [];
    await new Promise((resolve) => {
      client.message.streamResponse.subscribe(
        { sessionId: null, userMessage: 'test' },
        {
          onData: (event) => {
            events.push(event.type);
            if (event.type === 'complete') resolve();
          }
        }
      );
    });

    expect(events).toContain('session-created');
    expect(events).toContain('text-start');
  });
});
```

---

## 🤖 For LLMs (Automated Testing)

### Option 1: Vitest (推薦)

**Read test results:**
```bash
# Run tests
bun test --reporter=json > test-results.json

# Check if tests passed
cat test-results.json | jq '.testResults[].status'

# See failures
cat test-results.json | jq '.testResults[] | select(.status == "failed")'
```

**Example output:**
```json
{
  "success": true,
  "numPassedTests": 5,
  "numFailedTests": 0,
  "testResults": [
    {
      "name": "streaming.test.ts",
      "status": "passed",
      "duration": 2500
    }
  ]
}
```

### Option 2: Test Harness

**Read test results:**
```bash
# Run test
DEBUG=* bun ./packages/code/src/test-harness.ts "test message"

# Read result
cat ~/.sylphx-code/logs/test-result-*.json

# Check success
jq '.success' ~/.sylphx-code/logs/test-result-*.json

# See output
jq '.output' ~/.sylphx-code/logs/test-result-*.json

# Read debug logs
cat ~/.sylphx-code/logs/test-debug-*.log
```

---

## 📊 Test Structure

```
packages/code/src/tests/
├── streaming.test.ts           # Integration tests (full flow)
├── subscription-adapter.test.ts # Unit tests (event handling)
└── ...

~/.sylphx-code/logs/
├── test-result-{timestamp}.json  # Test harness results
├── test-debug-{timestamp}.log    # Debug logs
└── debug.log                     # Manual debug logs
```

---

## 🎯 When to Use Which

| Scenario | Use |
|----------|-----|
| Testing a function | Vitest unit test |
| Testing API integration | Vitest integration test |
| CI/CD pipeline | Vitest |
| Coverage report | Vitest |
| Quick manual check | Test harness |
| Visual verification | Manual TUI |
| Debug complex issue | Manual TUI + DEBUG_FILE |
| LLM automated testing | Vitest (JSON reporter) |

---

## 🔧 Configuration

### Vitest Config

`vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for integration tests
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@sylphx/code-core': './packages/code-core/src',
      '@sylphx/code-server': './packages/code-server/src',
      '@sylphx/code-client': './packages/code-client/src',
    },
  },
});
```

### Debug Logging

Environment variables:
- `DEBUG=*` - Enable all debug logs
- `DEBUG=subscription:*` - Enable specific namespace
- `DEBUG_FILE=debug.log` - Write logs to file

---

## 📈 Coverage

```bash
# Generate coverage report
bun test:coverage

# View HTML report
open coverage/index.html
```

Coverage targets:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

---

## 🚀 Best Practices

1. **Write tests first** - TDD approach
2. **Test behavior, not implementation** - Focus on what, not how
3. **Use descriptive test names** - `it('should create session when sessionId is null')`
4. **One assertion per test** - Keep tests focused
5. **Clean up resources** - Use `afterAll` / `afterEach`
6. **Mock external dependencies** - Database, AI providers, etc.
7. **Use snapshots sparingly** - Only for stable outputs

---

## 🐛 Debugging Failed Tests

```bash
# Run single test in watch mode
bun test:watch streaming.test.ts

# Enable debug logging
DEBUG=* bun test

# Use vitest UI
bun test:ui

# Run with verbose output
bun test --reporter=verbose
```
