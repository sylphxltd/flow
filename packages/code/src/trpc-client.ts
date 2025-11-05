/**
 * tRPC Client for code CLI
 * Connects to code-server via HTTP/SSE
 *
 * NOTE: This file is only used for remote connections (--server-url flag)
 * Default mode uses in-process tRPC link (zero overhead)
 */

import type { AppRouter } from '@sylphx/code-client';
import {
  createTRPCProxyClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from '@trpc/client';
import { EventSource } from 'eventsource';

/**
 * Create HTTP tRPC client for remote connections
 *
 * Architecture:
 * - Queries/Mutations: HTTP batch requests
 * - Subscriptions: SSE (Server-Sent Events)
 *
 * Used when connecting to remote server with --server-url flag
 *
 * SECURITY: Supports API key authentication for HTTP connections
 * Set SYLPHX_API_KEY environment variable to authenticate
 */
export function createHTTPClient(serverUrl?: string, apiKey?: string) {
  const url = serverUrl || process.env.CODE_SERVER_URL || 'http://localhost:3000';
  const key = apiKey || process.env.SYLPHX_API_KEY;

  // Prepare headers with optional API key
  const headers = () => {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if API key is provided
    if (key) {
      baseHeaders['Authorization'] = `Bearer ${key}`;
    }

    return baseHeaders;
  };

  return createTRPCProxyClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
        // Subscriptions: Use SSE with EventSource polyfill for Node.js/Bun
        true: httpSubscriptionLink({
          url: `${url}/trpc`,
          EventSource: EventSource as any, // Provide EventSource polyfill for non-browser environments
          connectionParams: () => {
            // Add API key to SSE connection if provided
            return key ? { apiKey: key } : {};
          },
        }),
        // Queries/Mutations: Use batched HTTP
        false: httpBatchLink({
          url: `${url}/trpc`,
          headers,
        }),
      }),
    ],
  });
}

/**
 * Check if HTTP server is running at given URL
 */
export async function checkServer(serverUrl?: string): Promise<boolean> {
  const url = serverUrl || process.env.CODE_SERVER_URL || 'http://localhost:3000';

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for HTTP server to be ready
 */
export async function waitForServer(
  serverUrl?: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await checkServer(serverUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
