# Phase 3: Advanced FP Refactoring Assessment

## Status
**Started**: December 31, 2024
**Phase 1**: ✅ COMPLETE (Critical FP violations)
**Phase 2**: ✅ COMPLETE (All 7 services → factory functions)
**Phase 3**: 🔄 IN PROGRESS (Advanced refactoring)

---

## Remaining Classes Analysis

### Total Classes Found: 49 files

Analyzed categories:

### 1. ✅ **Acceptable Classes** (Keep as-is)
These classes serve specific purposes where class syntax is beneficial or required:

#### Error Classes (7 files)
- `src/errors/embeddings-errors.ts` - Typed error classes
- `src/errors/evaluation-errors.ts` - Typed error classes
- `src/errors/agent-errors.ts` - Typed error classes
- `src/errors/memory-errors.ts` - Typed error classes
- `src/utils/errors.ts` - Base error types
- `src/utils/database-errors.ts` - Database error types
- `src/utils/simplified-errors.ts` - Simplified error types

**Rationale**: Error classes extend `Error` which requires class syntax. These are simple data structures.

#### React Components (2 files)
- `src/components/benchmark-monitor.tsx` - React component (InkMonitor)
- `src/components/reindex-progress.tsx` - React component

**Rationale**: React components often use class syntax (though could be refactored to hooks).

#### Database/Storage Infrastructure (7 files)
- `src/db/cache-db.ts` - Database client
- `src/db/memory-db.ts` - Memory database client
- `src/db/index.ts` - Database exports
- `src/services/storage/memory-storage.ts` - Storage implementation
- `src/services/storage/cache-storage.ts` - Cache storage
- `src/services/storage/separated-storage.ts` - Separated storage
- `src/services/storage/drizzle-storage.ts` - Drizzle ORM storage

**Rationale**: These interact with external libraries (Drizzle ORM) that expect class-based patterns.

#### Adapters (3 files)
- `src/adapters/memory-storage-adapter.ts` - Storage adapter
- `src/adapters/cache-storage-adapter.ts` - Cache adapter
- `src/adapters/vector-storage-adapter.ts` - Vector storage adapter

**Rationale**: Adapters implement interfaces for external systems.

---

### 2. 🔄 **Should Convert** (Priority targets)
These classes contain business logic and should follow FP principles:

#### High Priority (Core Business Logic)

**Logger** (`src/utils/logger.ts`)
- **Status**: Class with global singleton
- **Issue**: Mutable state, global instance
- **Action**: Convert to factory function pattern
- **Complexity**: Medium (affects many files)
- **Impact**: High (used throughout codebase)

**ProcessManager** (`src/utils/process-manager.ts`)
- **Status**: Singleton class
- **Issue**: Global mutable state
- **Action**: Convert to factory function
- **Complexity**: Low
- **Impact**: Medium

**MCP Installer** (`src/core/installers/mcp-installer.ts`)
- **Status**: Class
- **Issue**: Should use factory pattern like other services
- **Action**: Convert to factory function
- **Complexity**: Low
- **Impact**: Low (already updated to use factory MCPService)

**File Installer** (`src/core/installers/file-installer.ts`)
- **Status**: Class
- **Issue**: Business logic in class
- **Action**: Convert to factory function
- **Complexity**: Low
- **Impact**: Low

#### Medium Priority

**Target Manager** (`src/core/target-manager.ts`)
- **Status**: Singleton class
- **Issue**: Global mutable registry
- **Action**: Consider converting or documenting as acceptable
- **Complexity**: High (affects init command, many imports)
- **Impact**: High

**Storage Manager** (`src/core/unified-storage-manager.ts`)
- **Status**: Singleton class
- **Issue**: Global storage management
- **Action**: Convert to factory or DI pattern
- **Complexity**: Medium
- **Impact**: High

**DI Container** (`src/core/di-container.ts`)
- **Status**: Class-based container
- **Issue**: Could be functional
- **Action**: Consider refactoring (low priority)
- **Complexity**: High
- **Impact**: High

