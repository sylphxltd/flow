# Test Coverage Analysis - Post-Refactoring

**Generated:** 2024-10-28
**Current Coverage:** 4.6% 🔴 CRITICAL

---

## 📊 Current State

### Overall Coverage
```
Statement Coverage: 4.6%
Branch Coverage:   77.52%
Function Coverage: 36.46%
Line Coverage:     4.6%
```

### What's Tested (22 tests)
- ✅ Path resolution (2 tests)
- ✅ MCP environment variables (4 tests)
- ✅ MCP configuration (3 tests)
- ✅ Server registry (13 tests)

### What's NOT Tested (0% coverage)
- ❌ **Domains** (0% - ALL refactored code!)
- ❌ **Services** (0% - ALL refactored code!)
- ❌ **Commands** (0%)
- ❌ **Adapters** (0%)
- ❌ **Core utilities** (mostly 0%)

---

## 🚨 Critical Test Gaps

### Priority 1: CRITICAL - Core Domain Tools (Just Refactored!)

#### 1. Workspace Tools (5 tools - 0% coverage)
**File:** `src/domains/workspace/tasks/tools.ts`

**Must Test:**
- [ ] `workspace_create_task` - Create task with task_id
- [ ] `workspace_read_task` - Read task by ID
- [ ] `workspace_update_task` - Update task state
- [ ] `workspace_list_tasks` - List/discover tasks
- [ ] `workspace_complete_task` - Archive completed task

**Why Critical:** Stateless design, used by AI agents, core functionality

**Test File:** `tests/domains/workspace/workspace-tools.test.ts`

```typescript
describe('Workspace Tools', () => {
  describe('workspace_create_task', () => {
    it('should create task and return task_id')
    it('should generate unique task IDs')
    it('should create STATUS.md with correct format')
  })

  describe('workspace_read_task', () => {
    it('should read existing task state')
    it('should return error for non-existent task')
  })

  describe('workspace_update_task', () => {
    it('should update last_action and next_action')
    it('should update phase')
    it('should append to notes section')
  })

  describe('workspace_list_tasks', () => {
    it('should list active tasks')
    it('should list completed tasks')
    it('should filter by status')
  })

  describe('workspace_complete_task', () => {
    it('should archive task to archive directory')
    it('should add completion timestamp')
  })
})
```

#### 2. Search Tools (0% coverage)
**Files:**
- `src/domains/codebase/tools.ts`
- `src/domains/knowledge/tools.ts`

**Must Test:**
- [ ] `codebase_search` - Search codebase with filters
- [ ] `knowledge_search` - Search knowledge base
- [ ] `knowledge_get` - Get specific knowledge resource

**Test File:** `tests/domains/search-tools.test.ts`

#### 3. Time Tools (0% coverage)
**File:** `src/domains/utilities/time/tools.ts`

**Must Test:**
- [ ] Time zone conversion
- [ ] Current time retrieval
- [ ] Time formatting

**Test File:** `tests/domains/utilities/time-tools.test.ts`

---

### Priority 2: HIGH - Service Layers (Just Refactored!)

#### 1. Search Services (0% coverage)
**Directory:** `src/services/search/`

**Must Test:**
- [ ] `unified-search-service.ts` - Main search orchestration
- [ ] `codebase-indexer.ts` - Index codebase files
- [ ] `knowledge-indexer.ts` - Index knowledge base
- [ ] `tfidf.ts` - TF-IDF search algorithm
- [ ] `embeddings.ts` - Embedding generation

**Test File:** `tests/services/search/search-services.test.ts`

```typescript
describe('Unified Search Service', () => {
  it('should initialize search service')
  it('should search codebase with query')
  it('should search knowledge with query')
  it('should return formatted results')
})

describe('Codebase Indexer', () => {
  it('should index TypeScript files')
  it('should respect .gitignore')
  it('should detect file languages')
  it('should build search index')
})
```

#### 2. Storage Services (0% coverage)
**Directory:** `src/services/storage/`

**Must Test:**
- [ ] `cache-storage.ts` - Cache operations
- [ ] `memory-storage.ts` - Memory operations
- [ ] `vector-storage.ts` - Vector search
- [ ] `separated-storage.ts` - Separated storage

**Test File:** `tests/services/storage/storage-services.test.ts`

---

### Priority 3: MEDIUM - Commands & CLI

