/**
 * Session Types
 * Unified session and message types used across TUI and headless modes
 */

import type { ProviderId } from '../config/ai-config.js';

/**
 * Message part - can be text or tool call
 */
export type MessagePart =
  | { type: 'text'; content: string }
  | {
      type: 'tool';
      name: string;
      status: 'running' | 'completed' | 'failed';
      duration?: number;
      args?: unknown;
      result?: unknown;
    };

/**
 * Session message
 */
export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  parts?: MessagePart[];
}

/**
 * Chat session
 */
export interface Session {
  id: string;
  provider: ProviderId;
  model: string;
  messages: SessionMessage[];
  created: number;
  updated: number;
}
