/**
 * Session Types
 * Unified session and message types used across TUI and headless modes
 */

import type { ProviderId } from '../config/ai-config.js';
import type { Todo } from './todo.types.js';

/**
 * Message Part - unified type for all content parts
 *
 * ALL parts have status field to track their lifecycle state:
 * - 'active': Being generated/processed
 * - 'completed': Successfully finished
 * - 'error': Failed with error
 * - 'abort': User cancelled
 *
 * Design: No separate "StreamingPart" type needed
 * - Streaming parts ARE message parts
 * - Status field tracks state during and after streaming
 * - No conversion required between streaming/stored formats
 *
 * Multiple parts can be active simultaneously (parallel tool calls).
 */
export type MessagePart =
  | {
      type: 'text';
      content: string;
      status: 'active' | 'completed' | 'error' | 'abort';
    }
  | {
      type: 'reasoning';
      content: string;
      status: 'active' | 'completed' | 'error' | 'abort';
      duration?: number;
      startTime?: number;
    }
  | {
      type: 'tool';
      toolId: string;
      name: string;
      status: 'active' | 'completed' | 'error' | 'abort';
      args?: unknown;
      result?: unknown;
      error?: string;
      duration?: number;
      startTime?: number;
    }
  | {
      type: 'error';
      error: string;
      status: 'completed';  // Errors are immediately completed
    };

/**
 * Legacy type alias for backwards compatibility
 * @deprecated Use MessagePart directly
 */
export type StreamingPart = MessagePart;

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
  cpu?: string;         // CPU usage at creation time (e.g., "45.3% (8 cores)")
  memory?: string;      // Memory usage at creation time (e.g., "4.2GB/16.0GB")
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
 * - todoSnapshot: Todo state at message creation, injected as context
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
 *
 * Why todoSnapshot at top-level (not in metadata):
 * - Structured data (Todo[]), not string context like cpu/memory
 * - Enables rewind feature - can restore todo state at any point in conversation
 * - May be used by UI for historical view
 * - Clearer separation: metadata = simple context, todoSnapshot = structured state
 */
export interface SessionMessage {
  role: 'user' | 'assistant';
  content: MessagePart[];  // UI display (without system status)
  timestamp: number;
  status?: 'active' | 'completed' | 'error' | 'abort';  // Message lifecycle state (default: 'completed')
  metadata?: MessageMetadata;  // System info for LLM context (not shown in UI)
  todoSnapshot?: Todo[];   // Full todo state at message creation time (for rewind + LLM context)
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
 *
 * Design: Message status-based state
 * ===================================
 *
 * Streaming state is derived from message status, not stored separately:
 * - message.status: 'active' | 'completed' | 'error' | 'abort'
 * - part.status: 'active' | 'completed' | 'error' | 'abort'
 *
 * Session recovery:
 * 1. Find messages with status === 'active'
 * 2. Display their parts directly
 * 3. No separate streaming state needed
 *
 * Streaming lifecycle:
 * 1. User sends message → Create message with status='active'
 * 2. Parts arrive → Add/update parts in message
 * 3. User switches session → Message stays in DB with status='active'
 * 4. Streaming completes → Update message status='completed'
 * 5. User aborts (ESC) → Update message status='abort'
 *
 * Benefits:
 * - Single source of truth (message data)
 * - No conversion between streaming/persistent formats
 * - Recovery is just "display active messages"
 * - Archives naturally (status='archived')
 */
export interface Session {
  id: string;
  title?: string; // Auto-generated from first user message
  provider: ProviderId;
  model: string;
  agentId: string;       // Agent configuration for this session
  messages: SessionMessage[];
  todos: Todo[];         // Per-session todo list (not global!)
  nextTodoId: number;    // Next todo ID for this session (starts at 1)

  // Note: Streaming state derived from message.status, not stored here
  // To check if streaming: messages.some(m => m.status === 'active')

  created: number;
  updated: number;
}
