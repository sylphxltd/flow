# Functional Programming Refactoring Plan

## Goal
Deeply refactor the project to strictly follow functional programming principles while maintaining 100% test pass rate.

## Current Status
- **Test Coverage:** 2243/2243 (100%) ✅
- **FP Violations Found:** 17 (6 Critical, 5 High, 6 Medium)

## Strategy
Refactor incrementally with continuous test validation. Each change must maintain 100% test pass rate.

---

## Phase 1: Critical Violations (Week 1-2)

### 1.1 Error Handling Migration to Result Type
**Impact:** High | **Effort:** Medium | **Files:** 15+

**Tasks:**
- [x] Identify all try-catch blocks (completed by analysis)
- [ ] Create `ResultAsync` helper utilities
- [ ] Migrate memory.service.ts error handling
- [ ] Migrate agent-service.ts error handling
- [ ] Migrate evaluation-service.ts error handling
- [ ] Migrate embeddings-provider.ts error handling
- [ ] Update tests to use Result assertions
- [ ] Remove legacy MemoryResult type in favor of Result

**Success Criteria:**
- All services use `Result<T, E>` instead of try-catch
- Zero `catch` blocks in business logic
- 100% tests passing

---

### 1.2 Replace Mutable Buffer Accumulation
**Impact:** High | **Effort:** Low | **Files:** 3

**Tasks:**
- [ ] Refactor agent-service.ts stdout/stderr buffers
- [ ] Use functional array operations instead of `+=`
- [ ] Implement BufferBuilder with immutable operations
- [ ] Update tests

**Success Criteria:**
- No string concatenation with `+=`
- Buffers built using immutable operations
- 100% tests passing

---

### 1.3 Immutable Cache Operations
**Impact:** High | **Effort:** Medium | **Files:** 2

**Tasks:**
- [ ] Create ImmutableMap abstraction
- [ ] Refactor memory.service.ts cache operations
- [ ] Replace `Map.set()` and `Map.delete()` with immutable alternatives
- [ ] Update cleanup logic to use functional operations
- [ ] Update tests

**Success Criteria:**
- Cache operations return new state instead of mutating
- No direct mutations of cache Map
- 100% tests passing

---

### 1.4 Declarative Array Operations
**Impact:** High | **Effort:** Medium | **Files:** 5

**Tasks:**
- [ ] Replace imperative loops in embeddings-provider.ts
  - [ ] Batch processing loop → `reduce()` or `flatMap()`
  - [ ] Vector operations → `reduce()` for dot product
- [ ] Replace loops in parallel-operations.ts
  - [ ] Batch processing → functional composition
  - [ ] Result accumulation → `reduce()`
- [ ] Replace loops in tfidf.ts
  - [ ] Document building → `flatMap()`
  - [ ] Term frequency → `map()` on Map entries
  - [ ] Matched terms → `filter()` then `map()`
- [ ] Update all tests

**Success Criteria:**
- No traditional `for` loops in business logic
- All iterations use `map()`, `reduce()`, `filter()`, `flatMap()`
- 100% tests passing

---

### 1.5 Immutable Connection Pool
**Impact:** High | **Effort:** High | **Files:** 1

**Tasks:**
- [ ] Refactor connection-pool.ts to use immutable operations
- [ ] Replace `shift()`, `splice()`, direct Map mutations
- [ ] Use `filter()` and functional composition
- [ ] Update connection state immutably
- [ ] Update tests

**Success Criteria:**
- No array mutations (shift, splice, push)
- Pool state changes return new state
- 100% tests passing

---

## Phase 2: High Severity Violations (Week 3-4)

### 2.1 Convert Classes to Factory Functions
**Impact:** Very High | **Effort:** High | **Files:** 6+

**Priority Order:**
1. [ ] AgentService → createAgentService factory
2. [ ] MemoryService → createMemoryService factory
3. [ ] EvaluationService → createEvaluationService factory
4. [ ] MCPService → createMCPService factory
5. [ ] EmbeddingsProvider → createEmbeddingsProvider factory
6. [ ] ConnectionPool → createConnectionPool factory

**Pattern for Each:**
```typescript
// Before
class ServiceName {
  constructor(private deps) {}
  async method() { /* ... */ }
}

// After
const createServiceName = (deps: ServiceDeps) => ({
  method: () => methodImpl(deps),
  // ...
});

const methodImpl = (deps: ServiceDeps) => async (...args) => {
  // Pure functional implementation
};
```

**Success Criteria:**
- All classes converted to factory functions
- Dependencies injected explicitly
- No instance state
- 100% tests passing

---

