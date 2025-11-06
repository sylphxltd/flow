import { jsx as _jsx } from "react/jsx-runtime";
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
import { createContext, useContext } from 'react';
import { createTRPCProxyClient } from '@trpc/client';
import { inProcessLink } from './trpc-links/index.js';
/**
 * React Context for tRPC client
 */
const TRPCContext = createContext(null);
/**
 * TRPCProvider - Provides tRPC client to React tree
 * Also initializes global client for Zustand stores
 *
 * @example
 * ```typescript
 * const client = createInProcessClient({ router, createContext });
 *
 * render(
 *   <TRPCProvider client={client}>
 *     <App />
 *   </TRPCProvider>
 * );
 * ```
 */
export function TRPCProvider({ client, children }) {
    // Initialize global client for Zustand stores (cannot use React Context)
    _initGlobalClient(client);
    return _jsx(TRPCContext.Provider, { value: client, children: children });
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
export function useTRPCClient() {
    const client = useContext(TRPCContext);
    if (!client) {
        throw new Error('useTRPCClient must be used within TRPCProvider. ' +
            'Wrap your app with <TRPCProvider client={client}>...</TRPCProvider>');
    }
    return client;
}
/**
 * Helper: Create in-process tRPC client
 * Zero-overhead communication for embedded server
 *
 * @example
 * ```typescript
 * const server = new CodeServer();
 * await server.initialize();
 *
 * const client = createInProcessClient({
 *   router: server.getRouter(),
 *   createContext: server.getContext(),
 * });
 * ```
 */
export function createInProcessClient(options) {
    return createTRPCProxyClient({
        links: [inProcessLink(options)],
    });
}
/**
 * Helper: Create HTTP tRPC client
 * For remote server connections
 *
 * @example
 * ```typescript
 * const client = createHTTPClient('http://localhost:3000');
 * ```
 */
export function createHTTPClient(serverUrl) {
    const { httpBatchLink, httpSubscriptionLink, splitLink } = require('@trpc/client');
    const { EventSource } = require('eventsource');
    return createTRPCProxyClient({
        links: [
            splitLink({
                condition: (op) => op.type === 'subscription',
                true: httpSubscriptionLink({
                    url: `${serverUrl}/trpc`,
                    EventSource: EventSource,
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
let _globalClientForStores = null;
/**
 * Initialize global client for Zustand stores
 * Called automatically by TRPCProvider
 * @internal
 */
export function _initGlobalClient(client) {
    _globalClientForStores = client;
}
/**
 * Get tRPC client for Zustand stores
 * @internal DO NOT USE in React components - use useTRPCClient() hook
 */
export function getTRPCClient() {
    if (!_globalClientForStores) {
        throw new Error('tRPC client not initialized. Ensure TRPCProvider wraps your app.');
    }
    return _globalClientForStores;
}
//# sourceMappingURL=trpc-provider.js.map