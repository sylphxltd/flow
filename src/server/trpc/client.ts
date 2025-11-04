/**
 * tRPC Client
 * Unified client for TUI (in-process) and Web GUI (HTTP)
 *
 * Architecture:
 * - TUI: Uses in-process links (zero overhead)
 * - Web: Uses HTTP links (network transport)
 * - Same API, different transport layer!
 */

import { createTRPCClient } from '@trpc/client';
import { appRouter, type AppRouter } from './routers/index.js';
import { createContext } from './context.js';
import { inProcessSubscriptionLink } from './links/inProcessSubscriptionLink.js';

/**
 * Global client instance (lazy initialized)
 * Reuses same context for all calls (efficient for in-process)
 */
let clientInstance: ReturnType<typeof createTRPCClient<AppRouter>> | null = null;
let callerInstance: ReturnType<typeof appRouter.createCaller> | null = null;
let contextPromise: Promise<any> | null = null;

/**
 * Get tRPC client instance
 * In-process calls with full type safety and zero HTTP overhead
 *
 * Features:
 * - Queries/Mutations: Direct function calls
 * - Subscriptions: In-process observables (no SSE)
 * - Type-safe: Full end-to-end types
 *
 * @returns Type-safe tRPC client with subscription support
 */
export async function getTRPCClient() {
  if (clientInstance) {
    return clientInstance;
  }

  // Create context once and reuse
  if (!contextPromise) {
    contextPromise = createContext();
  }

  const ctx = await contextPromise;

  // Create caller for in-process link
  if (!callerInstance) {
    callerInstance = appRouter.createCaller(ctx);
  }

  // Create client with in-process subscription link
  clientInstance = createTRPCClient<AppRouter>({
    links: [
      inProcessSubscriptionLink({
        caller: callerInstance,
      }),
    ],
  });

  return clientInstance;
}

/**
 * Reset client instance (for testing or context refresh)
 */
export function resetTRPCClient() {
  clientInstance = null;
  callerInstance = null;
  contextPromise = null;
}

/**
 * Export type for use in components
 */
export type TRPCClient = Awaited<ReturnType<typeof getTRPCClient>>;

/**
 * Example: How to use for Web GUI
 *
 * ```typescript
 * import { createTRPCClient } from '@trpc/client';
 * import { httpBatchLink } from '@trpc/client';
 * import { httpSubscriptionLink } from '@trpc/client';
 * import { splitLink } from '@trpc/client';
 * import type { AppRouter } from './routers/index.js';
 *
 * // Web GUI client (HTTP + SSE)
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
 * // Same API as TUI!
 * await webClient.session.getRecent.query({ limit: 20 });
 * webClient.message.stream.subscribe({ sessionId: 'xyz' }, {
 *   onData: (data) => console.log(data),
 * });
 * ```
 */
