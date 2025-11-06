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

import type { TRPCLink, TRPCClientError } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { createLogger } from '@sylphx/code-core';

const log = createLogger('trpc:link');

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
export function inProcessLink<TRouter extends AnyRouter>(
  options: InProcessLinkOptions<TRouter>
): TRPCLink<TRouter> {
  return () => {
    return ({ op, next }) => {
      return observable((observer) => {
        const { type, path, input } = op;

        // Execute procedure via server-side caller
        (async () => {
          try {
            // Create context for this request
            const ctx = await options.createContext();

            // Create server-side caller with context
            const caller = options.router.createCaller(ctx);

            // Navigate to the procedure using path (e.g., 'session.getLast')
            const procedureFn = getProcedureFunction(caller, path);

            if (!procedureFn) {
              throw new Error(`Procedure not found: ${path}`);
            }

            // Execute procedure based on type
            if (type === 'query' || type === 'mutation') {
              // Regular query/mutation
              const result = await procedureFn(input);
              observer.next({ result: { type: 'data', data: result } });
              observer.complete();
            } else if (type === 'subscription') {
              // Subscription - stream results
              log('Executing subscription:', path);
              log('Calling procedure with input keys:', Object.keys(input || {}));
              const subscription = await procedureFn(input);
              log('Subscription returned:', typeof subscription);

              if (Symbol.asyncIterator in subscription) {
                log('Async iterable subscription detected');
                // Async iterable subscription
                for await (const data of subscription as AsyncIterable<any>) {
                  log('Received data from async iterator');
                  observer.next({ result: { type: 'data', data } });
                }
                log('Async iterator completed');
                observer.complete();
              } else {
                log('Observable subscription detected');
                // Observable subscription
                const sub = subscription.subscribe({
                  next: (data: any) => {
                    log('Observable next:', data?.type || typeof data);
                    observer.next({ result: { type: 'data', data } });
                  },
                  error: (err: any) => {
                    log('Observable error:', err instanceof Error ? err.message : String(err));
                    observer.error(err);
                  },
                  complete: () => {
                    log('Observable complete');
                    observer.complete();
                  },
                });

                // Return unsubscribe function
                return () => {
                  log('Unsubscribing from observable');
                  sub.unsubscribe();
                };
              }
            }
          } catch (error) {
            observer.error(error as TRPCClientError<TRouter>);
          }
        })();
      });
    };
  };
}

/**
 * Get procedure function from caller by path
 *
 * Navigates the caller object using dot notation path:
 * 'session.getLast' -> caller.session.getLast
 * 'message.streamResponse' -> caller.message.streamResponse
 */
function getProcedureFunction(caller: any, path: string): any {
  const parts = path.split('.');
  let current = caller;

  for (const part of parts) {
    if (!current[part]) {
      return null;
    }
    current = current[part];
  }

  return current;
}
