/**
 * Tests for session serializer utils
 */

import { describe, it, expect } from 'vitest';
import {
  serializeSession,
  deserializeSession,
  safeParseJSON,
  serializeSessionSafe,
  deserializeSessionSafe,
  getSerializedSize,
  serializeSessionWithLimit,
  prettyPrintSession,
  compactSession,
  isValidJSON,
  isValidSessionJSON,
  extractSessionId,
  extractSessionMetadata,
} from './serializer.js';
import { createNewSession } from './lifecycle.js';

describe('serializeSession', () => {
  it('should serialize session to compact JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet', 'test-id', 1000);
    const json = serializeSession(session, true);

    expect(json).toBeTypeOf('string');
    expect(json).not.toContain('\n'); // Compact format
    expect(json).toContain('test-id');
    expect(json).toContain('anthropic');
  });

  it('should serialize session to pretty JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const json = serializeSession(session, false);

    expect(json).toContain('\n'); // Pretty format with newlines
    expect(json).toContain('  '); // Indentation
  });

  it('should update timestamp when serializing', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet', 'test-id', 1000);
    const json = serializeSession(session);
    const parsed = JSON.parse(json);

    expect(parsed.updated).toBeGreaterThan(session.updated);
  });
});

describe('deserializeSession', () => {
  it('should deserialize valid session JSON', () => {
    const original = createNewSession('anthropic', 'claude-3.5-sonnet', 'test-id', 1000);
    const json = serializeSession(original);
    const deserialized = deserializeSession(json);

    expect(deserialized).not.toBeNull();
    expect(deserialized?.id).toBe(original.id);
    expect(deserialized?.provider).toBe(original.provider);
    expect(deserialized?.model).toBe(original.model);
  });

  it('should return null for invalid JSON', () => {
    expect(deserializeSession('invalid json')).toBeNull();
    expect(deserializeSession('{incomplete')).toBeNull();
    expect(deserializeSession('')).toBeNull();
  });

  it('should return null for invalid session data', () => {
    expect(deserializeSession('{}')).toBeNull();
    expect(deserializeSession('{"id": "test"}')).toBeNull();
    expect(deserializeSession('{"id": "test", "provider": "anthropic"}')).toBeNull();
  });

  it('should migrate old session format', () => {
    const oldFormat = JSON.stringify({
      id: 'test',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'Hello', timestamp: 1000 }],
      created: 1000,
      updated: 2000,
    });

    const session = deserializeSession(oldFormat);
    expect(session).not.toBeNull();
    expect(session?.messages[0].content).toEqual([{ type: 'text', content: 'Hello' }]);
    expect(session?.todos).toEqual([]);
    expect(session?.nextTodoId).toBe(1);
  });
});

describe('safeParseJSON', () => {
  it('should parse valid JSON', () => {
    expect(safeParseJSON('{"key": "value"}')).toEqual({ key: 'value' });
    expect(safeParseJSON('[]')).toEqual([]);
    expect(safeParseJSON('123')).toBe(123);
  });

  it('should return null for invalid JSON', () => {
    expect(safeParseJSON('invalid')).toBeNull();
    expect(safeParseJSON('{incomplete')).toBeNull();
    expect(safeParseJSON('')).toBeNull();
  });
});

describe('serializeSessionSafe', () => {
  it('should return success result for valid session', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const result = serializeSessionSafe(session);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeTypeOf('string');
    }
  });
});

describe('deserializeSessionSafe', () => {
  it('should return success result for valid JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const json = serializeSession(session);
    const result = deserializeSessionSafe(json);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(session.id);
    }
  });

  it('should return parse error for invalid JSON', () => {
    const result = deserializeSessionSafe('invalid json');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe('parse');
      expect(result.error).toBeTruthy();
    }
  });

  it('should return migration error for invalid structure', () => {
    const result = deserializeSessionSafe('{}');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe('migration');
    }
  });

  it('should return migration error for missing required fields', () => {
    const invalidSession = JSON.stringify({
      id: 'test',
      // Missing provider and model
      messages: [],
      todos: [],
      nextTodoId: 1,
      created: 1000,
      updated: 2000,
    });

    const result = deserializeSessionSafe(invalidSession);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe('migration');
    }
  });
});

