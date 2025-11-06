/**
 * tRPC Initialization
 * Base procedures and router factory
 * SECURITY: Implements OWASP API2 (Broken Authentication), API4 (Rate Limiting), and API5 (Function Level Authorization)
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { strictRateLimiter, moderateRateLimiter, lenientRateLimiter, streamingRateLimiter, } from '../services/rate-limiter.service.js';
// Initialize tRPC with context and SSE support for subscriptions
const t = initTRPC.context().create({
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
                isAuthenticated: true,
                userId: ctx.auth.userId,
                role: ctx.auth.role,
            },
        },
    });
});
/**
 * SECURITY: Authorization middleware factory (OWASP API5)
 * Checks if user has required role to access function
 *
 * Role hierarchy:
 * - admin: Can access all functions (local CLI)
 * - user: Can access standard functions (HTTP with API key)
 * - guest: Can only access public functions (HTTP without API key)
 */
function requireRole(...allowedRoles) {
    return t.middleware(async ({ ctx, next }) => {
        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(ctx.auth.role)) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${ctx.auth.role}`,
            });
        }
        return next();
    });
}
/**
 * Protected procedure (authentication required)
 * Use for sensitive operations: mutations, data access, admin functions
 *
 * ASSUMPTION: API key auth is sufficient for CLI tool (not multi-tenant)
 * ALTERNATIVE: JWT with user roles for multi-tenant scenarios
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);
/**
 * SECURITY: Admin-only procedure (OWASP API5)
 * Requires admin role (in-process CLI only)
 * Use for system management operations
 */
export const adminProcedure = protectedProcedure.use(requireRole('admin'));
/**
 * SECURITY: User procedure (OWASP API5)
 * Requires user or admin role (authenticated access)
 * Use for standard read/write operations
 */
export const userProcedure = protectedProcedure.use(requireRole('admin', 'user'));
/**
 * SECURITY: Rate limiting middleware factory (OWASP API4)
 * Prevents resource exhaustion attacks
 *
 * - In-process calls: No rate limiting (trusted local process)
 * - HTTP calls: Token bucket algorithm with sliding window
 *
 * Returns 429 Too Many Requests when limit exceeded
 */
function createRateLimitMiddleware(limiter, endpointName) {
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
export const strictProcedure = protectedProcedure.use(createRateLimitMiddleware(strictRateLimiter, 'strict endpoint'));
// Moderate rate limiting: 30 req/min (update operations)
export const moderateProcedure = protectedProcedure.use(createRateLimitMiddleware(moderateRateLimiter, 'moderate endpoint'));
// Lenient rate limiting: 100 req/min (queries)
export const lenientProcedure = protectedProcedure.use(createRateLimitMiddleware(lenientRateLimiter, 'lenient endpoint'));
// Streaming rate limiting: 5 streams/min (subscriptions)
export const streamingProcedure = protectedProcedure.use(createRateLimitMiddleware(streamingRateLimiter, 'streaming endpoint'));
/**
 * Role-based + rate-limited procedures
 * Combine authorization and rate limiting for comprehensive security
 */
// Admin procedures with rate limiting
export const adminStrictProcedure = adminProcedure.use(createRateLimitMiddleware(strictRateLimiter, 'admin strict endpoint'));
export const adminModerateProcedure = adminProcedure.use(createRateLimitMiddleware(moderateRateLimiter, 'admin moderate endpoint'));
// User procedures with rate limiting (most common)
export const userStrictProcedure = userProcedure.use(createRateLimitMiddleware(strictRateLimiter, 'user strict endpoint'));
export const userModerateProcedure = userProcedure.use(createRateLimitMiddleware(moderateRateLimiter, 'user moderate endpoint'));
export const userStreamingProcedure = userProcedure.use(createRateLimitMiddleware(streamingRateLimiter, 'user streaming endpoint'));
/**
 * Router factory
 */
export const router = t.router;
/**
 * Middleware factory
 */
export const middleware = t.middleware;
//# sourceMappingURL=trpc.js.map