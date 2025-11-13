# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### 🚀 Major Features

#### Loop Mode - Autonomous Continuous Execution
Revolutionary loop mode that enables truly autonomous AI agents:
- **Continuous execution** with automatic context preservation
- **Zero wait time default** - task execution is the natural interval
- **Smart continue mode** - auto-enables from 2nd iteration
- **Graceful shutdown** - Ctrl+C handling with summaries
- **Configurable wait times** for rate limiting or polling scenarios

```bash
# Continuous autonomous work
sylphx-flow "process all github issues" --loop

# With wait time for polling
sylphx-flow "check for new commits" --loop 300 --max-runs 20
```

#### File Input Support
Load prompts from files for complex, reusable instructions:
- **@file syntax** - `@prompt.txt` or `@/path/to/prompt.txt`
- **No shell escaping issues** - write natural language prompts
- **Version control friendly** - commit prompts alongside code
- **Works seamlessly with loop mode**

```bash
# Use file input
sylphx-flow "@task.txt" --loop --max-runs 10
```

#### Smart Configuration System
Intelligent defaults that learn from your choices:
- **Auto-saves preferences** - provider, agent, target selections
- **Smart defaults** - uses saved preferences automatically
- **Selective override** - `--select-provider` / `--select-agent` flags
- **Inline API key setup** - configure keys when selecting providers
- **No repeated prompts** - set once, use forever

#### OpenCode Integration
Full support for OpenCode (Claude Code alternative):
- **Auto-detection** of OpenCode installation
- **Target-aware component checking**
- **JSONC config parsing** for OpenCode's commented configs
- **Directory structure adaptation** (singular vs plural naming)
- **Automatic migration** from old directory structures

### 🔧 Major Improvements

#### Flow Orchestrator Architecture
Complete refactor for separation of concerns:
- **Modular design** - clean separation of init/setup/launch phases
- **State-driven decisions** - smart detection of project state
- **Positive logic patterns** - explicit conditions instead of negative flags
- **Component integrity** - automatic detection and repair of missing components

#### Performance Optimizations
- **Loop mode optimization** - setup once, execute repeatedly (no redundant checks)
- **Parallel execution** - concurrent independent operations
- **Smart caching** - reuse configuration across runs
- **Reduced overhead** - streamlined initialization flow

#### Developer Experience
- **Better error messages** - actionable feedback with suggestions
- **Progress indicators** - clear feedback during long operations
- **Dry-run mode** - preview commands before execution
- **Verbose mode** - detailed output for debugging
- **Headless mode** - `-p` for non-interactive execution

### 🐛 Bug Fixes

#### Critical Fixes
- **Init command execution** - fixed Commander.js action() misuse that prevented initialization
- **State detection timing** - only check components after target is known
- **MCP detection** - proper JSONC parsing for OpenCode configs
- **Directory naming** - fixed OpenCode command/commands mismatch
- **Continue flag logic** - proper handling of conversation context

#### OpenCode Specific
- **YAML field compatibility** - removed unsupported fields (name, mode, rules)
- **Automatic cleanup** - removes legacy directories to prevent crashes
- **Config validation** - proper error handling for invalid configurations

#### Memory & Settings
- **Persistent settings** - fixed "re-prompt every run" issue
- **Target-specific configs** - separate settings per platform
- **Environment variables** - proper inheritance to spawned processes

### 📚 Documentation
- **LOOP_MODE.md** - Complete loop mode documentation
- **Updated help text** - clearer, more descriptive option descriptions
- **Inline examples** - usage examples in help output
- **Consistent terminology** - "wait time" instead of mixed "interval/cooldown"

### ⚠️ Breaking Changes

#### Configuration File Rename
- Old: `.sylphx-flow/config.json`
- New: `.sylphx-flow/settings.json`
- Migration: Automatic on first run

#### Default Behavior Changes
- **Loop interval default**: 60s → 0s (immediate execution)
- **Init logic**: Negative logic → Positive logic (explicit conditions)
- **Provider selection**: Opt-in defaults → Smart defaults (auto-use saved)

#### Removed Features
- **Deprecated commands**: Old separate init/run commands (use integrated `flow` command)
- **Complex loop strategies**: Removed over-engineered exit conditions (until-success, until-stable)

### 🔄 Migration Guide

**From 0.x to 1.0:**