describe('getSerializedSize', () => {
  it('should return size in bytes', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const size = getSerializedSize(session);

    expect(size).toBeGreaterThan(0);
    expect(size).toBeTypeOf('number');
  });

  it('should return larger size for pretty format', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const compactSize = getSerializedSize(session, true);
    const prettySize = getSerializedSize(session, false);

    expect(prettySize).toBeGreaterThan(compactSize);
  });
});

describe('serializeSessionWithLimit', () => {
  it('should succeed if size is within limit', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const result = serializeSessionWithLimit(session, 10000);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.size).toBeLessThan(10000);
      expect(result.data).toBeTypeOf('string');
    }
  });

  it('should fail if size exceeds limit', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const result = serializeSessionWithLimit(session, 10); // Very small limit

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.actualSize).toBeGreaterThan(result.maxSize);
      expect(result.error).toContain('exceeds');
    }
  });
});

describe('prettyPrintSession', () => {
  it('should return pretty formatted JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const pretty = prettyPrintSession(session);

    expect(pretty).toContain('\n');
    expect(pretty).toContain('  '); // Indentation
  });
});

describe('compactSession', () => {
  it('should return compact JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const compact = compactSession(session);

    expect(compact).not.toContain('\n');
  });
});

describe('isValidJSON', () => {
  it('should return true for valid JSON', () => {
    expect(isValidJSON('{}')).toBe(true);
    expect(isValidJSON('[]')).toBe(true);
    expect(isValidJSON('123')).toBe(true);
    expect(isValidJSON('"string"')).toBe(true);
  });

  it('should return false for invalid JSON', () => {
    expect(isValidJSON('invalid')).toBe(false);
    expect(isValidJSON('{incomplete')).toBe(false);
    expect(isValidJSON('')).toBe(false);
  });
});

describe('isValidSessionJSON', () => {
  it('should return true for valid session JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet');
    const json = serializeSession(session);

    expect(isValidSessionJSON(json)).toBe(true);
  });

  it('should return false for invalid session JSON', () => {
    expect(isValidSessionJSON('{}')).toBe(false);
    expect(isValidSessionJSON('invalid')).toBe(false);
    expect(isValidSessionJSON('{"id": "test"}')).toBe(false);
  });
});

describe('extractSessionId', () => {
  it('should extract session ID from JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet', 'test-id');
    const json = serializeSession(session);
    const id = extractSessionId(json);

    expect(id).toBe('test-id');
  });

  it('should return null for invalid JSON', () => {
    expect(extractSessionId('invalid')).toBeNull();
  });

  it('should return null if ID is missing', () => {
    expect(extractSessionId('{}')).toBeNull();
  });

  it('should return null if ID is not a string', () => {
    expect(extractSessionId('{"id": 123}')).toBeNull();
  });
});

describe('extractSessionMetadata', () => {
  it('should extract session metadata from JSON', () => {
    const session = createNewSession('anthropic', 'claude-3.5-sonnet', 'test-id', 1000);
    const json = serializeSession(session);
    const metadata = extractSessionMetadata(json);

    expect(metadata).not.toBeNull();
    expect(metadata?.id).toBe('test-id');
    expect(metadata?.provider).toBe('anthropic');
    expect(metadata?.model).toBe('claude-3.5-sonnet');
    expect(metadata?.created).toBe(1000);
  });

  it('should return null for invalid JSON', () => {
    expect(extractSessionMetadata('invalid')).toBeNull();
  });

  it('should return null if required fields are missing', () => {
    expect(extractSessionMetadata('{}')).toBeNull();
    expect(extractSessionMetadata('{"id": "test"}')).toBeNull();
  });

  it('should handle missing optional fields', () => {
    const json = JSON.stringify({
      id: 'test',
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
    });

    const metadata = extractSessionMetadata(json);
    expect(metadata?.created).toBe(0);
    expect(metadata?.updated).toBe(0);
    expect(metadata?.title).toBeUndefined();
  });
});

describe('round-trip serialization', () => {
  it('should preserve session data through serialize/deserialize', () => {
    const original = createNewSession('anthropic', 'claude-3.5-sonnet', 'test-id', 1000);
    const json = serializeSession(original);
    const restored = deserializeSession(json);

    expect(restored).not.toBeNull();
    expect(restored?.id).toBe(original.id);
    expect(restored?.provider).toBe(original.provider);
    expect(restored?.model).toBe(original.model);
    expect(restored?.messages).toEqual(original.messages);
    expect(restored?.todos).toEqual(original.todos);
    expect(restored?.nextTodoId).toBe(original.nextTodoId);
  });
});