### 2.2 Immutable Object Operations
**Impact:** Medium | **Effort:** Low | **Files:** 1

**Tasks:**
- [ ] Refactor object-utils.ts to return new objects
- [ ] `setNestedProperty()` → returns new object
- [ ] `deleteNestedProperty()` → returns new object
- [ ] Update all callers to use returned values
- [ ] Update tests

**Success Criteria:**
- No direct object mutation
- All functions return new objects
- 100% tests passing

---

### 2.3 Decouple Logger from Console
**Impact:** Medium | **Effort:** Low | **Files:** 1

**Tasks:**
- [ ] Extract console output to dependency
- [ ] Inject output sink into logger
- [ ] Separate formatting from output
- [ ] Update tests with mock sinks

**Success Criteria:**
- Logger doesn't directly call console
- Output is injectable
- 100% tests passing

---

### 2.4 Functional Command Handlers
**Impact:** High | **Effort:** High | **Files:** 10+

**Tasks:**
- [ ] Extract business logic from command actions
- [ ] Use `pipe()` for command flow
- [ ] Return data instead of direct output
- [ ] Use dependency injection for storage/services
- [ ] Update tests

**Success Criteria:**
- Commands orchestrate pure functions
- Business logic separated from I/O
- 100% tests passing

---

## Phase 3: Medium Severity (Week 5-6)

### 3.1 Remove Global Singletons
**Impact:** Medium | **Effort:** Medium | **Files:** 3

**Tasks:**
- [ ] Replace logger singleton with DI
- [ ] Replace storageManager singleton with DI
- [ ] Create DI container/composition root
- [ ] Update all imports
- [ ] Update tests

**Success Criteria:**
- No global singletons
- All dependencies injected
- 100% tests passing

---

### 3.2 Functional Tokenizer Initialization
**Impact:** Low | **Effort:** Low | **Files:** 1

**Tasks:**
- [ ] Remove console mutation in getTokenizer()
- [ ] Use lazy initialization pattern
- [ ] Inject logging abstraction
- [ ] Update tests

**Success Criteria:**
- No global mutations
- Clean initialization
- 100% tests passing

---

### 3.3 Declarative MCP Service Operations
**Impact:** Medium | **Effort:** Medium | **Files:** 1

**Tasks:**
- [ ] Replace imperative loops with functional operations
- [ ] Use `reduce()` for value accumulation
- [ ] Use `filter()` and `map()` for transformations
- [ ] Update tests

**Success Criteria:**
- No imperative loops
- Functional composition
- 100% tests passing

---

## Testing Strategy

### Continuous Validation
After each refactoring task:
```bash
# Run full test suite
npx vitest run

# Must show 2243/2243 passing
# If any failures, rollback and fix before proceeding
```

### Test Update Pattern
1. Read existing test file
2. Update test to match new functional API
3. Ensure test passes
4. Refactor implementation
5. Verify test still passes

---

## Quality Gates

### Before Each Commit
- [ ] All tests pass (2243/2243)
- [ ] No TypeScript errors
- [ ] No new eslint violations
- [ ] Code follows FP principles

### Before Each Push
- [ ] Full test suite passes
- [ ] Git log shows atomic commits
- [ ] Each commit maintains working state

---

## Success Metrics

### Phase 1 Complete
- Zero critical FP violations
- All error handling uses Result type
- No mutable buffer operations
- No imperative loops in core logic

### Phase 2 Complete
- Zero high severity violations
- No class-based services
- Immutable object operations
- Functional command handlers

### Phase 3 Complete
- Zero medium severity violations
- No global singletons
- All operations declarative
- 100% functional codebase

### Project Complete
- **100% test coverage maintained**
- **Zero FP violations**
- **All code follows functional principles**
- **Improved maintainability and testability**

---

## Risk Mitigation

### High Risk Areas
1. **Connection Pool**: Complex state management
2. **Command Handlers**: Many dependencies
3. **Class Conversions**: Large refactoring scope

### Mitigation Strategy
- Start with smallest changes
- Maintain working state after each change
- Use feature flags if needed for gradual rollout
- Comprehensive testing at each step

---

## Timeline Estimate

- **Phase 1 (Critical):** 2 weeks
- **Phase 2 (High):** 2 weeks
- **Phase 3 (Medium):** 2 weeks
- **Total:** 6 weeks for complete FP migration

**Note:** Can be faster if working in parallel or slower if issues arise. Adjust based on progress.

---

## Next Steps

1. ✅ Analysis complete
2. ✅ Plan created
3. [ ] Start Phase 1.1: Error handling migration
4. [ ] Continue through phases systematically

**Current Focus:** Begin Phase 1.1 - Error Handling Migration
