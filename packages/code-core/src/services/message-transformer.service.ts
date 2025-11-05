/**
 * Message Transformer Service
 * Transforms SessionMessage (UI format) to ModelMessage (LLM format)
 *
 * Key responsibilities:
 * - Inject system status from stored metadata (preserves prompt cache)
 * - Inject todo context from stored snapshots
 * - Transform message parts to AI SDK format
 * - Handle file attachments
 * - Add status annotations for aborted/errored messages
 *
 * Why this is separate from useChat:
 * - Message transformation is core business logic
 * - Needs to be reusable (title generation, etc.)
 * - Should be testable independently of React
 * - Keeps client layer thin
 */

import type { SessionMessage, MessageMetadata, Todo, FileAttachment } from '../types/session.types.js';
import type { ModelMessage, UserContent, AssistantContent, ToolCallPart, ToolResultPart } from '../types/common.types.js';
import { buildTodoContext } from '../utils/todo-context.js';
import { FileAttachmentService } from './file-attachment.service.js';

/**
 * Build system status string from metadata
 * Uses STORED metadata (captured at message creation) for prompt cache effectiveness
 */
export function buildSystemStatusFromMetadata(metadata: {
  timestamp: string;
  cpu: string;
  memory: string;
}): string {
  return `<system_status timestamp="${metadata.timestamp}">
CPU: ${metadata.cpu}
Memory: ${metadata.memory}
</system_status>`;
}

export interface MessageTransformerOptions {
  /**
   * File attachment service (optional, uses default if not provided)
   */
  fileAttachmentService?: FileAttachmentService;
}

export class MessageTransformerService {
  private fileService: FileAttachmentService;

  constructor(options: MessageTransformerOptions = {}) {
    // Use provided service or create new instance
    this.fileService = options.fileAttachmentService || new FileAttachmentService();
  }

  /**
   * Transform user message to ModelMessage format
   * Injects:
   * - System status from metadata
   * - Todo context from snapshot
   * - File attachments
   */
  private async transformUserMessage(msg: SessionMessage): Promise<ModelMessage> {
    const contentParts: UserContent = [];

    // 1. Inject context from STORED data (not current values!)
    //    ⚠️ Using stored data preserves prompt cache - messages stay immutable

    // System status from metadata
    if (msg.metadata) {
      const systemStatusString = buildSystemStatusFromMetadata({
        timestamp: new Date(msg.timestamp).toISOString(),
        cpu: msg.metadata.cpu || 'N/A',
        memory: msg.metadata.memory || 'N/A',
      });
      contentParts.push({
        type: 'text',
        text: systemStatusString,
      });
    }

    // Todo context from todoSnapshot (full structured state)
    if (msg.todoSnapshot && msg.todoSnapshot.length > 0) {
      const todoContext = buildTodoContext(msg.todoSnapshot);
      contentParts.push({
        type: 'text',
        text: todoContext,
      });
    }

    // 2. Extract text parts from content (user message)
    const textParts = msg.content.filter((part) => part.type === 'text');
    for (const part of textParts) {
      contentParts.push({
        type: 'text',
        text: part.content,
      });
    }

    // 3. Add file attachments as file parts (use cache with mtime validation)
    if (msg.attachments && msg.attachments.length > 0) {
      try {
        const fileContents = await this.fileService.readAttachments(msg.attachments);
        contentParts.push(...fileContents);
      } catch (error) {
        console.error('Failed to read attachments:', error);
      }
    }

    return {
      role: 'user' as const,
      content: contentParts,
    };
  }

  /**
   * Transform assistant message to ModelMessage format
   * Converts:
   * - Text parts → text content
   * - Reasoning parts → reasoning content
   * - Tool parts → tool-call + tool-result
   * - Error parts → text (so LLM knows what happened)
   * - Status annotations for aborted/errored messages
   */
  private transformAssistantMessage(msg: SessionMessage): ModelMessage {
    const contentParts: AssistantContent = msg.content.flatMap(part => {
      switch (part.type) {
        case 'text':
          return [{
            type: 'text' as const,
            text: part.content,
          }];

        case 'reasoning':
          return [{
            type: 'reasoning' as const,
            text: part.content,
          }];

        case 'tool': {
          // Tool call + optional tool result
          const parts: AssistantContent = [{
            type: 'tool-call' as const,
            toolCallId: part.toolId,
            toolName: part.name,
            input: part.args,
          } as ToolCallPart];

          // Add tool result if available
          if (part.result !== undefined) {
            parts.push({
              type: 'tool-result' as const,
              toolCallId: part.toolId,
              toolName: part.name,
              output: part.result,
            } as ToolResultPart);
          }

          return parts;
        }

        case 'error':
          // Convert error to text so LLM knows what happened
          return [{
            type: 'text' as const,
            text: `[Error: ${part.error}]`,
          }];

        default:
          // Exhaustive check - TypeScript will error if we miss a type
          return [];
      }
    });

    // Add status annotation if message was aborted or errored
    if (msg.status === 'abort') {
      contentParts.push({
        type: 'text',
        text: '[This response was aborted by the user]',
      });
    } else if (msg.status === 'error') {
      contentParts.push({
        type: 'text',
        text: '[This response ended with an error]',
      });
    }

    return {
      role: msg.role as 'assistant',
      content: contentParts,
    };
  }

  /**
   * Transform SessionMessage[] to ModelMessage[] for LLM
   *
   * ⚠️ CRITICAL: This is where SessionMessage (UI) transforms to ModelMessage (LLM)
   *
   * Key transformations:
   * 1. System status: Built from STORED metadata, NOT current values (prompt cache!)
   * 2. File attachments: Read fresh from disk (files can change between requests)
   * 3. Content: Extract text from MessagePart[] format
   *
   * Why use stored metadata?
   * - Historical messages must be IMMUTABLE for prompt cache
   * - buildSystemStatusFromMetadata uses msg.metadata (captured at creation)
   * - NEVER use getSystemStatus() here (would use current values → cache miss)
   */
  async transformMessages(messages: SessionMessage[]): Promise<ModelMessage[]> {
    return Promise.all(
      messages.map(async (msg) => {
        if (msg.role === 'user') {
          return this.transformUserMessage(msg);
        } else {
          return this.transformAssistantMessage(msg);
        }
      })
    );
  }

  /**
   * Clear file attachment cache
   */
  clearCache(): void {
    this.fileService.clearCache();
  }
}

/**
 * Default singleton instance
 * Use this for simple use cases
 */
export const defaultMessageTransformer = new MessageTransformerService();
