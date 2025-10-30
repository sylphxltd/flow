# Next Session Plan: 90%+ Target

## Current Status
```
Tests Passing: 1861/2093 (88.9%)
Failures: 232 tests
Distance to 90%: +23 tests
Distance to 95%: +127 tests
Distance to 100%: +232 tests
```

## Session 3 Achievement Summary
- **Start:** 1632/1989 (82.0%)
- **End:** 1861/2093 (88.9%)
- **Gain:** +229 passing tests (+6.9%)
- **Target:** ✅ Exceeded 85% by 3.9%

## Failure Analysis

### Test Pollution (~213 false failures) - HIGHEST PRIORITY
**Evidence:** Tests pass individually but fail in full suite

**Affected Test Suites:**
1. Secret Utils: 61 failures (passes 65/65 individually) ✅ Confirmed pollution
2. Separated Storage: 46 failures (passes 46/46 individually) ✅ Confirmed pollution
3. TF-IDF Search: 19 failures (passes 27/27 individually - 2 real, 17 pollution)
4. Paths: 17 failures (passes 49/49 individually) ✅ Confirmed pollution
5. Unified Search: 13 failures (some pollution, some real)

**Total Estimated Pollution:** ~156 false failures from confirmed cases alone

**Root Cause Hypothesis:**
- Database connections persisting across tests
- Singleton instances not being reset
- Module-level state leaking between test files
- CWD changes affecting subsequent tests

**Investigation Strategy:**
1. Run tests in isolation vs full suite to identify pollution patterns
2. Check for singleton instances in storage/search modules
3. Investigate database connection lifecycle
4. Look for module-level state that persists

**Quick Test:**
```bash
# Compare individual vs suite results
bun test tests/utils/secret-utils.test.ts  # 65/65 pass
bun test                                    # 4/65 pass (61 polluted)
```

### Real Failures (76 confirmed)
**High-ROI Targets:**

1. **Logger Tests (45 failures)**
   - **Issue:** Console mocking not capturing output in vitest 4.x
   - **Error:** `consoleLogOutput` array remains empty
   - **Complexity:** High (console mocking is tricky)
   - **Impact:** 45 tests
   - **Files:** tests/utils/logger.test.ts

2. **Process Manager (12 failures)**
   - **Issue:** Singleton pattern + global process mocking
   - **Error:** Can't reset singleton without vi.resetModules()
   - **Complexity:** Medium (requires refactoring)
   - **Impact:** 12 tests
   - **Files:** tests/utils/process-manager.test.ts
   - **Solution:** Add dependency injection pattern

3. **Target Config (3 failures)**
   - **Issue:** Test logic issues after vi.mocked fix
   - **Complexity:** Low
   - **Impact:** 3 tests
   - **Files:** tests/utils/target-config.test.ts

4. **Unified Search Service (2 real failures)**
   - **Issue:** Knowledge base not indexed in temp test directory
   - **Error:** "Knowledge base not indexed yet"
   - **Complexity:** Medium
   - **Impact:** 2 tests (+ 11 pollution)
   - **Files:** tests/services/search/unified-search-service.test.ts
   - **Solution:** Mock knowledge indexer or create test knowledge files

5. **Paths Coverage (2 failures)**
   - **Complexity:** Low
   - **Impact:** 2 tests
   - **Files:** tests/utils/paths.test.ts

6. **Codebase Tools (1 failure)**
   - **Complexity:** Low
   - **Impact:** 1 test
   - **Files:** tests/domains/codebase/codebase-tools.test.ts

## Recommended Approach for Next Session

### Phase 1: Quick Wins (Target: +10 tests, reach ~89.4%)
**Effort:** Low | **Time:** 30 minutes | **Success Rate:** Very High

1. Fix Target Config (3 tests)
2. Fix Paths Coverage (2 tests)
3. Fix Codebase Tools (1 failure)
4. Investigate and fix other small issues (4+ tests)

**Commands:**
```bash
bun test tests/utils/target-config.test.ts 2>&1 | grep -A10 "(fail)"
bun test tests/utils/paths.test.ts 2>&1 | grep -A10 "(fail)"
bun test tests/domains/codebase/codebase-tools.test.ts 2>&1 | grep -A10 "(fail)"
```

### Phase 2: Test Pollution Investigation (Target: +50-100 tests, reach 92-95%)
**Effort:** High | **Time:** 2-3 hours | **Success Rate:** Medium-High

**Strategy: Systematic Root Cause Analysis**

1. **Identify Pollution Source**
   ```bash
   # Test hypothesis: Database connections persist
   grep -r "new.*Database\|new.*Storage\|getInstance" src/services/storage/

   # Check for singletons
   grep -r "static instance\|let.*instance.*=" src/

   # Check test execution order
   ls tests/**/*.test.ts | sort
   ```

2. **Test Isolation Experiments**
   ```bash
   # Run polluted tests in different orders
   bun test tests/services/storage/*.test.ts tests/utils/secret-utils.test.ts
   bun test tests/utils/secret-utils.test.ts tests/services/storage/*.test.ts

   # Compare results to identify contamination source
   ```

3. **Fix Patterns**
   - Add proper cleanup in afterEach hooks
   - Reset singleton instances
   - Close database connections
   - Restore CWD and environment
   - Clear module caches if needed

4. **Verification**
   ```bash
   # Before fix
   bun test tests/utils/secret-utils.test.ts  # Pass individually
   bun test | grep "Secret Utils"             # Fail in suite

   # After fix
   bun test | grep "Secret Utils"             # Should pass in suite
   ```

**Expected Impact:** +50-100 tests if successful

### Phase 3: Logger Console Mocking (Target: +45 tests, reach 97%+)
**Effort:** High | **Time:** 2-3 hours | **Success Rate:** Medium

