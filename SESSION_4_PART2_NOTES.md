# Session 4 Part 2: Test Pollution Investigation

## Current Status
- **Tests Passing**: 2035/2243 (90.7%)
- **Gain from Part 1**: +1 test (2034 → 2035)
- **Remaining Failures**: 208

## Investigation Summary

### Root Cause Found (Partially)

**Discovery**: Tests calling `vi.restoreAllMocks()` were removing module-level mocks!

**What `restoreAllMocks()` does**:
- Restores ALL mocked functions to their original implementations
- This includes module-level `vi.mock()` calls
- Breaks subsequent tests that depend on those mocks

**What `clearAllMocks()` does**:
- Clears mock call history and results
- KEEPS the mocks in place
- Safe for test suites with module-level mocks

**Files Fixed**:
1. `tests/commands/sysinfo-command.test.ts`
2. `tests/utils/async-file-operations.test.ts`
3. `tests/utils/errors.test.ts`
4. `tests/utils/logger.test.ts`
5. `tests/utils/target-config.test.ts` (4 occurrences)

**Impact**: Only +1 test (Target Config: 12 → 11 failures)

### Pollution Still Persists

**Evidence**:
- Secret Utils: 42 failures (passes 65/65 individually)
- Separated Storage: 46 failures (passes 46/46 individually)
- Paths: 17 failures (passes 49/49 individually)

**Error Pattern**:
```
ENOENT: no such file or directory, open '/tmp/.../API_KEY'
```

This means tests are calling the REAL `secretUtils` functions, not mocks!

### Investigation Findings

**Tested Combinations** (all passed when run in isolation):
- Commands + secret-utils: 316 pass, 1 fail ✅
- Config + secret-utils: 199 pass, 0 fail ✅
- DB + secret-utils: 118 pass, 0 fail ✅
- Services + secret-utils: 221 pass, 2 fail ✅
- Targets + secret-utils: 86 pass, 0 fail ✅
- Storage + secret-utils: 152 pass, 0 fail ✅
- Paths + secret-utils: 114 pass, 0 fail ✅
- Search + secret-utils: 96 pass, 0 fail ✅

**Conclusion**: Pollution is NOT from individual test directories, but from:
1. Test execution order in full suite
2. Vitest module caching/hoisting
3. Cumulative effects across multiple test files

### Defensive Mocks Added

**Files with complete secret-utils mocks**:
1. `tests/commands/init-command.test.ts` ✅
2. `tests/mcp-required-envs.test.ts` ✅
3. `tests/utils/target-config.test.ts` ✅
4. `tests/mcp-configuration.test.ts` ✅ (added this session)

### Hypotheses Not Confirmed

❌ **Hypothesis 1**: Early tests import modules without mocks
- **Test**: Added mocks to all tests importing target-config/opencode/etc.
- **Result**: No improvement

❌ **Hypothesis 2**: `restoreAllMocks()` was the main cause
- **Test**: Replaced with `clearAllMocks()` in 5 files
- **Result**: Only +1 test improvement

## Remaining Pollution Sources (Unknown)

**Possibilities**:
1. **Vitest Module Caching**: Vitest may be caching modules in a way that bypasses mocks
2. **Import Order**: Some import statement is loading real module before mocks are applied
3. **Dynamic Imports**: Some code using `await import()` after mocks are set
4. **Module Reset**: Some other mechanism resetting modules (not found in grep)
5. **Test File Execution Order**: Specific combination of test files in specific order

## Next Steps to Try

### Option 1: Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    mockReset: true,  // Reset mocks between tests
    restoreMocks: false,  // Don't restore mocks
    clearMocks: true,  // Clear mock history
    unstubGlobals: false,  // Keep global stubs
  }
})
```

### Option 2: Global Test Setup
```typescript
// vitest.setup.ts
import { afterEach } from 'vitest';

afterEach(() => {
  // Global cleanup that preserves module-level mocks
  vi.clearAllMocks();
  // But DON'T call vi.restoreAllMocks()
});
```

### Option 3: Explicit Mock Preservation
```typescript
// In each test file after vi.mock():
afterEach(() => {
  vi.clearAllMocks();
  // Re-mock if needed
});
```

### Option 4: Test Isolation
Run tests in separate processes:
```json
{
  "test": {
    "pool": "forks",  // Run each test file in separate process
    "poolOptions": {
      "forks": {
        "singleFork": false
      }
    }
  }
}
```

### Option 5: Systematic Binary Search
1. Run first half of tests + secret-utils
2. Run second half of tests + secret-utils
3. Narrow down which test file(s) cause pollution
4. Investigate those specific files

## Failure Breakdown (Current)

| Test Suite | Failures | Notes |
|------------|----------|-------|
| Separated Storage | 46 | 100% pollution |
| Logger | 45 | Real failures (console mocking) |
| Secret Utils | 42 | Pollution (ENOENT errors) |
| TF-IDF Search | 19 | Mix of real + pollution |
| Paths | 17 | Pollution |
| Unified Search | 13 | Mix |
| Process Manager | 12 | Real (singleton issues) |
| Target Config | 11 | Real failures |
| Paths Coverage | 2 | Real failures |
| Codebase Tools | 1 | Real failure |

## Commits This Session (Part 2)

1. `test: add complete secret-utils mock to mcp-configuration test`
2. `fix: replace restoreAllMocks with clearAllMocks to prevent test pollution`

## Summary

**Progress**: Minimal (+1 test)
**Discovery**: Found and fixed `restoreAllMocks()` issue
**Challenge**: Pollution persists from unknown source(s)
**Recommendation**: Try vitest configuration changes or test isolation next

The pollution is more complex than initially thought. It's not a single test file issue, but likely related to vitest's module system and how mocks are applied/preserved across the test suite.
