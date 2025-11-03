/**
 * Tests for session migration utils
 */

import { describe, it, expect } from 'vitest';
import {
  migrateSessionData,
  migrateTodos,
  migrateMessage,
  migrateMessageContent,
  needsMigration,
  getSessionVersion,
  validateSession,
} from './migration.js';

describe('migrateSessionData', () => {
  it('should return null for invalid input', () => {
    expect(migrateSessionData(null)).toBeNull();
    expect(migrateSessionData(undefined)).toBeNull();
    expect(migrateSessionData('string')).toBeNull();
    expect(migrateSessionData(123)).toBeNull();
  });

  it('should return null for missing required fields', () => {
    expect(migrateSessionData({})).toBeNull();
    expect(migrateSessionData({ id: 'test' })).toBeNull();
    expect(migrateSessionData({ id: 'test', provider: 'anthropic' })).toBeNull();
  });

  it('should migrate session with minimal fields', () => {
    const raw = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
    };

    const result = migrateSessionData(raw);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('session-1');
    expect(result?.provider).toBe('anthropic');
    expect(result?.model).toBe('claude-3.5-sonnet');
    expect(result?.messages).toEqual([]);
    expect(result?.todos).toEqual([]);
    expect(result?.nextTodoId).toBe(1);
  });

  it('should add missing todos field', () => {
    const raw = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [],
    };

    const result = migrateSessionData(raw);
    expect(result?.todos).toEqual([]);
    expect(result?.nextTodoId).toBe(1);
  });

  it('should preserve existing todos', () => {
    const raw = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      todos: [{ id: 1, content: 'Task', activeForm: 'Doing', status: 'pending', ordering: 0 }],
      nextTodoId: 2,
    };

    const result = migrateSessionData(raw);
    expect(result?.todos).toHaveLength(1);
    expect(result?.nextTodoId).toBe(2);
  });

  it('should migrate message content from string to array', () => {
    const raw = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [
        { role: 'user', content: 'Hello', timestamp: 1000 },
        { role: 'assistant', content: 'Hi', timestamp: 2000 },
      ],
    };

    const result = migrateSessionData(raw);
    expect(result?.messages).toHaveLength(2);
    expect(result?.messages[0].content).toEqual([{ type: 'text', content: 'Hello' }]);
    expect(result?.messages[1].content).toEqual([{ type: 'text', content: 'Hi' }]);
  });

  it('should preserve modern message format', () => {
    const raw = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [
        { role: 'user', content: [{ type: 'text', content: 'Hello' }], timestamp: 1000 },
      ],
    };

    const result = migrateSessionData(raw);
    expect(result?.messages[0].content).toEqual([{ type: 'text', content: 'Hello' }]);
  });

  it('should filter out invalid messages', () => {
    const raw = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [
        { role: 'user', content: 'Valid', timestamp: 1000 },
        null,
        { role: 'assistant' }, // missing content
        { content: 'Missing role' },
      ],
    };

    const result = migrateSessionData(raw);
    expect(result?.messages).toHaveLength(1);
    expect(result?.messages[0].content).toEqual([{ type: 'text', content: 'Valid' }]);
  });
});

describe('migrateTodos', () => {
  it('should add todos if missing', () => {
    const result = migrateTodos({});
    expect(result).toEqual({ todos: [], nextTodoId: 1 });
  });

  it('should preserve existing todos', () => {
    const todos = [{ id: 1, content: 'Task', activeForm: 'Doing', status: 'pending', ordering: 0 }];
    const result = migrateTodos({ todos, nextTodoId: 2 });
    expect(result).toEqual({ todos, nextTodoId: 2 });
  });

  it('should default nextTodoId to 1 if missing', () => {
    const todos = [{ id: 1, content: 'Task', activeForm: 'Doing', status: 'pending', ordering: 0 }];
    const result = migrateTodos({ todos });
    expect(result.nextTodoId).toBe(1);
  });

  it('should handle invalid todos', () => {
    const result = migrateTodos({ todos: 'invalid' });
    expect(result.todos).toEqual([]);
  });
});

describe('migrateMessage', () => {
  it('should return null for invalid input', () => {
    expect(migrateMessage(null)).toBeNull();
    expect(migrateMessage(undefined)).toBeNull();
    expect(migrateMessage('string')).toBeNull();
    expect(migrateMessage({})).toBeNull();
  });

  it('should return null for missing required fields', () => {
    expect(migrateMessage({ role: 'user' })).toBeNull();
    expect(migrateMessage({ content: 'Hello' })).toBeNull();
  });

  it('should migrate message with string content', () => {
    const msg = { role: 'user', content: 'Hello', timestamp: 1000 };
    const result = migrateMessage(msg);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.content).toEqual([{ type: 'text', content: 'Hello' }]);
    expect(result?.timestamp).toBe(1000);
  });

  it('should preserve array content', () => {
    const msg = {
      role: 'assistant',
      content: [{ type: 'text', content: 'Hi' }],
      timestamp: 2000,
    };
    const result = migrateMessage(msg);

    expect(result?.content).toEqual([{ type: 'text', content: 'Hi' }]);
  });

  it('should add default timestamp if missing', () => {
    const msg = { role: 'user', content: 'Hello' };
    const result = migrateMessage(msg);

    expect(result?.timestamp).toBeGreaterThan(0);
  });

  it('should preserve optional fields', () => {
    const msg = {
      role: 'assistant',
      content: 'Hi',
      timestamp: 1000,
      metadata: { cpu: '50%' },
      attachments: [{ path: '/a', relativePath: 'a' }],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      todoSnapshot: [{ id: 1, content: 'Task', activeForm: 'Doing', status: 'pending', ordering: 0 }],
    };

    const result = migrateMessage(msg);
    expect(result?.metadata).toEqual({ cpu: '50%' });
    expect(result?.attachments).toHaveLength(1);
    expect(result?.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    expect(result?.finishReason).toBe('stop');
    expect(result?.todoSnapshot).toHaveLength(1);
  });
});