#### CLI Commands (0% coverage)
- [ ] `codebase-command.ts` - Codebase search CLI
- [ ] `knowledge-command.ts` - Knowledge search CLI
- [ ] `mcp-command.ts` - MCP server management
- [ ] `init-command.ts` - Project initialization
- [ ] `run-command.ts` - Workflow execution

**Test File:** `tests/commands/cli-commands.test.ts`

---

### Priority 4: LOW - Utilities

Most utilities have 0% coverage but are less critical than domain/service logic.

---

## 📋 Recommended Test Plan

### Phase 1: Critical Path Coverage (Target: 40%)
**Estimated Effort:** 4-6 hours

1. **Workspace Tools** (~2 hours)
   - Create `tests/domains/workspace/workspace-tools.test.ts`
   - 15-20 tests covering all 5 workspace tools
   - Test edge cases (non-existent tasks, invalid IDs)

2. **Search Tools** (~2 hours)
   - Create `tests/domains/codebase/codebase-tools.test.ts`
   - Create `tests/domains/knowledge/knowledge-tools.test.ts`
   - 10-15 tests for search functionality

3. **Search Services** (~2 hours)
   - Create `tests/services/search/unified-search.test.ts`
   - Create `tests/services/search/indexers.test.ts`
   - 15-20 tests for search infrastructure

### Phase 2: Infrastructure Coverage (Target: 60%)
**Estimated Effort:** 3-4 hours

1. **Storage Services** (~2 hours)
   - Test cache, memory, vector storage
   - Mock database operations

2. **CLI Commands** (~2 hours)
   - Integration tests for CLI
   - Mock file system and user input

### Phase 3: Full Coverage (Target: 80%)
**Estimated Effort:** 4-6 hours

1. **Utilities** (~2 hours)
2. **Adapters** (~2 hours)
3. **Edge Cases** (~2 hours)

---

## 🎯 Immediate Action Items

### Must Do (Before Next Release)
1. ✅ Test workspace tools (critical AI agent functionality)
2. ✅ Test search services (core feature)
3. ✅ Test storage services (data integrity)

### Should Do (This Sprint)
4. Test CLI commands
5. Test domain tools (codebase, knowledge)
6. Add integration tests

### Nice to Have
7. Test utilities
8. Test adapters
9. Performance tests

---

## 🧪 Testing Guidelines

### Test Structure
```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Feature Name', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'test-'));
  });

  afterEach(() => {
    // Clean up
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Best Practices
1. **Isolate tests** - Use temp directories, mock external deps
2. **Test behavior, not implementation** - Focus on what, not how
3. **Clear test names** - Describe what should happen
4. **Arrange-Act-Assert** - Clear test structure
5. **Edge cases** - Test error conditions, boundaries
6. **Integration tests** - Test real file I/O where needed

---

## 📊 Expected Coverage After Test Plan

| Category | Current | Phase 1 | Phase 2 | Phase 3 |
|----------|---------|---------|---------|---------|
| **Overall** | 4.6% | 40% | 60% | 80% |
| **Domains** | 0% | 70% | 80% | 90% |
| **Services** | 0% | 50% | 70% | 85% |
| **Commands** | 0% | 20% | 60% | 75% |
| **Utils** | ~5% | 10% | 40% | 70% |

---

## 🎓 Why This Matters

### Current Risk Level: 🔴 HIGH

**Problems:**
1. **No safety net** - Refactoring could break things unnoticed
2. **Regression risk** - Future changes might break working code
3. **Confidence issues** - Hard to refactor with confidence
4. **Documentation gap** - Tests serve as usage examples

### With 80% Coverage: 🟢 LOW

**Benefits:**
1. **Safe refactoring** - Tests catch breaks immediately
2. **Living documentation** - Tests show how to use APIs
3. **Faster debugging** - Tests help isolate issues
4. **Better design** - Writing tests improves code design

---

## 💡 Recommendation

**YES - We absolutely need more tests!**

**Start with:**
1. Workspace tools tests (highest priority - core functionality)
2. Search services tests (recently refactored)
3. Storage services tests (data integrity)

**Estimated time to reach 40% coverage:** 4-6 hours
**Estimated time to reach 80% coverage:** 12-16 hours total

This is **essential** given:
- We just refactored 94 files
- Critical AI agent functionality (workspace) is untested
- Core services (search, storage) have 0% coverage

**Would you like me to start writing the workspace tools tests?**