1. **Update package**: `bun update @sylphx/flow`
2. **Config auto-migrates** on first run - no manual steps needed
3. **Loop mode users**: Consider removing wait time for faster execution:
   ```bash
   # Before (0.x)
   sylphx-flow "task" --loop 60

   # After (1.0 - faster)
   sylphx-flow "task" --loop
   ```
4. **Provider/Agent selection**: No longer need `--use-defaults` - it's automatic now

### 📊 Stats
- **50+ commits** since 0.3.0
- **15+ major features** added
- **20+ bug fixes**
- **Full OpenCode support**
- **10x faster loop execution** (setup overhead removed)

---

## [0.2.13] - 2025-11-04

### ✨ Features

#### Message History
- **Bash-like Navigation**: Navigate through previous messages using up/down arrow keys (`cf52287`)
- **Database Persistence**: Message history persisted in database with 100-message limit (`f92e03f`)

### 🐛 Bug Fixes

#### Windows Compatibility
- **Path Resolution**: Fixed agents and rules not being found on Windows by using `fileURLToPath` instead of `URL.pathname` (`620395f`)
  - Issue: Windows path format caused builtin assets to fail loading
  - Solution: Use Node.js `fileURLToPath` for cross-platform compatibility

#### Chat Refactoring Fixes
- **Critical Issues**: Resolved input box malfunction, missing messages, and streaming errors after refactoring (`d8bbee6`)
  - Fixed InputSection props: `onSubmit`, `cursor`, `addMessage`, `createCommandContext`
  - Fixed `createStreamCallbacks` import (removed duplicate param definition)
  - Fixed layout with proper flexGrow/flexShrink attributes
  - Restored message submission and display functionality
- **TypeScript Errors**: Resolved all compilation errors in refactored chat modules (`8eb908d`)
  - Exported `FileInfo` interface from file-scanner.ts
  - Added null checks and type assertions in streamCallbacks.ts
  - Fixed unused parameter warnings

#### Input System
- **Autocomplete Cursor**: Only trigger autocomplete when cursor is AFTER special characters (/, @) (`1ca0f34`)
  - Prevents autocomplete when typing before special chars
- **History Navigation**: Prevent autocomplete from blocking up/down arrow history navigation (`064cd66`)
  - Fixed autocomplete intercepting arrow keys
  - Cursor positioned at start when navigating history
- **State Management**: Fixed sessions variable initialization order (`34d16c0`, `a05947a`)

### 🚀 Performance

#### Database Optimization
- **Message History Query**: Use indexed database query instead of traversing all sessions (`2e8bb2f`)
  - Load once on mount, update in-place
  - Avoid O(n) sessions traversal on every state change

### 🔧 Refactoring

#### Chat Architecture
- **Modular Extraction**: Complete refactoring of Chat.tsx into 21 focused modules (`2caf765`)
  - Reduced from 1595 → 616 lines (61% reduction)
  - **State Hooks** (4 files): useInputState, useStreamingState, useSelectionState, useCommandState
  - **Streaming Logic** (4 files): streamingHelpers, databasePersistence, streamCallbacks, messageStreaming
  - **Command Handling** (2 files): commandContext, messageHandler
  - **Autocomplete** (5 files): hintText, fileAutocomplete, commandAutocomplete, optionLoader, types
  - **UI Components** (4 files): ChatHeader, ChatMessages, StatusIndicator, InputSection
  - **Session Management** (2 files): messageHistory, titleGeneration

#### Guidelines Optimization
- **MEP Principles**: Optimized core guidelines with Minimal Effective Prompt principles (`9d6fd6b`)
  - Clearer structure and reduced verbosity
  - Better focus on critical information

### 📊 Summary

This release focuses on **message history navigation**, **Windows compatibility**, and **major architecture refactoring**. Key highlights:

- ✨ **Bash-like message history** with up/down arrow navigation
- 🪟 **Windows compatibility** for builtin agents and rules
- 🔧 **Chat.tsx refactoring** - 61% code reduction with better modularity
- 🐛 **Critical bug fixes** after refactoring
- 🚀 **Performance optimization** for message history queries

**Stats:**
- **12 commits** since v0.2.12
- **Chat.tsx reduced** from 1595 → 616 lines
- **21 new modules** created for better separation of concerns
- **Windows path resolution** fixed for global npm installs

---

## [0.2.12] - 2025-11-04

### ✨ Features

#### Selection UI Enhancements
- **Free Text Input**: Allow users to input custom answers instead of selecting from predefined options (`b769fcb`, `aef7239`, `4b36597`)
- **Per-Option Checked State**: Each option can have default checked state for multi-select (included in commits above)
- **Filter Mode Improvement**: Require "/" key to enter filter mode, preventing accidental filtering (`7051ea7`)

