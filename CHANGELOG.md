# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2025-11-03

**250 commits since v0.2.0** | 79 fixes | 62 features | 57 refactors | 3 performance improvements

This release represents a major evolution of Sylphx Flow with comprehensive improvements across stability, performance, and user experience. The codebase has been significantly enhanced with better architecture, database migration, and a polished TUI interface.

### 🎯 Major Features

#### Database Migration System
- **Migrate from file-based to SQLite database for session storage**
  - Automatic migration from JSON files to database
  - Zero downtime migration - seamlessly detects and migrates existing sessions
  - Better performance and reliability for session management
  - Supports concurrent access and atomic operations
  - Headless mode now uses database for consistency

#### Claude Code Provider Integration
- **Official Claude Agent SDK integration via Claude Code provider**
  - Text-based tool calling support (Tool Use format)
  - Full streaming support for tool execution
  - Reasoning/thinking stream support with real-time updates
  - Cache token tracking for prompt caching optimization
  - Disabled Claude Code built-in tools to use our custom tools
  - Usage tracking includes cache read/write tokens

#### Advanced Input System
- **Complete readline keyboard shortcuts implementation**
  - Full Emacs-style keybindings (Ctrl+A/E/K/U/W/D/H/B/F, etc.)
  - Up/Down arrow navigation for multi-line input
  - Height limit with scrollable window for long input
  - Mac-specific delete key handling
  - Ctrl+H separate from Delete/Backspace

#### Session Management & Rewind
- **Session tracking with message deduplication**
  - Detects rewind/edit operations
  - Todo state snapshots stored in each message
  - Enables session rewind capability
  - System status (CPU, memory) captured per message
  - Todo context injected at each step for LLM awareness

#### Comprehensive Streaming
- **Real streaming for all content types**
  - Text streaming with live cursor
  - Thinking/reasoning streaming with duration tracking
  - Tool execution streaming with status updates
  - Live duration display for long-running operations
  - Batched updates for performance (50ms debounce)

### 🚀 Features

#### ESC Key to Abort Streaming
- **Add ESC key support to cancel AI responses during streaming**
  - Press ESC once during AI generation to abort the stream
  - Shows "Press ESC to cancel" hint when streaming
  - Displays cancellation message: "[CANCELLED] Response cancelled by user"
  - Gracefully handles AbortError without crashing the application

#### Notification System
- **Add notification system for AI response completion**
  - Terminal notifications with formatted message boxes
  - OS-level notifications (macOS, Linux, Windows)
  - Sound feedback support
  - Configurable notification settings via `/notifications` command
  - Shows response preview (first 100 characters)

#### Natural Message Flow UX
- **Improve chat interface with seamless message positioning**
  - Removed "Ready to chat..." placeholder for cleaner initial state
  - Input area stays near top when chat is empty
  - Input moves to bottom naturally as messages appear
  - No visual jumps when sending messages
  - Changed "INPUT" label to "YOU" for consistency

#### Todo List Improvements
- **Enhanced task tracking visibility and positioning**
  - Todo list always visible, even during AI streaming
  - Positioned above input area (before "▌ YOU" label)
  - Removed border box for cleaner, unified design
  - Header style matches chat sections: "▌ TASKS · progress"
  - Content alignment consistent with messages (marginLeft=2)

### Bug Fixes

#### Critical Crashes Fixed
- **Fix application crash when AI uses tools** (TodoWrite, etc.)
  - Root cause: Using array index as React key caused component tracking issues
  - Solution: Stable keys based on part identity (`tool-${toolId}`, `reasoning-${startTime}`)
  - Prevents React errors when tool status changes (running → completed)

- **Fix Proxy revoked error in todo updates**
  - Root cause: Accessing immer draft proxy in async operation after `set()` completed
  - Solution: Copy draft data before async database operations
  - Prevents "TypeError: Proxy has already been revoked" crashes

- **Fix React hooks violation in TodoList**
  - Root cause: Early return before `useMemo` hook caused inconsistent hook counts
  - Solution: Move all hooks before conditional returns
  - Prevents "Rendered more hooks than during the previous render" errors

#### UI/UX Fixes
- **Fix process exit when pressing ESC during streaming**
  - Root cause: Global unhandledRejection handler called `process.exit(1)` on AbortError
  - Solution: Ignore AbortError in global handler, let app handle gracefully
  - Users can now safely cancel AI responses without crashing

- **Fix duplicate "Error:" prefix in error messages**
  - Root cause: Error prefix added in both useChat.ts and MessagePart.tsx
  - Solution: Remove prefix from MessagePart since error is pre-formatted
  - Before: "❌ Error: ❌ Error: ..."  →  After: "[ERROR] ..."

- **Fix markdown horizontal rules wrapping to next line**
  - Root cause: HR rendered at full terminal width (80 chars) in narrow container (54 chars)
  - Solution: Fixed-width HR (48 chars) using '─' character
  - Prevents awkward line breaks in chat display

- **Fix spacing inconsistencies between sections**
  - Unified all section spacing to use `paddingTop={1}` only
  - Removed `paddingBottom` to prevent double spacing
  - Input and message areas now have consistent visual rhythm

- **Fix undefined sessions reference in Chat component**
  - Removed unused sessions selector causing unnecessary re-renders
  - Only select current session instead of entire sessions array

- **Fix sessions command undefined variable**
  - Fixed reference to undefined `sessions` variable in sessions command

#### Database Fixes
- **Fix database initialization in headless mode**
  - Initialize database before any session operations
  - Prevents "database not ready" errors in CLI usage

- **Fix session ID consistency between UI and database**
  - Use same session ID for both UI state and database
  - Prevents mismatches that caused session data loss

#### CLI Fixes
- **Fix hook command hanging and not exiting**
  - Root cause: Commander.js doesn't auto-exit after async actions
  - Solution: Added explicit `process.exit(0)` after output
  - Standard pattern used by npm, yarn, webpack

### Performance

#### Input Handling Optimization
- **Drastically reduce re-renders in input components (50-70% reduction)**
  - Added React.memo to ControlledTextInput with custom comparator
  - Added React.memo to TextInputWithHint
  - Used useCallback for all input handlers
  - Used useMemo for expensive filtering operations (files, commands)
  - Fixed Mac delete key responsiveness by separating Ctrl+H from Delete/Backspace handling
  - Prevents input box hanging and terminal crashes

### Refactoring

#### Visual Design
- **Replace emoji with ASCII text markers**
  - Removed emoji: ⚡ ❌ ⚠️ 🔔 👋
  - Replaced with: [ERROR], [CANCELLED], [!]
  - Preserved Unicode symbols: ✓ ✗ ▶ ○ (for todos)
  - Preserved box drawing: ─ │ ▌
  - Cleaner, more professional terminal appearance

### Technical Improvements

#### Architecture
- Optimistic updates pattern for UI state management
- Session persistence with SQLite database
- Graceful error handling throughout streaming pipeline
- Proper AbortController integration for stream cancellation

#### Code Quality
- Fixed React hooks violations following Rules of Hooks
- Eliminated race conditions in async state updates
- Improved component memoization for better performance
- Consistent spacing and alignment system

---

## [0.2.2] - Previous Release

See git history for previous changes.
