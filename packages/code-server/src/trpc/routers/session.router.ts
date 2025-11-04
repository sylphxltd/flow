/**
 * Session Router
 * Enterprise-grade session management with pagination and lazy loading
 * REACTIVE: Emits events for all state changes
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc.js';
import type { ProviderId } from '@sylphx/code-core';
import { eventBus } from '../../services/event-bus.service.js';

export const sessionRouter = router({
  /**
   * Get recent sessions (paginated)
   * PERFORMANCE: Only load metadata, not full message history
   */
  getRecent: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.sessionRepository.getRecentSessions(input.limit, input.offset);
    }),

  /**
   * Get session by ID with full data
   * LAZY LOADING: Only called when user opens a specific session
   */
  getById: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.sessionRepository.getSessionById(input.sessionId);
    }),

  /**
   * Get session count
   * EFFICIENT: Database count without loading any data
   */
  getCount: publicProcedure.query(async ({ ctx }) => {
    return await ctx.sessionRepository.getSessionCount();
  }),

  /**
   * Get last session (for headless mode)
   */
  getLast: publicProcedure.query(async ({ ctx }) => {
    return await ctx.sessionRepository.getLastSession();
  }),

  /**
   * Search sessions by title
   * INDEXED: Uses database index for fast search
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.sessionRepository.searchSessionsByTitle(input.query, input.limit);
    }),

  /**
   * Create new session
   * REACTIVE: Emits session-created event
   */
  create: publicProcedure
    .input(
      z.object({
        provider: z.string() as z.ZodType<ProviderId>,
        model: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.sessionRepository.createSession(input.provider, input.model);

      // Emit event for reactive clients
      eventBus.emitEvent({
        type: 'session-created',
        sessionId: session.id,
        provider: input.provider,
        model: input.model,
      });

      return session;
    }),

  /**
   * Update session title
   * REACTIVE: Emits session-updated event
   */
  updateTitle: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateSessionTitle(input.sessionId, input.title);

      eventBus.emitEvent({
        type: 'session-updated',
        sessionId: input.sessionId,
        field: 'title',
        value: input.title,
      });
    }),

  /**
   * Update session model
   * REACTIVE: Emits session-updated event
   */
  updateModel: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        model: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateSessionModel(input.sessionId, input.model);

      eventBus.emitEvent({
        type: 'session-updated',
        sessionId: input.sessionId,
        field: 'model',
        value: input.model,
      });
    }),

  /**
   * Update session provider and model
   * REACTIVE: Emits session-updated event
   */
  updateProvider: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        provider: z.string() as z.ZodType<ProviderId>,
        model: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateSessionProvider(
        input.sessionId,
        input.provider,
        input.model
      );

      eventBus.emitEvent({
        type: 'session-updated',
        sessionId: input.sessionId,
        field: 'provider',
        value: `${input.provider}:${input.model}`,
      });
    }),

  /**
   * Delete session
   * CASCADE: Automatically deletes all messages, todos, attachments
   * REACTIVE: Emits session-deleted event
   */
  delete: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.deleteSession(input.sessionId);

      eventBus.emitEvent({
        type: 'session-deleted',
        sessionId: input.sessionId,
      });
    }),

  /**
   * Subscribe to session changes (SUBSCRIPTION)
   * Real-time sync for all clients
   *
   * Emits events:
   * - session-created: New session created
   * - session-updated: Session field changed
   * - session-deleted: Session removed
   */
  onChange: publicProcedure.subscription(() => {
    return observable<{
      type: 'session-created' | 'session-updated' | 'session-deleted';
      sessionId: string;
      provider?: string;
      model?: string;
      field?: 'title' | 'model' | 'provider';
      value?: string;
    }>((emit) => {
      // Subscribe to event bus
      const unsubscribe = eventBus.onAppEvent((event) => {
        // Filter session events
        if (
          event.type === 'session-created' ||
          event.type === 'session-updated' ||
          event.type === 'session-deleted'
        ) {
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
