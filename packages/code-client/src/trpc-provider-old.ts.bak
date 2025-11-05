/**
 * tRPC Provider for code-client
 * Provides HTTP tRPC client to all hooks and stores
 *
 * Usage:
 * ```typescript
 * // In app entry (TUI or Web)
 * import { setTRPCClient } from '@sylphx/code-client';
 * import { createTRPCClient, httpBatchLink } from '@trpc/client';
 *
 * const client = createTRPCClient({
 *   links: [httpBatchLink({ url: 'http://localhost:3000/trpc' })],
 * });
 * setTRPCClient(client);
 * ```
 */

import type { AppRouter } from '@sylphx/code-server';

/**
 * Global tRPC client instance
 * Must be set before using any hooks or stores
 */
let globalClient: any = null;

/**
 * Set global tRPC client
 * Call this once at app startup
 */
export function setTRPCClient(client: any) {
  globalClient = client;
}

/**
 * Get tRPC client
 * Throws error if not initialized
 */
export function getTRPCClient(): any {
  if (!globalClient) {
    throw new Error(
      'tRPC client not initialized. Call setTRPCClient() at app startup.'
    );
  }
  return globalClient;
}

/**
 * Reset client (for testing)
 */
export function resetTRPCClient() {
  globalClient = null;
}
