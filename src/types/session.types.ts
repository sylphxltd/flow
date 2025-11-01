/**
 * Session Types
 * Unified session and message types used across TUI and headless modes
 */

import type { ProviderId } from '../config/ai-config.js';

/**
 * Message part - can be text, reasoning, or tool call
 */
export type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string; duration?: number }
  | {
      type: 'tool';
      name: string;
      status: 'running' | 'completed' | 'failed';
      duration?: number;
      args?: unknown;
      result?: unknown;
    };

/**
 * File attachment
 */
export interface FileAttachment {
  path: string;
  relativePath: string;
  size?: number;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Session message
 */
export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  parts?: MessagePart[];
  attachments?: FileAttachment[];
  usage?: TokenUsage;
  finishReason?: string;
}

/**
 * Chat session
 */
export interface Session {
  id: string;
  title?: string; // Auto-generated from first user message
  provider: ProviderId;
  model: string;
  messages: SessionMessage[];
  created: number;
  updated: number;
}
