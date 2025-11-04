/**
 * tRPC Client for code CLI
 * Connects to code-server via HTTP/SSE
 */

import type { AppRouter } from '@sylphx/code-client';
import {
  createTRPCProxyClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from '@trpc/client';

const SERVER_URL = process.env.CODE_SERVER_URL || 'http://localhost:3000';

/**
 * Create tRPC client that connects to code-server
 *
 * Architecture:
 * - Queries/Mutations: HTTP batch requests
 * - Subscriptions: SSE (Server-Sent Events)
 *
 * This allows code TUI to share data with code-web in real-time
 */
export function createClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
        // Subscriptions: Use SSE
        true: httpSubscriptionLink({
          url: `${SERVER_URL}/trpc`,
        }),
        // Queries/Mutations: Use batched HTTP
        false: httpBatchLink({
          url: `${SERVER_URL}/trpc`,
          headers: () => ({
            'Content-Type': 'application/json',
          }),
        }),
      }),
    ],
  });
}

/**
 * Check if code-server is running
 */
export async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(SERVER_URL, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(timeoutMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await checkServer()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
