/**
 * Message Router
 * Efficient message operations with lazy loading and streaming support
 * REACTIVE: Emits events for all state changes
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc.js';
import { eventBus } from '../../services/event-bus.service.js';

// Zod schemas for type safety
const MessagePartSchema = z.union([
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({
    type: z.literal('tool-use'),
    toolUseId: z.string(),
    toolName: z.string(),
    toolInput: z.any(),
  }),
  z.object({
    type: z.literal('tool-result'),
    toolUseId: z.string(),
    toolName: z.string(),
    content: z.string(),
    isError: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('reasoning'),
    reasoning: z.string(),
  }),
]);

const FileAttachmentSchema = z.object({
  path: z.string(),
  relativePath: z.string(),
  size: z.number().optional(),
});

const TokenUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

const MessageMetadataSchema = z.object({
  agentId: z.string().optional(),
  ruleIds: z.array(z.string()).optional(),
  isCommandExecution: z.boolean().optional(),
});

const TodoSnapshotSchema = z.object({
  id: z.number(),
  content: z.string(),
  activeForm: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  ordering: z.number(),
});

// Streaming event types (unified interface for TUI and Web)
const StreamEventSchema = z.discriminatedUnion('type', [
  // Session events
  z.object({ type: z.literal('session-created'), sessionId: z.string(), provider: z.string(), model: z.string() }),
  z.object({ type: z.literal('session-title-start') }),
  z.object({ type: z.literal('session-title-delta'), text: z.string() }),
  z.object({ type: z.literal('session-title-complete'), title: z.string() }),

  // Message creation
  z.object({ type: z.literal('assistant-message-created'), messageId: z.string() }),

  // Text streaming
  z.object({ type: z.literal('text-start') }),
  z.object({ type: z.literal('text-delta'), text: z.string() }),
  z.object({ type: z.literal('text-end') }),

  // Reasoning streaming
  z.object({ type: z.literal('reasoning-start') }),
  z.object({ type: z.literal('reasoning-delta'), text: z.string() }),
  z.object({ type: z.literal('reasoning-end'), duration: z.number() }),

  // Tool streaming
  z.object({
    type: z.literal('tool-call'),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.any(),
  }),
  z.object({
    type: z.literal('tool-result'),
    toolCallId: z.string(),
    toolName: z.string(),
    result: z.any(),
    duration: z.number(),
  }),
  z.object({
    type: z.literal('tool-error'),
    toolCallId: z.string(),
    toolName: z.string(),
    error: z.string(),
    duration: z.number(),
  }),

  // Completion
  z.object({
    type: z.literal('complete'),
    usage: TokenUsageSchema.optional(),
    finishReason: z.string().optional(),
  }),

  // Error/Abort
  z.object({ type: z.literal('error'), error: z.string() }),
  z.object({ type: z.literal('abort') }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export const messageRouter = router({
  /**
   * Get message count for session
   * EFFICIENT: Count only, no data loading
   */
  getCount: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.sessionRepository.getMessageCount(input.sessionId);
    }),

  /**
   * Add message to session
   * Used for both user messages and assistant messages
   * REACTIVE: Emits message-added event
   */
  add: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.array(MessagePartSchema),
        attachments: z.array(FileAttachmentSchema).optional(),
        usage: TokenUsageSchema.optional(),
        finishReason: z.string().optional(),
        metadata: MessageMetadataSchema.optional(),
        todoSnapshot: z.array(TodoSnapshotSchema).optional(),
        status: z.enum(['active', 'completed', 'error', 'abort']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.sessionRepository.addMessage(
        input.sessionId,
        input.role,
        input.content,
        input.attachments,
        input.usage,
        input.finishReason,
        input.metadata,
        input.todoSnapshot,
        input.status
      );

      // Emit event for reactive clients
      eventBus.emitEvent({
        type: 'message-added',
        sessionId: input.sessionId,
        messageId: message.id,
        role: input.role,
      });

      return message;
    }),

  /**
   * Update message parts (during streaming)
   * Replaces all parts atomically
   * REACTIVE: Emits message-updated event
   */
  updateParts: publicProcedure
    .input(
      z.object({
        messageId: z.string(),
        parts: z.array(MessagePartSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateMessageParts(input.messageId, input.parts);

      eventBus.emitEvent({
        type: 'message-updated',
        messageId: input.messageId,
        field: 'parts',
      });
    }),

  /**
   * Update message status
   * Used when streaming completes/aborts
   * REACTIVE: Emits message-updated event
   */
  updateStatus: publicProcedure
    .input(
      z.object({
        messageId: z.string(),
        status: z.enum(['active', 'completed', 'error', 'abort']),
        finishReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateMessageStatus(
        input.messageId,
        input.status,
        input.finishReason
      );

      eventBus.emitEvent({
        type: 'message-updated',
        messageId: input.messageId,
        field: 'status',
      });
    }),

  /**
   * Update message usage
   * Used when streaming completes with token counts
   * REACTIVE: Emits message-updated event
   */
  updateUsage: publicProcedure
    .input(
      z.object({
        messageId: z.string(),
        usage: TokenUsageSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateMessageUsage(input.messageId, input.usage);

      eventBus.emitEvent({
        type: 'message-updated',
        messageId: input.messageId,
        field: 'usage',
      });
    }),

  /**
   * Get recent user messages for command history
   * INDEXED: Uses efficient database query with role index
   */
  getRecentUserMessages: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.sessionRepository.getRecentUserMessages(input.limit);
    }),

  /**
   * Stream AI response (SUBSCRIPTION)
   * Unified interface for TUI (in-process) and Web (SSE)
   *
   * Usage:
   * ```typescript
   * // TUI and Web use same API!
   * client.message.streamResponse.subscribe(
   *   { sessionId, userMessage, attachments },
   *   {
   *     onData: (event) => {
   *       if (event.type === 'text-delta') {
   *         appendText(event.text);
   *       }
   *     },
   *     onError: (error) => console.error(error),
   *     onComplete: () => console.log('Done'),
   *   }
   * );
   * ```
   *
   * Transport:
   * - TUI: In-process observable (zero overhead)
   * - Web: SSE (httpSubscriptionLink)
   */
  streamResponse: publicProcedure
    .input(
      z.object({
        sessionId: z.string().nullish(), // Optional - will create if null
        provider: z.string().optional(),  // Required if sessionId is null
        model: z.string().optional(),     // Required if sessionId is null
        userMessage: z.string(),
        attachments: z.array(FileAttachmentSchema).optional(),
      })
    )
    .subscription(async ({ ctx, input }) => {
      // DEBUG: Log subscription received
      console.error('[DEBUG message.router] Subscription received:', { sessionId: input.sessionId, userMessage: input.userMessage?.substring(0, 50) });

      // Import streaming service
      const { streamAIResponse } = await import('../../services/streaming.service.js');

      // Stream AI response using service
      console.error('[DEBUG message.router] Calling streamAIResponse...');
      return streamAIResponse({
        sessionRepository: ctx.sessionRepository,
        aiConfig: ctx.aiConfig,
        sessionId: input.sessionId || null,
        provider: input.provider,
        model: input.model,
        userMessage: input.userMessage,
        attachments: input.attachments,
      });
    }),

  /**
   * Subscribe to message changes (SUBSCRIPTION)
   * Real-time sync for all clients (non-streaming updates)
   *
   * Emits events:
   * - message-added: New message added to session
   * - message-updated: Message parts/status/usage updated
   */
  onChange: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(), // Optional - subscribe to all if not provided
      })
    )
    .subscription(({ input }) => {
      return observable<{
        type: 'message-added' | 'message-updated';
        sessionId?: string;
        messageId: string;
        role?: 'user' | 'assistant';
        field?: 'parts' | 'status' | 'usage';
      }>((emit) => {
        // Subscribe to event bus
        const unsubscribe = eventBus.onAppEvent((event) => {
          // Filter message events
          if (event.type === 'message-added') {
            // If sessionId filter provided, only emit matching events
            if (!input.sessionId || event.sessionId === input.sessionId) {
              emit.next(event);
            }
          } else if (event.type === 'message-updated') {
            emit.next(event);
          }
        });

        // Cleanup on unsubscribe
        return () => {
          unsubscribe();
        };
      });
    }),
});
