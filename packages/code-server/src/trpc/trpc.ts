/**
 * tRPC Initialization
 * Base procedures and router factory
 */

import { initTRPC } from '@trpc/server';
import type { Context } from './context.js';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

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
