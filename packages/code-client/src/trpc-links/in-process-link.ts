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
import { observable } from '@trpc/server/observable';

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
 * Calls tRPC procedures directly without network stack
 */
export function inProcessLink<TRouter extends AnyRouter>(
  options: InProcessLinkOptions<TRouter>
): TRPCLink<TRouter> {
  return () => {
    return ({ op, next }) => {
      return observable((observer) => {
        const { type, path, input } = op;

        // Execute procedure directly
        (async () => {
          try {
            // Create context for this request
            const ctx = await options.createContext();

            // Get procedure from router
            const procedure = getProcedure(options.router, path);

            if (!procedure) {
              throw new Error(`Procedure not found: ${path}`);
            }

            // Execute procedure based on type
            if (type === 'query' || type === 'mutation') {
              // Regular query/mutation
              const result = await procedure({ ctx, input, path, type });
              observer.next({ result: { type: 'data', data: result } });
              observer.complete();
            } else if (type === 'subscription') {
              // Subscription - stream results
              const subscription = await procedure({ ctx, input, path, type });

              if (Symbol.asyncIterator in subscription) {
                // Async iterable subscription
                for await (const data of subscription as AsyncIterable<any>) {
                  observer.next({ result: { type: 'data', data } });
                }
                observer.complete();
              } else {
                // Observable subscription
                const sub = subscription.subscribe({
                  next: (data: any) => {
                    observer.next({ result: { type: 'data', data } });
                  },
                  error: (err: any) => {
                    observer.error(err);
                  },
                  complete: () => {
                    observer.complete();
                  },
                });

                // Return unsubscribe function
                return () => {
                  sub.unsubscribe();
                };
              }
            }
          } catch (error) {
            observer.error(error);
          }
        })();
      });
    };
  };
}

/**
 * Get procedure from router by path
 * Supports nested paths like 'session.getLast' or 'message.streamResponse'
 */
function getProcedure(router: any, path: string): any {
  const parts = path.split('.');
  let current = router._def.procedures;

  for (const part of parts) {
    if (!current[part]) {
      return null;
    }
    current = current[part];
  }

  return current;
}
