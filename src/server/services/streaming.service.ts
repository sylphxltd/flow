/**
 * Streaming Service
 * Backend service for AI streaming - used by tRPC subscription
 *
 * Architecture:
 * - Loads session data from database
 * - Builds message context for AI
 * - Streams AI response
 * - Saves results to database
 * - Emits events to subscription observer
 *
 * This service is called by message.streamResponse subscription procedure
 */

import { observable } from '@trpc/server/observable';
import type { SessionRepository } from '../../db/session-repository.js';
import {
  createAIStream,
  getSystemStatus,
  buildSystemStatusFromMetadata,
  injectSystemStatusToOutput,
} from '../../core/ai-sdk.js';
import { processStream, type StreamCallbacks } from '../../core/stream-handler.js';
import { getProvider } from '../../providers/index.js';
import { buildTodoContext } from '../../utils/todo-context.js';
import type { AIConfig } from '../../config/ai-config.js';
import type { ModelMessage, UserContent, AssistantContent } from 'ai';
import type {
  MessagePart,
  FileAttachment,
  TokenUsage,
} from '../../types/session.types.js';
import type { ToolCallPart, ToolResultPart } from '@ai-sdk/provider';

// Re-export StreamEvent type from message router
export type StreamEvent =
  | { type: 'text-start' }
  | { type: 'text-delta'; text: string }
  | { type: 'text-end' }
  | { type: 'reasoning-start' }
  | { type: 'reasoning-delta'; text: string }
  | { type: 'reasoning-end'; duration: number }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool-result'; toolCallId: string; toolName: string; result: any; duration: number }
  | { type: 'tool-error'; toolCallId: string; toolName: string; error: string; duration: number }
  | { type: 'complete'; usage?: TokenUsage; finishReason?: string }
  | { type: 'error'; error: string }
  | { type: 'abort' };

export interface StreamAIResponseOptions {
  sessionRepository: SessionRepository;
  aiConfig: AIConfig;
  sessionId: string;
  userMessage: string;
  attachments?: FileAttachment[];
  abortSignal?: AbortSignal;
}

/**
 * Stream AI response as Observable<StreamEvent>
 *
 * This function:
 * 1. Loads session from database
 * 2. Adds user message to session
 * 3. Builds message context for AI
 * 4. Streams AI response
 * 5. Emits events to observer
 * 6. Saves final result to database
 */
