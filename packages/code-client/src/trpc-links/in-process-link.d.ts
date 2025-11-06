/**
 * In-Process tRPC Link
 * Zero-overhead communication via direct function calls
 *
 * Inspired by graphql-yoga's execute() pattern
 * Performance: ~0.1ms vs ~3ms for HTTP localhost
 *
 * Usage:
 * ```typescript
 * import { CodeServer } from '@sylphx/code-server';
 * import { inProcessLink } from '@sylphx/code-client';
 *
 * const server = new CodeServer();
 * await server.initialize();
 *
 * const client = createTRPCClient({
 *   links: [inProcessLink({
 *     router: server.getRouter(),
 *     createContext: server.getContext()
 *   })]
 * });
 * ```
 */
import type { TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
export interface InProcessLinkOptions<TRouter extends AnyRouter> {
    /**
     * tRPC router instance from CodeServer
     */
    router: TRouter;
    /**
     * Context factory from CodeServer
     */
    createContext: () => Promise<any> | any;
}
/**
 * Create in-process tRPC link for zero-overhead communication
 * Uses tRPC server-side caller API for proper procedure invocation
 */
export declare function inProcessLink<TRouter extends AnyRouter>(options: InProcessLinkOptions<TRouter>): TRPCLink<TRouter>;
//# sourceMappingURL=in-process-link.d.ts.map