#### UI Improvements
- **Chat Title Restored**: Display current session title with streaming animation support (`74364db`)
- **Command Autocomplete**: Prioritize command name matches over description matches (`0b90edd`)
- **Session Switching**: Fixed session switching issues caused by Static component (`d058b2e`, `604de1c`, `c911024`, `d06a0f6`)

### 🔧 Refactoring

#### Architecture Simplification
- **Removed Flat Rendering**: Reverted to simple nested structure for better maintainability (`604de1c`, `d058b2e`)
- **Extracted Rendering Logic**: Split Chat.tsx into smaller, focused modules (`486d681`, `76cd1f5`)

#### Code Quality Improvements
- **DRY Principle**: Eliminated code duplication across the codebase (`8a1e914`, `c639884`, `f18f6d1`, `1581ad2`, `e7195c3`)
- **Provider Refactoring**: Reduced provider-related code from 759→246 lines (`cb798a5`, `36ca514`, `d6dd8b3`)
- **Circular Dependencies**: Completely eliminated all circular dependencies - achieved 0 circulars (`18ae9c9`, `e2689f5`, `ad78657`, `3022be7`)

#### Feature Extraction
- **Pure Function Extraction**: Extracted business logic into testable pure functions
  - Session utils (`bf3dd0e`, `ae06aad`)
  - Memory utils (`6b7ce82`) - 20 tests
  - Codebase utils (`6b7ce82`) - 45 tests
  - Run command (`d5fd6af`)
  - Knowledge utils (`261721d`)
  - Hook utils (`b2ee60b`)
  - Autocomplete (`d993921`)
  - Commands (`f5352b4`)
  - Streaming (`18b61e5`)
  - Input handling (`8310748`)

### 🐛 Bug Fixes

#### Streaming and Message Handling
- **Text Part Handling**: Fixed missing text content display (`00216e0`, `81187f5`, `4212915`, `461ceb7`)
- **Abort Handling**: Improved abort detection and state management (`564bd01`, `9366de6`, `ebbbfe1`, `5d798df`)
- **Message Persistence**: Multiple fixes for content preservation (`fbee92e`, `4a05b89`, `f8233c3`, `0a109b2`)
- **Key Stability**: Fixed React key issues (`db1081d`, `e6ffd2d`, `2a4b4ae`)

#### Data Migration
- **Attachment Normalization**: Fixed invalid attachment format issues (`21ee2ed`, `2e4d77e`, `c3a1b51`, `de026da`)
- **Migration Fixes**: Restored missing migrations (`7b4f907`)

### 🎨 UI/UX Improvements

#### Chat Layout and Scrolling
- **Natural Terminal Scroll**: Embraced natural terminal behavior (`3159a8a`, `a0ab44e`, `07ab6e1`)
- **Status Indicators**: Enhanced streaming status display (`658da0f`, `92eb2da`, `11fc07c`)
- **Input Box Improvements**: Better input handling during streaming (`c8d8614`, `d2b937c`, `fae8dda`)

#### Content Display
- **Reasoning Duration**: Real-time duration updates with adaptive frequency (`830cc4d`, `652b7d1`, `2f3f5ae`)
- **Tool Display**: Improved LLM tool display colors (`bad2a21`, `7b4f907`)

#### Message Handling
- **Error and Abort Display**: Better error and abort message handling (`1ba600c`, `53a18e2`, `bf11c67`, `c51e313`, `7a5b2e8`, `0fe71be`, `e9e9e3b`, `79b90e7`)
- **Message Structure**: Improved message content handling (`ee0d705`, `03908c9`, `ff14431`, `0f9ebf5`, `db8a9b1`)

### 🔄 Message State Management

- **Message-Based Streaming**: Refactored streaming state from session to message level (`ccf95c4`, `2b0dbf6`, `4fc941b`, `2996237`, `a856091`)
- **Data Persistence**: Enhanced streaming state persistence with auto-migration (`19e7dfd`, `6b1164e`)

### 🛠️ Development Experience

#### Debug and Monitoring
- **Debug Indicators**: Visual indicators for Static/Dynamic regions (`dc56409`, `d4ae5ef`, `ecc9808`)
- **Performance Monitoring**: FPS counter (added and removed) (`c53a07b`, `87ce639`, `628a289`)
- **Logging**: Comprehensive stream chunk logging (`4bee994`)

