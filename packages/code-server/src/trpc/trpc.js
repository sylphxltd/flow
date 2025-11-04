/**
 * tRPC Initialization
 * Base procedures and router factory
 */
import { initTRPC } from '@trpc/server';
// Initialize tRPC with context
const t = initTRPC.context().create();
/**
 * Unprotected procedure (no auth needed for local in-process calls)
 */
export const publicProcedure = t.procedure;
/**
 * Router factory
 */
export const router = t.router;
/**
 * Middleware factory
 */
export const middleware = t.middleware;
//# sourceMappingURL=trpc.js.map