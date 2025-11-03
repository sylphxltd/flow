# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
