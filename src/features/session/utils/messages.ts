/**
 * Session Messages Utils
 * Pure functions for message array manipulation
 * All functions return new arrays (immutable)
 */

import type { SessionMessage, MessagePart } from '../../../types/session.types.js';

/**
 * Create a message object
 */
export function createMessage(
  role: 'user' | 'assistant',
  content: MessagePart[],
  timestamp?: number
): SessionMessage {
  return {
    role,
    content,
    timestamp: timestamp ?? Date.now(),
  };
}

/**
 * Create a text message (convenience function)
 */
export function createTextMessage(
  role: 'user' | 'assistant',
  text: string,
  timestamp?: number
): SessionMessage {
  return createMessage(role, [{ type: 'text', content: text }], timestamp);
}

/**
 * Add message to array (immutable)
 */
export function addMessage(
  messages: SessionMessage[],
  message: SessionMessage
): SessionMessage[] {
  return [...messages, message];
}

/**
 * Get message count
 */
export function getMessageCount(messages: SessionMessage[]): number {
  return messages.length;
}

/**
 * Get last message
 */
export function getLastMessage(messages: SessionMessage[]): SessionMessage | undefined {
  if (messages.length === 0) return undefined;
  return messages[messages.length - 1];
}

/**
 * Clear all messages (returns empty array)
 */
export function clearMessages(): SessionMessage[] {
  return [];
}

/**
 * Get messages after timestamp (inclusive)
 */
export function getMessagesAfter(
  messages: SessionMessage[],
  timestamp: number
): SessionMessage[] {
  return messages.filter((msg) => msg.timestamp >= timestamp);
}

/**
 * Get messages before timestamp (exclusive)
 */
export function getMessagesBefore(
  messages: SessionMessage[],
  timestamp: number
): SessionMessage[] {
  return messages.filter((msg) => msg.timestamp < timestamp);
}

/**
 * Get messages by role
 */
export function getMessagesByRole(
  messages: SessionMessage[],
  role: 'user' | 'assistant'
): SessionMessage[] {
  return messages.filter((msg) => msg.role === role);
}

/**
 * Get user messages
 */
export function getUserMessages(messages: SessionMessage[]): SessionMessage[] {
  return getMessagesByRole(messages, 'user');
}

/**
 * Get assistant messages
 */
export function getAssistantMessages(messages: SessionMessage[]): SessionMessage[] {
  return getMessagesByRole(messages, 'assistant');
}

/**
 * Get first message
 */
export function getFirstMessage(messages: SessionMessage[]): SessionMessage | undefined {
  if (messages.length === 0) return undefined;
  return messages[0];
}

/**
 * Get first user message
 */
export function getFirstUserMessage(messages: SessionMessage[]): SessionMessage | undefined {
  return messages.find((msg) => msg.role === 'user');
}

/**
 * Get messages with attachments
 */
export function getMessagesWithAttachments(messages: SessionMessage[]): SessionMessage[] {
  return messages.filter((msg) => msg.attachments && msg.attachments.length > 0);
}

/**
 * Get messages with usage (token usage)
 */
export function getMessagesWithUsage(messages: SessionMessage[]): SessionMessage[] {
  return messages.filter((msg) => msg.usage !== undefined);
}

/**
 * Get total token usage across all messages
 */
export function getTotalTokenUsage(messages: SessionMessage[]): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const result = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  for (const msg of messages) {
    if (msg.usage) {
      result.promptTokens += msg.usage.promptTokens;
      result.completionTokens += msg.usage.completionTokens;
      result.totalTokens += msg.usage.totalTokens;
    }
  }

  return result;
}

/**
 * Check if messages array is empty
 */
export function isEmpty(messages: SessionMessage[]): boolean {
  return messages.length === 0;
}

/**
 * Get message at index
 */
export function getMessageAt(
  messages: SessionMessage[],
  index: number
): SessionMessage | undefined {
  if (index < 0 || index >= messages.length) return undefined;
  return messages[index];
}

/**
 * Get messages in range [start, end) (end exclusive)
 */
export function getMessagesRange(
  messages: SessionMessage[],
  start: number,
  end: number
): SessionMessage[] {
  return messages.slice(start, end);
}

/**
 * Get last N messages
 */
export function getLastNMessages(
  messages: SessionMessage[],
  count: number
): SessionMessage[] {
  if (count <= 0) return [];
  if (count >= messages.length) return [...messages];
  return messages.slice(-count);
}

/**
 * Get first N messages
 */
export function getFirstNMessages(
  messages: SessionMessage[],
  count: number
): SessionMessage[] {
  if (count <= 0) return [];
  return messages.slice(0, count);
}

/**
 * Count messages by role
 */
export function countMessagesByRole(
  messages: SessionMessage[],
  role: 'user' | 'assistant'
): number {
  return messages.filter((msg) => msg.role === role).length;
}

/**
 * Extract all text content from messages
 * Returns concatenated text from all text parts
 */
export function extractAllText(messages: SessionMessage[]): string {
  const textParts: string[] = [];

  for (const msg of messages) {
    for (const part of msg.content) {
      if (part.type === 'text') {
        textParts.push(part.content);
      } else if (part.type === 'reasoning') {
        textParts.push(part.content);
      }
    }
  }

  return textParts.join('\n\n');
}

/**
 * Extract text from specific message
 */
export function extractMessageText(message: SessionMessage): string {
  const textParts: string[] = [];

  for (const part of message.content) {
    if (part.type === 'text') {
      textParts.push(part.content);
    } else if (part.type === 'reasoning') {
      textParts.push(part.content);
    }
  }

  return textParts.join('\n\n');
}

/**
 * Check if message has text content
 */
export function hasTextContent(message: SessionMessage): boolean {
  return message.content.some((part) => part.type === 'text' || part.type === 'reasoning');
}

/**
 * Check if message has tool calls
 */
export function hasToolCalls(message: SessionMessage): boolean {
  return message.content.some((part) => part.type === 'tool');
}

/**
 * Check if message has errors
 */
export function hasErrors(message: SessionMessage): boolean {
  return message.content.some(
    (part) => part.type === 'error' || (part.type === 'tool' && part.status === 'failed')
  );
}

/**
 * Get tool calls from message
 */
export function getToolCalls(message: SessionMessage): Extract<MessagePart, { type: 'tool' }>[] {
  return message.content.filter((part): part is Extract<MessagePart, { type: 'tool' }> =>
    part.type === 'tool'
  );
}

/**
 * Get text parts from message
 */
export function getTextParts(message: SessionMessage): Extract<MessagePart, { type: 'text' }>[] {
  return message.content.filter((part): part is Extract<MessagePart, { type: 'text' }> =>
    part.type === 'text'
  );
}

/**
 * Get reasoning parts from message
 */
export function getReasoningParts(message: SessionMessage): Extract<MessagePart, { type: 'reasoning' }>[] {
  return message.content.filter((part): part is Extract<MessagePart, { type: 'reasoning' }> =>
    part.type === 'reasoning'
  );
}

/**
 * Get error parts from message
 */
export function getErrorParts(message: SessionMessage): Extract<MessagePart, { type: 'error' }>[] {
  return message.content.filter((part): part is Extract<MessagePart, { type: 'error' }> =>
    part.type === 'error'
  );
}
