/**
 * Session Lifecycle Utils
 * Pure functions for session creation and manipulation
 * All functions return new objects (immutable)
 */

import type { Session, SessionMessage } from '../../../types/session.types.js';
import type { ProviderId } from '../../../config/ai-config.js';
import type { Todo } from '../../../types/todo.types.js';

/**
 * Create a new session with default values
 * Pure function - returns new session object
 */
export function createNewSession(
  provider: ProviderId,
  model: string,
  id?: string,
  timestamp?: number
): Session {
  const now = timestamp ?? Date.now();
  const sessionId = id ?? `session-${now}`;

  return {
    id: sessionId,
    provider,
    model,
    messages: [],
    todos: [],
    nextTodoId: 1,
    created: now,
    updated: now,
  };
}

/**
 * Add message to session (immutable)
 * Returns new session with message appended
 */
export function addMessageToSession(
  session: Session,
  message: SessionMessage
): Session {
  return {
    ...session,
    messages: [...session.messages, message],
    updated: Date.now(),
  };
}

/**
 * Clear all messages from session (immutable)
 * Keeps session metadata intact
 */
export function clearMessages(session: Session): Session {
  return {
    ...session,
    messages: [],
    updated: Date.now(),
  };
}

/**
 * Update session timestamp (immutable)
 */
export function updateSessionTimestamp(session: Session, timestamp?: number): Session {
  return {
    ...session,
    updated: timestamp ?? Date.now(),
  };
}

/**
 * Update session title (immutable)
 */
export function updateSessionTitle(session: Session, title: string): Session {
  return {
    ...session,
    title,
    updated: Date.now(),
  };
}

/**
 * Update session model (immutable)
 */
export function updateSessionModel(session: Session, model: string): Session {
  return {
    ...session,
    model,
    updated: Date.now(),
  };
}

/**
 * Update session provider and model (immutable)
 */
export function updateSessionProvider(
  session: Session,
  provider: ProviderId,
  model: string
): Session {
  return {
    ...session,
    provider,
    model,
    updated: Date.now(),
  };
}

/**
 * Update session todos (immutable)
 */
export function updateSessionTodos(
  session: Session,
  todos: Todo[],
  nextTodoId?: number
): Session {
  return {
    ...session,
    todos,
    nextTodoId: nextTodoId ?? session.nextTodoId,
    updated: Date.now(),
  };
}

/**
 * Get session age in milliseconds
 */
export function getSessionAge(session: Session): number {
  return Date.now() - session.created;
}

/**
 * Get time since last update in milliseconds
 */
export function getTimeSinceUpdate(session: Session): number {
  return Date.now() - session.updated;
}

/**
 * Check if session has messages
 */
export function hasMessages(session: Session): boolean {
  return session.messages.length > 0;
}

/**
 * Check if session has title
 */
export function hasTitle(session: Session): boolean {
  return !!session.title && session.title.trim().length > 0;
}

/**
 * Get session message count
 */
export function getMessageCount(session: Session): number {
  return session.messages.length;
}

/**
 * Get session todo count
 */
export function getTodoCount(session: Session): number {
  return session.todos.length;
}

/**
 * Clone session (deep copy)
 * Useful for creating independent session copies
 */
export function cloneSession(session: Session): Session {
  return {
    ...session,
    messages: [...session.messages],
    todos: [...session.todos],
  };
}
