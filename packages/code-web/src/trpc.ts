/**
 * tRPC Client Configuration
 * Uses HTTP for queries/mutations and SSE for subscriptions
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import { httpSubscriptionLink } from '@trpc/client';

// Import AppRouter type - using type-only import to avoid bundling backend code
import type { AppRouter } from '@sylphx/code-server';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Create tRPC client factory
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
        // Subscriptions: Use SSE
        true: httpSubscriptionLink({
          url: '/trpc',
        }),
        // Queries/Mutations: Use batched HTTP
        false: httpBatchLink({
          url: '/trpc',
          headers: () => ({
            'Content-Type': 'application/json',
          }),
        }),
      }),
    ],
  });
}
