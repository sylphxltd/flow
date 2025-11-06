/**
 * tRPC Provider for code-client
 * Provides type-safe tRPC client to all React components via Context
 */

import { createContext, useContext, type ReactNode } from 'react';
import { createTRPCProxyClient } from '@trpc/client';
import { inProcessLink, type InProcessLinkOptions } from './trpc-links/index.js';
import type { AppRouter } from '@sylphx/code-server';

/**
 * tRPC Client type (typed with AppRouter)
 */
export type TypedTRPCClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

/**
 * React Context for tRPC client
 */
const TRPCContext = createContext<TypedTRPCClient | null>(null);

/**
 * Provider props
 */
export interface TRPCProviderProps {
  client: TypedTRPCClient;
  children: ReactNode;
}

/**
 * TRPCProvider - Provides tRPC client to React tree
 * Also initializes global client for Zustand stores
 */
export function TRPCProvider({ client, children }: TRPCProviderProps) {
  // Initialize global client for Zustand stores (cannot use React Context)
  _initGlobalClient(client);

  return <TRPCContext.Provider value={client}>{children}</TRPCContext.Provider>;
}

/**
 * Hook to access tRPC client
 * Must be used within TRPCProvider
 */
export function useTRPCClient(): TypedTRPCClient {
  const client = useContext(TRPCContext);

  if (!client) {
    throw new Error(
      'useTRPCClient must be used within TRPCProvider. ' +
      'Wrap your app with <TRPCProvider client={client}>...</TRPCProvider>'
    );
  }

  return client;
}

/**
 * Helper: Create in-process tRPC client
 * Zero-overhead communication for embedded server
 */
export function createInProcessClient(
  options: InProcessLinkOptions<AppRouter>
): TypedTRPCClient {
  return createTRPCProxyClient<AppRouter>({
    links: [inProcessLink(options)],
  });
}

/**
 * Helper: Create HTTP tRPC client
 * For remote server connections
 */
export function createHTTPClient(serverUrl: string): TypedTRPCClient {
  const { httpBatchLink, httpSubscriptionLink, splitLink } = require('@trpc/client');
  const { EventSource } = require('eventsource');

  return createTRPCProxyClient<AppRouter>({
    links: [
      splitLink({
        condition: (op: { type: string }) => op.type === 'subscription',
        true: httpSubscriptionLink({
          url: `${serverUrl}/trpc`,
          EventSource: EventSource as any,
        }),
        false: httpBatchLink({
          url: `${serverUrl}/trpc`,
          headers: () => ({
            'Content-Type': 'application/json',
          }),
        }),
      }),
    ],
  });
}

// ============================================================================
// Internal: Global Client for Zustand Stores
// ============================================================================
// Zustand stores cannot use React hooks, so they need global client access
// This is INTERNAL API - React components should use useTRPCClient() hook

/**
 * Global tRPC client instance for Zustand stores
 * @internal DO NOT USE in React components - use useTRPCClient() hook
 */
let _globalClientForStores: TypedTRPCClient | null = null;

/**
 * Initialize global client for Zustand stores
 * Called automatically by TRPCProvider
 * @internal
 */
export function _initGlobalClient(client: TypedTRPCClient) {
  _globalClientForStores = client;
}

/**
 * Get tRPC client for Zustand stores
 * @internal DO NOT USE in React components - use useTRPCClient() hook
 */
export function getTRPCClient(): TypedTRPCClient {
  if (!_globalClientForStores) {
    throw new Error(
      'tRPC client not initialized. Ensure TRPCProvider wraps your app.'
    );
  }
  return _globalClientForStores;
}