describe('migrateMessageContent', () => {
  it('should convert string to text part', () => {
    const result = migrateMessageContent('Hello world');
    expect(result).toEqual([{ type: 'text', content: 'Hello world' }]);
  });

  it('should preserve array format', () => {
    const content = [{ type: 'text', content: 'Hello' }];
    const result = migrateMessageContent(content);
    expect(result).toEqual(content);
  });

  it('should handle empty string', () => {
    const result = migrateMessageContent('');
    expect(result).toEqual([{ type: 'text', content: '' }]);
  });

  it('should handle invalid types', () => {
    expect(migrateMessageContent(null)).toEqual([{ type: 'text', content: '' }]);
    expect(migrateMessageContent(undefined)).toEqual([{ type: 'text', content: '' }]);
    expect(migrateMessageContent(123)).toEqual([{ type: 'text', content: '' }]);
  });
});

describe('needsMigration', () => {
  it('should return false for invalid input', () => {
    expect(needsMigration(null)).toBe(false);
    expect(needsMigration(undefined)).toBe(false);
    expect(needsMigration('string')).toBe(false);
  });

  it('should return true for missing todos', () => {
    const session = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [],
    };

    expect(needsMigration(session)).toBe(true);
  });

  it('should return true for missing nextTodoId', () => {
    const session = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [],
      todos: [],
    };

    expect(needsMigration(session)).toBe(true);
  });

  it('should return true for string message content', () => {
    const session = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'Hello', timestamp: 1000 }],
      todos: [],
      nextTodoId: 1,
    };

    expect(needsMigration(session)).toBe(true);
  });

  it('should return false for modern format', () => {
    const session = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [{ role: 'user', content: [{ type: 'text', content: 'Hello' }], timestamp: 1000 }],
      todos: [],
      nextTodoId: 1,
    };

    expect(needsMigration(session)).toBe(false);
  });
});

describe('getSessionVersion', () => {
  it('should return 0 for invalid input', () => {
    expect(getSessionVersion(null)).toBe(0);
    expect(getSessionVersion(undefined)).toBe(0);
    expect(getSessionVersion('string')).toBe(0);
  });

  it('should return 0 for old format', () => {
    const session = {
      id: 'session-1',
      messages: [{ role: 'user', content: 'Hello', timestamp: 1000 }],
    };

    expect(getSessionVersion(session)).toBe(0);
  });

  it('should return 1 for modern format', () => {
    const session = {
      id: 'session-1',
      messages: [{ role: 'user', content: [{ type: 'text', content: 'Hello' }], timestamp: 1000 }],
      todos: [],
      nextTodoId: 1,
    };

    expect(getSessionVersion(session)).toBe(1);
  });

  it('should return 0 for partial modern format', () => {
    const session = {
      id: 'session-1',
      messages: [
        { role: 'user', content: [{ type: 'text', content: 'Hello' }], timestamp: 1000 },
        { role: 'assistant', content: 'Hi', timestamp: 2000 }, // Mixed format
      ],
      todos: [],
      nextTodoId: 1,
    };

    expect(getSessionVersion(session)).toBe(0);
  });
});

describe('validateSession', () => {
  it('should return false for invalid input', () => {
    expect(validateSession(null)).toBe(false);
    expect(validateSession(undefined)).toBe(false);
    expect(validateSession('string')).toBe(false);
    expect(validateSession(123)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    expect(validateSession({})).toBe(false);
    expect(validateSession({ id: 'test' })).toBe(false);
    expect(validateSession({ id: 'test', provider: 'anthropic' })).toBe(false);
  });

  it('should return true for valid session', () => {
    const session = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [
        { role: 'user', content: [{ type: 'text', content: 'Hello' }], timestamp: 1000 },
      ],
      todos: [],
      nextTodoId: 1,
      created: 1000,
      updated: 2000,
    };

    expect(validateSession(session)).toBe(true);
  });

  it('should return false for invalid messages', () => {
    const session = {
      id: 'session-1',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [{ role: 'user' }], // Missing content
      todos: [],
      nextTodoId: 1,
      created: 1000,
      updated: 2000,
    };

    expect(validateSession(session)).toBe(false);
  });

  it('should return false for invalid field types', () => {
    const session = {
      id: 123, // Should be string
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [],
      todos: [],
      nextTodoId: 1,
      created: 1000,
      updated: 2000,
    };

    expect(validateSession(session)).toBe(false);
  });
});
