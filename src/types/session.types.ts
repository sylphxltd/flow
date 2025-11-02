/**
 * Session Types
 * Unified session and message types used across TUI and headless modes
 */

import type { ProviderId } from '../config/ai-config.js';
import type { Todo } from './todo.types.js';

/**
 * Message part - can be text, reasoning, tool call, or error
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
      error?: string; // Error message if status is 'failed'
    }
  | { type: 'error'; error: string }; // Stream-level errors

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
 * Message metadata - system information at message creation time
 */
export interface MessageMetadata {
  cpu?: string;      // CPU usage at creation time (e.g., "45.3% (8 cores)")
  memory?: string;   // Memory usage at creation time (e.g., "4.2GB/16.0GB")
  // Future: add more fields as needed (sessionId, requestId, etc.)
}

/**
 * Session message
 */
export interface SessionMessage {
  role: 'user' | 'assistant';
  content: MessagePart[];  // UI display (without system status)
  timestamp: number;
  metadata?: MessageMetadata;  // System info for LLM context (not shown in UI)
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
  todos: Todo[]; // Per-session todo list
  nextTodoId: number; // Next todo ID for this session
  created: number;
  updated: number;
}
