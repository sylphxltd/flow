/**
 * Session Router
 * Enterprise-grade session management with pagination and lazy loading
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import type { ProviderId } from '@sylphx/code-core';

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
   */
  create: publicProcedure
    .input(
      z.object({
        provider: z.string() as z.ZodType<ProviderId>,
        model: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.sessionRepository.createSession(input.provider, input.model);
    }),

  /**
   * Update session title
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
    }),

  /**
   * Update session model
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
    }),

  /**
   * Update session provider and model
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
    }),

  /**
   * Delete session
   * CASCADE: Automatically deletes all messages, todos, attachments
   */
  delete: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.deleteSession(input.sessionId);
    }),
});