export function streamAIResponse(opts: StreamAIResponseOptions) {
  return observable<StreamEvent>((observer) => {
    let aborted = false;

    // Async execution wrapped in promise
    (async () => {
      try {
        const {
          sessionRepository,
          aiConfig,
          sessionId,
          userMessage,
          attachments = [],
          abortSignal,
        } = opts;

        // 1. Load session from database
        const session = await sessionRepository.getSessionById(sessionId);
        if (!session) {
          observer.error(new Error('Session not found'));
          return;
        }

        // 2. Check AI configuration
        const provider = session.provider;
        const modelName = session.model;
        const providerConfig = aiConfig?.providers?.[provider];

        if (!providerConfig) {
          observer.next({
            type: 'error',
            error: '[ERROR] Provider not configured\\n\\nPlease configure your provider using the /provider command.',
          });
          observer.complete();
          return;
        }

        const providerInstance = getProvider(provider);
        if (!providerInstance.isConfigured(providerConfig)) {
          observer.next({
            type: 'error',
            error: `[ERROR] ${providerInstance.name} is not properly configured\\n\\nPlease check your settings with the /provider command.`,
          });
          observer.complete();
          return;
        }

        // 3. Add user message to session (with system status + attachments)
        const systemStatus = getSystemStatus();
        const messageId = await sessionRepository.addMessage(
          sessionId,
          'user',
          [{ type: 'text', content: userMessage }],
          attachments,
          undefined,
          undefined,
          {
            cpu: systemStatus.cpu,
            memory: systemStatus.memory,
          },
          session.todos // Capture current todos for this message
        );

        // 4. Reload session to get updated messages
        const updatedSession = await sessionRepository.getSessionById(sessionId);
        if (!updatedSession) {
          observer.error(new Error('Session not found after adding message'));
          return;
        }

        // 5. Build ModelMessage[] for AI (same logic as useChat.ts)
        const messages: ModelMessage[] = await Promise.all(
          updatedSession.messages.map(async (msg) => {
            if (msg.role === 'user') {
              const contentParts: UserContent = [];

              // Inject system status from metadata
              if (msg.metadata) {
                const systemStatusString = buildSystemStatusFromMetadata({
                  timestamp: new Date(msg.timestamp).toISOString(),
                  cpu: msg.metadata.cpu || 'N/A',
                  memory: msg.metadata.memory || 'N/A',
                });
                contentParts.push({ type: 'text', text: systemStatusString });
              }

              // Inject todo context from snapshot
              if (msg.todoSnapshot && msg.todoSnapshot.length > 0) {
                const todoContext = buildTodoContext(msg.todoSnapshot);
                contentParts.push({ type: 'text', text: todoContext });
              }

              // Add message content
              msg.content.forEach((part) => {
                if (part.type === 'text') {
                  contentParts.push({ type: 'text', text: part.content });
                }
              });

              // Add file attachments
              if (msg.attachments && msg.attachments.length > 0) {
                for (const attachment of msg.attachments) {
                  const fs = await import('node:fs/promises');
                  try {
                    const content = await fs.readFile(attachment.path, 'utf-8');
                    contentParts.push({
                      type: 'file',
                      data: content,
                      mimeType: 'text/plain',
                    });
                  } catch (error) {
                    console.error(`Failed to read attachment: ${attachment.path}`, error);
                  }
                }
              }

              return { role: msg.role as 'user', content: contentParts };
            } else {
              // Assistant message
              const contentParts: AssistantContent = msg.content.flatMap((part) => {
                switch (part.type) {
                  case 'text':
                    return [{ type: 'text' as const, text: part.content }];

                  case 'reasoning':
                    return [{ type: 'reasoning' as const, text: part.content }];

                  case 'tool': {
                    const parts: AssistantContent = [
                      {
                        type: 'tool-call' as const,
                        toolCallId: part.toolId,
                        toolName: part.name,
                        input: part.args,
                      } as ToolCallPart,
                    ];

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
                    return [{ type: 'text' as const, text: `[Error: ${part.error}]` }];

                  default:
                    return [];
                }
              });

              // Add status annotation
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

              return { role: msg.role as 'assistant', content: contentParts };
            }
          })
        );

        // 6. Create AI model
        const model = providerInstance.createClient(providerConfig, modelName);

        // 7. Create AI stream
        const stream = createAIStream({
          model,
          messages,
          ...(abortSignal ? { abortSignal } : {}),
          onTransformToolResult: (output, toolName) => {
            const systemStatus = getSystemStatus();
            return injectSystemStatusToOutput(output, systemStatus);
          },
        });

        // 8. Create assistant message in database (status: active)
        const assistantMessageId = await sessionRepository.addMessage(
          sessionId,
          'assistant',
          [], // Empty content initially
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'active'
        );

        // 9. Process stream and emit events
        const callbacks: StreamCallbacks = {
          onTextStart: () => observer.next({ type: 'text-start' }),
          onTextDelta: (text) => observer.next({ type: 'text-delta', text }),
          onTextEnd: () => observer.next({ type: 'text-end' }),
          onReasoningStart: () => observer.next({ type: 'reasoning-start' }),
          onReasoningDelta: (text) => observer.next({ type: 'reasoning-delta', text }),
          onReasoningEnd: (duration) => observer.next({ type: 'reasoning-end', duration }),
          onToolCall: (toolCallId, toolName, args) =>
            observer.next({ type: 'tool-call', toolCallId, toolName, args }),
          onToolResult: (toolCallId, toolName, result, duration) =>
            observer.next({ type: 'tool-result', toolCallId, toolName, result, duration }),
          onToolError: (toolCallId, toolName, error, duration) =>
            observer.next({ type: 'tool-error', toolCallId, toolName, error, duration }),
          onAbort: () => {
            aborted = true;
            observer.next({ type: 'abort' });
          },
          onError: (error) => {
            observer.next({ type: 'error', error });
          },
        };

        const result = await processStream(stream, callbacks);

        // 10. Save final message to database
        await sessionRepository.updateMessageParts(assistantMessageId, result.messageParts);
        await sessionRepository.updateMessageStatus(
          assistantMessageId,
          aborted ? 'abort' : result.usage ? 'completed' : 'error',
          result.finishReason
        );

        if (result.usage) {
          await sessionRepository.updateMessageUsage(assistantMessageId, result.usage);
        }

        // 11. Emit complete event
        observer.next({
          type: 'complete',
          usage: result.usage,
          finishReason: result.finishReason,
        });

        observer.complete();
      } catch (error) {
        observer.next({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
        observer.complete();
      }
    })();

    // Cleanup function
    return () => {
      aborted = true;
    };
  });
}
