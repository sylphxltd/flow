/**
 * In-Process Subscription Link for tRPC
 * Provides subscription support WITHOUT SSE overhead for same-process calls
 *
 * Architecture:
 * - TUI: Uses this link (zero network overhead)
 * - Web GUI: Uses httpSubscriptionLink (SSE over network)
 * - Same API, different transport!
 *
 * Benefits:
 * - Unified interface for TUI and Web
 * - Type-safe subscriptions
 * - In-process: EventEmitter (instant)
 * - Web: SSE (network-friendly)
 */

import { observable } from '@trpc/server/observable';
import type { TRPCLink, Operation } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import { TRPCClientError } from '@trpc/client';

/**
 * Creates an in-process subscription link
 * Direct function calls, no HTTP/SSE overhead
 *
 * @param opts.caller - tRPC caller instance (from router.createCaller)
 */
export function inProcessSubscriptionLink<TRouter extends AnyRouter>(opts: {
  caller: ReturnType<TRouter['createCaller']>;
}): TRPCLink<TRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer) => {
        // Handle different operation types
        const { type, path, input } = op;

        // For subscriptions: call the procedure and handle the observable
        if (type === 'subscription') {
          try {
            // Navigate to the procedure using path
            const procedure = getNestedProperty(opts.caller, path.split('.'));

            if (typeof procedure !== 'function') {
              observer.error(
                new TRPCClientError('Procedure not found: ' + path)
              );
              return;
            }

            // Call the subscription procedure (returns an observable)
            const result = procedure(input);

            // Subscribe to the result
            const subscription = result.subscribe({
              next: (data: any) => {
                observer.next({ result: { data } });
              },
              error: (error: any) => {
                observer.error(
                  TRPCClientError.from(error)
                );
              },
              complete: () => {
                observer.complete();
              },
            });

            // Return unsubscribe function
            return () => {
              subscription.unsubscribe();
            };
          } catch (error) {
            observer.error(
              TRPCClientError.from(error)
            );
          }
        }

        // For queries and mutations: just call directly
        else if (type === 'query' || type === 'mutation') {
          try {
            const procedure = getNestedProperty(opts.caller, path.split('.'));

            if (typeof procedure !== 'function') {
              observer.error(
                new TRPCClientError('Procedure not found: ' + path)
              );
              return;
            }

            // Call and return result
            Promise.resolve(procedure(input))
              .then((data) => {
                observer.next({ result: { data } });
                observer.complete();
              })
              .catch((error) => {
                observer.error(
                  TRPCClientError.from(error)
                );
              });
          } catch (error) {
            observer.error(
              TRPCClientError.from(error)
            );
          }
        }
      });
    };
  };
}

/**
 * Helper to navigate nested object properties
 * e.g., ['message', 'stream'] -> caller.message.stream
 */
function getNestedProperty(obj: any, path: string[]): any {
  return path.reduce((current, key) => {
    return current?.[key];
  }, obj);
}
