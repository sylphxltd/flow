/**
 * Tests for session messages utils
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createMessage,
  createTextMessage,
  addMessage,
  getMessageCount,
  getLastMessage,
  clearMessages,
  getMessagesAfter,
  getMessagesBefore,
  getMessagesByRole,
  getUserMessages,
  getAssistantMessages,
  getFirstMessage,
  getFirstUserMessage,
  getMessagesWithAttachments,
  getMessagesWithUsage,
  getTotalTokenUsage,
  isEmpty,
  getMessageAt,
  getMessagesRange,
  getLastNMessages,
  getFirstNMessages,
  countMessagesByRole,
  extractAllText,
  extractMessageText,
  hasTextContent,
  hasToolCalls,
  hasErrors,
  getToolCalls,
  getTextParts,
  getReasoningParts,
  getErrorParts,
} from './messages.js';
import type { SessionMessage, MessagePart } from '../../../types/session.types.js';

describe('createMessage', () => {
  const baseTime = new Date('2025-01-01T00:00:00Z').getTime();

  it('should create message with content', () => {
    const content: MessagePart[] = [{ type: 'text', content: 'Hello' }];
    const msg = createMessage('user', content, baseTime);

    expect(msg).toEqual({
      role: 'user',
      content,
      timestamp: baseTime,
    });
  });

  it('should accept custom timestamp', () => {
    const content: MessagePart[] = [{ type: 'text', content: 'Hello' }];
    const msg = createMessage('user', content, 9999999999999);

    expect(msg.timestamp).toBe(9999999999999);
  });
});

describe('createTextMessage', () => {
  it('should create message with text content', () => {
    const msg = createTextMessage('user', 'Hello world');

    expect(msg.content).toEqual([{ type: 'text', content: 'Hello world' }]);
    expect(msg.role).toBe('user');
  });
});

describe('addMessage', () => {
  it('should add message to empty array', () => {
    const msg = createTextMessage('user', 'Hello');
    const result = addMessage([], msg);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(msg);
  });

  it('should append message to existing array', () => {
    const msg1 = createTextMessage('user', 'Hello');
    const msg2 = createTextMessage('assistant', 'Hi');
    const result = addMessage([msg1], msg2);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msg1);
    expect(result[1]).toBe(msg2);
  });

  it('should not mutate original array', () => {
    const original = [createTextMessage('user', 'Hello')];
    const msg2 = createTextMessage('assistant', 'Hi');
    const result = addMessage(original, msg2);

    expect(original).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});

describe('getMessageCount', () => {
  it('should return 0 for empty array', () => {
    expect(getMessageCount([])).toBe(0);
  });

  it('should return correct count', () => {
    const msgs = [
      createTextMessage('user', 'Hello'),
      createTextMessage('assistant', 'Hi'),
      createTextMessage('user', 'How are you?'),
    ];
    expect(getMessageCount(msgs)).toBe(3);
  });
});

describe('getLastMessage', () => {
  it('should return undefined for empty array', () => {
    expect(getLastMessage([])).toBeUndefined();
  });

  it('should return last message', () => {
    const msgs = [
      createTextMessage('user', 'Hello'),
      createTextMessage('assistant', 'Hi'),
    ];
    expect(getLastMessage(msgs)).toBe(msgs[1]);
  });
});

describe('clearMessages', () => {
  it('should return empty array', () => {
    expect(clearMessages()).toEqual([]);
  });
});

describe('getMessagesAfter', () => {
  it('should return messages after timestamp', () => {
    const msgs = [
      createTextMessage('user', 'Hello', 1000),
      createTextMessage('assistant', 'Hi', 2000),
      createTextMessage('user', 'How are you?', 3000),
    ];

    const result = getMessagesAfter(msgs, 2000);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[1]);
    expect(result[1]).toBe(msgs[2]);
  });

  it('should return empty array if no messages after', () => {
    const msgs = [createTextMessage('user', 'Hello', 1000)];
    const result = getMessagesAfter(msgs, 5000);
    expect(result).toHaveLength(0);
  });
});

describe('getMessagesBefore', () => {
  it('should return messages before timestamp', () => {
    const msgs = [
      createTextMessage('user', 'Hello', 1000),
      createTextMessage('assistant', 'Hi', 2000),
      createTextMessage('user', 'How are you?', 3000),
    ];

    const result = getMessagesBefore(msgs, 3000);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[0]);
    expect(result[1]).toBe(msgs[1]);
  });
});

describe('getMessagesByRole', () => {
  let msgs: SessionMessage[];

  beforeEach(() => {
    msgs = [
      createTextMessage('user', 'Hello'),
      createTextMessage('assistant', 'Hi'),
      createTextMessage('user', 'How are you?'),
      createTextMessage('assistant', 'Good'),
    ];
  });

  it('should filter user messages', () => {
    const result = getMessagesByRole(msgs, 'user');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[0]);
    expect(result[1]).toBe(msgs[2]);
  });

  it('should filter assistant messages', () => {
    const result = getMessagesByRole(msgs, 'assistant');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[1]);
    expect(result[1]).toBe(msgs[3]);
  });
});

describe('getUserMessages', () => {
  it('should return only user messages', () => {
    const msgs = [
      createTextMessage('user', 'Hello'),
      createTextMessage('assistant', 'Hi'),
      createTextMessage('user', 'Bye'),
    ];

    const result = getUserMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.role === 'user')).toBe(true);
  });
});

describe('getAssistantMessages', () => {
  it('should return only assistant messages', () => {
    const msgs = [
      createTextMessage('user', 'Hello'),
      createTextMessage('assistant', 'Hi'),
      createTextMessage('assistant', 'Bye'),
    ];

    const result = getAssistantMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.role === 'assistant')).toBe(true);
  });
});

describe('getFirstMessage', () => {
  it('should return undefined for empty array', () => {
    expect(getFirstMessage([])).toBeUndefined();
  });

  it('should return first message', () => {
    const msgs = [
      createTextMessage('user', 'Hello'),
      createTextMessage('assistant', 'Hi'),
    ];
    expect(getFirstMessage(msgs)).toBe(msgs[0]);
  });
});

describe('getFirstUserMessage', () => {
  it('should return first user message', () => {
    const msgs = [
      createTextMessage('assistant', 'Welcome'),
      createTextMessage('user', 'Hello'),
      createTextMessage('user', 'Hi'),
    ];

    expect(getFirstUserMessage(msgs)).toBe(msgs[1]);
  });

  it('should return undefined if no user messages', () => {
    const msgs = [createTextMessage('assistant', 'Hello')];
    expect(getFirstUserMessage(msgs)).toBeUndefined();
  });
});

describe('getMessagesWithAttachments', () => {
  it('should return messages with attachments', () => {
    const msgs: SessionMessage[] = [
      { ...createTextMessage('user', 'Hello'), attachments: [{ path: '/a', relativePath: 'a', size: 100 }] },
      createTextMessage('assistant', 'Hi'),
      { ...createTextMessage('user', 'Check this'), attachments: [{ path: '/b', relativePath: 'b' }] },
    ];

    const result = getMessagesWithAttachments(msgs);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[0]);
    expect(result[1]).toBe(msgs[2]);
  });

  it('should exclude messages with empty attachments array', () => {
    const msgs: SessionMessage[] = [
      { ...createTextMessage('user', 'Hello'), attachments: [] },
      createTextMessage('assistant', 'Hi'),
    ];

    const result = getMessagesWithAttachments(msgs);
    expect(result).toHaveLength(0);
  });
});

describe('getMessagesWithUsage', () => {
  it('should return messages with usage', () => {
    const msgs: SessionMessage[] = [
      createTextMessage('user', 'Hello'),
      { ...createTextMessage('assistant', 'Hi'), usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } },
      createTextMessage('user', 'Thanks'),
    ];

    const result = getMessagesWithUsage(msgs);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(msgs[1]);
  });
});

describe('getTotalTokenUsage', () => {
  it('should return zero for no messages', () => {
    const result = getTotalTokenUsage([]);
    expect(result).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });

  it('should sum token usage across messages', () => {
    const msgs: SessionMessage[] = [
      { ...createTextMessage('assistant', 'Hi'), usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } },
      createTextMessage('user', 'Thanks'),
      { ...createTextMessage('assistant', 'Welcome'), usage: { promptTokens: 20, completionTokens: 8, totalTokens: 28 } },
    ];

    const result = getTotalTokenUsage(msgs);
    expect(result).toEqual({
      promptTokens: 30,
      completionTokens: 13,
      totalTokens: 43,
    });
  });
});

describe('isEmpty', () => {
  it('should return true for empty array', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('should return false for non-empty array', () => {
    expect(isEmpty([createTextMessage('user', 'Hello')])).toBe(false);
  });
});

describe('getMessageAt', () => {
  const msgs = [
    createTextMessage('user', 'Hello'),
    createTextMessage('assistant', 'Hi'),
    createTextMessage('user', 'Bye'),
  ];

  it('should return message at index', () => {
    expect(getMessageAt(msgs, 1)).toBe(msgs[1]);
  });

  it('should return undefined for negative index', () => {
    expect(getMessageAt(msgs, -1)).toBeUndefined();
  });

  it('should return undefined for out of bounds', () => {
    expect(getMessageAt(msgs, 10)).toBeUndefined();
  });
});

describe('getMessagesRange', () => {
  const msgs = [
    createTextMessage('user', 'A'),
    createTextMessage('assistant', 'B'),
    createTextMessage('user', 'C'),
    createTextMessage('assistant', 'D'),
  ];

  it('should return messages in range', () => {
    const result = getMessagesRange(msgs, 1, 3);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[1]);
    expect(result[1]).toBe(msgs[2]);
  });

  it('should handle full range', () => {
    const result = getMessagesRange(msgs, 0, msgs.length);
    expect(result).toHaveLength(msgs.length);
  });
});

describe('getLastNMessages', () => {
  const msgs = [
    createTextMessage('user', 'A'),
    createTextMessage('assistant', 'B'),
    createTextMessage('user', 'C'),
    createTextMessage('assistant', 'D'),
  ];

  it('should return last N messages', () => {
    const result = getLastNMessages(msgs, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[2]);
    expect(result[1]).toBe(msgs[3]);
  });

  it('should return all messages if N >= length', () => {
    const result = getLastNMessages(msgs, 10);
    expect(result).toHaveLength(4);
  });

  it('should return empty array for N <= 0', () => {
    expect(getLastNMessages(msgs, 0)).toHaveLength(0);
    expect(getLastNMessages(msgs, -1)).toHaveLength(0);
  });
});

describe('getFirstNMessages', () => {
  const msgs = [
    createTextMessage('user', 'A'),
    createTextMessage('assistant', 'B'),
    createTextMessage('user', 'C'),
    createTextMessage('assistant', 'D'),
  ];

  it('should return first N messages', () => {
    const result = getFirstNMessages(msgs, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msgs[0]);
    expect(result[1]).toBe(msgs[1]);
  });

  it('should return all messages if N >= length', () => {
    const result = getFirstNMessages(msgs, 10);
    expect(result).toHaveLength(4);
  });

  it('should return empty array for N <= 0', () => {
    expect(getFirstNMessages(msgs, 0)).toHaveLength(0);
  });
});

describe('countMessagesByRole', () => {
  const msgs = [
    createTextMessage('user', 'A'),
    createTextMessage('assistant', 'B'),
    createTextMessage('user', 'C'),
    createTextMessage('assistant', 'D'),
    createTextMessage('user', 'E'),
  ];

  it('should count user messages', () => {
    expect(countMessagesByRole(msgs, 'user')).toBe(3);
  });

  it('should count assistant messages', () => {
    expect(countMessagesByRole(msgs, 'assistant')).toBe(2);
  });
});

describe('extractAllText', () => {
  it('should extract text from text parts', () => {
    const msgs: SessionMessage[] = [
      createMessage('user', [{ type: 'text', content: 'Hello' }]),
      createMessage('assistant', [{ type: 'text', content: 'Hi there' }]),
    ];

    const result = extractAllText(msgs);
    expect(result).toBe('Hello\n\nHi there');
  });

  it('should extract text from reasoning parts', () => {
    const msgs: SessionMessage[] = [
      createMessage('assistant', [
        { type: 'reasoning', content: 'Thinking...' },
        { type: 'text', content: 'Answer' },
      ]),
    ];

    const result = extractAllText(msgs);
    expect(result).toBe('Thinking...\n\nAnswer');
  });

  it('should skip tool and error parts', () => {
    const msgs: SessionMessage[] = [
      createMessage('assistant', [
        { type: 'text', content: 'Let me check' },
        { type: 'tool', name: 'read', status: 'completed' },
        { type: 'text', content: 'Done' },
      ]),
    ];

    const result = extractAllText(msgs);
    expect(result).toBe('Let me check\n\nDone');
  });
});

describe('extractMessageText', () => {
  it('should extract text from single message', () => {
    const msg = createMessage('user', [
      { type: 'text', content: 'Part 1' },
      { type: 'text', content: 'Part 2' },
    ]);

    const result = extractMessageText(msg);
    expect(result).toBe('Part 1\n\nPart 2');
  });

  it('should handle mixed content types', () => {
    const msg = createMessage('assistant', [
      { type: 'reasoning', content: 'Thinking' },
      { type: 'tool', name: 'test', status: 'completed' },
      { type: 'text', content: 'Result' },
    ]);

    const result = extractMessageText(msg);
    expect(result).toBe('Thinking\n\nResult');
  });
});

describe('hasTextContent', () => {
  it('should return true for text parts', () => {
    const msg = createMessage('user', [{ type: 'text', content: 'Hello' }]);
    expect(hasTextContent(msg)).toBe(true);
  });

  it('should return true for reasoning parts', () => {
    const msg = createMessage('assistant', [{ type: 'reasoning', content: 'Thinking' }]);
    expect(hasTextContent(msg)).toBe(true);
  });

  it('should return false for only tool parts', () => {
    const msg = createMessage('assistant', [{ type: 'tool', name: 'test', status: 'running' }]);
    expect(hasTextContent(msg)).toBe(false);
  });
});

describe('hasToolCalls', () => {
  it('should return true for tool parts', () => {
    const msg = createMessage('assistant', [{ type: 'tool', name: 'test', status: 'running' }]);
    expect(hasToolCalls(msg)).toBe(true);
  });

  it('should return false without tool parts', () => {
    const msg = createMessage('user', [{ type: 'text', content: 'Hello' }]);
    expect(hasToolCalls(msg)).toBe(false);
  });
});

describe('hasErrors', () => {
  it('should return true for error parts', () => {
    const msg = createMessage('assistant', [{ type: 'error', error: 'Failed' }]);
    expect(hasErrors(msg)).toBe(true);
  });

  it('should return true for failed tool calls', () => {
    const msg = createMessage('assistant', [{ type: 'tool', name: 'test', status: 'failed' }]);
    expect(hasErrors(msg)).toBe(true);
  });

  it('should return false without errors', () => {
    const msg = createMessage('user', [{ type: 'text', content: 'Hello' }]);
    expect(hasErrors(msg)).toBe(false);
  });
});

describe('getToolCalls', () => {
  it('should return tool parts', () => {
    const msg = createMessage('assistant', [
      { type: 'text', content: 'Checking' },
      { type: 'tool', name: 'read', status: 'completed' },
      { type: 'tool', name: 'write', status: 'running' },
    ]);

    const tools = getToolCalls(msg);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('read');
    expect(tools[1].name).toBe('write');
  });
});

describe('getTextParts', () => {
  it('should return only text parts', () => {
    const msg = createMessage('assistant', [
      { type: 'text', content: 'Hello' },
      { type: 'reasoning', content: 'Thinking' },
      { type: 'text', content: 'World' },
    ]);

    const parts = getTextParts(msg);
    expect(parts).toHaveLength(2);
    expect(parts[0].content).toBe('Hello');
    expect(parts[1].content).toBe('World');
  });
});

describe('getReasoningParts', () => {
  it('should return only reasoning parts', () => {
    const msg = createMessage('assistant', [
      { type: 'reasoning', content: 'Step 1' },
      { type: 'text', content: 'Answer' },
      { type: 'reasoning', content: 'Step 2' },
    ]);

    const parts = getReasoningParts(msg);
    expect(parts).toHaveLength(2);
    expect(parts[0].content).toBe('Step 1');
    expect(parts[1].content).toBe('Step 2');
  });
});

describe('getErrorParts', () => {
  it('should return only error parts', () => {
    const msg = createMessage('assistant', [
      { type: 'text', content: 'Trying' },
      { type: 'error', error: 'Failed' },
      { type: 'error', error: 'Timeout' },
    ]);

    const parts = getErrorParts(msg);
    expect(parts).toHaveLength(2);
    expect(parts[0].error).toBe('Failed');
    expect(parts[1].error).toBe('Timeout');
  });
});
