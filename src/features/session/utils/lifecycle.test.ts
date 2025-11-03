/**
 * Tests for session lifecycle utils
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createNewSession,
  addMessageToSession,
  clearMessages,
  updateSessionTimestamp,
  updateSessionTitle,
  updateSessionModel,
  updateSessionProvider,
  updateSessionTodos,
  getSessionAge,
  getTimeSinceUpdate,
  hasMessages,
  hasTitle,
  getMessageCount,
  getTodoCount,
  cloneSession,
} from './lifecycle.js';
import type { Session, SessionMessage } from '../../../types/session.types.js';
import type { Todo } from '../../../types/todo.types.js';

describe('createNewSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create new session with default values', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');

    expect(session).toEqual({
      id: 'session-1735689600000',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [],
      todos: [],
      nextTodoId: 1,
      created: 1735689600000,
      updated: 1735689600000,
    });
  });

  it('should accept custom ID', () => {
    const session = createNewSession('openai', 'gpt-4o', 'custom-id');
    expect(session.id).toBe('custom-id');
  });

  it('should accept custom timestamp', () => {
    const customTime = 1234567890000;
    const session = createNewSession('google', 'gemini-2.0-flash', undefined, customTime);
    expect(session.created).toBe(customTime);
    expect(session.updated).toBe(customTime);
  });
});

describe('addMessageToSession', () => {
  let session: Session;
  let message: SessionMessage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    session = createNewSession('anthropic', 'claude-3.5-sonnet');

    message = {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }],
      timestamp: Date.now(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add message to empty session', () => {
    const updated = addMessageToSession(session, message);

    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]).toBe(message);
  });

  it('should append message to existing messages', () => {
    const session1 = addMessageToSession(session, message);
    const message2: SessionMessage = {
      role: 'assistant',
      content: [{ type: 'text', content: 'Hi' }],
      timestamp: Date.now(),
    };
    const session2 = addMessageToSession(session1, message2);

    expect(session2.messages).toHaveLength(2);
    expect(session2.messages[0]).toBe(message);
    expect(session2.messages[1]).toBe(message2);
  });

  it('should not mutate original session', () => {
    const updated = addMessageToSession(session, message);

    expect(session.messages).toHaveLength(0);
    expect(updated.messages).toHaveLength(1);
  });

  it('should update timestamp', () => {
    vi.setSystemTime(new Date('2025-01-01T00:01:00Z'));
    const updated = addMessageToSession(session, message);

    expect(updated.updated).toBe(1735689660000);
    expect(session.updated).toBe(1735689600000);
  });
});

describe('clearMessages', () => {
  let session: Session;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    session = createNewSession('anthropic', 'claude-3.5-sonnet');
    session = addMessageToSession(session, {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }],
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should clear all messages', () => {
    const cleared = clearMessages(session);
    expect(cleared.messages).toHaveLength(0);
  });

  it('should keep other session data', () => {
    const cleared = clearMessages(session);
    expect(cleared.id).toBe(session.id);
    expect(cleared.provider).toBe(session.provider);
    expect(cleared.model).toBe(session.model);
    expect(cleared.todos).toEqual(session.todos);
  });

  it('should not mutate original session', () => {
    const cleared = clearMessages(session);
    expect(session.messages).toHaveLength(1);
    expect(cleared.messages).toHaveLength(0);
  });

  it('should update timestamp', () => {
    vi.setSystemTime(new Date('2025-01-01T00:01:00Z'));
    const cleared = clearMessages(session);
    expect(cleared.updated).toBe(1735689660000);
  });
});

describe('updateSessionTimestamp', () => {
  let session: Session;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    session = createNewSession('anthropic', 'claude-3.5-sonnet');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should update timestamp to current time', () => {
    vi.setSystemTime(new Date('2025-01-01T00:01:00Z'));
    const updated = updateSessionTimestamp(session);
    expect(updated.updated).toBe(1735689660000);
  });

  it('should accept custom timestamp', () => {
    const customTime = 9999999999999;
    const updated = updateSessionTimestamp(session, customTime);
    expect(updated.updated).toBe(customTime);
  });

  it('should not mutate original session', () => {
    const updated = updateSessionTimestamp(session, 9999999999999);
    expect(session.updated).toBe(1735689600000);
    expect(updated.updated).toBe(9999999999999);
  });
});

describe('updateSessionTitle', () => {
  let session: Session;

  beforeEach(() => {
    session = createNewSession('anthropic', 'claude-3.5-sonnet');
  });

  it('should set session title', () => {
    const updated = updateSessionTitle(session, 'My Chat');
    expect(updated.title).toBe('My Chat');
  });

  it('should not mutate original session', () => {
    const updated = updateSessionTitle(session, 'My Chat');
    expect(session.title).toBeUndefined();
    expect(updated.title).toBe('My Chat');
  });

  it('should update existing title', () => {
    const session1 = updateSessionTitle(session, 'Old Title');
    const session2 = updateSessionTitle(session1, 'New Title');
    expect(session2.title).toBe('New Title');
  });
});

describe('updateSessionModel', () => {
  let session: Session;

  beforeEach(() => {
    session = createNewSession('anthropic', 'claude-3.5-sonnet');
  });

  it('should update model', () => {
    const updated = updateSessionModel(session, 'claude-3.5-haiku');
    expect(updated.model).toBe('claude-3.5-haiku');
  });

  it('should not mutate original session', () => {
    const updated = updateSessionModel(session, 'claude-3.5-haiku');
    expect(session.model).toBe('claude-3.5-sonnet');
    expect(updated.model).toBe('claude-3.5-haiku');
  });
});

describe('updateSessionProvider', () => {
  let session: Session;

  beforeEach(() => {
    session = createNewSession('anthropic', 'claude-3.5-sonnet');
  });

  it('should update both provider and model', () => {
    const updated = updateSessionProvider(session, 'openai', 'gpt-4o');
    expect(updated.provider).toBe('openai');
    expect(updated.model).toBe('gpt-4o');
  });

  it('should not mutate original session', () => {
    const updated = updateSessionProvider(session, 'openai', 'gpt-4o');
    expect(session.provider).toBe('anthropic');
    expect(session.model).toBe('claude-3.5-sonnet');
    expect(updated.provider).toBe('openai');
    expect(updated.model).toBe('gpt-4o');
  });
});

describe('updateSessionTodos', () => {
  let session: Session;
  let todos: Todo[];

  beforeEach(() => {
    session = createNewSession('anthropic', 'claude-3.5-sonnet');
    todos = [
      { id: 1, content: 'Task 1', activeForm: 'Doing task 1', status: 'pending', ordering: 0 },
      { id: 2, content: 'Task 2', activeForm: 'Doing task 2', status: 'in_progress', ordering: 1 },
    ];
  });

  it('should update todos', () => {
    const updated = updateSessionTodos(session, todos);
    expect(updated.todos).toEqual(todos);
    expect(updated.nextTodoId).toBe(1);
  });

  it('should update nextTodoId if provided', () => {
    const updated = updateSessionTodos(session, todos, 3);
    expect(updated.nextTodoId).toBe(3);
  });

  it('should not mutate original session', () => {
    const updated = updateSessionTodos(session, todos, 3);
    expect(session.todos).toHaveLength(0);
    expect(updated.todos).toHaveLength(2);
  });
});

describe('getSessionAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return age in milliseconds', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    vi.setSystemTime(new Date('2025-01-01T00:05:00Z'));

    const age = getSessionAge(session);
    expect(age).toBe(5 * 60 * 1000); // 5 minutes
  });

  it('should return 0 for brand new session', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const age = getSessionAge(session);
    expect(age).toBe(0);
  });
});

describe('getTimeSinceUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return time since last update', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    vi.setSystemTime(new Date('2025-01-01T00:10:00Z'));

    const timeSince = getTimeSinceUpdate(session);
    expect(timeSince).toBe(10 * 60 * 1000); // 10 minutes
  });

  it('should return 0 for brand new session', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const timeSince = getTimeSinceUpdate(session);
    expect(timeSince).toBe(0);
  });
});

describe('hasMessages', () => {
  it('should return false for empty session', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    expect(hasMessages(session)).toBe(false);
  });

  it('should return true for session with messages', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const updated = addMessageToSession(session, {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }],
      timestamp: Date.now(),
    });
    expect(hasMessages(updated)).toBe(true);
  });
});

describe('hasTitle', () => {
  it('should return false for session without title', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    expect(hasTitle(session)).toBe(false);
  });

  it('should return false for empty title', () => {
    const session = updateSessionTitle(
      createNewSession('anthropic', 'claude-3.5-sonnet'),
      ''
    );
    expect(hasTitle(session)).toBe(false);
  });

  it('should return false for whitespace title', () => {
    const session = updateSessionTitle(
      createNewSession('anthropic', 'claude-3.5-sonnet'),
      '   '
    );
    expect(hasTitle(session)).toBe(false);
  });

  it('should return true for session with title', () => {
    const session = updateSessionTitle(
      createNewSession('anthropic', 'claude-3.5-sonnet'),
      'My Chat'
    );
    expect(hasTitle(session)).toBe(true);
  });
});

describe('getMessageCount', () => {
  it('should return 0 for empty session', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    expect(getMessageCount(session)).toBe(0);
  });

  it('should return correct count', () => {
    let session = createNewSession('anthropic', 'claude-3.5-sonnet');
    session = addMessageToSession(session, {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }],
      timestamp: Date.now(),
    });
    session = addMessageToSession(session, {
      role: 'assistant',
      content: [{ type: 'text', content: 'Hi' }],
      timestamp: Date.now(),
    });
    expect(getMessageCount(session)).toBe(2);
  });
});

describe('getTodoCount', () => {
  it('should return 0 for session without todos', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    expect(getTodoCount(session)).toBe(0);
  });

  it('should return correct count', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const todos: Todo[] = [
      { id: 1, content: 'Task 1', activeForm: 'Doing task 1', status: 'pending', ordering: 0 },
      { id: 2, content: 'Task 2', activeForm: 'Doing task 2', status: 'completed', ordering: 1 },
    ];
    const updated = updateSessionTodos(session, todos);
    expect(getTodoCount(updated)).toBe(2);
  });
});

describe('cloneSession', () => {
  it('should create deep copy', () => {
    let session = createNewSession('anthropic', 'claude-3.5-sonnet');
    session = addMessageToSession(session, {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }],
      timestamp: Date.now(),
    });
    session = updateSessionTodos(session, [
      { id: 1, content: 'Task', activeForm: 'Doing task', status: 'pending', ordering: 0 },
    ]);

    const cloned = cloneSession(session);

    expect(cloned).toEqual(session);
    expect(cloned).not.toBe(session);
    expect(cloned.messages).not.toBe(session.messages);
    expect(cloned.todos).not.toBe(session.todos);
  });

  it('should allow independent mutations', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const cloned = cloneSession(session);

    const updatedClone = addMessageToSession(cloned, {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }],
      timestamp: Date.now(),
    });

    expect(session.messages).toHaveLength(0);
    expect(updatedClone.messages).toHaveLength(1);
  });
});
