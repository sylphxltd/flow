/**
 * Message Router
 * Efficient message operations with lazy loading and streaming support
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';

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
      return await ctx.sessionRepository.addMessage(
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
    }),

  /**
   * Update message parts (during streaming)
   * Replaces all parts atomically
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
    }),

  /**
   * Update message status
   * Used when streaming completes/aborts
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
    }),

  /**
   * Update message usage
   * Used when streaming completes with token counts
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
});
