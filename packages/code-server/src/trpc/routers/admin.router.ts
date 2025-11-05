/**
 * Admin Router
 * System management operations (admin-only)
 * SECURITY: Function level authorization (OWASP API5) + API Inventory (OWASP API9)
 */

import { z } from 'zod';
import { router, publicProcedure, adminStrictProcedure, adminModerateProcedure } from '../trpc.js';
import { getAPIInventory, generateMarkdownDocs } from '../../utils/api-inventory.js';

export const adminRouter = router({
  /**
   * Delete all sessions (admin-only)
   * SECURITY: Requires admin role (in-process CLI only)
   * Dangerous operation - removes all data
   */
  deleteAllSessions: adminStrictProcedure
    .input(z.object({ confirm: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      // Get all sessions
      const sessions = await ctx.sessionRepository.getRecentSessionsMetadata(1000);

      // Delete each session (cascade deletes messages, todos, attachments)
      let deletedCount = 0;
      for (const session of sessions.sessions) {
        await ctx.sessionRepository.deleteSession(session.id);
        deletedCount++;
      }

      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} sessions`,
      };
    }),

  /**
   * Get system statistics (admin-only)
   * SECURITY: Requires admin role
   * Shows internal metrics not exposed to regular users
   */
  getSystemStats: adminModerateProcedure.query(async ({ ctx }) => {
    const sessionCount = await ctx.sessionRepository.getSessionCount();

    // Get all sessions to calculate stats
    const sessions = await ctx.sessionRepository.getRecentSessionsMetadata(1000);

    // Calculate message count across all sessions
    let totalMessages = 0;
    for (const session of sessions.sessions) {
      totalMessages += session.messageCount || 0;
    }

    return {
      sessions: {
        total: sessionCount,
        avgMessagesPerSession: sessionCount > 0 ? totalMessages / sessionCount : 0,
      },
      messages: {
        total: totalMessages,
      },
      config: {
        providers: Object.keys(ctx.aiConfig.providers || {}),
        defaultProvider: ctx.aiConfig.defaultProvider,
        defaultModel: ctx.aiConfig.defaultModel,
      },
    };
  }),

  /**
   * Get server health (public - for monitoring)
   * No authorization required
   */
  getHealth: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
    };
  }),

  /**
   * Force garbage collection (admin-only)
   * SECURITY: Requires admin role
   * System management operation
   */
  forceGC: adminModerateProcedure.mutation(() => {
    if (global.gc) {
      global.gc();
      return { success: true, message: 'Garbage collection triggered' };
    } else {
      return { success: false, message: 'GC not exposed. Run with --expose-gc flag' };
    }
  }),

  /**
   * Get API inventory (public - for documentation)
   * SECURITY: OWASP API9 compliance
   * Shows all available endpoints, their types, and requirements
   */
  getAPIInventory: publicProcedure.query(() => {
    return getAPIInventory();
  }),

  /**
   * Get API documentation (public - for developers)
   * SECURITY: OWASP API9 compliance
   * Returns Markdown-formatted API reference
   */
  getAPIDocs: publicProcedure
    .input(z.object({ format: z.enum(['json', 'markdown']).default('json') }))
    .query(({ input }) => {
      if (input.format === 'markdown') {
        return generateMarkdownDocs();
      }
      return getAPIInventory();
    }),
});
