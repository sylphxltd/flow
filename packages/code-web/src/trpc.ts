/**
 * tRPC Client Configuration
 * Uses HTTP for queries/mutations and SSE for subscriptions
 * SECURITY: Supports API key authentication
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import { httpSubscriptionLink } from '@trpc/client';

// Import AppRouter type - using type-only import to avoid bundling backend code
import type { AppRouter } from '@sylphx/code-client';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create tRPC client factory
 *
 * SECURITY: Pass apiKey parameter to authenticate with server
 * @param apiKey - Optional API key for authentication (defaults to VITE_SYLPHX_API_KEY env var)
 */
export function createTRPCClient(apiKey?: string) {
  // Get API key from parameter or environment variable
  const key = apiKey || import.meta.env?.VITE_SYLPHX_API_KEY;

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

  return trpc.createClient({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
        // Subscriptions: Use SSE
        true: httpSubscriptionLink({
          url: '/trpc',
          connectionParams: () => {
            // Add API key to SSE connection if provided
            return key ? { apiKey: key } : {};
          },
        }),
        // Queries/Mutations: Use batched HTTP
        false: httpBatchLink({
          url: '/trpc',
          headers,
        }),
      }),
    ],
  });
}