**Problem:** vitest 4.x console mocking doesn't capture output

**Investigation Steps:**
1. Research vitest 4.x console mocking patterns
2. Check if console.log is being called but not captured
3. Try alternative mocking approaches:
   - Use vi.spyOn(console, 'log')
   - Create custom console wrapper
   - Use stdout/stderr capture
4. Update logger tests to work with vitest 4.x

**Reference:** Check if other projects have solved this in vitest 4.x

### Phase 4: Process Manager Refactoring (Target: +12 tests, reach 98%)
**Effort:** Medium | **Time:** 1-2 hours | **Success Rate:** High

**Current Issue:** Singleton pattern can't be reset between tests

**Solution:** Dependency injection pattern
```typescript
// Before: Singleton
class ProcessManager {
  private static instance: ProcessManager;
  static getInstance() { ... }
}

// After: Injectable
class ProcessManager {
  constructor(private process: NodeJS.Process = global.process) {}
}

// In tests
const mockProcess = { ... };
const manager = new ProcessManager(mockProcess);
```

## Priority Order

### To Reach 90% (+23 tests):
1. Phase 1: Quick wins (+10 tests) → 89.4%
2. Phase 2: Fix one major pollution source (+20+ tests) → 90%+

### To Reach 95% (+127 tests):
1. Complete Phase 2: Solve all test pollution (+100+ tests)
2. Phase 3: Fix logger tests (+45 tests)
3. Cleanup remaining issues

### To Reach 100% (+232 tests):
1. Phases 1-3 above (+155+ tests)
2. Phase 4: Process Manager (+12 tests)
3. Fix all remaining edge cases (+65 tests)

## Key Insights from Session 3

### 1. Module-Level Mocks Persist Globally
**Discovery:** In vitest 4.x, `vi.mock()` at module level affects ALL tests in suite

**Impact:** Single incomplete logger mock caused 111 false failures

**Solution Pattern:**
```typescript
// Module-level mocks MUST support ALL usage patterns
vi.mock('module', () => ({
  export: {
    directMethod: vi.fn(),           // Pattern 1
    factoryMethod: vi.fn(() => ({    // Pattern 2
      directMethod: vi.fn(),
    })),
  },
}));
```

### 2. Vitest 4.x Mock Pattern
```typescript
// DO: Create mock variable before vi.mock()
let mockFn = vi.fn();
vi.mock('module', () => ({ export: mockFn }));

// DON'T: Use deprecated vi.mocked()
vi.mocked(module.export) // ❌ Removed in vitest 4.x
```

### 3. Test Pollution is Widespread
**Scale:** ~213 false failures (40% of remaining issues)

**Detection:** Tests pass individually but fail in full suite

**Root Causes:**
- Database connections persisting
- Singleton instances not reset
- Module caches not cleared
- Global state mutations

## Files to Investigate

### Storage/Database Layer
- src/services/storage/memory-storage.ts
- src/services/storage/cache-storage.ts
- src/services/storage/separated-storage.ts
- src/services/storage/drizzle-storage.ts
- src/db/cache-db.ts
- src/db/memory-db.ts

### Singleton Patterns
```bash
grep -r "static instance\|getInstance" src/
```

### Test Files with Pollution
- tests/utils/secret-utils.test.ts (61 polluted)
- tests/services/storage/separated-storage.test.ts (46 polluted)
- tests/utils/paths.test.ts (17 polluted)
- tests/services/search/tfidf.test.ts (17 polluted)
- tests/services/search/unified-search-service.test.ts (11 polluted)

## Success Metrics

### Next Session Goals
- **Minimum:** Reach 90% (1884/2093, +23 tests)
- **Target:** Reach 92-95% (1925-1988/2093, +64-127 tests)
- **Stretch:** Reach 95%+ by solving test pollution

### Quality Standards
- ✅ Maintain 100% FP principles
- ✅ No regressions in existing tests
- ✅ Document all discoveries
- ✅ Create reusable patterns

## Commands Cheat Sheet

```bash
# Check current status
bun test 2>&1 | tail -5

# Get failure breakdown
bun test 2>&1 | grep "^(fail)" | sed 's/^(fail) //' | cut -d'>' -f1 | sort | uniq -c | sort -rn

# Test individual file
bun test tests/path/to/file.test.ts

# Test with verbose output
bun test tests/path/to/file.test.ts 2>&1 | tail -100

# Find test pollution
bun test tests/utils/secret-utils.test.ts  # Individual
bun test | grep "Secret Utils"              # In suite

# Search for patterns
grep -r "pattern" tests/
grep -r "pattern" src/

# Find singletons
grep -r "static instance\|getInstance" src/
```

## Expected Timeline

### Quick Session (1-2 hours)
- Phase 1 only: +10 tests → 89.4%
- Won't reach 90% but good progress

### Standard Session (3-4 hours)
- Phase 1 + Phase 2 partial: +30-50 tests → 90-92%
- Reach 90% milestone
- Begin test pollution fixes

### Deep Session (5-6 hours)
- Phase 1 + Phase 2 complete: +100+ tests → 95%+
- Solve test pollution
- Major milestone achievement

## Final Notes

**Session 3 was exceptional:** +229 tests, exceeded 85% target by 3.9%

**Key achievement:** Discovered and fixed massive test pollution from incomplete logger mock (+111 tests)

**Next breakthrough:** Solving remaining test pollution will likely add +100-150 tests immediately

**Path is clear:** Fix quick wins → solve pollution → reach 95%+

**Quality maintained:** 100% FP principles throughout all work

---

**Status:** Ready for next session
**Current:** 1861/2093 (88.9%)
**Next Target:** 90% (+23 tests)
**Ultimate Goal:** 100% (2093/2093)
