/**
 * Session Migration Utils
 * Pure functions for migrating session data across schema versions
 * Handles backward compatibility for older session formats
 */

import type { Session, SessionMessage, MessagePart } from '../../../types/session.types.js';
import type { ProviderId } from '../../../config/ai-config.js';

/**
 * Migrate raw session data to current schema
 * Handles all backward compatibility transformations
 */
export function migrateSessionData(rawSession: any): Session | null {
  if (!rawSession || typeof rawSession !== 'object') {
    return null;
  }

  // Validate required fields
  if (!rawSession.id || !rawSession.provider || !rawSession.model) {
    return null;
  }

  // Start with base session structure
  const session: Session = {
    id: rawSession.id,
    provider: rawSession.provider as ProviderId,
    model: rawSession.model,
    messages: [],
    todos: [],
    nextTodoId: 1,
    created: rawSession.created ?? Date.now(),
    updated: rawSession.updated ?? Date.now(),
  };

  // Migrate title if present
  if (rawSession.title) {
    session.title = rawSession.title;
  }

  // Migrate todos (add if missing)
  const { todos, nextTodoId } = migrateTodos(rawSession);
  session.todos = todos;
  session.nextTodoId = nextTodoId;

  // Migrate messages (normalize content format)
  if (Array.isArray(rawSession.messages)) {
    session.messages = rawSession.messages
      .map((msg: any) => migrateMessage(msg))
      .filter((msg): msg is SessionMessage => msg !== null);
  }

  return session;
}

/**
 * Migrate todos field (add if missing)
 * Old sessions may not have todos/nextTodoId
 */
export function migrateTodos(rawSession: any): {
  todos: any[];
  nextTodoId: number;
} {
  return {
    todos: Array.isArray(rawSession.todos) ? rawSession.todos : [],
    nextTodoId: typeof rawSession.nextTodoId === 'number' ? rawSession.nextTodoId : 1,
  };
}

/**
 * Migrate message content format
 * Old: { content: string }
 * New: { content: MessagePart[] }
 */
export function migrateMessage(message: any): SessionMessage | null {
  if (!message || typeof message !== 'object') {
    return null;
  }

  if (!message.role || !message.content) {
    return null;
  }

  // Migrate content from string to MessagePart[]
  const content = migrateMessageContent(message.content);

  const migratedMessage: SessionMessage = {
    role: message.role,
    content,
    timestamp: message.timestamp ?? Date.now(),
  };

  // Optional fields
  if (message.metadata) {
    migratedMessage.metadata = message.metadata;
  }

  if (message.attachments) {
    migratedMessage.attachments = message.attachments;
  }

  if (message.usage) {
    migratedMessage.usage = message.usage;
  }

  if (message.finishReason) {
    migratedMessage.finishReason = message.finishReason;
  }

  if (message.todoSnapshot) {
    migratedMessage.todoSnapshot = message.todoSnapshot;
  }

  return migratedMessage;
}

/**
 * Migrate message content from string to MessagePart[]
 */
export function migrateMessageContent(content: any): MessagePart[] {
  // Already in new format (array)
  if (Array.isArray(content)) {
    return content as MessagePart[];
  }

  // Old format (string) - convert to text part
  if (typeof content === 'string') {
    return [{ type: 'text', content }];
  }

  // Invalid format - return empty text part
  return [{ type: 'text', content: '' }];
}

/**
 * Check if session needs migration
 * Returns true if session is in old format
 */
export function needsMigration(rawSession: any): boolean {
  if (!rawSession || typeof rawSession !== 'object') {
    return false;
  }

  // Check for missing todos/nextTodoId (old format)
  if (!rawSession.todos || typeof rawSession.nextTodoId !== 'number') {
    return true;
  }

  // Check for old message content format (string instead of array)
  if (Array.isArray(rawSession.messages)) {
    for (const msg of rawSession.messages) {
      if (msg.content && typeof msg.content === 'string') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get migration version from session data
 * Returns version number or 0 if unknown
 */
export function getSessionVersion(rawSession: any): number {
  if (!rawSession || typeof rawSession !== 'object') {
    return 0;
  }

  // v1: Has todos and MessagePart[] content
  if (
    Array.isArray(rawSession.todos) &&
    typeof rawSession.nextTodoId === 'number' &&
    Array.isArray(rawSession.messages) &&
    rawSession.messages.every((m: any) => Array.isArray(m.content))
  ) {
    return 1;
  }

  // v0: Old format (no todos or string content)
  return 0;
}

/**
 * Validate migrated session data
 * Returns true if session is valid
 */
export function validateSession(session: any): boolean {
  if (!session || typeof session !== 'object') {
    return false;
  }

  // Required fields
  if (!session.id || typeof session.id !== 'string') {
    return false;
  }

  if (!session.provider || typeof session.provider !== 'string') {
    return false;
  }

  if (!session.model || typeof session.model !== 'string') {
    return false;
  }

  if (!Array.isArray(session.messages)) {
    return false;
  }

  if (!Array.isArray(session.todos)) {
    return false;
  }

  if (typeof session.nextTodoId !== 'number') {
    return false;
  }

  if (typeof session.created !== 'number') {
    return false;
  }

  if (typeof session.updated !== 'number') {
    return false;
  }

  // Validate messages structure
  for (const msg of session.messages) {
    if (!msg.role || !Array.isArray(msg.content) || typeof msg.timestamp !== 'number') {
      return false;
    }
  }

  return true;
}