#### Lower Priority

**Knowledge Indexer** (`src/services/search/knowledge-indexer.ts`)
- **Status**: Class
- **Action**: Convert to factory function
- **Complexity**: Medium
- **Impact**: Medium

**Codebase Indexer** (`src/services/search/codebase-indexer.ts`)
- **Status**: Class
- **Action**: Convert to factory function
- **Complexity**: Medium
- **Impact**: Medium

**Vector Storage** (`src/services/storage/lancedb-vector-storage.ts`)
- **Status**: Class (wraps LanceDB)
- **Action**: Consider converting
- **Complexity**: Medium
- **Impact**: Low

**Plugin Manager** (`src/plugins/plugin-manager.ts`)
- **Status**: Class
- **Action**: Convert to factory
- **Complexity**: Low
- **Impact**: Low

---

### 3. ⏳ **Defer** (Low priority or acceptable)

**Utility Classes** (Keep as-is for now)
- `src/utils/cli-output.ts` - CLI formatter
- `src/utils/memory-tui.ts` - Terminal UI
- `src/utils/mcp-config.ts` - MCP configuration
- `src/utils/advanced-tokenizer.ts` - Tokenizer wrapper
- `src/utils/template-engine.ts` - Template engine
- `src/utils/security.ts` - Security utilities
- `src/utils/settings.ts` - Settings manager
- `src/utils/async-file-operations.ts` - Async file ops
- `src/utils/parallel-operations.ts` - Already functional (exports pure functions)

**Domain Classes**
- `src/domains/knowledge/resources.ts` - Knowledge resources
- `src/domains/knowledge/indexer.ts` - Domain indexer

**Plugins**
- `src/plugins/plugin-bootstrap.ts` - Plugin bootstrap
- `src/plugins/examples/memory-mcp-plugin.ts` - Example plugin

**Configuration**
- `src/config/targets.ts` - Target configurations
- `src/core/connection-pool.ts` - Connection pooling
- `src/core/storage-factory.ts` - Storage factory

**Repositories**
- `src/repositories/memory.repository.ts` - Memory repository (already used by MemoryService)

**Embeddings**
- `src/services/search/embeddings.ts` - Embeddings service

---

## Phase 3 Priorities

### 🎯 Immediate Focus (This session)

1. **Convert Logger to Factory Function**
   - Lines: ~343
   - Impact: HIGH (used everywhere)
   - Complexity: MEDIUM
   - Pattern: Similar to MemoryService (config + methods)

2. **Convert ProcessManager to Factory Function**
   - Lines: ~100-150 (estimate)
   - Impact: MEDIUM
   - Complexity: LOW
   - Pattern: Singleton → Factory

3. **Convert Installers**
   - MCPInstaller: ~154 lines
   - FileInstaller: ~? lines
   - Impact: LOW
   - Complexity: LOW

### 📋 Next Session

4. **Refactor Global Singletons**
   - Storage Manager
   - Target Manager (complex)
   - DI Container (optional)

5. **Convert Remaining Services**
   - Knowledge Indexer
   - Codebase Indexer
   - Vector Storage

6. **Command Handlers** (if time permits)
   - Convert command handlers to functional style
   - 10+ command files to refactor

---

## Success Criteria

**Phase 3 Complete** when:
- ✅ Logger converted to factory function
- ✅ ProcessManager converted to factory function
- ✅ Installers converted to factory functions
- ✅ All global singletons documented or refactored
- ✅ Critical business logic classes converted
- ✅ Test coverage maintained at 100%
- ✅ Zero regressions

---

## Estimated Effort

- **Immediate Focus**: 1 session (4-6 hours)
- **Next Session**: 1-2 sessions
- **Total Phase 3**: 2-3 sessions

---

## Notes

- Focus on business logic classes first
- Infrastructure/utility classes can remain if needed
- Maintain 100% test coverage throughout
- Document decisions for classes we keep
