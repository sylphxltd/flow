# API Reference

**Version:** 1.0.0
**Generated:** 2025-11-05T08:12:06.790Z

## Session

### `session.getRecent`

**Type:** query

**Authentication:** public

**Description:** Get recent sessions with pagination (metadata only)

---

### `session.getById`

**Type:** query

**Authentication:** public

**Description:** Get session by ID with full data

---

### `session.getCount`

**Type:** query

**Authentication:** public

**Description:** Get total session count

---

### `session.getLast`

**Type:** query

**Authentication:** public

**Description:** Get last session (for headless mode)

---

### `session.search`

**Type:** query

**Authentication:** public

**Description:** Search sessions by title with pagination

---

### `session.create`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** strict

**Description:** Create new session

---

### `session.updateTitle`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update session title

---

### `session.updateModel`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update session model

---

### `session.updateProvider`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update session provider and model

---

### `session.delete`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** strict

**Description:** Delete session (cascade deletes messages, todos, attachments)

---

### `session.onChange`

**Type:** subscription

**Authentication:** public

**Description:** Subscribe to session changes (real-time)

---

## Message

### `message.getBySession`

**Type:** query

**Authentication:** public

**Description:** Get messages for session with pagination

---

### `message.getCount`

**Type:** query

**Authentication:** public

**Description:** Get message count for session

---

### `message.getRecentUserMessages`

**Type:** query

**Authentication:** public

**Description:** Get recent user messages for command history

---

### `message.add`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Add message to session

---

### `message.updateParts`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update message parts (during streaming)

---

### `message.updateStatus`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update message status

---

### `message.updateUsage`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update message token usage

---

### `message.streamResponse`

**Type:** subscription

**Authentication:** protected

**Rate Limit:** streaming

**Description:** Stream AI response (unified interface for TUI and Web)

---

### `message.onChange`

**Type:** subscription

**Authentication:** public

**Description:** Subscribe to message changes (real-time)

---

## Todo

### `todo.update`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update todos for session (atomic replacement)

---

### `todo.onChange`

**Type:** subscription

**Authentication:** public

**Description:** Subscribe to todo changes (real-time)

---

## Config

### `config.load`

**Type:** query

**Authentication:** public

**Description:** Load AI config from file system (sanitized)

---

### `config.getPaths`

**Type:** query

**Authentication:** public

**Description:** Get config file paths

---

### `config.updateDefaultProvider`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update default provider

---

### `config.updateDefaultModel`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update default model

---

### `config.updateProviderConfig`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Update provider configuration

---

### `config.removeProvider`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Remove provider configuration

---

### `config.save`

**Type:** mutation

**Authentication:** protected

**Rate Limit:** moderate

**Description:** Save AI config to file system

---

### `config.onChange`

**Type:** subscription

**Authentication:** public

**Description:** Subscribe to config changes (real-time)

---

## Admin

### `admin.getHealth`

**Type:** query

**Authentication:** public

**Description:** Get server health (for monitoring)

---

### `admin.getSystemStats`

**Type:** query

**Authentication:** admin

**Rate Limit:** moderate

**Description:** Get system statistics (admin-only)

---

### `admin.deleteAllSessions`

**Type:** mutation

**Authentication:** admin

**Rate Limit:** strict

**Description:** Delete all sessions (dangerous, admin-only)

---

### `admin.forceGC`

**Type:** mutation

**Authentication:** admin

**Rate Limit:** moderate

**Description:** Force garbage collection (admin-only)

---


