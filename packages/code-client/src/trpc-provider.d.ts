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
import { type ReactNode } from 'react';
import { createTRPCProxyClient } from '@trpc/client';
import type { AppRouter } from '@sylphx/code-server';
import { type InProcessLinkOptions } from './trpc-links/index.js';
/**
 * tRPC Client type with full AppRouter typing
 */
export type TypedTRPCClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>;
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
export declare function TRPCProvider({ client, children }: TRPCProviderProps): import("react/jsx-runtime").JSX.Element;
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
export declare function useTRPCClient(): TypedTRPCClient;
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
export declare function createInProcessClient(options: InProcessLinkOptions<AppRouter>): TypedTRPCClient;
/**
 * Helper: Create HTTP tRPC client
 * For remote server connections
 *
 * @example
 * ```typescript
 * const client = createHTTPClient('http://localhost:3000');
 * ```
 */
export declare function createHTTPClient(serverUrl: string): TypedTRPCClient;
/**
 * Initialize global client for Zustand stores
 * Called automatically by TRPCProvider
 * @internal
 */
export declare function _initGlobalClient(client: TypedTRPCClient): void;
/**
 * Get tRPC client for Zustand stores
 * @internal DO NOT USE in React components - use useTRPCClient() hook
 */
export declare function getTRPCClient(): TypedTRPCClient;
//# sourceMappingURL=trpc-provider.d.ts.map