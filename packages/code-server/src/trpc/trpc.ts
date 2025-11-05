/**
 * tRPC Initialization
 * Base procedures and router factory
 * SECURITY: Implements OWASP API2 (Broken Authentication) and API4 (Rate Limiting)
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';
import {
  strictRateLimiter,
  moderateRateLimiter,
  lenientRateLimiter,
  streamingRateLimiter,
  type RateLimiter,
} from '../services/rate-limiter.service.js';

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
 * SECURITY: Rate limiting middleware factory (OWASP API4)
 * Prevents resource exhaustion attacks
 *
 * - In-process calls: No rate limiting (trusted local process)
 * - HTTP calls: Token bucket algorithm with sliding window
 *
 * Returns 429 Too Many Requests when limit exceeded
 */
function createRateLimitMiddleware(limiter: RateLimiter, endpointName: string) {
  return t.middleware(async ({ ctx, next }) => {
    // Skip rate limiting for in-process calls (trusted)
    if (ctx.auth.source === 'in-process') {
      return next();
    }

    // Rate limit HTTP calls
    const identifier = ctx.auth.userId || ctx.req?.ip || 'unknown';
    const result = limiter.check(identifier);

    if (!result.allowed) {
      const resetAtSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded for ${endpointName}. Try again in ${resetAtSeconds} seconds.`,
      });
    }

    // Add rate limit headers to response (for HTTP clients)
    if (ctx.res) {
      ctx.res.setHeader('X-RateLimit-Limit', String(limiter['config'].maxRequests));
      ctx.res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      ctx.res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    }

    return next();
  });
}

/**
 * Rate-limited protected procedures
 */

// Strict rate limiting: 10 req/min (create, delete operations)
export const strictProcedure = protectedProcedure.use(
  createRateLimitMiddleware(strictRateLimiter, 'strict endpoint')
);

// Moderate rate limiting: 30 req/min (update operations)
export const moderateProcedure = protectedProcedure.use(
  createRateLimitMiddleware(moderateRateLimiter, 'moderate endpoint')
);

// Lenient rate limiting: 100 req/min (queries)
export const lenientProcedure = protectedProcedure.use(
  createRateLimitMiddleware(lenientRateLimiter, 'lenient endpoint')
);

// Streaming rate limiting: 5 streams/min (subscriptions)
export const streamingProcedure = protectedProcedure.use(
  createRateLimitMiddleware(streamingRateLimiter, 'streaming endpoint')
);

/**
 * Router factory
 */
export const router = t.router;

/**
 * Middleware factory
 */
export const middleware = t.middleware;
