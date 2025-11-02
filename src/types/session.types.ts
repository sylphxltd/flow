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
 *
 * IMPORTANT: This metadata is captured ONCE when the message is created and NEVER changes.
 * This is critical for prompt cache effectiveness - historical messages must remain immutable.
 *
 * Design decisions:
 * 1. Stored separately from content - not shown in UI, only sent to LLM
 * 2. Captured at creation time - never updated to preserve prompt cache
 * 3. Used to build system status context when constructing ModelMessage for LLM
 *
 * What goes in metadata vs top-level fields:
 * - metadata: Info for LLM but NOT shown in UI (cpu, memory, future: sessionId, requestId)
 * - usage/finishReason: Info for UI/monitoring but NOT sent to LLM
 * - timestamp: Shown in UI AND used to construct metadata for LLM
 * - content: Shown in UI AND sent to LLM
 */
export interface MessageMetadata {
  cpu?: string;      // CPU usage at creation time (e.g., "45.3% (8 cores)")
  memory?: string;   // Memory usage at creation time (e.g., "4.2GB/16.0GB")
  // Future: add more fields as needed (sessionId, requestId, modelVersion, etc.)
}

/**
 * Session message - Unified message type for both UI display and LLM consumption
 *
 * Design: Separation of UI display vs LLM context
 * ================================================
 *
 * UI Display (what user sees):
 * - content: MessagePart[] - Text, tool calls, reasoning, errors
 * - timestamp: Display time
 * - usage: Token counts for monitoring
 * - attachments: Show file paths
 *
 * LLM Context (what AI sees):
 * - content: Converted to ModelMessage format
 * - metadata: Injected as system status (cpu, memory) - NOT shown in UI
 * - timestamp: Used to construct system status time
 * - attachments: File contents read and injected
 *
 * Why content doesn't include system status:
 * - System status is contextual info, not part of user's actual message
 * - Including it in content would display "<system_status>..." in chat UI
 * - metadata allows us to store it separately and inject only when building ModelMessage
 *
 * Why usage/finishReason are NOT in metadata:
 * - They're for monitoring/debugging, not for LLM consumption
 * - finishReason controls multi-step flow (stop vs tool-calls vs length)
 * - usage helps track API costs and quota
 */
export interface SessionMessage {
  role: 'user' | 'assistant';
  content: MessagePart[];  // UI display (without system status)
  timestamp: number;
  metadata?: MessageMetadata;  // System info for LLM context (not shown in UI)
  attachments?: FileAttachment[];
  usage?: TokenUsage;          // For UI/monitoring, not sent to LLM
  finishReason?: string;       // For flow control (stop/tool-calls/length/error), not sent to LLM
}

/**
 * Chat session
 *
 * Design: Per-session todo lists
 * ================================
 *
 * Why todos are scoped to sessions (not global):
 * 1. Context isolation - Each conversation has its own task context
 * 2. Prevents cross-contamination - New session won't see old todos
 * 3. LLM clarity - AI only sees tasks relevant to current conversation
 *
 * Before (global todos):
 * - Session A creates todos ["Build feature X", "Test feature X"]
 * - Session B starts, user says "hi"
 * - LLM sees Session A's todos and tries to complete them ❌
 *
 * After (per-session todos):
 * - Session A has its own todos
 * - Session B starts with empty todos ✅
 * - Each session manages independent task lists
 *
 * Implementation notes:
 * - nextTodoId is also per-session to avoid ID conflicts
 * - Todos are persisted with session to disk
 * - updateTodos tool requires sessionId parameter
 */
export interface Session {
  id: string;
  title?: string; // Auto-generated from first user message
  provider: ProviderId;
  model: string;
  messages: SessionMessage[];
  todos: Todo[];         // Per-session todo list (not global!)
  nextTodoId: number;    // Next todo ID for this session (starts at 1)
  created: number;
  updated: number;
}
