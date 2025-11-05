/**
 * tRPC Initialization
 * Base procedures and router factory
 * SECURITY: Implements OWASP API2 (Broken Authentication) protection
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';

// Initialize tRPC with context and SSE support for subscriptions
const t = initTRPC.context<Context>().create({
  sse: true, // Enable Server-Sent Events for subscriptions over HTTP
});

/**
 * Public procedure (no auth required)
 * Safe for read-only operations on non-sensitive data
 */
export const publicProcedure = t.procedure;

/**
 * SECURITY: Authentication middleware (OWASP API2)
 * Ensures requests are authenticated before accessing protected resources
 *
 * - In-process calls: Always authenticated (trusted local process)
 * - HTTP calls: Requires valid API key in Authorization header
 *
 * Usage: Set SYLPHX_API_KEY environment variable for HTTP authentication
 */
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.auth.isAuthenticated) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Provide API key via Authorization header (Bearer <key>)',
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Override auth to be definitely authenticated
      auth: {
        ...ctx.auth,
        isAuthenticated: true as const,
        userId: ctx.auth.userId!,
      },
    },
  });
});

/**
 * Protected procedure (authentication required)
 * Use for sensitive operations: mutations, data access, admin functions
 *
 * ASSUMPTION: API key auth is sufficient for CLI tool (not multi-tenant)
 * ALTERNATIVE: JWT with user roles for multi-tenant scenarios
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * Router factory
 */
export const router = t.router;

/**
 * Middleware factory
 */
export const middleware = t.middleware;
