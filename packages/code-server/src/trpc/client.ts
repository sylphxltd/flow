/**
 * tRPC Client
 * Unified client for TUI (in-process) and Web GUI (HTTP)
 *
 * Architecture:
 * - TUI: Uses router.createCaller() for direct in-process calls (zero overhead)
 * - Web: Uses createTRPCClient() with HTTP links (network transport)
 * - Same API, different implementation!
 */

import { appRouter, type AppRouter } from './routers/index.js';
import { createContext } from './context.js';

/**
 * Global client instance (lazy initialized)
 * Reuses same context for all calls (efficient for in-process)
 */
let callerInstance: ReturnType<typeof appRouter.createCaller> | null = null;
let contextPromise: Promise<any> | null = null;

/**
 * Get tRPC client instance (in-process caller)
 * Direct function calls with full type safety and zero overhead
 *
 * Features:
 * - Queries: Direct async function calls
 * - Mutations: Direct async function calls
 * - Subscriptions: Returns observables directly (no SSE)
 * - Type-safe: Full end-to-end types
 *
 * @returns Type-safe tRPC caller with subscription support
 */
export async function getTRPCClient() {
  if (callerInstance) {
    return callerInstance;
  }

  // Create context once and reuse
  if (!contextPromise) {
    contextPromise = createContext();
  }

  const ctx = await contextPromise;

  // Create caller for in-process usage (supports queries, mutations, and subscriptions)
  callerInstance = appRouter.createCaller(ctx);

  return callerInstance;
}

/**
 * Reset client instance (for testing or context refresh)
 */
export function resetTRPCClient() {
  callerInstance = null;
  contextPromise = null;
}

/**
 * Export type for use in components
 */
export type TRPCClient = Awaited<ReturnType<typeof getTRPCClient>>;

/**
 * Example: How to use for Web GUI (different implementation, same API)
 *
 * ```typescript
 * import { createTRPCClient } from '@trpc/client';
 * import { httpBatchLink } from '@trpc/client';
 * import { httpSubscriptionLink } from '@trpc/client';
 * import { splitLink } from '@trpc/client';
 * import type { AppRouter } from './routers/index.js';
 *
 * // Web GUI client (HTTP + SSE over network)
 * const webClient = createTRPCClient<AppRouter>({
 *   links: [
 *     splitLink({
 *       condition: (op) => op.type === 'subscription',
 *       true: httpSubscriptionLink({
 *         url: 'http://localhost:3000/trpc',
 *       }),
 *       false: httpBatchLink({
 *         url: 'http://localhost:3000/trpc',
 *       }),
 *     }),
 *   ],
 * });
 *
 * // Same API as TUI caller!
 * await webClient.session.getRecent.query({ limit: 20 });
 * webClient.message.streamResponse.subscribe({ sessionId: 'xyz', userMessage: 'hi' }, {
 *   onData: (data) => console.log(data),
 *   onError: (err) => console.error(err),
 *   onComplete: () => console.log('done'),
 * });
 * ```
 */
