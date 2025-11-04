/**
 * tRPC Client
 * In-process client for high-performance local calls
 */

import { appRouter } from './routers/index.js';
import { createContext } from './context.js';

/**
 * Create caller from app router
 * v11 API: router.createCaller(context)
 */

/**
 * Global client instance (lazy initialized)
 * Reuses same context for all calls (efficient for in-process)
 */
let clientInstance: ReturnType<typeof appRouter.createCaller> | null = null;
let contextPromise: Promise<any> | null = null;

/**
 * Get tRPC client instance
 * In-process calls with full type safety and zero HTTP overhead
 *
 * @returns Type-safe tRPC client
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
  clientInstance = appRouter.createCaller(ctx);

  return clientInstance;
}

/**
 * Reset client instance (for testing or context refresh)
 */
export function resetTRPCClient() {
  clientInstance = null;
  contextPromise = null;
}

/**
 * Export type for use in components
 */
export type TRPCClient = Awaited<ReturnType<typeof getTRPCClient>>;
