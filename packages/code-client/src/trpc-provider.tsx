/**
 * tRPC Provider for code-client
 * Provides type-safe tRPC client to all React components via Context
 *
 * Usage:
 * ```typescript
 * // In app entry (TUI or Web)
 * import { TRPCProvider, createInProcessClient } from '@sylphx/code-client';
 * import { CodeServer } from '@sylphx/code-server';
 *
 * const server = new CodeServer();
 * await server.initialize();
 *
 * const client = createInProcessClient({
 *   router: server.getRouter(),
 *   createContext: server.getContext(),
 * });
 *
 * render(
 *   <TRPCProvider client={client}>
 *     <App />
 *   </TRPCProvider>
 * );
 * ```
 */

import { createContext, useContext, type ReactNode } from 'react';
import { createTRPCProxyClient, type TRPCClient } from '@trpc/client';
import { inProcessLink, type InProcessLinkOptions } from './trpc-links/index.js';

/**
 * Generic tRPC Client type
 * TRouter should be your AppRouter type from your server
 *
 * @example
 * ```typescript
 * import type { AppRouter } from '@sylphx/code-server';
 * type MyClient = TypedTRPCClient<AppRouter>;
 * ```
 */
export type TypedTRPCClient<TRouter = any> = ReturnType<typeof createTRPCProxyClient<TRouter>>;

/**
 * React Context for tRPC client
 */
const TRPCContext = createContext<TypedTRPCClient<any> | null>(null);

/**
 * Provider props
 */
export interface TRPCProviderProps<TRouter = any> {
  client: TypedTRPCClient<TRouter>;
  children: ReactNode;
}

/**
 * TRPCProvider - Provides tRPC client to React tree
 * Also initializes global client for Zustand stores
 *
 * @example
 * ```typescript
 * import type { AppRouter } from '@sylphx/code-server';
 * const client = createInProcessClient<AppRouter>({ router, createContext });
 *
 * render(
 *   <TRPCProvider client={client}>
 *     <App />
 *   </TRPCProvider>
 * );
 * ```
 */
export function TRPCProvider<TRouter = any>({ client, children }: TRPCProviderProps<TRouter>) {
  // Initialize global client for Zustand stores (cannot use React Context)
  _initGlobalClient(client);

  return <TRPCContext.Provider value={client}>{children}</TRPCContext.Provider>;
}

/**
 * Hook to access tRPC client
 * Must be used within TRPCProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const client = useTRPCClient();
 *   const session = await client.session.getLast.query();
 * }
 * ```
 */
export function useTRPCClient<TRouter = any>(): TypedTRPCClient<TRouter> {
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
 *
 * @example
 * ```typescript
 * import type { AppRouter } from '@sylphx/code-server';
 *
 * const server = new CodeServer();
 * await server.initialize();
 *
 * const client = createInProcessClient<AppRouter>({
 *   router: server.getRouter(),
 *   createContext: server.getContext(),
 * });
 * ```
 */
export function createInProcessClient<TRouter>(
  options: InProcessLinkOptions<TRouter>
): TypedTRPCClient<TRouter> {
  return createTRPCProxyClient<TRouter>({
    links: [inProcessLink(options)],
  });
}

/**
 * Helper: Create HTTP tRPC client
 * For remote server connections
 *
 * @example
 * ```typescript
 * import type { AppRouter } from '@sylphx/code-server';
 * const client = createHTTPClient<AppRouter>('http://localhost:3000');
 * ```
 */
export function createHTTPClient<TRouter>(serverUrl: string): TypedTRPCClient<TRouter> {
  const { httpBatchLink, httpSubscriptionLink, splitLink } = require('@trpc/client');
  const { EventSource } = require('eventsource');

  return createTRPCProxyClient<TRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
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
let _globalClientForStores: TypedTRPCClient<any> | null = null;

/**
 * Initialize global client for Zustand stores
 * Called automatically by TRPCProvider
 * @internal
 */
export function _initGlobalClient<TRouter>(client: TypedTRPCClient<TRouter>) {
  _globalClientForStores = client;
}

/**
 * Get tRPC client for Zustand stores
 * @internal DO NOT USE in React components - use useTRPCClient() hook
 */
export function getTRPCClient<TRouter = any>(): TypedTRPCClient<TRouter> {
  if (!_globalClientForStores) {
    throw new Error(
      'tRPC client not initialized. Ensure TRPCProvider wraps your app.'
    );
  }
  return _globalClientForStores;
}