#### Tool Integration
- **Ask Tool**: Interactive question support for AI (`cc9f5f6`, `e119f41`, `3e2eb84`)

### 🔧 Technical Improvements

#### Type Safety
- **TypeScript Improvements**: Better type safety for AI SDK (`67ccf43`, `ebbbfe1`, `5d798df`)

#### Performance
- **Optimization**: Improved rendering performance (`c2f5882`, `d3eb858`, `aa8b408`)

#### API Changes
- **Parameter Refactoring**: Better parameter organization (`b2d1a5d`, `c0ce45c`)

#### Platform Compatibility
- **Windows Support**: Fixed path handling for Windows (`8310748`)

### 📝 Documentation

- **Comprehensive Documentation**: Added extensive design and refactoring docs (`61b6360`, `d94e1a7`, `c2f6f8f`, `a432aea`, `1b8d362`, `59d92d5`, `9a8f0b8`, `77d09a2`)

---

### Summary

This release focuses on **significant UI/UX improvements** for the selection system, **architectural simplification**, and **comprehensive code quality optimization**. The major highlights include:

- ✨ **Free text input** and **per-option checked state** for selection UI
- 🔧 **Simplified architecture** by removing flat rendering complexity
- 🐛 **Fixed session switching** issues
- 📦 **Eliminated all circular dependencies** (100% success)
- 🧹 **Massive code cleanup** with DRY principle applied throughout
- 📝 **Comprehensive documentation** added for all major features

**Stats:**
- **159 commits** since v0.2.11
- **Zero circular dependencies** achieved
- **400+ lines of code eliminated** through refactoring
- **100+ tests added** for pure function utilities

---

## [0.2.11] - 2025-11-03

### Bug Fixes
- fix(db): use package root resolution for session database migrations (fixes SQLITE_ERROR near DO on Windows)

---

## [0.2.10] - 2025-11-03

### Bug Fixes
- fix(db): include drizzle migrations in npm package and use package root resolution (fixes Windows migration error)
- fix(db): create both home directory (~/.sylphx-flow) and project directory (.sylphx-flow) for database storage
- fix(db): code command now uses home directory, init/run commands use project directory

---

## [0.2.9] - 2025-11-03

### Bug Fixes
- fix(db): complete Windows fix - remove file: URL scheme from memory database (incomplete in v0.2.8)

---

## [0.2.8] - 2025-11-03

### Bug Fixes
- fix(db): use direct file path without file: URL scheme for Windows compatibility

---

## [0.2.7] - 2025-11-03

### Bug Fixes
- fix(db): pre-create database file before libSQL connection to fix Windows SQLITE_CANTOPEN error

---

## [0.2.6] - 2025-11-03

### Bug Fixes
- fix(db): use file:/// (triple slash) for Windows absolute paths in libSQL URLs

---

## [0.2.5] - 2025-11-03

### Bug Fixes
- fix(db): normalize Windows paths for libSQL file URLs (fixes SQLITE_CANTOPEN error on Windows)

---

## [0.2.4] - 2025-11-03

### Features
- feat(compact): auto-trigger AI response after compacting session
- feat(input): add text wrapping with multi-line navigation support
- feat(title): add AI-powered session title generation with streaming
- feat(dashboard): add full-screen mode with mouse support
- feat(audio): add cross-platform audio player for notifications

### Bug Fixes
- fix(chat): fix conditional rendering crashes with 0-byte files
- fix(input): restore @file tag background highlighting
- fix(input): allow autocomplete to handle up/down arrows
- fix(db): resolve SQLITE_BUSY errors with WAL mode
- fix(notifications): remove terminal notification visual output

### Refactors
- refactor(paths): use package.json lookup for bundled assets

---

## [0.2.3] - 2025-11-03

### Features
- feat(db): migrate to SQLite with automatic JSON migration
- feat(provider): integrate Claude Code provider with streaming
- feat(input): add ESC key to cancel AI responses
- feat(notifications): add system notifications for response completion
- feat(input): add complete readline keyboard shortcuts
- feat(session): add session rewind with todo state snapshots

### Bug Fixes
- fix(app): fix crash when AI uses tools
- fix(todo): fix proxy revoked error in todo updates
- fix(db): resolve schema migration errors on fresh installs
- fix(streaming): fix memory leaks in streaming handlers

### Performance
- perf(render): optimize message rendering with memoization
- perf(streaming): batch streaming updates with 50ms debounce

---
